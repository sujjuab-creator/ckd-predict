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
from utils.security import token_required, roles_required
from utils.access import current_user, accessible_patient_ids_query

analytics_bp = Blueprint('analytics', __name__, url_prefix='/api/analytics')

ML_REPORTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml', 'reports'))

@analytics_bp.route('', methods=['GET'])
@analytics_bp.route('/', methods=['GET'])
@token_required
@roles_required('doctor', 'admin')
def get_analytics():
    """
    GET /api/analytics -> database-derived statistics (sign-in required; patients get 403).
    Admin: system-wide. Doctor: aggregate statistics for the doctor's assigned patients only.
    """
    try:
        user = current_user()
        scope = accessible_patient_ids_query(user)  # None = all (admin)

        pred_q = Prediction.query
        report_q = Report.query
        patient_q = Patient.query
        if scope is not None:
            pred_q = pred_q.filter(Prediction.patient_id.in_(scope))
            report_q = report_q.filter(Report.patient_id.in_(scope))
            patient_q = patient_q.filter(Patient.id.in_(scope))

        total_patients = patient_q.count()
        total_predictions = pred_q.count()
        total_reports = report_q.count()

        ckd_risk_count = pred_q.filter(
            Prediction.prediction_result.ilike('%CKD Risk%'),
            ~Prediction.prediction_result.ilike('%No CKD%')
        ).count()

        no_ckd_risk_count = pred_q.filter(
            Prediction.prediction_result.ilike('%No CKD%')
        ).count()

        # Model usage breakdown
        usage_q = db.session.query(Prediction.model_name, func.count(Prediction.id))
        if scope is not None:
            usage_q = usage_q.filter(Prediction.patient_id.in_(scope))
        model_usage_query = usage_q.group_by(Prediction.model_name).all()

        model_usage = [
            {"model_name": name or "Random Forest", "count": count}
            for name, count in model_usage_query
        ]

        # Prediction trends by date
        trends_q = db.session.query(
            func.date(Prediction.created_at).label('date'),
            func.count(Prediction.id).label('count')
        )
        if scope is not None:
            trends_q = trends_q.filter(Prediction.patient_id.in_(scope))
        trends_query = trends_q.group_by(func.date(Prediction.created_at)).order_by(func.date(Prediction.created_at).desc()).limit(14).all()

        prediction_trends = [
            {"date": str(t.date), "count": t.count}
            for t in reversed(trends_query)
        ]

        if user.role != 'admin':
            # Doctor-level view: aggregates over assigned patients only, no system-wide account counts.
            counts = {
                'total_patients': total_patients,
                'total_predictions': total_predictions,
                'total_reports': total_reports,
                'ckd_risk_predictions': ckd_risk_count,
                'no_ckd_risk_predictions': no_ckd_risk_count
            }
            return jsonify({
                'success': True,
                'scope': 'assigned_patients',
                **counts,
                'prediction_trends': prediction_trends,
                'model_usage': model_usage,
                'counts': counts
            }), 200

        total_users = User.query.count()
        total_doctors = User.query.filter_by(role='doctor').count()

        return jsonify({
            'success': True,
            'scope': 'system',
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
@token_required
@roles_required('doctor', 'admin')
def get_model_comparison():
    """
    GET /api/analytics/model-comparison -> stored ML model evaluation metrics (sign-in required).
    Contains only aggregate test-set metrics, no patient data. Doctors/Admins only; patients get 403.
    """
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
