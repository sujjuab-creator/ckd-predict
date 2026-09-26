from werkzeug.security import generate_password_hash, check_password_hash

def hash_password(password: str) -> str:
    """Hash password using Werkzeug security helper."""
    return generate_password_hash(password)

def verify_password(password: str, password_hash: str) -> bool:
    """Verify raw password against stored password hash."""
    return check_password_hash(password_hash, password)
