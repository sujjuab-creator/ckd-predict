from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError, IntegrityError
from extensions import db
from models.user import User
from models.patient import Patient
from models.prediction import Prediction
from utils.security import hash_password, token_required, roles_required
from services.auth_service import normalize_doctor_code, is_valid_doctor_code

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def _resolve_active_doctor(raw_id):
    """Returns (doctor_user, error_message). raw_id is a users.id of a doctor."""
    try:
        doctor_user_id = int(raw_id)
    except (TypeError, ValueError):
        return None, 'Treating doctor must be a valid doctor account.'
    doctor = db.session.get(User, doctor_user_id)
    if not doctor or doctor.role != 'doctor':
        return None, 'Treating doctor must be a valid doctor account.'
    if doctor.status != 'Active':
        return None, 'The selected treating doctor account is inactive.'
    return doctor, None


def _user_admin_dict(user, patients_by_user=None):
    data = user.to_dict()
    if user.role == 'patient':
        record = (patients_by_user or {}).get(user.id) if patients_by_user is not None else Patient.query.filter_by(user_id=user.id).first()
        data['patient_id'] = record.patient_id if record else None
        data['treating_doctor_id'] = record.doctor_id if record else None
    return data

@admin_bp.route('/users', methods=['GET'])
@token_required
@roles_required('admin')
def get_all_users():
    """GET /api/admin/users -> List all users for Admin management"""
    try:
        role_filter = request.args.get('role', '').strip().lower()
        search_query = request.args.get('search', '').strip().lower()

        query = User.query

        if role_filter in ['admin', 'doctor', 'patient']:
            query = query.filter(User.role == role_filter)

        users = query.order_by(User.created_at.desc()).all()

        if search_query:
            users = [
                u for u in users
                if search_query in u.name.lower() or search_query in u.email.lower()
            ]

        patients_by_user = {p.user_id: p for p in Patient.query.filter(Patient.user_id.isnot(None)).all()}
        return jsonify({
            'success': True,
            'count': len(users),
            'users': [_user_admin_dict(u, patients_by_user) for u in users]
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'Database unavailable.',
            'details': str(err)
        }), 503


@admin_bp.route('/users', methods=['POST'])
@token_required
@roles_required('admin')
def create_user():
    """
    POST /api/admin/users
    Admin creates a Doctor or Patient account with initial credentials.
    Enforces strict role validations, email uniqueness, and prevents creation of additional Admin accounts.
    """
    data = request.get_json() or {}

    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = (data.get('role') or '').strip().lower()
    specialty_or_department = (data.get('specialty_or_department') or '').strip() or (data.get('specialty') or '').strip() or (data.get('department') or '').strip()
    phone = (data.get('phone') or '').strip()

    if not name or not email or not password or not role:
        return jsonify({
            'success': False,
            'error': 'Name, email, password, and role are required.'
        }), 400

    if role not in ['doctor', 'patient']:
        if role == 'admin':
            return jsonify({
                'success': False,
                'error': 'Creation of additional Admin accounts is strictly prohibited. Exactly one Admin account is permitted.'
            }), 400
        return jsonify({
            'success': False,
            'error': 'Invalid role specified. Only Doctor and Patient accounts can be created by Administrator.'
        }), 400

    # 1. Enforce unique email across ALL users (lowercase)
    existing_email = User.query.filter(User.email.ilike(email)).first()
    if existing_email:
        return jsonify({
            'success': False,
            'error': f'An account with email address "{email}" already exists.'
        }), 409

    doctor_code = None
    if role == 'doctor':
        doctor_code = normalize_doctor_code(data.get('doctor_id') or data.get('doctor_code'))
        if doctor_code:
            if not is_valid_doctor_code(doctor_code):
                return jsonify({'success': False, 'error': 'Doctor ID must be 3-50 characters using letters, numbers, "-", "_" or "/".'}), 400
            if User.query.filter(User.doctor_code == doctor_code).first():
                return jsonify({'success': False, 'error': f'Doctor ID "{doctor_code}" is already registered.'}), 409
        else:
            doctor_code = None

    treating_doctor = None
    raw_treating = data.get('treating_doctor_id')
    if role == 'patient' and raw_treating not in (None, ''):
        treating_doctor, doc_err = _resolve_active_doctor(raw_treating)
        if doc_err:
            return jsonify({'success': False, 'error': doc_err}), 400

    try:
        # Create user
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(password),
            role=role,
            status='Active',
            is_temporary_password=True,
            specialty_or_department=specialty_or_department or None,
            phone=phone or None,
            doctor_code=doctor_code
        )
        db.session.add(user)
        db.session.commit()

        # If role is patient, automatically create associated Patient record
        if role == 'patient':
            patient_record = Patient(
                user_id=user.id,
                patient_id=f"PAT-{user.id:04d}",
                gender=data.get('gender', 'Unspecified'),
                doctor_id=treating_doctor.id if treating_doctor else None
            )
            db.session.add(patient_record)
            db.session.commit()

        return jsonify({
            'success': True,
            'message': f'{role.capitalize()} account created successfully for {name}.',
            'user': _user_admin_dict(user)
        }), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'An account with this email or Doctor ID already exists.'}), 409
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database operation failed.',
            'details': str(err)
        }), 503


