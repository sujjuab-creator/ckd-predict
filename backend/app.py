import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy.exc import OperationalError, DatabaseError

from config import Config
from extensions import db
from models.user import User
import models  # noqa: F401  (registers all tables, incl. email_otps & password_reset_tokens)
from utils.security import hash_password, verify_password

from routes.auth import auth_bp
from routes.admin import admin_bp
from routes.patients import patients_bp
from routes.predictions import predictions_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp
from routes.care import patient_bp, reviews_bp, notifications_bp

def auto_migrate_user_schema(app):
    """Safely adds missing hospital metadata columns to existing users table if needed."""
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            if 'users' in inspector.get_table_names():
                existing_cols = [c['name'] for c in inspector.get_columns('users')]
                with db.engine.begin() as conn:
                    if 'status' not in existing_cols:
                        conn.execute(db.text("ALTER TABLE users ADD COLUMN status VARCHAR(20) DEFAULT 'Active'"))
                    if 'is_temporary_password' not in existing_cols:
                        conn.execute(db.text("ALTER TABLE users ADD COLUMN is_temporary_password BOOLEAN DEFAULT 1"))
                    if 'specialty_or_department' not in existing_cols:
                        conn.execute(db.text("ALTER TABLE users ADD COLUMN specialty_or_department VARCHAR(100)"))
                    if 'phone' not in existing_cols:
                        conn.execute(db.text("ALTER TABLE users ADD COLUMN phone VARCHAR(30)"))
        except Exception as err:
            print(f"[INFO] Auto-migration check: {err}")

    auto_migrate_auth_schema(app)


def auto_migrate_auth_schema(app):
    """
    Additive, idempotent migration for registration / care-team fields.
    - users.doctor_code  (unique Doctor ID), users.updated_at
    - patients.doctor_id (treating doctor -> users.id, ON DELETE SET NULL on MySQL)
    New tables (email_otps, password_reset_tokens) are created by db.create_all().
    Never drops or rewrites existing data. Each step runs independently.
    """
    with app.app_context():
        try:
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
        except Exception as err:
            print(f"[INFO] Auth schema migration skipped: {err.__class__.__name__}")
            return

        dialect = db.engine.dialect.name
        steps = []
        if 'users' in tables:
            user_cols = [c['name'] for c in inspector.get_columns('users')]
            user_indexes = [i['name'] for i in inspector.get_indexes('users')]
            if 'doctor_code' not in user_cols:
                steps.append("ALTER TABLE users ADD COLUMN doctor_code VARCHAR(50) NULL")
            if 'ix_users_doctor_code' not in user_indexes:
                steps.append("CREATE UNIQUE INDEX ix_users_doctor_code ON users (doctor_code)")
            if 'updated_at' not in user_cols:
                steps.append("ALTER TABLE users ADD COLUMN updated_at DATETIME NULL")
        if 'patients' in tables:
            patient_cols = [c['name'] for c in inspector.get_columns('patients')]
            if 'doctor_id' not in patient_cols:
                steps.append("ALTER TABLE patients ADD COLUMN doctor_id INTEGER NULL")
                steps.append("CREATE INDEX ix_patients_doctor_id ON patients (doctor_id)")
                if dialect == 'mysql':
                    steps.append(
                        "ALTER TABLE patients ADD CONSTRAINT fk_patients_doctor_id "
                        "FOREIGN KEY (doctor_id) REFERENCES users (id) ON DELETE SET NULL"
                    )

        for sql in steps:
            try:
                with db.engine.begin() as conn:
                    conn.execute(db.text(sql))
                print(f"[INFO] Schema migration applied: {sql.split(' ADD ')[0] if ' ADD ' in sql else sql[:40]}")
            except Exception as err:
                print(f"[INFO] Schema migration step skipped ({err.__class__.__name__}): {sql[:60]}")


class AdminConfigurationError(RuntimeError):
    """Raised when the initial System Administrator cannot be created safely."""


MIN_ADMIN_PASSWORD_LENGTH = 8


def _sync_existing_admin(admin, admin_email, admin_password):
    """Synchronise the existing admin's password with ADMIN_PASSWORD when ADMIN_EMAIL matches."""
    if (admin.email or '').strip().lower() != admin_email:
        print('[INFO] System Administrator already exists; ADMIN_EMAIL does not match it, so it was left unchanged.')
        return
    if not _admin_password_is_valid(admin_password):
        if admin_password.strip():
            print(f'[WARNING] ADMIN_PASSWORD is shorter than {MIN_ADMIN_PASSWORD_LENGTH} characters; '
                  'the existing System Administrator password was NOT changed.')
        return

    changed = False
    if not verify_password(admin_password, admin.password_hash):
        admin.password_hash = hash_password(admin_password)
        admin.is_temporary_password = False
        changed = True
    if admin.role != 'admin':
        admin.role = 'admin'
        changed = True
    if admin.status != 'Active':
        admin.status = 'Active'
        changed = True
    if changed:
        db.session.commit()
        print(f'[INFO] System Administrator ({admin.email}) synchronised with ADMIN_EMAIL/ADMIN_PASSWORD.')


