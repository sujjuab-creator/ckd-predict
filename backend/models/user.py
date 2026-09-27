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
    # Unique hospital/registration identifier for Doctor accounts (exposed as "doctor_id" in the API).
    # Nullable so existing doctors created before this field existed keep working.
    doctor_code = db.Column(db.String(50), unique=True, nullable=True, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)

    # Relationship to the Patient record(s) owned by this user account.
    # foreign_keys is explicit because patients also reference users through doctor_id.
    patients = db.relationship(
        'Patient',
        backref='user',
        lazy=True,
        cascade='all, delete-orphan',
        foreign_keys='Patient.user_id',
    )

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
            'doctor_id': getattr(self, 'doctor_code', None),
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

    def to_public_doctor_dict(self):
        """Minimal, non-sensitive fields used for treating-doctor selection."""
        return {
            'id': self.id,
            'doctor_id': self.doctor_code,
            'name': self.name,
            'specialty': self.specialty_or_department,
        }