@admin_bp.route('/users/<int:user_id>', methods=['PUT'])
@token_required
@roles_required('admin')
def update_user(user_id):
    """PUT /api/admin/users/<user_id> -> Admin edits account details"""
    data = request.get_json() or {}
    user = db.session.get(User, user_id)

    if not user:
        return jsonify({'success': False, 'error': f'User with ID {user_id} not found.'}), 404

    # `or ''` guards against JSON nulls (e.g. phone: null) sent by the edit form
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    specialty_or_department = (data.get('specialty_or_department') or '').strip() or (data.get('specialty') or '').strip() or (data.get('department') or '').strip()
    status = (data.get('status') or '').strip()

    if email and email != user.email:
        existing = User.query.filter(User.email.ilike(email)).first()
        if existing and existing.id != user.id:
            return jsonify({'success': False, 'error': f'Email "{email}" is already used by another account.'}), 409
        user.email = email

    if name:
        user.name = name
    if phone:
        user.phone = phone
    if specialty_or_department:
        user.specialty_or_department = specialty_or_department
    if user.role == 'doctor' and ('doctor_id' in data or 'doctor_code' in data):
        new_code = normalize_doctor_code(data.get('doctor_id') if 'doctor_id' in data else data.get('doctor_code'))
        if new_code:
            if not is_valid_doctor_code(new_code):
                return jsonify({'success': False, 'error': 'Doctor ID must be 3-50 characters using letters, numbers, "-", "_" or "/".'}), 400
            clash = User.query.filter(User.doctor_code == new_code, User.id != user.id).first()
            if clash:
                return jsonify({'success': False, 'error': f'Doctor ID "{new_code}" is already registered.'}), 409
            user.doctor_code = new_code

    if user.role == 'patient' and 'treating_doctor_id' in data:
        record = Patient.query.filter_by(user_id=user.id).first()
        raw_treating = data.get('treating_doctor_id')
        if raw_treating in (None, ''):
            if record:
                record.doctor_id = None
        elif record and str(record.doctor_id) == str(raw_treating):
            pass  # unchanged assignment
        else:
            treating_doctor, doc_err = _resolve_active_doctor(raw_treating)
            if doc_err:
                return jsonify({'success': False, 'error': doc_err}), 400
            if record:
                record.doctor_id = treating_doctor.id

    if status in ['Active', 'Inactive']:
        if user.role == 'admin' and status == 'Inactive':
            return jsonify({'success': False, 'error': 'The Administrator account cannot be deactivated.'}), 400
        user.status = status

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Account details updated for {user.name}.',
            'user': _user_admin_dict(user)
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503


@admin_bp.route('/users/<int:user_id>/reset-password', methods=['POST'])
@token_required
@roles_required('admin')
def reset_user_password(user_id):
    """POST /api/admin/users/<user_id>/reset-password -> Reset user password to temporary password"""
    data = request.get_json() or {}
    new_password = data.get('new_password', '').strip()

    if not new_password:
        return jsonify({'success': False, 'error': 'New temporary password is required.'}), 400

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': f'User with ID {user_id} not found.'}), 404

    try:
        user.password_hash = hash_password(new_password)
        user.is_temporary_password = True
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f'Temporary password successfully updated for {user.name}.'
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503


@admin_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@token_required
@roles_required('admin')
def toggle_user_status(user_id):
    """POST /api/admin/users/<user_id>/toggle-status -> Activate or deactivate account"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': f'User with ID {user_id} not found.'}), 404

    if user.role == 'admin':
        return jsonify({'success': False, 'error': 'The System Administrator account cannot be deactivated.'}), 400

    user.status = 'Inactive' if user.status == 'Active' else 'Active'

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Account status changed to {user.status} for {user.name}.',
            'status': user.status
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503


@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@token_required
@roles_required('admin')
def delete_user(user_id):
    """DELETE /api/admin/users/<user_id> -> Admin deletes a user account"""
    user = db.session.get(User, user_id)
    if not user:
        return jsonify({'success': False, 'error': f'User with ID {user_id} not found.'}), 404

    if user.role == 'admin':
        return jsonify({'success': False, 'error': 'The System Administrator account cannot be deleted.'}), 400

    try:
        if user.role == 'doctor':
            # Keep patient records; only remove the treating-doctor link
            Patient.query.filter_by(doctor_id=user.id).update({'doctor_id': None})
            # Keep predictions for the audit trail; only clear the reference to the deleted account
            Prediction.query.filter_by(doctor_user_id=user.id).update({'doctor_user_id': None})
        db.session.delete(user)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'User {user.name} removed successfully.'
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503
