import os
from functools import wraps
from flask import request, jsonify, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

def hash_password(password: str) -> str:
    """Hash password using Werkzeug security helper."""
    return generate_password_hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """Verify raw password against stored password hash."""
    return check_password_hash(password_hash, password)

def generate_token(user, secret_key: str = None) -> str:
    """Generate a signed auth token containing user ID, role, and email."""
    if not secret_key:
        secret_key = current_app.config.get('SECRET_KEY', 'default_secret')
    serializer = URLSafeTimedSerializer(secret_key)
    return serializer.dumps({
        'user_id': user.id,
        'email': user.email.lower().strip(),
        'role': user.role
    }, salt='ckd-predict-auth')

def decode_token(token: str, secret_key: str = None, max_age: int = 604800) -> dict:
    """Decode and verify signed auth token. Default max_age = 7 days."""
    if not secret_key:
        secret_key = current_app.config.get('SECRET_KEY', 'default_secret')
    serializer = URLSafeTimedSerializer(secret_key)
    try:
        data = serializer.loads(token, salt='ckd-predict-auth', max_age=max_age)
        return data
    except (BadSignature, SignatureExpired, Exception):
        return None

def token_required(f):
    """Decorator to enforce authenticated session via Bearer token."""
    @wraps(f)
    def decorated(*args, **kwargs):
        from models.user import User
        auth_header = request.headers.get('Authorization', '')
        token = None
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
        elif 'X-Access-Token' in request.headers:
            token = request.headers.get('X-Access-Token')

        if not token:
            return jsonify({'success': False, 'error': 'Authentication token is required.'}), 401

        payload = decode_token(token)
        if not payload:
            return jsonify({'success': False, 'error': 'Invalid or expired authentication token.'}), 401

        user = db.session.get(User, payload.get('user_id'))
        if not user or getattr(user, 'status', 'Active') != 'Active':
            return jsonify({'success': False, 'error': 'User account is inactive or disabled.'}), 401

        request.current_user = user
        return f(*args, **kwargs)
    return decorated

def roles_required(*allowed_roles):
    """Decorator to enforce role-based access control (RBAC)."""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if not hasattr(request, 'current_user') or not request.current_user:
                return jsonify({'success': False, 'error': 'Authentication required.'}), 401
            if request.current_user.role not in allowed_roles:
                return jsonify({'success': False, 'error': f'Access denied. Role must be one of: {list(allowed_roles)}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
