from flask import Blueprint, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from models.patient import Patient
from models.prediction import Prediction
from utils.security import token_required, roles_required
from utils.access import can_access_patient, current_user, forbidden, accessible_patient_ids_query

patients_bp = Blueprint('patients', __name__, url_prefix='/api/patients')

@patients_bp.route('', methods=['GET'])
@patients_bp.route('/', methods=['GET'])
@token_required
@roles_required('doctor', 'admin')
def get_patients():
    """GET /api/patients -> Admin: all patients. Doctor: only patients assigned to them."""
    try:
        query = Patient.query
        scope = accessible_patient_ids_query(current_user())
        if scope is not None:
            query = query.filter(Patient.id.in_(scope))
        patients = query.all()
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
@token_required
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

        # Admin: any record. Doctor: assigned patients only. Patient: own record only.
        if not can_access_patient(current_user(), patient):
            if current_user().role == 'doctor':
                return forbidden('This patient is not assigned to you.')
            return forbidden('You can only access your own patient record.')

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
@token_required
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

        # Admin: any record. Doctor: assigned patients only. Patient: own record only.
        if not can_access_patient(current_user(), patient):
            if current_user().role == 'doctor':
                return forbidden('This patient is not assigned to you.')
            return forbidden('You can only access your own patient record.')

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

