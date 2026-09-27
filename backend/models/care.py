from datetime import datetime
from extensions import db


class DoctorReview(db.Model):
    """A doctor's written review of a patient's result/report. Patients can only read them."""
    __tablename__ = 'doctor_reviews'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id', ondelete='CASCADE'), nullable=False, index=True)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    prediction_id = db.Column(db.Integer, db.ForeignKey('predictions.id', ondelete='SET NULL'), nullable=True, index=True)
    report_id = db.Column(db.Integer, db.ForeignKey('reports.id', ondelete='SET NULL'), nullable=True, index=True)
    review_text = db.Column(db.Text, nullable=False)
    recommendations = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    def to_dict(self, doctor=None, report=None):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'doctor_user_id': self.doctor_user_id,
            'doctor_name': doctor.name if doctor else None,
            'doctor_id': getattr(doctor, 'doctor_code', None) if doctor else None,
            'prediction_id': self.prediction_id,
            'formatted_prediction_id': f"PRED-{self.prediction_id:04d}" if self.prediction_id else None,
            'report_id': self.report_id,
            'report_code': (report.report_id if report else None),
            'review_text': self.review_text,
            'recommendations': self.recommendations,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class Notification(db.Model):
    """In-app notification for a single user account."""
    __tablename__ = 'notifications'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    type = db.Column(db.String(30), nullable=False, default='info')  # report | review | security | info
    title = db.Column(db.String(150), nullable=False)
    message = db.Column(db.String(500), nullable=True)
    link = db.Column(db.String(200), nullable=True)  # frontend hash route, e.g. /patient/reports/3
    is_read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False, index=True)

    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'message': self.message,
            'link': self.link,
            'is_read': bool(self.is_read),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
