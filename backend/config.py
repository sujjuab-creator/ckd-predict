import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from backend/.env or project .env
backend_env = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(backend_env):
    load_dotenv(backend_env)
else:
    load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'ckd_prediction_secret_key_demo_2026')
    flask_env = os.getenv('FLASK_ENV', 'development').lower()
    
    db_url = os.getenv('DATABASE_URL', '').strip()
    
    if flask_env == 'testing':
        SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    elif flask_env == 'production':
        if not db_url:
            raise ValueError("[PRODUCTION CONFIG ERROR] DATABASE_URL environment variable is required in production environment!")
        SQLALCHEMY_DATABASE_URI = db_url
    elif db_url and db_url.startswith('mysql'):
        try:
            # Test MySQL connection in development
            engine = create_engine(db_url, connect_args={'connect_timeout': 5})
            conn = engine.connect()
            conn.close()
            SQLALCHEMY_DATABASE_URI = db_url
        except Exception:
            # Fallback to local SQLite database in development if local MySQL is offline
            base_dir = os.path.abspath(os.path.dirname(__file__))
            SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(base_dir, 'ckd_db.sqlite')}"
    elif db_url:
        SQLALCHEMY_DATABASE_URI = db_url
    else:
        # Default local development fallback
        base_dir = os.path.abspath(os.path.dirname(__file__))
        SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(base_dir, 'ckd_db.sqlite')}"

    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGIN = os.getenv('FRONTEND_URL') or os.getenv('CORS_ORIGIN', 'http://localhost:5173')


