from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.user import User
from models.patient import Patient
from utils.security import hash_password, verify_password

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'patient').strip().lower()

    if not name or not email or not password:
        return jsonify({'success': False, 'error': 'Name, email, and password are required.'}), 400

    if role == 'admin':
        return jsonify({'success': False, 'error': 'Public registration for Admin role is strictly prohibited.'}), 403

    if role not in ['patient', 'doctor']:
        return jsonify({'success': False, 'error': 'Invalid role specified. Allowed roles: patient, doctor.'}), 400

    try:
        # Check existing user
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            return jsonify({'success': False, 'error': 'An account with this email address already exists.'}), 409

        # Create new User with hashed password
        password_hash = hash_password(password)
        user = User(
            name=name,
            email=email,
            password_hash=password_hash,
            role=role
        )
        db.session.add(user)
        db.session.commit()

        # If role is patient, automatically create Patient record
        if role == 'patient':
            patient_record = Patient(
                user_id=user.id,
                patient_id=f"PAT-{user.id:04d}"
            )
            db.session.add(patient_record)
            db.session.commit()

        return jsonify({
            'success': True,
            'message': f'User registered successfully as {role}.',
            'user': user.to_dict()
        }), 201
    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    selected_role = data.get('role', '').strip().lower()

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required.'}), 400

    try:
        user = User.query.filter_by(email=email).first()
        
        if not user or not verify_password(password, user.password_hash):
            return jsonify({'success': False, 'error': 'Invalid credentials. Please check your email and password.'}), 401

        if selected_role and user.role != selected_role:
            return jsonify({'success': False, 'error': f'Account role mismatch. User is registered as {user.role.upper()}.'}), 401

        return jsonify({
            'success': True,
            'message': 'Login successful.',
            'user': user.to_dict()
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err),
            'configuration_needed': '1. Ensure MySQL Server is running on localhost:3306. 2. Create database ckd_db. 3. Update backend/.env DATABASE_URL.'
        }), 503

