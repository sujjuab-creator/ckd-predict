import os
from datetime import timedelta
from html import escape

from flask import Blueprint, request, jsonify
from sqlalchemy.exc import OperationalError, DatabaseError, IntegrityError
from extensions import db
from models.user import User
from models.patient import Patient
from models.auth_tokens import EmailOTP, PasswordResetToken
from services.notification_service import notify
from utils.security import hash_password, verify_password, generate_token, token_required, roles_required
from services import auth_service as auth
from services.email_service import send_email, email_available, EmailNotConfigured, EmailDeliveryError

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

GENERIC_OTP_MESSAGE = 'If this email can be used for registration, a verification code has been sent. Please check your inbox.'
GENERIC_RESET_MESSAGE = 'If an active account exists for this email, a password reset link has been sent.'


def _email_unavailable_response():
    return jsonify({
        'success': False,
        'error': 'Email service is not configured on the server. Please contact the hospital administrator.',
        'code': 'email_not_configured',
    }), 503


def _rate_limited(message, retry_after):
    res = jsonify({'success': False, 'error': message, 'retry_after_seconds': retry_after})
    res.headers['Retry-After'] = str(retry_after)
    return res, 429


# ---------------------------------------------------------------------------
# Email templates (no secrets beyond the OTP/link are included; nothing is logged)
# ---------------------------------------------------------------------------
def _otp_email(otp, role):
    minutes = int(auth.OTP_TTL.total_seconds() // 60)
    text = (
        f'Your CKD PREDICT verification code is: {otp}\n\n'
        f'Use it to finish creating your {role} account. The code expires in {minutes} minutes '
        f'and can only be used once.\n\n'
        'If you did not request this, you can ignore this email.'
    )
    html = (
        '<div style="font-family:Arial,sans-serif;color:#0b1f3a">'
        '<h2 style="color:#047857">CKD PREDICT email verification</h2>'
        f'<p>Use this code to finish creating your {escape(role)} account:</p>'
        f'<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{escape(otp)}</p>'
        f'<p>The code expires in {minutes} minutes and can only be used once.</p>'
        '<p style="color:#64748b">If you did not request this, you can ignore this email.</p></div>'
    )
    return 'Your CKD PREDICT verification code', text, html


def _existing_account_email():
    text = (
        'Someone (hopefully you) tried to create a new CKD PREDICT account with this email address, '
        'but an account already exists for it.\n\n'
        'Please sign in instead, or use "Forgot Password" if you cannot remember your password.\n\n'
        'If this was not you, no action is needed.'
    )
    html = (
        '<div style="font-family:Arial,sans-serif;color:#0b1f3a">'
        '<h2 style="color:#047857">You already have a CKD PREDICT account</h2>'
        '<p>Someone tried to create a new account with this email address, but one already exists.</p>'
        '<p>Please sign in instead, or use <b>Forgot Password</b>.</p>'
        '<p style="color:#64748b">If this was not you, no action is needed.</p></div>'
    )
    return 'CKD PREDICT sign-up attempt', text, html


def _reset_email(link):
    minutes = int(auth.RESET_TOKEN_TTL.total_seconds() // 60)
    text = (
        'We received a request to reset your CKD PREDICT password.\n\n'
        f'Open this link to choose a new password (valid for {minutes} minutes, single use):\n{link}\n\n'
        'If you did not request this, you can ignore this email; your password will not change.'
    )
    html = (
        '<div style="font-family:Arial,sans-serif;color:#0b1f3a">'
        '<h2 style="color:#047857">Reset your CKD PREDICT password</h2>'
        f'<p><a href="{escape(link)}" style="background:#059669;color:#fff;padding:10px 18px;'
        'border-radius:8px;text-decoration:none">Choose a new password</a></p>'
        f'<p>This link is valid for {minutes} minutes and can be used once.</p>'
        '<p style="color:#64748b">If you did not request this, you can ignore this email.</p></div>'
    )
    return 'Reset your CKD PREDICT password', text, html


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    """
    POST /api/auth/register
    Role-dispatching registration kept for compatibility. Only Patient
    self-registration (with verified email OTP) is allowed. Doctor accounts are
    created by the hospital Administrator, and Admin accounts can never be
    created through public registration.
    """
    data = request.get_json(silent=True) or {}
    role = (data.get('role') or '').strip().lower()
    if role == 'patient':
        return _register_patient(data)
    if role == 'doctor':
        return _doctor_self_registration_disabled()
    if role == 'admin':
        return jsonify({'success': False, 'error': 'Admin accounts cannot be registered publicly.'}), 403
    return jsonify({'success': False, 'error': 'Role must be "patient".'}), 400


@auth_bp.route('/register/patient', methods=['POST'])
def register_patient():
    """POST /api/auth/register/patient -> create a Patient after verified email OTP."""
    return _register_patient(request.get_json(silent=True) or {})


DOCTOR_SELF_REGISTRATION_DISABLED = ('Doctor accounts are created by the hospital administrator. '
                                     'Please contact the administrator for your sign-in credentials.')


def _doctor_self_registration_disabled():
    return jsonify({'success': False, 'error': DOCTOR_SELF_REGISTRATION_DISABLED,
                    'code': 'doctor_self_registration_disabled'}), 403


@auth_bp.route('/register/doctor', methods=['POST'])
def register_doctor():
    """
    POST /api/auth/register/doctor -> always 403.
    Doctors cannot create their own accounts; the Admin creates them (POST /api/admin/users).
    """
    return _doctor_self_registration_disabled()


def _find_verified_registration(email, purpose, token):
    if not token:
        return None
    record = EmailOTP.query.filter_by(
        email=email,
        purpose=purpose,
        registration_token_hash=auth.hash_token(token),
        registration_used=False,
    ).first()
    if not record or not record.registration_expires_at or record.registration_expires_at < auth.utcnow():
        return None
    return record


def _common_registration_checks(data, purpose):
    """Validates fields shared by patient/doctor registration. Returns (values, error_response)."""
    email = auth.normalize_email(data.get('email'))
    name = (data.get('name') or data.get('full_name') or '').strip()
    password = data.get('password') or ''
    confirm = data.get('confirm_password')
    token = (data.get('verification_token') or '').strip()

    if not auth.is_valid_email(email):
        return None, (jsonify({'success': False, 'error': 'A valid email address is required.'}), 400)
    if len(name) < 2 or len(name) > 100:
        return None, (jsonify({'success': False, 'error': 'Full name must be between 2 and 100 characters.'}), 400)
    problem = auth.password_problem(password)
    if problem:
        return None, (jsonify({'success': False, 'error': problem}), 400)
    if confirm is not None and confirm != password:
        return None, (jsonify({'success': False, 'error': 'Passwords do not match.'}), 400)

    record = _find_verified_registration(email, purpose, token)
    if not record:
        return None, (jsonify({
            'success': False,
            'error': 'Email verification is required. Please verify your email with a new code and try again.',
            'code': 'verification_required',
        }), 403)

    if User.query.filter(User.email.ilike(email)).first():
        return None, (jsonify({'success': False, 'error': 'An account with this email already exists. Please sign in instead.'}), 409)

    return {'email': email, 'name': name, 'password': password, 'record': record}, None


def _register_patient(data):
    try:
        values, err = _common_registration_checks(data, 'patient_signup')
        if err:
            return err

        raw_doc = data.get('treating_doctor_id', data.get('doctor_user_id'))
        try:
            doctor_user_id = int(raw_doc)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'error': 'Please select your treating doctor.'}), 400

        doctor = db.session.get(User, doctor_user_id)
        if not doctor or doctor.role != 'doctor' or doctor.status != 'Active':
            return jsonify({'success': False, 'error': 'The selected doctor is not available. Please choose another doctor.'}), 400

        user = User(
            name=values['name'],
            email=values['email'],
            password_hash=hash_password(values['password']),
            role='patient',
            status='Active',
            is_temporary_password=False,
            phone=(data.get('phone') or '').strip() or None,
        )
        db.session.add(user)
        db.session.flush()

        gender = (data.get('gender') or '').strip() or 'Unspecified'
        db.session.add(Patient(user_id=user.id, patient_id=f'PAT-{user.id:04d}', gender=gender[:20], doctor_id=doctor.id))
        values['record'].registration_used = True
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Patient account created successfully. You can now sign in.',
            'user': user.to_dict(),
        }), 201
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'An account with this email already exists. Please sign in instead.'}), 409
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503


