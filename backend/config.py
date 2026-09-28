import os
from dotenv import load_dotenv

from env_loader import BACKEND_ENV_FILE, load_backend_env


def load_config_environment(env_file=BACKEND_ENV_FILE):
    """
    Load backend/.env (absolute path next to this file) with the reliable loader in env_loader.py:
    UTF-8, UTF-8 with BOM and UTF-16 files are supported.
    - DATABASE_URL: a non-empty value in backend/.env is used even if the environment has an
      empty/stale DATABASE_URL.
    - Every other variable: an existing environment variable (e.g. set on Render) keeps priority.
    If backend/.env does not exist (e.g. on Render), the previous behaviour is kept: python-dotenv
    looks for a project .env and never overrides existing environment variables.
    Returns non-secret diagnostics (or None when backend/.env does not exist).
    """
    if os.path.isfile(env_file):
        return load_backend_env(env_file)
    load_dotenv()
    return None


load_config_environment()

from database_config import normalize_database_url, mysql_engine_options


def _sqlite_fallback_uri():
    base_dir = os.path.abspath(os.path.dirname(__file__))
    return f"sqlite:///{os.path.join(base_dir, 'ckd_db.sqlite')}"


def build_database_settings(flask_env, db_url):
    """
    Returns (SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS).

    MySQL URLs (including Aiven Service URIs with ?ssl-mode=REQUIRED) are normalised
    for PyMySQL: the ssl-mode query option is removed from the URL and TLS is
    configured through connect_args instead (see database_config.py).
    """
    db_url = (db_url or '').strip()

    if flask_env == 'testing':
        return 'sqlite:///:memory:', {}

    if flask_env == 'production':
        if not db_url:
            raise ValueError("[PRODUCTION CONFIG ERROR] DATABASE_URL environment variable is required in production environment!")
        uri, connect_args = normalize_database_url(db_url)
        if uri.startswith('mysql'):
            return uri, mysql_engine_options(connect_args)
        return uri, {}

    if db_url:
        # An intended MySQL/Aiven DATABASE_URL is always used as configured - there is no silent
        # fallback to SQLite. If the server is unreachable, the app reports the database error.
        uri, connect_args = normalize_database_url(db_url)
        return uri, (mysql_engine_options(connect_args) if uri.startswith('mysql') else {})

    # No DATABASE_URL at all: local development SQLite database
    return _sqlite_fallback_uri(), {}


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'ckd_prediction_secret_key_demo_2026')
    flask_env = os.getenv('FLASK_ENV', 'development').lower()

    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = build_database_settings(
        flask_env, os.getenv('DATABASE_URL', ''))

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGIN = os.getenv('FRONTEND_URL') or os.getenv('CORS_ORIGIN', 'http://localhost:5173')
