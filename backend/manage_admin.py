"""
One-off command: create or update the single System Administrator account
in the PRODUCTION MySQL database (e.g. Aiven).

- Loads backend/.env from an absolute path next to this file (not the working directory);
  DATABASE_URL in that file wins over an empty/stale environment variable. UTF-8 (with or
  without BOM) and UTF-16 .env files are supported.
- Refuses to run if DATABASE_URL is missing or is not a MySQL URL (e.g. SQLite).
  It NEVER falls back to the local SQLite file.
- Reuses database_config.normalize_database_url, so an Aiven Service URI
  (mysql://...?ssl-mode=REQUIRED) is converted to mysql+pymysql:// with TLS.
- Prints only a masked destination (host:port/database) before doing anything.
- The password is prompted for (hidden input) or read from CKD_NEW_ADMIN_PASSWORD;
  it is stored only as a hash and never printed.

Usage (from the backend/ folder):
    python manage_admin.py --email admin@predict.com
"""
import argparse
import getpass
import os
import sys

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

DEFAULT_ENV_FILE = os.path.join(backend_dir, '.env')   # absolute path from __file__, never the working directory


class CommandError(SystemExit):
    """Stops the command with a message; nothing has been changed."""


def load_environment(env_file=None):
    """
    Load backend/.env (absolute path next to this file). DATABASE_URL from the file takes priority
    over an empty or stale environment variable. Handles UTF-8 with BOM and UTF-16 files.
    Returns non-secret diagnostics (file path, encoding, key NAMES only).
    """
    from env_loader import load_backend_env
    return load_backend_env(env_file or DEFAULT_ENV_FILE)


def _missing_database_url_message(info):
    """Explain why DATABASE_URL was not found, without printing any value."""
    if not info.get('exists'):
        where = f'{info.get("path")} does not exist'
    elif 'DATABASE_URL' in info.get('empty_keys', []):
        where = f'DATABASE_URL is present in {info["path"]} but its value is empty'
    else:
        names = ', '.join(info.get('keys') or []) or 'none'
        where = (f'{info["path"]} was read (encoding {info.get("encoding")}) but has no DATABASE_URL line. '
                 f'Variable names found: {names}')
    return (f'DATABASE_URL is not set: {where}. Add your Aiven MySQL Service URI as '
            'DATABASE_URL=mysql://... in backend/.env. Nothing was changed.')


def resolve_mysql_database(info=None):
    """Return (sqlalchemy_url, connect_args, masked_destination) or raise CommandError."""
    from sqlalchemy.engine import make_url
    from database_config import normalize_database_url

    raw = (os.environ.get('DATABASE_URL') or '').strip()
    if not raw:
        raise CommandError(_missing_database_url_message(info or {}))
    try:
        backend = make_url(raw).get_backend_name()
    except Exception:
        raise CommandError('DATABASE_URL could not be parsed. Nothing was changed.')
    if backend != 'mysql':
        raise CommandError(f'DATABASE_URL points to "{backend}", not MySQL. This command only updates the '
                           'production MySQL (Aiven) database and never uses SQLite. Nothing was changed.')

    uri, connect_args = normalize_database_url(raw)
    url = make_url(uri)
    tls = 'TLS on' if connect_args.get('ssl') is not None else 'TLS off'
    masked = f'{url.host}:{url.port or 3306}/{url.database or ""} ({tls})'
    return uri, connect_args, masked


def check_connection(uri, connect_args):
    """Open one connection to MySQL before changing anything."""
    from sqlalchemy import create_engine, text, inspect
    engine = create_engine(uri, connect_args={**connect_args, 'connect_timeout': 10})
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
            if not inspect(conn).has_table('users'):
                raise CommandError('The MySQL database has no "users" table. Deploy/start the backend once so '
                                   'the tables are created, then run this command again. Nothing was changed.')
    except CommandError:
        raise
    except Exception as err:
        raise CommandError(f'Could not connect to the MySQL database ({err.__class__.__name__}). '
                           'Nothing was changed.')
    finally:
        engine.dispose()


def create_admin_app(uri, connect_args):
    """Minimal Flask app bound ONLY to the given MySQL database (no SQLite fallback, no table creation)."""
    from flask import Flask
    from database_config import mysql_engine_options
    from extensions import db
    import models  # noqa: F401  (register tables)
    from routes.auth import auth_bp

    app = Flask('ckd_manage_admin')
    app.config.update(
        SQLALCHEMY_DATABASE_URI=uri,
        SQLALCHEMY_ENGINE_OPTIONS=mysql_engine_options(connect_args),
        SQLALCHEMY_TRACK_MODIFICATIONS=False,
        SECRET_KEY=os.getenv('SECRET_KEY', 'ckd_prediction_secret_key_demo_2026'),
    )
    db.init_app(app)
    app.register_blueprint(auth_bp)
    return app


def read_password():
    env_value = os.environ.get('CKD_NEW_ADMIN_PASSWORD')
    if env_value:
        return env_value
    first = getpass.getpass('New admin password: ')
    second = getpass.getpass('Repeat password: ')
    if first != second:
        raise CommandError('Passwords do not match. Nothing was changed.')
    return first


def main(argv=None, env_file=None):
    parser = argparse.ArgumentParser(description='Create or update the single CKD PREDICT admin account (MySQL only).')
    parser.add_argument('--email', required=True, help='Admin email address, e.g. admin@predict.com')
    parser.add_argument('--name', default=None, help='Optional admin display name')
    args = parser.parse_args(argv)

    info = load_environment(env_file)
    uri, connect_args, masked = resolve_mysql_database(info)
    source = info['sources'].get('DATABASE_URL', 'environment')
    print(f'DATABASE_URL source: {source}')
    print(f'Target database: {masked}')          # host:port/database only - never the username/password

    password = read_password()
    check_connection(uri, connect_args)

    from extensions import db
    from models.user import User
    from services.admin_account import upsert_single_admin, AdminAccountError

    app = create_admin_app(uri, connect_args)
    with app.app_context():
        try:
            action, admin = upsert_single_admin(args.email, password, args.name)
        except AdminAccountError as err:
            raise CommandError(f'Admin account NOT changed: {err}')
        admin_count = User.query.filter_by(role='admin').count()
        email = admin.email
        db.session.remove()

    res = app.test_client().post('/api/auth/login', json={'email': email, 'password': password, 'role': 'admin'})
    login_ok = res.status_code == 200

    print(f'Admin account {action}: {email} (admins in database: {admin_count})')
    print('Login check with the new credentials: ' + ('OK' if login_ok else f'FAILED (HTTP {res.status_code})'))
    if os.environ.get('ADMIN_PASSWORD') and (os.environ.get('ADMIN_EMAIL') or '').strip().lower() == email:
        print('Note: ADMIN_EMAIL/ADMIN_PASSWORD are set for this admin; on startup the password is synchronised '
              'to ADMIN_PASSWORD, so keep them identical (or remove ADMIN_PASSWORD).')
    return 0 if login_ok else 1


if __name__ == '__main__':
    sys.exit(main())
