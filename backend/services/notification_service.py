"""
Creates in-app notifications. Callers commit the surrounding transaction.
Notifications never contain passwords, OTP codes, tokens or medical values.
"""
from extensions import db
from models.care import Notification


def notify(user_id, type_, title, message=None, link=None):
    if not user_id:
        return None
    note = Notification(user_id=user_id, type=type_, title=title[:150],
                        message=(message or '')[:500] or None, link=(link or '')[:200] or None)
    db.session.add(note)
    return note


def notify_patient_record(patient, type_, title, message=None, link=None):
    """Notify the user account that owns a Patient record (if any)."""
    if patient is None or not patient.user_id:
        return None
    return notify(patient.user_id, type_, title, message, link)
