from routes.auth import auth_bp
from routes.patients import patients_bp
from routes.predictions import predictions_bp
from routes.analytics import analytics_bp
from routes.reports import reports_bp

__all__ = ['auth_bp', 'patients_bp', 'predictions_bp', 'analytics_bp', 'reports_bp']
