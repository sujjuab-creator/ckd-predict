import os
import sys
from flask import Blueprint, jsonify, request, send_file
from sqlalchemy.exc import OperationalError, DatabaseError
from extensions import db
from models.report import Report
from models.prediction import Prediction
from models.patient import Patient
from models.user import User

# Ensure services directory is in sys.path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
services_dir = os.path.join(backend_dir, 'services')
for p in [backend_dir, services_dir]:
    if p not in sys.path:
        sys.path.insert(0, p)

from report_service import generate_pdf_report

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('', methods=['GET'])
@reports_bp.route('/', methods=['GET'])
def get_reports():
    """GET /api/reports -> List all reports"""
    try:
        reports = Report.query.order_by(Report.created_at.desc()).all()
        return jsonify({
            'success': True,
            'count': len(reports),
            'reports': [r.to_dict() for r in reports]
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err)
        }), 503


@reports_bp.route('/<prediction_id>', methods=['POST'])
def create_report_for_prediction(prediction_id):
    """
    POST /api/reports/<prediction_id>
    Generates a professional PDF report for the specified saved prediction and stores the Report record in MySQL.
    """
    raw_pred_id = prediction_id
    if str(prediction_id).upper().startswith('PRED-'):
        raw_pred_id = str(prediction_id).upper().replace('PRED-', '')

    try:
        prediction_record = None
        if str(raw_pred_id).isdigit():
            prediction_record = Prediction.query.get(int(raw_pred_id))

        if not prediction_record:
            return jsonify({
                'success': False,
                'error': f'Prediction with ID {prediction_id} not found.'
            }), 404

        # Fetch associated patient & user information
        patient_record = Patient.query.get(prediction_record.patient_id)
        user_record = User.query.get(patient_record.user_id) if patient_record and patient_record.user_id else None

        # Generate PDF report using reportlab service
        pdf_res = generate_pdf_report(prediction_record, patient_info=patient_record, user_info=user_record)
        
        report_code = pdf_res['report_id']
        pdf_path = pdf_res['report_path']

        # Check existing report for prediction or create new record
        report_record = Report.query.filter_by(prediction_id=prediction_record.id).first()
        if not report_record:
            report_record = Report(
                report_id=report_code,
                patient_id=prediction_record.patient_id,
                prediction_id=prediction_record.id,
                report_path=pdf_path,
                status='generated'
            )
            db.session.add(report_record)
        else:
            report_record.report_id = report_code
            report_record.report_path = pdf_path
            report_record.status = 'generated'

        db.session.commit()

        return jsonify({
            'success': True,
            'report_id': report_code,
            'prediction_id': prediction_id,
            'formatted_prediction_id': f"PRED-{prediction_record.id:04d}",
            'status': 'generated',
            'download_url': f"/api/reports/{report_code}/download",
            'message': 'Medical report generated successfully'
        }), 201

    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': 'Database operation failed while saving report.',
            'details': str(err)
        }), 500
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'error': f'Report PDF generation failed: {str(e)}'
        }), 500


@reports_bp.route('/<report_id>', methods=['GET'])
def get_report_by_id(report_id):
    """GET /api/reports/<report_id> -> Get single report details"""
    try:
        raw_id = report_id
        if str(report_id).upper().startswith('RPT-'):
            raw_id = str(report_id).upper().replace('RPT-', '')

        report = None
        if str(raw_id).isdigit():
            report = Report.query.get(int(raw_id))

        if not report:
            report = Report.query.filter_by(report_id=report_id).first()

        if not report:
            return jsonify({'success': False, 'error': f'Report with ID {report_id} not found.'}), 404

        return jsonify({
            'success': True,
            'report': report.to_dict()
        }), 200
    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err)
        }), 503


@reports_bp.route('/<report_id>/download', methods=['GET'])
def download_report_file(report_id):
    """GET /api/reports/<report_id>/download -> Download generated PDF file"""
    try:
        raw_id = report_id
        if str(report_id).upper().startswith('RPT-'):
            raw_id = str(report_id).upper().replace('RPT-', '')

        report = None
        if str(raw_id).isdigit():
            report = Report.query.get(int(raw_id))

        if not report:
            report = Report.query.filter_by(report_id=report_id).first()

        if not report:
            return jsonify({'success': False, 'error': f'Report record with ID {report_id} not found.'}), 404

        pdf_path = report.report_path
        if not pdf_path or not os.path.exists(pdf_path):
            return jsonify({'success': False, 'error': f'Report file for ID {report_id} does not exist on server.'}), 404

        return send_file(
            pdf_path,
            as_attachment=True,
            download_name=os.path.basename(pdf_path),
            mimetype='application/pdf'
        )

    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err)
        }), 503
