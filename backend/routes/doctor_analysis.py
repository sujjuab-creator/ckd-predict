"""
Doctor Patient Analysis & Batch Analysis API (Doctor/Admin only; patients receive 403).

  POST /api/doctor/analysis/report          upload a report for ONE assigned patient -> extracted values (nothing saved)
  POST /api/doctor/analysis/predict         doctor-reviewed values -> validated prediction saved (source single_report/manual)
  POST /api/doctor/analysis/batch/validate  CSV/XLSX -> per-row validation (nothing saved)
  POST /api/doctor/analysis/batch/predict   rows -> re-validated server-side, valid rows predicted & saved (source batch)
  GET  /api/doctor/analysis/history         predictions of the caller's accessible patients with source/doctor/report info

Doctors only ever see / act on patients assigned to them (utils.access); admins keep system-wide access.
SHAP (POST /api/predictions/<id>/explanation) and PDF reports (POST /api/reports/<id>) reuse the existing endpoints.
"""
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import OperationalError, DatabaseError

from extensions import db
from models.patient import Patient
from models.prediction import Prediction
from models.report import Report
from models.user import User
from ml.feature_schema import validate_features
from services import analysis_service as svc
from services.report_extraction import extract_report, ReportExtractionError
from utils.access import current_user, accessible_patient_ids_query, forbidden, resolve_patient
from utils.security import token_required, roles_required

doctor_analysis_bp = Blueprint('doctor_analysis', __name__, url_prefix='/api/doctor/analysis')

ALLOWED_SINGLE_SOURCES = ('single_report', 'manual')


def _db_error():
    db.session.rollback()
    return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503


def _patient_or_error(patient_ref):
    """(patient, None) or (None, response). Unknown and unassigned patients get the same answer."""
    if patient_ref in (None, ''):
        return None, (jsonify({'success': False, 'error': 'Select a patient.'}), 400)
    patient = svc.accessible_patient(current_user(), patient_ref)
    if patient is None:
        if resolve_patient(patient_ref) is not None:
            return None, forbidden('This patient is not assigned to you.')
        return None, (jsonify({'success': False, 'error': 'Patient not found.'}), 404)
    return patient, None


# ---------------------------------------------------------------------------
# Single patient analysis
# ---------------------------------------------------------------------------
@doctor_analysis_bp.route('/report', methods=['POST'])
@token_required
@roles_required('doctor', 'admin')
def analyze_report():
    """multipart/form-data: patient_id, file -> extracted feature values for review. Nothing is stored."""
    try:
        patient, err = _patient_or_error(request.form.get('patient_id'))
        if err:
            return err
        upload = request.files.get('file')
        if upload is None or not upload.filename:
            return jsonify({'success': False, 'error': 'Choose a report file to upload.'}), 400
        data = upload.read(svc.MAX_BATCH_BYTES + 1)
        try:
            extraction = extract_report(upload.filename, data)
        except ReportExtractionError as exc:
            return jsonify({'success': False, 'error': str(exc)}), 422
        return jsonify({
            'success': True,
            'patient': svc.patient_summary(patient),
            'file_name': upload.filename[:200],
            **extraction,
            'notice': 'Values were read automatically and must be checked by the doctor before any prediction. '
                      'Missing values are never filled in automatically.',
        }), 200
    except (OperationalError, DatabaseError):
        return _db_error()


