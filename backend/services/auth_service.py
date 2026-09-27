"""
Helpers for email OTP verification, self-registration and password reset.

Security properties:
- OTPs are 6 digits from `secrets` (CSPRNG) and stored only as an HMAC-SHA256
  keyed with SECRET_KEY; they are never logged or returned by the API.
- OTPs expire after OTP_TTL, are single-use and allow at most OTP_MAX_ATTEMPTS
  guesses. Sends are rate limited per email and per client IP.
- A successful verification issues a random registration token (stored as a
  SHA-256 hash) that the registration endpoint must present; the backend never
  trusts a client-side "verified" flag.
- Password-reset tokens are random, stored hashed, single-use and short-lived.
"""
import hashlib
import hmac
import re
import secrets
from datetime import datetime, timedelta

from flask import current_app, request

OTP_TTL = timedelta(minutes=10)
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN = timedelta(seconds=60)
OTP_MAX_SENDS_PER_EMAIL_PER_HOUR = 5
OTP_MAX_SENDS_PER_IP_PER_HOUR = 20
REGISTRATION_TOKEN_TTL = timedelta(minutes=30)

RESET_TOKEN_TTL = timedelta(minutes=30)
RESET_MAX_PER_EMAIL_PER_HOUR = 3
RESET_MAX_PER_IP_PER_HOUR = 10

SIGNUP_PURPOSES = {'patient_signup': 'patient', 'doctor_signup': 'doctor'}

EMAIL_RE = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
DOCTOR_CODE_RE = re.compile(r'^[A-Z0-9][A-Z0-9\-_/]{2,49}$')


def utcnow():
    return datetime.utcnow()


def normalize_email(value):
    return (value or '').strip().lower()


def is_valid_email(email):
    return bool(email) and len(email) <= 120 and bool(EMAIL_RE.match(email))


def normalize_doctor_code(value):
    return (value or '').strip().upper()


def is_valid_doctor_code(code):
    return bool(DOCTOR_CODE_RE.match(code or ''))


def password_problem(password):
    """Returns an error message if the password is too weak, else None."""
    if not password or len(password) < 8:
        return 'Password must be at least 8 characters long.'
    if len(password) > 128:
        return 'Password must be at most 128 characters long.'
    if not re.search(r'[A-Za-z]', password) or not re.search(r'\d', password):
        return 'Password must contain at least one letter and one number.'
    return None


def generate_otp():
    return f'{secrets.randbelow(10 ** 6):06d}'


def _secret():
    return (current_app.config.get('SECRET_KEY') or '').encode('utf-8')


def hash_otp(email, purpose, otp):
    msg = f'{purpose}:{email}:{otp}'.encode('utf-8')
    return hmac.new(_secret(), msg, hashlib.sha256).hexdigest()


def otp_matches(record, email, purpose, otp):
    return hmac.compare_digest(record.otp_hash, hash_otp(email, purpose, str(otp).strip()))


def new_token():
    return secrets.token_urlsafe(32)


def hash_token(token):
    return hashlib.sha256((token or '').encode('utf-8')).hexdigest()


def client_ip():
    try:
        route = request.access_route
        return (route[0] if route else request.remote_addr or '')[:64]
    except RuntimeError:
        return ''


def seconds_until(dt):
    return max(1, int((dt - utcnow()).total_seconds()))
