from datetime import datetime
from extensions import db

class Prediction(db.Model):
    __tablename__ = 'predictions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    prediction_result = db.Column(db.String(50), nullable=False)
    prediction_probability = db.Column(db.Float, nullable=True)
    model_name = db.Column(db.String(100), nullable=True, default='Random Forest Classifier')
    input_features = db.Column(db.JSON, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Audit fields (nullable: records created before these columns existed keep NULL)
    doctor_user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True)
    source = db.Column(db.String(30), nullable=True)            # manual | single_report | batch
    report_reference = db.Column(db.String(255), nullable=True)  # uploaded file name / "file.csv row 12"
    batch_id = db.Column(db.String(40), nullable=True, index=True)
    model_version = db.Column(db.String(60), nullable=True)      # model artifact training timestamp

    # Relationships
    reports = db.relationship('Report', backref='prediction', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'prediction_id': f"PRED-{self.id:04d}",
            'patient_id': self.patient_id,
            'prediction_result': self.prediction_result,
            'prediction_probability': self.prediction_probability,
            'probability': self.prediction_probability,
            'model_name': self.model_name,
            'input_features': self.input_features,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'doctor_user_id': self.doctor_user_id,
            'source': self.source,
            'report_reference': self.report_reference,
            'batch_id': self.batch_id,
            'model_version': self.model_version,
        }