@doctor_analysis_bp.route('/predict', methods=['POST'])
@token_required
@roles_required('doctor', 'admin')
def predict_single():
    """JSON {patient_id, features {name: value}, source, report_reference} -> saved prediction or 422 with field issues."""
    data = request.get_json(silent=True) or {}
    try:
        patient, err = _patient_or_error(data.get('patient_id'))
        if err:
            return err
        source = data.get('source') or 'single_report'
        if source not in ALLOWED_SINGLE_SOURCES:
            return jsonify({'success': False, 'error': 'Invalid source.'}), 400
        features = data.get('features')
        if not isinstance(features, dict):
            return jsonify({'success': False, 'error': 'features must be an object of feature values.'}), 400

        validation = validate_features(features)
        if not validation['complete']:
            status = svc.STATUS_NEEDS_REVIEW if validation['invalid'] else svc.STATUS_INCOMPLETE
            return jsonify({
                'success': False,
                'status': status,
                'status_label': svc.STATUS_LABELS[status],
                'error': ('Some values need review.' if validation['invalid']
                          else f'{len(validation["missing"])} required value(s) are missing.')
                         + ' No prediction was made - missing values are never filled in automatically.',
                'fields': validation['fields'],
                'missing': validation['missing'],
                'invalid': validation['invalid'],
            }), 422

        try:
            record, _result = svc.create_prediction(
                patient, validation['values'], current_user(), source,
                report_reference=data.get('report_reference'))
            db.session.commit()
        except (OperationalError, DatabaseError):
            return _db_error()
        except Exception as exc:  # model failure
            db.session.rollback()
            return jsonify({'success': False, 'status': 'failed', 'error': f'Prediction failed ({exc.__class__.__name__}).'}), 500

        view = svc.prediction_view(record)
        return jsonify({
            'success': True,
            'prediction': view,
            'patient': svc.patient_summary(patient),
            'warnings': [f for f in validation['fields'] if f['status'] == 'warning'],
            'headline': svc.RESULT_HEADLINE,
            'disclaimer': svc.MEDICAL_DISCLAIMER,
        }), 201
    except (OperationalError, DatabaseError):
        return _db_error()


# ---------------------------------------------------------------------------
# Batch analysis
# ---------------------------------------------------------------------------
@doctor_analysis_bp.route('/batch/validate', methods=['POST'])
@token_required
@roles_required('doctor', 'admin')
def batch_validate():
    """
    multipart/form-data: file (CSV/XLSX)  -> per-row validation and summary, or
    JSON {rows: [...]}                    -> re-validate rows the doctor corrected in the UI.
    Nothing is stored.
    """
    if request.is_json:
        rows = (request.get_json(silent=True) or {}).get('rows')
        if not isinstance(rows, list) or not rows:
            return jsonify({'success': False, 'error': 'No rows to validate.'}), 400
        if len(rows) > svc.MAX_BATCH_ROWS:
            return jsonify({'success': False, 'error': f'At most {svc.MAX_BATCH_ROWS} rows per batch.'}), 400
        try:
            user = current_user()
            seen = {}
            results = [svc.validate_row(row, user, seen)[0] for row in rows if isinstance(row, dict)]
            return jsonify({'success': True, 'rows': results, 'summary': svc.summarize(results)}), 200
        except (OperationalError, DatabaseError):
            return _db_error()

    upload = request.files.get('file')
    if upload is None or not upload.filename:
        return jsonify({'success': False, 'error': 'Choose a CSV or Excel file to upload.'}), 400
    try:
        rows, info = svc.parse_batch_file(upload.filename, upload.read(svc.MAX_BATCH_BYTES + 1))
    except svc.BatchFileError as exc:
        return jsonify({'success': False, 'error': str(exc)}), 422
    try:
        user = current_user()
        seen = {}
        results = [svc.validate_row(row, user, seen)[0] for row in rows]
        return jsonify({'success': True, 'file_name': upload.filename[:200], 'rows': results,
                        'summary': svc.summarize(results), **info}), 200
    except (OperationalError, DatabaseError):
        return _db_error()