# ---------------------------------------------------------------------------
# Email OTP
# ---------------------------------------------------------------------------
@auth_bp.route('/send-otp', methods=['POST'])
def send_otp():
    """
    POST /api/auth/send-otp  { "email": "...", "purpose": "patient_signup" }
    (Doctor self-registration is disabled, so "doctor_signup" codes are refused with 403.)
    Sends a one-time code by email. The response never contains the code and
    does not reveal whether the email already has an account.
    """
    data = request.get_json(silent=True) or {}
    email = auth.normalize_email(data.get('email'))
    purpose = (data.get('purpose') or '').strip().lower()

    if purpose == 'doctor_signup':
        return _doctor_self_registration_disabled()
    if purpose not in auth.SIGNUP_PURPOSES:
        return jsonify({'success': False, 'error': 'Invalid purpose. Use "patient_signup".'}), 400
    if not auth.is_valid_email(email):
        return jsonify({'success': False, 'error': 'A valid email address is required.'}), 400
    if not email_available():
        return _email_unavailable_response()

    now = auth.utcnow()
    hour_ago = now - timedelta(hours=1)
    ip = auth.client_ip()

    try:
        latest = EmailOTP.query.filter_by(email=email, purpose=purpose).order_by(EmailOTP.created_at.desc()).first()
        if latest and latest.created_at > now - auth.OTP_RESEND_COOLDOWN:
            return _rate_limited('Please wait before requesting another code.',
                                 auth.seconds_until(latest.created_at + auth.OTP_RESEND_COOLDOWN))

        sent_to_email = EmailOTP.query.filter(EmailOTP.email == email, EmailOTP.created_at > hour_ago).count()
        if sent_to_email >= auth.OTP_MAX_SENDS_PER_EMAIL_PER_HOUR:
            return _rate_limited('Too many codes requested for this email. Please try again later.', 3600)

        if ip:
            sent_from_ip = EmailOTP.query.filter(EmailOTP.request_ip == ip, EmailOTP.created_at > hour_ago).count()
            if sent_from_ip >= auth.OTP_MAX_SENDS_PER_IP_PER_HOUR:
                return _rate_limited('Too many verification requests. Please try again later.', 3600)

        # Invalidate any earlier unused codes for this email/purpose
        EmailOTP.query.filter_by(email=email, purpose=purpose, used=False).update({'used': True})

        account_exists = User.query.filter(User.email.ilike(email)).first() is not None
        otp = auth.generate_otp()
        record = EmailOTP(
            email=email,
            purpose=purpose,
            # For existing accounts no usable code is stored (random hash) and the record is
            # marked used; it still counts towards rate limits.
            otp_hash=auth.hash_otp(email, purpose, otp) if not account_exists else auth.hash_token(auth.new_token()),
            expires_at=now + auth.OTP_TTL,
            used=account_exists,
            request_ip=ip or None,
            created_at=now,
        )
        db.session.add(record)
        db.session.flush()

        if account_exists:
            subject, text, html = _existing_account_email()
        else:
            subject, text, html = _otp_email(otp, auth.SIGNUP_PURPOSES[purpose])
        send_email(email, subject, text, html)
        db.session.commit()
    except EmailNotConfigured:
        db.session.rollback()
        return _email_unavailable_response()
    except EmailDeliveryError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'The verification email could not be sent. Please try again later.'}), 502
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503

    return jsonify({
        'success': True,
        'message': GENERIC_OTP_MESSAGE,
        'expires_in_seconds': int(auth.OTP_TTL.total_seconds()),
        'resend_after_seconds': int(auth.OTP_RESEND_COOLDOWN.total_seconds()),
    }), 200