def _admin_password_is_valid(password):
    return bool(password and password.strip()) and len(password) >= MIN_ADMIN_PASSWORD_LENGTH


def init_system_admin(app):
    """
    Ensure exactly one System Administrator account exists on initialization.

    Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from the environment (there is NO default password).

    - If an admin already exists, another one is never created.
      * When the existing admin's email matches ADMIN_EMAIL (case-insensitive) and ADMIN_PASSWORD is
        valid, the admin's password is synchronised to ADMIN_PASSWORD and the account is kept
        role='admin' / status='Active'.
      * Otherwise (different email, or ADMIN_PASSWORD not set) the existing admin is left untouched.
    - If no admin exists, a new admin is created from the environment. If ADMIN_PASSWORD is
      missing/empty/too short:
        * production: raise AdminConfigurationError (startup fails with a clear message)
        * development/testing: no admin is created and a warning is printed
    The password value is never printed or logged.
    """
    is_production = (os.getenv('FLASK_ENV') or '').strip().lower() == 'production'

    admin_email = (os.getenv('ADMIN_EMAIL') or 'admin@ckdpredict.com').strip().lower()
    admin_password = os.getenv('ADMIN_PASSWORD') or ''
    admin_name = (os.getenv('ADMIN_NAME') or 'System Administrator').strip() or 'System Administrator'

    with app.app_context():
        try:
            existing_admin = User.query.filter_by(role='admin').order_by(User.id).first()
            if existing_admin:
                _sync_existing_admin(existing_admin, admin_email, admin_password)
                return

            if not _admin_password_is_valid(admin_password):
                message = (
                    '[CONFIGURATION ERROR] No System Administrator account exists and ADMIN_PASSWORD is not set '
                    f'(or is shorter than {MIN_ADMIN_PASSWORD_LENGTH} characters). Set ADMIN_EMAIL and a strong '
                    'ADMIN_PASSWORD environment variable to create the initial Admin account.'
                )
                if is_production:
                    raise AdminConfigurationError(message)
                print(message.replace('[CONFIGURATION ERROR]', '[WARNING]') + ' Admin account was NOT created.')
                return

            if User.query.filter(User.email.ilike(admin_email)).first():
                message = (
                    f'[CONFIGURATION ERROR] ADMIN_EMAIL ({admin_email}) is already used by a non-admin account; '
                    'the System Administrator was not created. Choose a different ADMIN_EMAIL.'
                )
                if is_production:
                    raise AdminConfigurationError(message)
                print(message.replace('[CONFIGURATION ERROR]', '[WARNING]'))
                return

            db.session.add(User(
                name=admin_name,
                email=admin_email,
                password_hash=hash_password(admin_password),
                role='admin',
                status='Active',
                is_temporary_password=False,
                specialty_or_department='Chief Medical Data Officer'
            ))
            db.session.commit()
            print(f"[INFO] Single System Administrator initialized ({admin_email}).")
        except (OperationalError, DatabaseError) as err:
            db.session.rollback()
            print(f"[WARNING] System Admin initialization skipped (database error: {err.__class__.__name__}).")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend origin
    cors_origin = os.getenv('FRONTEND_URL') or app.config.get('CORS_ORIGIN', 'http://localhost:5173')
    allowed_origins = [cors_origin, "http://localhost:5173", "http://127.0.0.1:5173"]
    CORS(app, resources={r"/api/*": {"origins": list(set(allowed_origins))}}, supports_credentials=True)

    # Initialize extensions
    db.init_app(app)

    # Register API Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(predictions_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reports_bp)
    app.register_blueprint(patient_bp)
    app.register_blueprint(reviews_bp)
    app.register_blueprint(notifications_bp)

    # 1. Health Check API (No auth required)
    @app.route('/api/health', methods=['GET'])
    def health():
        db_status = "connected"
        try:
            db.session.execute(db.select(1))
        except Exception:
            db_status = "disconnected"

        return jsonify({
            "success": True,
            "status": "ok" if db_status == "connected" else "degraded",
            "service": "CKD Prediction API",
            "database": db_status
        }), 200

    # Custom Error Handlers
    @app.errorhandler(404)
    def handle_404(e):
        return jsonify({"success": False, "error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def handle_500(e):
        return jsonify({"success": False, "error": "Internal server error"}), 500

    # Database Initialization & Connection Check
    with app.app_context():
        try:
            db.create_all()
            auto_migrate_user_schema(app)
            print("[INFO] Database tables verified / created successfully.")
            init_system_admin(app)
        except (OperationalError, DatabaseError) as err:
            print("\n" + "="*70)
            print("[MYSQL ERROR] Failed to connect to MySQL database:")
            print(f"Details: {err}")
            print("\n[CONFIGURATION NEEDED]:")
            print("1. Ensure MySQL Server is installed and running on your system (port 3306).")
            print("2. Create database 'ckd_db': CREATE DATABASE ckd_db;")
            print("3. Check backend/.env DATABASE_URL=mysql+pymysql://username:password@localhost:3306/ckd_db")
            print("="*70 + "\n")

    return app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting CKD Prediction API Server on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
