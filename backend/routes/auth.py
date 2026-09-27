from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.user import User
from models.patient import Patient
from utils.security import hash_password, verify_password, generate_token, token_required

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST /api/auth/register
    Public self-registration is strictly disabled in hospital deployment mode.
    Accounts must be created by the System Administrator.
    """
    return jsonify({
        'success': False,
        'error': 'Public self-registration is disabled. Patient and Doctor accounts must be created by the Hospital Administrator.'
    }), 403


@auth_bp.route('/login', methods=['POST'])
def login():
    """
    POST /api/auth/login
    Authenticates user credentials, verifies account status, and issues signed JWT bearer token.
    """
    data = request.get_json() or {}
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    selected_role = data.get('role', '').strip().lower()

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    try:
        user = User.query.filter(User.email.ilike(email)).first()
        
        if not user or not verify_password(password, user.password_hash):
            return jsonify({'success': False, 'error': 'Invalid credentials. Please check your email and password.'}), 401

        # Check account status
        if getattr(user, 'status', 'Active') != 'Active':
            return jsonify({
                'success': False,
                'error': 'Account is deactivated. Please contact the Hospital Administrator.'
            }), 403

        # Check role mismatch if role was explicitly selected
        if selected_role and user.role != selected_role:
            return jsonify({
                'success': False,
                'error': f'Account role mismatch. Account is registered as {user.role.upper()}.'
            }), 401

        # Issue signed auth token
        token = generate_token(user)

        return jsonify({
            'success': True,
            'message': 'Login successful.',
            'token': token,
            'user': user.to_dict()
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503


@auth_bp.route('/change-password', methods=['POST'])
@token_required
def change_password():
    """
    POST /api/auth/change-password
    Allows logged-in Doctor or Patient to update their temporary password.
    """
    data = request.get_json() or {}
    new_password = data.get('new_password', '').strip()

    if not new_password or len(new_password) < 6:
        return jsonify({
            'success': False,
            'error': 'New password must be at least 6 characters long.'
        }), 400

    user = request.current_user

    try:
        user.password_hash = hash_password(new_password)
        user.is_temporary_password = False
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Password updated successfully.',
            'user': user.to_dict()
        }), 200
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database error', 'details': str(err)}), 503


@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile():
    """GET /api/auth/me -> Get current authenticated user details"""
    return jsonify({
        'success': True,
        'user': request.current_user.to_dict()
    }), 200
