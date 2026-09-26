import sys
import os
from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.prediction import Prediction
from models.patient import Patient

# Add ml and services directories to sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ml_dir = os.path.join(backend_dir, 'ml')
services_dir = os.path.join(backend_dir, 'services')

for path in [ml_dir, services_dir, backend_dir]:
    if path not in sys.path:
        sys.path.insert(0, path)

try:
    from predict import predict_ckd_risk, MEDICAL_DISCLAIMER
except ImportError:
    from ml.predict import predict_ckd_risk, MEDICAL_DISCLAIMER

try:
    from shap_service import generate_shap_explanation
except ImportError:
    from services.shap_service import generate_shap_explanation

predictions_bp = Blueprint('predictions', __name__, url_prefix='/api/predictions')

@predictions_bp.route('', methods=['GET'])
@predictions_bp.route('/', methods=['GET'])
def get_predictions():
    """GET /api/predictions -> List all system predictions"""
    try:
        predictions = Prediction.query.order_by(Prediction.created_at.desc()).all()
        return jsonify({
            'success': True,
            'count': len(predictions),
            'predictions': [p.to_dict() for p in predictions]
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503


@predictions_bp.route('', methods=['POST'])
@predictions_bp.route('/', methods=['POST'])
def create_prediction():
    """
    POST /api/predictions -> Real ML CKD Risk Inference
    Processes patient feature data through trained Random Forest pipeline and stores in database.
    """
    data = request.get_json() or {}

    try:
        # 1. Execute ML inference pipeline
        ml_result = predict_ckd_risk(data)
        
        patient_db_id = data.get('patient_id') or data.get('patientId')

        # 2. Store prediction record in database
        try:
            target_patient = None
            if patient_db_id:
                if str(patient_db_id).isdigit():
                    target_patient = Patient.query.get(int(patient_db_id))
                if not target_patient:
                    target_patient = Patient.query.filter_by(patient_id=str(patient_db_id)).first()

            # If no specific patient provided, associate with first patient or auto-create patient
            if not target_patient:
                target_patient = Patient.query.first()

            if not target_patient:
                target_patient = Patient(patient_id="PAT-0001")
                db.session.add(target_patient)
                db.session.commit()

            # Create Prediction DB record
            prediction_record = Prediction(
                patient_id=target_patient.id,
                prediction_result=ml_result['prediction_result'],
                prediction_probability=ml_result['prediction_probability'],
                model_name=ml_result['model_name'],
                input_features=data
            )
            db.session.add(prediction_record)
            db.session.commit()
            
            # Format actual database generated prediction ID
            formatted_pred_id = f"PRED-{prediction_record.id:04d}"

            # Only after db.session.commit() succeeds return db_stored=True
            return jsonify({
                'success': True,
                'db_stored': True,
                'prediction_id': formatted_pred_id,
                'prediction': ml_result['prediction'],
                'prediction_result': ml_result['prediction_result'],
                'probability': ml_result['prediction_probability'],
                'prediction_probability': ml_result['prediction_probability'],
                'risk_percentage': ml_result['risk_percentage'],
                'model': ml_result['model_name'],
                'model_name': ml_result['model_name'],
                'disclaimer': MEDICAL_DISCLAIMER
            }), 201

        except Exception as db_err:
            db.session.rollback()
            return jsonify({
                'success': False,
                'db_stored': False,
                'error': f'Database transaction failed: {str(db_err)}'
            }), 500

    except Exception as e:
        return jsonify({
            'success': False,
            'db_stored': False,
            'error': f'Prediction execution failed: {str(e)}'
        }), 500


@predictions_bp.route('/<prediction_id>/explanation', methods=['GET', 'POST'])
def get_prediction_explanation(prediction_id):
    """
    GET/POST /api/predictions/<prediction_id>/explanation
    Retrieves prediction record from database and calculates SHAP feature attribution values.
    """
    req_data = request.get_json(silent=True) or {}
    input_features = req_data.get('input_features')

    raw_id = prediction_id
    if str(prediction_id).upper().startswith('PRED-'):
        raw_id = str(prediction_id).upper().replace('PRED-', '')

    # Fetch prediction record from database using actual ID
    prediction_record = None
    try:
        if str(raw_id).isdigit():
            prediction_record = Prediction.query.get(int(raw_id))
    except (OperationalError, DatabaseError):
        prediction_record = None

    if prediction_record and prediction_record.input_features:
        input_features = prediction_record.input_features

    if not input_features or not isinstance(input_features, dict) or len(input_features) == 0:
        if req_data and isinstance(req_data, dict) and len(req_data) > 0:
            input_features = req_data
        else:
            return jsonify({
                'success': False,
                'error': f'Prediction with ID {prediction_id} not found or missing input features.'
            }), 404

    try:
        explanation = generate_shap_explanation(input_features, top_n=10)
        explanation['prediction_id'] = prediction_id
        return jsonify(explanation), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'SHAP explanation failed: {str(e)}',
            'disclaimer': MEDICAL_DISCLAIMER
        }), 500