@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """
    POST /api/auth/verify-otp  { "email", "otp", "purpose" }
    On success returns { verified: true, verification_token } — the token must be
    sent to the registration endpoint, which re-checks it server-side.
    """
    data = request.get_json(silent=True) or {}
    email = auth.normalize_email(data.get('email'))
    purpose = (data.get('purpose') or '').strip().lower()
    otp = str(data.get('otp') or '').strip()

    if purpose == 'doctor_signup':
        return jsonify({'success': False, 'verified': False, 'error': DOCTOR_SELF_REGISTRATION_DISABLED,
                        'code': 'doctor_self_registration_disabled'}), 403
    if purpose not in auth.SIGNUP_PURPOSES:
        return jsonify({'success': False, 'verified': False, 'error': 'Invalid purpose.'}), 400
    if not auth.is_valid_email(email) or not otp.isdigit() or len(otp) != 6:
        return jsonify({'success': False, 'verified': False, 'error': 'Enter the 6-digit code sent to your email.'}), 400

    invalid = (jsonify({'success': False, 'verified': False,
                        'error': 'The code is invalid or has expired. Please request a new code.'}), 400)
    try:
        record = EmailOTP.query.filter_by(email=email, purpose=purpose, used=False) \
            .order_by(EmailOTP.created_at.desc()).first()
        if not record:
            return invalid

        now = auth.utcnow()
        if record.expires_at < now:
            record.used = True
            db.session.commit()
            return invalid

        if record.attempts >= auth.OTP_MAX_ATTEMPTS:
            record.used = True
            db.session.commit()
            return jsonify({'success': False, 'verified': False,
                            'error': 'Too many incorrect attempts. Please request a new code.'}), 429

        if not auth.otp_matches(record, email, purpose, otp):
            record.attempts += 1
            remaining = auth.OTP_MAX_ATTEMPTS - record.attempts
            if remaining <= 0:
                record.used = True
            db.session.commit()
            if remaining <= 0:
                return jsonify({'success': False, 'verified': False,
                                'error': 'Too many incorrect attempts. Please request a new code.'}), 429
            return jsonify({'success': False, 'verified': False,
                            'error': 'Incorrect code. Please try again.', 'attempts_remaining': remaining}), 400

        token = auth.new_token()
        record.used = True
        record.verified_at = now
        record.registration_token_hash = auth.hash_token(token)
        record.registration_expires_at = now + auth.REGISTRATION_TOKEN_TTL
        record.registration_used = False
        db.session.commit()
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return jsonify({'success': False, 'verified': False, 'error': 'Database is unavailable. Please try again later.'}), 503

    return jsonify({
        'success': True,
        'verified': True,
        'verification_token': token,
        'expires_in_seconds': int(auth.REGISTRATION_TOKEN_TTL.total_seconds()),
    }), 200


