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
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

