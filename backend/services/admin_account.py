"""
Create or update THE single System Administrator account.

Used by the one-off command `python manage_admin.py` (see that file). The password
is only ever stored as a hash (utils.security.hash_password) and is never printed,
logged or returned.
"""
from extensions import db
from models.user import User
from utils.security import hash_password

MIN_ADMIN_PASSWORD_LENGTH = 8


class AdminAccountError(Exception):
    """Raised when the admin account cannot be created/updated safely."""


def upsert_single_admin(email, password, name=None):
    """
    Ensure exactly one admin exists with the given email and password.

    - If an admin exists, that account is updated (email, password hash, role, status).
    - If no admin exists, one is created.
    - Patient and Doctor accounts are never modified; if the email already belongs to one,
      nothing is changed and AdminAccountError is raised.
    Returns (action, user) where action is "created" or "updated". Caller must be inside an app context.
    """
    email = (email or '').strip().lower()
    if not email or '@' not in email:
        raise AdminAccountError('A valid admin email address is required.')
    if not password or not password.strip() or len(password) < MIN_ADMIN_PASSWORD_LENGTH:
        raise AdminAccountError(f'The admin password must be at least {MIN_ADMIN_PASSWORD_LENGTH} characters.')

    admins = User.query.filter_by(role='admin').order_by(User.id).all()
    if len(admins) > 1:
        raise AdminAccountError(
            f'{len(admins)} admin accounts exist; resolve this manually so exactly one admin remains. Nothing was changed.')

    owner = User.query.filter(User.email.ilike(email)).first()
    if owner is not None and owner.role != 'admin':
        raise AdminAccountError(
            f'{email} already belongs to a {owner.role} account, which is left unchanged. Choose a different admin email.')

    if admins:
        admin, action = admins[0], 'updated'
    else:
        admin, action = User(name=(name or 'System Administrator').strip() or 'System Administrator',
                             specialty_or_department='Chief Medical Data Officer'), 'created'
        db.session.add(admin)

    admin.email = email
    admin.password_hash = hash_password(password)
    admin.role = 'admin'
    admin.status = 'Active'
    admin.is_temporary_password = False
    if name and name.strip():
        admin.name = name.strip()
    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        raise
    return action, admin
