import os
import json
from flask import Blueprint, jsonify
from sqlalchemy import func
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.user import User
from models.patient import Patient
from models.prediction import Prediction
from models.report import Report

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

ML_REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml', 'reports'))

@analytics_bp.route('', methods=['GET'])
@analytics_bp.route('/', methods=['GET'])
def get_analytics():
    """GET /api/analytics -> Returns real database-derived analytics statistics"""
    try:
        total_users = User.query.count()
        total_patients = Patient.query.count()
        total_doctors = User.query.filter_by(role='doctor').count()
        total_predictions = Prediction.query.count()
        total_reports = Report.query.count()

        ckd_risk_count = Prediction.query.filter(
            Prediction.prediction_result.ilike('%CKD Risk%'),
            ~Prediction.prediction_result.ilike('%No CKD%')
        ).count()

        no_ckd_risk_count = Prediction.query.filter(
            Prediction.prediction_result.ilike('%No CKD%')
        ).count()

        # Model usage breakdown
        model_usage_query = db.session.query(
            Prediction.model_name, func.count(Prediction.id)
        ).group_by(Prediction.model_name).all()

        model_usage = [
            {"model_name": name or "Random Forest", "count": count}
            for name, count in model_usage_query
        ]

        # Prediction trends by date
        trends_query = db.session.query(
            func.date(Prediction.created_at).label('date'),
            func.count(Prediction.id).label('count')
        ).group_by(func.date(Prediction.created_at)).order_by(func.date(Prediction.created_at).desc()).limit(14).all()

        prediction_trends = [
            {"date": str(t.date), "count": t.count}
            for t in reversed(trends_query)
        ]

        return jsonify({
            'success': True,
            'total_users': total_users,
            'total_patients': total_patients,
            'total_doctors': total_doctors,
            'total_predictions': total_predictions,
            'ckd_risk_predictions': ckd_risk_count,
            'no_ckd_risk_predictions': no_ckd_risk_count,
            'total_reports': total_reports,
            'prediction_trends': prediction_trends,
            'model_usage': model_usage,
            'counts': {
                'total_users': total_users,
                'total_patients': total_patients,
                'total_doctors': total_doctors,
                'total_predictions': total_predictions,
                'total_reports': total_reports,
                'ckd_risk_predictions': ckd_risk_count,
                'no_ckd_risk_predictions': no_ckd_risk_count
            }
        }), 200

    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err)
        }), 503


@analytics_bp.route('/model-comparison', methods=['GET'])
def get_model_comparison():
    """GET /api/analytics/model-comparison -> Returns stored ML model evaluation comparison metrics"""
    json_path = os.path.join(ML_REPORTS_DIR, 'model_comparison.json')
    if not os.path.exists(json_path):
        return jsonify({
            'success': False,
            'error': 'Model comparison report not found. ML model training must be executed first.'
        }), 444

    try:
        with open(json_path, 'r') as f:
            evaluations = json.load(f)

        return jsonify({
            'success': True,
            'title': 'Model Evaluation Results',
            'selected_model': 'Random Forest',
            'selection_criterion': 'Prioritizing Recall (1.0000 sensitivity for CKD risk detection) and F1-Score (0.9637) to minimize false negatives in medical screening.',
            'evaluations': evaluations
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to read model comparison metrics: {str(e)}'
        }), 500
