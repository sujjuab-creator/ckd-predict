from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='patient') # admin, doctor, patient
    status = db.Column(db.String(20), nullable=False, default='Active') # Active, Inactive
    is_temporary_password = db.Column(db.Boolean, default=True)
    specialty_or_department = db.Column(db.String(100), nullable=True)
    phone = db.Column(db.String(30), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationship to Patient
    patients = db.relationship('Patient', backref='user', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email.lower() if self.email else '',
            'role': self.role,
            'status': getattr(self, 'status', 'Active') or 'Active',
            'is_temporary_password': bool(getattr(self, 'is_temporary_password', False)),
            'specialty_or_department': getattr(self, 'specialty_or_department', None),
            'phone': getattr(self, 'phone', None),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
