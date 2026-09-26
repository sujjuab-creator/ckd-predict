import os
from dotenv import load_dotenv
from sqlalchemy import create_engine

# Load environment variables from .env file
load_dotenv()

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'ckd_prediction_secret_key_demo_2026')
    
    db_url = os.getenv('DATABASE_URL', '')
    if db_url and db_url.startswith('mysql'):
        try:
            # Test MySQL connection
            engine = create_engine(db_url, connect_args={'connect_timeout': 2})
            conn = engine.connect()
            conn.close()
        except Exception:
            # Fallback to local SQLite database if MySQL server is not running
            base_dir = os.path.abspath(os.path.dirname(__file__))
            db_url = f"sqlite:///{os.path.join(base_dir, 'ckd_db.sqlite')}"
    elif not db_url:
        base_dir = os.path.abspath(os.path.dirname(__file__))
        db_url = f"sqlite:///{os.path.join(base_dir, 'ckd_db.sqlite')}"

    SQLALCHEMY_DATABASE_URI = db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    CORS_ORIGIN = os.getenv('CORS_ORIGIN', 'http://localhost:5173')

