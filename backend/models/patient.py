from datetime import datetime
from extensions import db

class Patient(db.Model):
    __tablename__ = 'patients'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    patient_id = db.Column(db.String(50), unique=True, nullable=False, index=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True)
    # Treating doctor (users.id of an account with role='doctor')
    doctor_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    predictions = db.relationship('Prediction', backref='patient', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='patient', lazy=True, cascade='all, delete-orphan')
    treating_doctor = db.relationship('User', foreign_keys=[doctor_id], lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'patient_id': self.patient_id,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'doctor_id': self.doctor_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
