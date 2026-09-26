from datetime import datetime
from extensions import db

class Report(db.Model):
    __tablename__ = 'reports'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    report_id = db.Column(db.String(50), unique=True, nullable=True, index=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    prediction_id = db.Column(db.Integer, db.ForeignKey('predictions.id'), nullable=True)
    report_path = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(30), nullable=False, default='generated')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        rpt_code = self.report_id or f"RPT-{self.id:04d}"
        pred_code = f"PRED-{self.prediction_id:04d}" if self.prediction_id else "N/A"
        return {
            'id': self.id,
            'report_id': rpt_code,
            'patient_id': self.patient_id,
            'prediction_id': self.prediction_id,
            'formatted_prediction_id': pred_code,
            'report_path': self.report_path,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

