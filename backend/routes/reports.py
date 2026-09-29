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
from utils.security import token_required, roles_required
from utils.access import can_access_patient, current_user, resolve_report, forbidden, accessible_patient_ids_query
from services.notification_service import notify_patient_record

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')

@reports_bp.route('', methods=['GET'])
@reports_bp.route('/', methods=['GET'])
@token_required
def get_reports():
    """GET /api/reports -> Admin: all reports. Doctor: assigned patients' reports. Patient: own reports."""
    try:
        query = Report.query
        scope = accessible_patient_ids_query(current_user())
        if scope is not None:
            query = query.filter(Report.patient_id.in_(scope))
        reports = query.order_by(Report.created_at.desc()).all()
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
@token_required
@roles_required('doctor', 'admin')
def create_report_for_prediction(prediction_id):
    """
    POST /api/reports/<prediction_id>  (Doctor/Admin only — patients cannot create or modify reports)
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
        if not can_access_patient(current_user(), patient_record):
            return forbidden('This patient is not assigned to you.')
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

        db.session.flush()
        notify_patient_record(
            patient_record, 'report', 'New report available',
            f'A new CKD risk report ({report_code}) has been added to your record.',
            f'/patient/reports/{report_record.id}',
        )
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


def _load_accessible_report(report_id):
    """Returns (report, None) or (None, error_response). Enforces ownership for patients."""
    report = resolve_report(report_id)
    if not report:
        return None, (jsonify({'success': False, 'error': f'Report with ID {report_id} not found.'}), 404)
    patient = db.session.get(Patient, report.patient_id)
    if not can_access_patient(current_user(), patient):
        if current_user().role == 'doctor':
            return None, forbidden('This patient is not assigned to you.')
        return None, forbidden('You can only access your own reports.')
    return report, None


@reports_bp.route('/<report_id>', methods=['GET'])
@token_required
def get_report_by_id(report_id):
    """GET /api/reports/<report_id> -> Get single report details (owner patient or Doctor/Admin)"""
    try:
        report, err = _load_accessible_report(report_id)
        if err:
            return err
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


import re
from datetime import datetime, timezone, timedelta

IST = timezone(timedelta(hours=5, minutes=30))

def get_report_download_filename(patient_record, user_record=None, now_dt=None):
    """
    Generates dynamic download filename in format:
    {PatientName}_CKD_Report_{YYYY-MM-DD}_{HH-MM-SS}.pdf
    
    Uses local India time (IST / Asia-Kolkata, UTC+5:30).
    Replaces spaces and unsafe characters with underscores.
    """
    raw_name = ""
    if user_record and getattr(user_record, 'name', None):
        raw_name = user_record.name
    elif patient_record and getattr(patient_record, 'name', None):
        raw_name = patient_record.name
    elif patient_record and getattr(patient_record, 'patient_id', None):
        raw_name = patient_record.patient_id
    else:
        raw_name = "Patient"

    clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', str(raw_name))
    clean_name = re.sub(r'_+', '_', clean_name).strip('_')
    if not clean_name:
        clean_name = "Patient"

    if now_dt is None:
        now_dt = datetime.now(IST)
    elif now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=timezone.utc).astimezone(IST)

    timestamp_str = now_dt.strftime('%Y-%m-%d_%H-%M-%S')
    return f"{clean_name}_CKD_Report_{timestamp_str}.pdf"


@reports_bp.route('/<report_id>/download', methods=['GET'])
@token_required
def download_report_file(report_id):
    """GET /api/reports/<report_id>/download -> Download PDF (owner patient or Doctor/Admin)"""
    try:
        report, err = _load_accessible_report(report_id)
        if err:
            return err

        pdf_path = report.report_path
        patient_record = db.session.get(Patient, report.patient_id) if report.patient_id else None
        user_record = db.session.get(User, patient_record.user_id) if patient_record and patient_record.user_id else None

        if not pdf_path or not os.path.exists(pdf_path):
            prediction_record = db.session.get(Prediction, report.prediction_id) if report.prediction_id else None
            if prediction_record is None:
                return jsonify({'success': False, 'error': f'Report file for ID {report_id} does not exist on server.'}), 404
            pdf_res = generate_pdf_report(prediction_record, patient_info=patient_record, user_info=user_record)
            pdf_path = pdf_res['report_path']
            if report.report_path != pdf_path:
                report.report_path = pdf_path
                db.session.commit()

        download_filename = get_report_download_filename(patient_record, user_record)

        response = send_file(
            pdf_path,
            as_attachment=True,
            download_name=download_filename,
            mimetype='application/pdf'
        )
        response.headers['Access-Control-Expose-Headers'] = 'Content-Disposition'
        return response

    except (OperationalError, DatabaseError) as err:
        return jsonify({
            'success': False,
            'error': 'MySQL database is unavailable.',
            'details': str(err)
        }), 503
    except Exception as e:
        print(f"[ERROR] Report PDF for {report_id} could not be prepared ({e.__class__.__name__}).")
        return jsonify({'success': False, 'error': 'The report PDF could not be prepared right now. Please try again later.'}), 500
