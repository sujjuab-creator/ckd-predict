import os
import sys
from flask import Flask, jsonify
from flask_cors import CORS
from sqlalchemy.exc import OperationalError, DatabaseError

from config import Config
from extensions import db
from routes.auth import auth_bp
from routes.patients import patients_bp
from routes.predictions import predictions_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp

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
    app.register_blueprint(patients_bp)
    app.register_blueprint(predictions_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(reports_bp)

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
            print("[INFO] Database tables verified / created successfully.")
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