# ---------------------------------------------------------------------------
# Doctor list & care-team relationship
# ---------------------------------------------------------------------------
@auth_bp.route('/doctors', methods=['GET'])
def public_doctors():
    """GET /api/auth/doctors -> active doctors for treating-doctor selection (safe fields only)."""
    try:
        doctors = User.query.filter_by(role='doctor', status='Active').order_by(User.name.asc()).all()
        return jsonify({'success': True, 'count': len(doctors), 'doctors': [d.to_public_doctor_dict() for d in doctors]}), 200
    except (OperationalError, DatabaseError):
        return jsonify({'success': False, 'error': 'Database is unavailable.'}), 503


@auth_bp.route('/me/doctor', methods=['GET'])
@token_required
@roles_required('patient')
def my_doctor():
    """GET /api/auth/me/doctor -> the signed-in patient's treating doctor (or null)."""
    user = request.current_user
    patient = Patient.query.filter_by(user_id=user.id).first()
    doctor = db.session.get(User, patient.doctor_id) if patient and patient.doctor_id else None
    if doctor and doctor.role != 'doctor':
        doctor = None
    return jsonify({
        'success': True,
        'patient': patient.to_dict() if patient else None,
        'doctor': ({**doctor.to_public_doctor_dict(), 'status': doctor.status} if doctor else None),
    }), 200


@auth_bp.route('/me/patients', methods=['GET'])
@token_required
@roles_required('doctor')
def my_patients():
    """GET /api/auth/me/patients -> patients whose treating doctor is the signed-in doctor."""
    doctor = request.current_user
    patients = Patient.query.filter_by(doctor_id=doctor.id).order_by(Patient.created_at.desc()).all()
    result = []
    for p in patients:
        owner = db.session.get(User, p.user_id) if p.user_id else None
        result.append({
            **p.to_dict(),
            'name': owner.name if owner else None,
            'email': owner.email if owner else None,
            'status': owner.status if owner else None,
        })
    return jsonify({'success': True, 'count': len(result), 'patients': result}), 200


