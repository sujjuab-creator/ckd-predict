from datetime import datetime
from extensions import db


class EmailOTP(db.Model):
    """
    One-time passcodes sent by email for self-registration.

    The OTP itself is never stored: only an HMAC of it (keyed with SECRET_KEY).
    After a successful verification a random registration token is issued; only
    its SHA-256 hash is stored, and it is consumed when the account is created.
    """
    __tablename__ = 'email_otps'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(120), nullable=False, index=True)
    purpose = db.Column(db.String(30), nullable=False, index=True)  # patient_signup | doctor_signup
    otp_hash = db.Column(db.String(128), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    attempts = db.Column(db.Integer, nullable=False, default=0)
    used = db.Column(db.Boolean, nullable=False, default=False)          # OTP already consumed or invalidated
    verified_at = db.Column(db.DateTime, nullable=True)
    registration_token_hash = db.Column(db.String(128), nullable=True, index=True)
    registration_expires_at = db.Column(db.DateTime, nullable=True)
    registration_used = db.Column(db.Boolean, nullable=False, default=False)
    request_ip = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)


class PasswordResetToken(db.Model):
    """Single-use, expiring password reset tokens (only a SHA-256 hash is stored)."""
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = db.Column(db.String(128), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, nullable=False, default=False)
    request_ip = db.Column(db.String(64), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)