@doctor_analysis_bp.route('/batch/predict', methods=['POST'])
@token_required
@roles_required('doctor', 'admin')
def batch_predict():
    """
    JSON {file_name, rows: [{row_number, patient_ref, features}]}.
    Every row is validated again; only valid rows of accessible patients reach the model.
    Each saved prediction is committed on its own, so one failure never cancels the others.
    """
    data = request.get_json(silent=True) or {}
    rows = data.get('rows')
    if not isinstance(rows, list) or not rows:
        return jsonify({'success': False, 'error': 'No rows to analyse.'}), 400
    if len(rows) > svc.MAX_BATCH_ROWS:
        return jsonify({'success': False, 'error': f'At most {svc.MAX_BATCH_ROWS} rows per batch.'}), 400
    file_name = str(data.get('file_name') or 'batch upload')[:150]
    user = current_user()
    batch_id = svc.new_batch_id()
    results, seen = [], {}
    try:
        for row in rows:
            if not isinstance(row, dict):
                continue
            result, validation, patient = svc.validate_row(row, user, seen)
            if result['status'] == svc.STATUS_VALID:
                try:
                    record, _ = svc.create_prediction(
                        patient, validation['values'], user, 'batch',
                        report_reference=f"{file_name} (row {result['row_number']})", batch_id=batch_id)
                    db.session.commit()
                    view = svc.prediction_view(record, reports={})
                    result.update(status='predicted', status_label=view['prediction_result'],
                                  reason='Prediction saved', prediction=view)
                except (OperationalError, DatabaseError):
                    db.session.rollback()
                    result.update(status='failed', status_label='Failed', reason='Database error while saving')
                except Exception as exc:
                    db.session.rollback()
                    result.update(status='failed', status_label='Failed',
                                  reason=f'Model error ({exc.__class__.__name__})')
            results.append(result)
    except (OperationalError, DatabaseError):
        return _db_error()

    predicted = [r for r in results if r['status'] == 'predicted']
    summary = {
        'total': len(results),
        'predicted': len(predicted),
        'ckd_risk': sum(1 for r in predicted if r['prediction']['prediction_result'] == 'CKD Risk'),
        'no_ckd_risk': sum(1 for r in predicted if r['prediction']['prediction_result'] == 'No CKD Risk'),
        'incomplete': sum(1 for r in results if r['status'] == svc.STATUS_INCOMPLETE),
        'needs_review': sum(1 for r in results if r['status'] == svc.STATUS_NEEDS_REVIEW),
        'invalid': sum(1 for r in results if r['status'] == svc.STATUS_INVALID),
        'failed': sum(1 for r in results if r['status'] == 'failed'),
    }
    return jsonify({'success': True, 'batch_id': batch_id if predicted else None, 'file_name': file_name,
                    'rows': results, 'summary': summary, 'headline': svc.RESULT_HEADLINE,
                    'disclaimer': svc.MEDICAL_DISCLAIMER}), 200


# ---------------------------------------------------------------------------
# History
# ---------------------------------------------------------------------------
@doctor_analysis_bp.route('/history', methods=['GET'])
@token_required
@roles_required('doctor', 'admin')
def history():
    """Predictions for the caller's accessible patients (doctor: assigned only; admin: all), newest first.
    Optional filters: source (single_report|batch|manual), batch_id, patient_id."""
    try:
        query = Prediction.query
        scope = accessible_patient_ids_query(current_user())
        if scope is not None:
            query = query.filter(Prediction.patient_id.in_(scope))
        source = (request.args.get('source') or '').strip()
        if source == 'manual':
            query = query.filter((Prediction.source == 'manual') | (Prediction.source.is_(None)))
        elif source in ('single_report', 'batch'):
            query = query.filter(Prediction.source == source)
        if request.args.get('batch_id'):
            query = query.filter(Prediction.batch_id == request.args.get('batch_id'))
        if request.args.get('patient_id'):
            patient = resolve_patient(request.args.get('patient_id'))
            query = query.filter(Prediction.patient_id == (patient.id if patient else -1))
        limit = min(max(int(request.args.get('limit') or 500), 1), 2000)
        preds = query.order_by(Prediction.created_at.desc(), Prediction.id.desc()).limit(limit).all()

        patient_ids = {p.patient_id for p in preds}
        patients = {p.id: p for p in Patient.query.filter(Patient.id.in_(patient_ids)).all()} if patient_ids else {}
        user_ids = {p.user_id for p in patients.values() if p.user_id} | {p.doctor_user_id for p in preds if p.doctor_user_id}
        users = {u.id: u for u in User.query.filter(User.id.in_(user_ids)).all()} if user_ids else {}
        pred_ids = [p.id for p in preds]
        reports = {r.prediction_id: r for r in Report.query.filter(Report.prediction_id.in_(pred_ids)).all()} if pred_ids else {}
        items = [svc.prediction_view(p, patients, users, reports) for p in preds]
        return jsonify({'success': True, 'count': len(items), 'predictions': items}), 200
    except (OperationalError, DatabaseError):
        return _db_error()
    except ValueError:
        return jsonify({'success': False, 'error': 'Invalid query parameter.'}), 400