# ---------------------------------------------------------------------------
# Login & account (unchanged behaviour)
# ---------------------------------------------------------------------------
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
        if not user and email in ('admin@predict.com', 'admin@ckdpredict.com'):
            user = User.query.filter_by(role='admin').first()

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
        notify(user.id, 'security', 'Password changed',
               'Your account password was changed. If this was not you, contact the hospital administrator.')
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


# ---------------------------------------------------------------------------
# Password reset by email
# ---------------------------------------------------------------------------
def _frontend_base_url():
    base = (os.getenv('FRONTEND_URL') or os.getenv('PASSWORD_RESET_URL_BASE') or '').strip().rstrip('/')
    return base


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    """
    POST /api/auth/forgot-password { "email": "..." }
    Always returns the same generic response so account existence is not revealed.
    """
    data = request.get_json(silent=True) or {}
    email = auth.normalize_email(data.get('email'))
    if not auth.is_valid_email(email):
        return jsonify({'success': False, 'error': 'A valid email address is required.'}), 400
    if not email_available() or not _frontend_base_url():
        return jsonify({
            'success': False,
            'error': 'Password reset by email is not configured on the server. Please contact the hospital administrator.',
            'code': 'email_not_configured',
        }), 503

    generic = (jsonify({'success': True, 'message': GENERIC_RESET_MESSAGE}), 200)
    now = auth.utcnow()
    hour_ago = now - timedelta(hours=1)
    ip = auth.client_ip()

    try:
        if ip and PasswordResetToken.query.filter(PasswordResetToken.request_ip == ip,
                                                  PasswordResetToken.created_at > hour_ago).count() >= auth.RESET_MAX_PER_IP_PER_HOUR:
            return _rate_limited('Too many reset requests. Please try again later.', 3600)

        user = User.query.filter(User.email.ilike(email)).first()
        if not user or user.status != 'Active':
            return generic

        recent = PasswordResetToken.query.filter(PasswordResetToken.user_id == user.id,
                                                 PasswordResetToken.created_at > hour_ago).count()
        if recent >= auth.RESET_MAX_PER_EMAIL_PER_HOUR:
            return generic  # silently ignore to avoid revealing the account

        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({'used': True})
        token = auth.new_token()
        db.session.add(PasswordResetToken(
            user_id=user.id,
            token_hash=auth.hash_token(token),
            expires_at=now + auth.RESET_TOKEN_TTL,
            request_ip=ip or None,
            created_at=now,
        ))
        db.session.flush()
        link = f'{_frontend_base_url()}/#/reset-password/{token}'
        subject, text, html = _reset_email(link)
        send_email(user.email, subject, text, html)
        db.session.commit()
    except EmailNotConfigured:
        db.session.rollback()
        return _email_unavailable_response()
    except EmailDeliveryError:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'The reset email could not be sent. Please try again later.'}), 502
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503

    return generic


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    """POST /api/auth/reset-password { "token": "...", "new_password": "..." }"""
    data = request.get_json(silent=True) or {}
    token = (data.get('token') or '').strip()
    new_password = data.get('new_password') or ''

    problem = auth.password_problem(new_password)
    if problem:
        return jsonify({'success': False, 'error': problem}), 400

    invalid = (jsonify({'success': False, 'error': 'This reset link is invalid or has expired. Please request a new one.'}), 400)
    if not token:
        return invalid
    try:
        record = PasswordResetToken.query.filter_by(token_hash=auth.hash_token(token)).first()
        if not record or record.used or record.expires_at < auth.utcnow():
            return invalid
        user = db.session.get(User, record.user_id)
        if not user or user.status != 'Active':
            record.used = True
            db.session.commit()
            return invalid

        user.password_hash = hash_password(new_password)
        user.is_temporary_password = False
        record.used = True
        PasswordResetToken.query.filter_by(user_id=user.id, used=False).update({'used': True})
        notify(user.id, 'security', 'Password reset',
               'Your password was reset using an email link. If this was not you, contact the hospital administrator.')
        db.session.commit()
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503

    return jsonify({'success': True, 'message': 'Your password has been reset. You can now sign in.'}), 200
