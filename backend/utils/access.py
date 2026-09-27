"""
Ownership / role helpers shared by patient-data routes.

Rules:
- admin: may access every patient record.
- doctor: may access ONLY patients assigned to them (patients.doctor_id == the
  doctor's user id) -- their records, predictions, reports and reviews.
- patient: may access ONLY their own patient record and the predictions,
  reports, reviews and notifications that belong to it.
"""
from flask import jsonify, request

from extensions import db
from models.patient import Patient
from models.prediction import Prediction
from models.report import Report

STAFF_ROLES = ('doctor', 'admin')


def current_user():
    return getattr(request, 'current_user', None)


def patient_record_for_user(user):
    """The Patient row owned by a patient user account (or None)."""
    if not user or user.role != 'patient':
        return None
    return Patient.query.filter_by(user_id=user.id).first()


def resolve_patient(patient_id):
    """Find a patient by numeric DB id or by patient code (e.g. PAT-0005)."""
    if patient_id is None:
        return None
    raw = str(patient_id).strip()
    patient = None
    if raw.isdigit():
        patient = db.session.get(Patient, int(raw))
    if not patient:
        patient = Patient.query.filter_by(patient_id=raw).first()
    return patient


def resolve_prediction(prediction_id):
    raw = str(prediction_id or '').upper().replace('PRED-', '')
    return db.session.get(Prediction, int(raw)) if raw.isdigit() else None


def resolve_report(report_id):
    raw = str(report_id or '')
    stripped = raw.upper().replace('RPT-', '')
    report = db.session.get(Report, int(stripped)) if stripped.isdigit() else None
    if not report:
        report = Report.query.filter_by(report_id=raw).first()
    return report


def can_access_patient(user, patient):
    """True when `user` may access data belonging to `patient`."""
    if not user or not patient:
        return False
    if user.role == 'admin':
        return True
    if user.role == 'doctor':
        return patient.doctor_id is not None and patient.doctor_id == user.id
    if user.role == 'patient':
        return patient.user_id == user.id
    return False


def accessible_patient_ids_query(user):
    """
    SQL subquery of patient ids the user may access, or None meaning "all" (admin).
    Used to scope list endpoints so unrelated patients are never returned.
    """
    if user and user.role == 'admin':
        return None
    q = db.session.query(Patient.id)
    if user and user.role == 'doctor':
        return q.filter(Patient.doctor_id == user.id)
    if user and user.role == 'patient':
        return q.filter(Patient.user_id == user.id)
    return q.filter(db.false())


def unassigned_patient_forbidden():
    return forbidden('This patient is not assigned to you.')


def forbidden(message=None):
    return jsonify({'success': False, 'error': message or 'You do not have permission to access this resource.'}), 403


def not_found(message='Resource not found.'):
    return jsonify({'success': False, 'error': message}), 404
