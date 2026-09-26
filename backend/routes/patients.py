from flask import Blueprint, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from models.patient import Patient
from models.prediction import Prediction

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')

@patients_bp.route('', methods=['GET'])
@patients_bp.route('/', methods=['GET'])
def get_patients():
    """GET /api/patients -> List all patients"""
    try:
        patients = Patient.query.all()
        return jsonify({
            'success': True,
            'count': len(patients),
            'patients': [p.to_dict() for p in patients]
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503


@patients_bp.route('/<patient_id>', methods=['GET'])
def get_patient_by_id(patient_id):
    """GET /api/patients/<patient_id> -> Get single patient details"""
    try:
        patient = None
        if patient_id.isdigit():
            patient = Patient.query.get(int(patient_id))
        
        if not patient:
            patient = Patient.query.filter_by(patient_id=patient_id).first()

        if not patient:
            return jsonify({'success': False, 'error': f'Patient with ID {patient_id} not found.'}), 404

        return jsonify({
            'success': True,
            'patient': patient.to_dict()
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503


@patients_bp.route('/<patient_id>/predictions', methods=['GET'])
def get_patient_predictions(patient_id):
    """GET /api/patients/<patient_id>/predictions -> Get predictions for patient"""
    try:
        patient = None
        if patient_id.isdigit():
            patient = Patient.query.get(int(patient_id))
        if not patient:
            patient = Patient.query.filter_by(patient_id=patient_id).first()

        if not patient:
            return jsonify({'success': False, 'error': f'Patient with ID {patient_id} not found.'}), 404

        predictions = Prediction.query.filter_by(patient_id=patient.id).all()
        return jsonify({
            'success': True,
            'patient_id': patient.patient_id,
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

