from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.user import User
from models.patient import Patient
from utils.security import hash_password, token_required, roles_required

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

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

        return jsonify({
            'success': True,
            'count': len(users),
            'users': [u.to_dict() for u in users]
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

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', '').strip().lower()
    specialty_or_department = data.get('specialty_or_department', '').strip() or data.get('specialty', '').strip() or data.get('department', '').strip()
    phone = data.get('phone', '').strip()

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
            phone=phone or None
        )
        db.session.add(user)
        db.session.commit()

        # If role is patient, automatically create associated Patient record
        if role == 'patient':
            patient_record = Patient(
                user_id=user.id,
                patient_id=f"PAT-{user.id:04d}",
                gender=data.get('gender', 'Unspecified')
            )
            db.session.add(patient_record)
            db.session.commit()

        return jsonify({
            'success': True,
            'message': f'{role.capitalize()} account created successfully for {name}.',
            'user': user.to_dict()
        }), 201
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

    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    phone = data.get('phone', '').strip()
    specialty_or_department = data.get('specialty_or_department', '').strip() or data.get('specialty', '').strip() or data.get('department', '').strip()
    status = data.get('status', '').strip()

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
    if status in ['Active', 'Inactive']:
        if user.role == 'admin' and status == 'Inactive':
            return jsonify({'success': False, 'error': 'The Administrator account cannot be deactivated.'}), 400
        user.status = status

    try:
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'Account details updated for {user.name}.',
            'user': user.to_dict()
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
        db.session.delete(user)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': f'User {user.name} removed successfully.'
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503
