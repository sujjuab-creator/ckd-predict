import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from backend/.env or project .env
backend_env = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

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

    if db_url and db_url.startswith('mysql'):
        uri, connect_args = normalize_database_url(db_url)
        try:
            # Test MySQL connection in development
            engine = create_engine(uri, connect_args={**connect_args, 'connect_timeout': 5})
            conn = engine.connect()
            conn.close()
            engine.dispose()
            return uri, mysql_engine_options(connect_args)
        except Exception:
            # Fallback to local SQLite database in development if MySQL is unreachable
            return _sqlite_fallback_uri(), {}

    if db_url:
        uri, connect_args = normalize_database_url(db_url)
        return uri, (mysql_engine_options(connect_args) if uri.startswith('mysql') else {})

    # Default local development fallback
    return _sqlite_fallback_uri(), {}


class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'ckd_prediction_secret_key_demo_2026')
    flask_env = os.getenv('FLASK_ENV', 'development').lower()

    SQLALCHEMY_DATABASE_URI, SQLALCHEMY_ENGINE_OPTIONS = build_database_settings(
        flask_env, os.getenv('DATABASE_URL', ''))

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGIN = os.getenv('FRONTEND_URL') or os.getenv('CORS_ORIGIN', 'http://localhost:5173')
