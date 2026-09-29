"""
Patient portal (read-only), doctor reviews and in-app notifications.

- /api/patient/*        Patient role only; always scoped to the caller's own patient record.
- /api/reviews          Doctors write reviews for their assigned patients; patients read their own.
- /api/notifications    Any signed-in user; always scoped to the caller's own notifications.
"""
from flask import Blueprint, jsonify, request
from sqlalchemy.exc import OperationalError, DatabaseError

from extensions import db
from models.user import User
from models.patient import Patient
from models.prediction import Prediction
from models.report import Report
from models.care import DoctorReview, Notification
from utils.security import token_required, roles_required
from utils.access import (
    current_user, patient_record_for_user, resolve_patient, resolve_prediction, resolve_report,
    can_access_patient, forbidden, not_found,
)
from services.notification_service import notify_patient_record

patient_bp = Blueprint('patient_portal', __name__, url_prefix='/api/patient')
reviews_bp = Blueprint('reviews', __name__, url_prefix='/api/reviews')
notifications_bp = Blueprint('notifications', __name__, url_prefix='/api/notifications')

MAX_REVIEW_CHARS = 5000


def _db_unavailable():
    return jsonify({'success': False, 'error': 'Database is unavailable. Please try again later.'}), 503


def _doctor_summary(doctor):
    if not doctor or doctor.role != 'doctor':
        return None
    return {
        'id': doctor.id,
        'name': doctor.name,
        'doctor_id': doctor.doctor_code,
        'specialty': doctor.specialty_or_department,
        'email': doctor.email,
        'phone': doctor.phone,
        'status': doctor.status,
    }


def _prediction_summary(pred):
    if not pred:
        return None
    return {
        'id': pred.id,
        'prediction_id': f'PRED-{pred.id:04d}',
        'result': pred.prediction_result,
        'probability': pred.prediction_probability,
        'model_name': pred.model_name,
        'created_at': pred.created_at.isoformat() if pred.created_at else None,
    }


def _reviews_for(patient_id):
    return DoctorReview.query.filter_by(patient_id=patient_id).order_by(DoctorReview.created_at.desc()).all()


def _review_dict(review):
    doctor = db.session.get(User, review.doctor_user_id) if review.doctor_user_id else None
    report = db.session.get(Report, review.report_id) if review.report_id else None
    return review.to_dict(doctor=doctor, report=report)


def _report_review_count(report, reviews):
    return sum(1 for r in reviews if r.report_id == report.id or (report.prediction_id and r.prediction_id == report.prediction_id))


def _report_dict(report, reviews):
    pred = db.session.get(Prediction, report.prediction_id) if report.prediction_id else None
    count = _report_review_count(report, reviews)
    data = report.to_dict()
    data.pop('report_path', None)  # never expose server file paths
    data.update({
        'prediction': _prediction_summary(pred),
        'review_count': count,
        'review_status': 'Reviewed' if count else 'Awaiting review',
    })
    return data


def _own_patient_or_error():
    patient = patient_record_for_user(current_user())
    if not patient:
        return None, (jsonify({'success': False, 'error': 'No patient record is linked to this account.',
                               'code': 'no_patient_record'}), 404)
    return patient, None


# ---------------------------------------------------------------------------
# Patient portal (read-only)
# ---------------------------------------------------------------------------
@patient_bp.route('/profile', methods=['GET'])
@token_required
@roles_required('patient')
def patient_profile():
    """GET /api/patient/profile -> own account, patient record and treating doctor."""
    try:
        user = current_user()
        patient = patient_record_for_user(user)
        doctor = db.session.get(User, patient.doctor_id) if patient and patient.doctor_id else None
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'patient': patient.to_dict() if patient else None,
            'doctor': _doctor_summary(doctor),
        }), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@patient_bp.route('/overview', methods=['GET'])
@token_required
@roles_required('patient')
def patient_overview():
    """GET /api/patient/overview -> summary built only from the caller's own data."""
    try:
        user = current_user()
        patient = patient_record_for_user(user)
        unread = Notification.query.filter_by(user_id=user.id, is_read=False).count()
        if not patient:
            return jsonify({'success': True, 'patient': None, 'doctor': None, 'latest_report': None,
                            'latest_prediction': None, 'review_status': None, 'report_count': 0,
                            'review_count': 0, 'unread_notifications': unread}), 200

        doctor = db.session.get(User, patient.doctor_id) if patient.doctor_id else None
        reviews = _reviews_for(patient.id)
        reports = Report.query.filter_by(patient_id=patient.id).order_by(Report.created_at.desc()).all()
        latest_report = reports[0] if reports else None
        latest_pred = Prediction.query.filter_by(patient_id=patient.id).order_by(Prediction.created_at.desc()).first()

        review_status = None
        if latest_report:
            review_status = 'Reviewed' if _report_review_count(latest_report, reviews) else 'Awaiting review'
        elif latest_pred:
            review_status = 'Reviewed' if any(r.prediction_id == latest_pred.id for r in reviews) else 'Awaiting review'

        return jsonify({
            'success': True,
            'user': {'name': user.name, 'email': user.email},
            'patient': patient.to_dict(),
            'doctor': _doctor_summary(doctor),
            'latest_report': _report_dict(latest_report, reviews) if latest_report else None,
            'latest_prediction': _prediction_summary(latest_pred),
            'review_status': review_status,
            'report_count': len(reports),
            'review_count': len(reviews),
            'unread_notifications': unread,
        }), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@patient_bp.route('/reports', methods=['GET'])
@token_required
@roles_required('patient')
def patient_reports():
    """GET /api/patient/reports -> only the caller's reports, with result and review status."""
    try:
        patient, err = _own_patient_or_error()
        if err:
            return jsonify({'success': True, 'count': 0, 'reports': []}), 200
        reviews = _reviews_for(patient.id)
        reports = Report.query.filter_by(patient_id=patient.id).order_by(Report.created_at.desc()).all()
        return jsonify({'success': True, 'count': len(reports), 'reports': [_report_dict(r, reviews) for r in reports]}), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@patient_bp.route('/reports/<report_id>', methods=['GET'])
@token_required
@roles_required('patient')
def patient_report_detail(report_id):
    """GET /api/patient/reports/<id> -> one of the caller's reports (403 for anyone else's)."""
    try:
        patient, err = _own_patient_or_error()
        if err:
            return err
        report = resolve_report(report_id)
        if not report:
            return not_found('Report not found.')
        if report.patient_id != patient.id:
            return forbidden('You can only access your own reports.')
        reviews = _reviews_for(patient.id)
        related = [r for r in reviews if r.report_id == report.id or (report.prediction_id and r.prediction_id == report.prediction_id)]
        return jsonify({
            'success': True,
            'report': _report_dict(report, reviews),
            'reviews': [_review_dict(r) for r in related],
        }), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@patient_bp.route('/reviews', methods=['GET'])
@token_required
@roles_required('patient')
def patient_reviews():
    """GET /api/patient/reviews -> doctor reviews on the caller's own record (read-only)."""
    try:
        patient, err = _own_patient_or_error()
        if err:
            return jsonify({'success': True, 'count': 0, 'reviews': []}), 200
        reviews = _reviews_for(patient.id)
        return jsonify({'success': True, 'count': len(reviews), 'reviews': [_review_dict(r) for r in reviews]}), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@patient_bp.route('/validate-csv', methods=['POST'])
@token_required
@roles_required('patient')
def patient_validate_csv():
    """
    POST /api/patient/validate-csv
    multipart/form-data: file (.csv)
    Validates uploaded CSV file against feature schema and verifies patient scoping.
    Does NOT store anything in the database.
    """
    try:
        user = current_user()
        patient = patient_record_for_user(user)
        if not patient:
            return jsonify({'success': False, 'error': 'No patient record found for this account.'}), 404

        upload = request.files.get('file')
        if not upload or not upload.filename:
            return jsonify({'success': False, 'error': 'Choose a CSV file to upload.'}), 400

        filename = upload.filename
        if not filename.lower().endswith('.csv'):
            return jsonify({'success': False, 'error': 'Invalid file type. Please upload a CSV file (.csv).'}), 400

        content = upload.read()
        if not content:
            return jsonify({'success': False, 'error': 'The uploaded CSV file is empty.'}), 400
        if len(content) > 5 * 1024 * 1024:
            return jsonify({'success': False, 'error': 'File size exceeds maximum limit of 5 MB.'}), 400

        import pandas as pd
        import io
        try:
            df = pd.read_csv(io.BytesIO(content))
        except Exception as e:
            return jsonify({'success': False, 'error': f'Failed to parse CSV file: {str(e)}'}), 400

        if df.empty:
            return jsonify({'success': False, 'error': 'The CSV file contains no data rows.'}), 400

        columns = [str(c).strip() for c in df.columns]

        # Check patient ID column if present in CSV
        patient_col = next((c for c in columns if c.lower().replace('-', '').replace('_', '').replace(' ', '') in ('patientid', 'patientcode', 'patient')), None)

        if patient_col:
            csv_patient_id = str(df.iloc[0].get(patient_col, '')).strip()
            if csv_patient_id and patient.patient_id and csv_patient_id.lower() != patient.patient_id.lower():
                return jsonify({
                    'success': False,
                    'status': 'invalid',
                    'error': f'Uploaded CSV patient ID ("{csv_patient_id}") does not match your assigned patient ID ("{patient.patient_id}"). A patient cannot submit data for another patient ID.'
                }), 403

        if len(df) > 1 and patient_col:
            unique_ids = df[patient_col].astype(str).str.strip().unique()
            if len(unique_ids) > 1:
                return jsonify({
                    'success': False,
                    'status': 'invalid',
                    'error': 'The CSV contains rows for multiple patient IDs. Only single patient CSV uploads are supported in Patient Portal.'
                }), 400

        first_row = df.iloc[0].to_dict()
        raw_features = {}
        for k, v in first_row.items():
            if patient_col and str(k).strip() == patient_col:
                continue
            raw_features[str(k).strip()] = '' if pd.isna(v) else str(v).strip()

        from ml.feature_schema import validate_features
        validation = validate_features(raw_features)
        preview_fields = validation['fields']

        if not validation['complete']:
            status = 'needs_review' if validation['invalid'] else 'incomplete'
            err_msg = 'CSV validation failed.'
            if validation['missing']:
                err_msg = f'{len(validation["missing"])} required feature(s) missing.'
            elif validation['invalid']:
                err_msg = f'{len(validation["invalid"])} feature(s) have invalid data.'

            return jsonify({
                'success': False,
                'status': status,
                'status_label': 'Invalid CSV' if validation['invalid'] else 'Incomplete CSV',
                'error': f'{err_msg} Please fix the CSV and re-upload. Missing or invalid values are never filled automatically.',
                'file_name': filename,
                'fields': preview_fields,
                'missing': validation['missing'],
                'invalid': validation['invalid'],
                'unknown': validation['unknown'],
            }), 422

        return jsonify({
            'success': True,
            'status': 'Valid CSV',
            'status_label': 'Valid CSV',
            'file_name': filename,
            'patient_id': patient.patient_id,
            'parsed_values': validation['values'],
            'fields': preview_fields,
            'warnings': [f for f in preview_fields if f['status'] == 'warning'],
            'unknown': validation['unknown'],
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': f'Validation failed: {str(e)}'}), 500


@patient_bp.route('/predict-csv', methods=['POST'])
@token_required
@roles_required('patient')
def patient_predict_csv():
    """
    POST /api/patient/predict-csv
    JSON body: { features: { ... }, file_name: "patient_data.csv" }
    Runs ML prediction for the caller's own patient record, saves Prediction & Report in DB.
    """
    try:
        user = current_user()
        patient = patient_record_for_user(user)
        if not patient:
            return jsonify({'success': False, 'error': 'No patient record found for this account.'}), 404

        data = request.get_json(silent=True) or {}
        features = data.get('features')
        if not isinstance(features, dict):
            return jsonify({'success': False, 'error': 'features dictionary is required.'}), 400

        file_name = str(data.get('file_name') or 'patient_data.csv')[:150]

        from ml.feature_schema import validate_features
        validation = validate_features(features)

        if not validation['complete']:
            return jsonify({
                'success': False,
                'error': 'Cannot run prediction: CSV data is incomplete or invalid. Missing values are never filled automatically.',
                'missing': validation['missing'],
                'invalid': validation['invalid'],
            }), 422

        from services import analysis_service as svc
        prediction_record, ml_result = svc.create_prediction(
            patient,
            validation['values'],
            doctor=None,
            source='patient_csv',
            report_reference=file_name
        )
        db.session.flush()

        from report_service import generate_pdf_report
        pdf_res = generate_pdf_report(prediction_record, patient_info=patient, user_info=user)

        report_code = pdf_res['report_id']
        pdf_path = pdf_res['report_path']

        report_record = Report(
            report_id=report_code,
            patient_id=patient.id,
            prediction_id=prediction_record.id,
            report_path=pdf_path,
            status='generated'
        )
        db.session.add(report_record)
        db.session.flush()

        notify_patient_record(
            patient, 'report', 'CKD Risk Assessment Completed',
            f'Your CKD risk assessment report ({report_code}) is ready to download.',
            f'/patient/reports/{report_record.id}',
        )
        db.session.commit()

        return jsonify({
            'success': True,
            'prediction_id': f"PRED-{prediction_record.id:04d}",
            'prediction': ml_result['prediction'],
            'prediction_result': ml_result['prediction_result'],
            'probability': ml_result['prediction_probability'],
            'prediction_probability': ml_result['prediction_probability'],
            'risk_percentage': ml_result['risk_percentage'],
            'disclaimer': 'AI-Assisted Prediction — Not a Medical Diagnosis',
            'report': {
                'id': report_record.id,
                'report_id': report_record.report_id,
                'download_url': f"/api/reports/{report_record.report_id}/download",
            }
        }), 201

    except (OperationalError, DatabaseError) as err:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Database operation failed while saving prediction.', 'details': str(err)}), 500
    except Exception as exc:
        db.session.rollback()
        return jsonify({'success': False, 'error': f'Prediction execution failed: {str(exc)}'}), 500


# ---------------------------------------------------------------------------
# Doctor reviews
# ---------------------------------------------------------------------------
def _clean_text(value, limit=MAX_REVIEW_CHARS):
    return (value or '').strip()[:limit]


@reviews_bp.route('', methods=['GET'])
@reviews_bp.route('/', methods=['GET'])
@token_required
def list_reviews():
    """
    GET /api/reviews?patient_id=<id> -> reviews for a patient.
    Admin: any patient. Doctor: assigned patients only (403 otherwise). Patient: own reviews only.
    """
    try:
        patient = resolve_patient(request.args.get('patient_id'))
        user = current_user()
        if user.role == 'patient':
            patient = patient_record_for_user(user)
            if not patient:
                return jsonify({'success': True, 'count': 0, 'reviews': []}), 200
        if not patient:
            return jsonify({'success': False, 'error': 'patient_id is required.'}), 400
        if not can_access_patient(user, patient):
            return forbidden('This patient is not assigned to you.' if user.role == 'doctor' else None)
        reviews = _reviews_for(patient.id)
        return jsonify({'success': True, 'count': len(reviews), 'reviews': [_review_dict(r) for r in reviews],
                        'can_review': user.role == 'doctor' and patient.doctor_id == user.id}), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@reviews_bp.route('', methods=['POST'])
@reviews_bp.route('/', methods=['POST'])
@token_required
@roles_required('doctor')
def create_review():
    """POST /api/reviews -> the patient's assigned treating doctor adds a review."""
    data = request.get_json(silent=True) or {}
    try:
        doctor = current_user()
        patient = resolve_patient(data.get('patient_id'))
        if not patient:
            return not_found('Patient not found.')
        if patient.doctor_id != doctor.id:
            return forbidden('Only the patient\'s assigned treating doctor can add a review.')

        text = _clean_text(data.get('review_text') or data.get('review'))
        if len(text) < 3:
            return jsonify({'success': False, 'error': 'Please write a review.'}), 400
        recommendations = _clean_text(data.get('recommendations')) or None

        prediction = None
        if data.get('prediction_id'):
            prediction = resolve_prediction(data.get('prediction_id'))
            if not prediction or prediction.patient_id != patient.id:
                return jsonify({'success': False, 'error': 'The prediction does not belong to this patient.'}), 400
        report = None
        if data.get('report_id'):
            report = resolve_report(data.get('report_id'))
            if not report or report.patient_id != patient.id:
                return jsonify({'success': False, 'error': 'The report does not belong to this patient.'}), 400
        if report and not prediction and report.prediction_id:
            prediction = db.session.get(Prediction, report.prediction_id)
        if prediction and not report:
            report = Report.query.filter_by(prediction_id=prediction.id).first()

        review = DoctorReview(
            patient_id=patient.id,
            doctor_user_id=doctor.id,
            prediction_id=prediction.id if prediction else None,
            report_id=report.id if report else None,
            review_text=text,
            recommendations=recommendations,
        )
        db.session.add(review)
        db.session.flush()
        notify_patient_record(
            patient, 'review', 'Your doctor reviewed your results',
            f'Dr. {doctor.name.replace("Dr. ", "")} added a review to your record.',
            '/patient/reviews',
        )
        db.session.commit()
        return jsonify({'success': True, 'message': 'Review saved.', 'review': _review_dict(review)}), 201
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return _db_unavailable()


def _own_review_or_error(review_id):
    review = db.session.get(DoctorReview, int(review_id)) if str(review_id).isdigit() else None
    if not review:
        return None, not_found('Review not found.')
    if review.doctor_user_id != current_user().id:
        return None, forbidden('You can only change reviews you wrote.')
    patient = db.session.get(Patient, review.patient_id)
    if not can_access_patient(current_user(), patient):
        return None, forbidden('This patient is not assigned to you.')
    return review, None


@reviews_bp.route('/<review_id>', methods=['PUT'])
@token_required
@roles_required('doctor')
def update_review(review_id):
    """PUT /api/reviews/<id> -> the authoring doctor edits their review."""
    data = request.get_json(silent=True) or {}
    try:
        review, err = _own_review_or_error(review_id)
        if err:
            return err
        if 'review_text' in data:
            text = _clean_text(data.get('review_text'))
            if len(text) < 3:
                return jsonify({'success': False, 'error': 'Please write a review.'}), 400
            review.review_text = text
        if 'recommendations' in data:
            review.recommendations = _clean_text(data.get('recommendations')) or None
        db.session.commit()
        return jsonify({'success': True, 'message': 'Review updated.', 'review': _review_dict(review)}), 200
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return _db_unavailable()


@reviews_bp.route('/<review_id>', methods=['DELETE'])
@token_required
@roles_required('doctor')
def delete_review(review_id):
    """DELETE /api/reviews/<id> -> the authoring doctor deletes their review."""
    try:
        review, err = _own_review_or_error(review_id)
        if err:
            return err
        db.session.delete(review)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Review deleted.'}), 200
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return _db_unavailable()


# ---------------------------------------------------------------------------
# Notifications (own only)
# ---------------------------------------------------------------------------
@notifications_bp.route('', methods=['GET'])
@notifications_bp.route('/', methods=['GET'])
@token_required
def list_notifications():
    """GET /api/notifications -> the caller's latest notifications."""
    try:
        user = current_user()
        items = Notification.query.filter_by(user_id=user.id).order_by(Notification.created_at.desc()).limit(100).all()
        unread = Notification.query.filter_by(user_id=user.id, is_read=False).count()
        return jsonify({'success': True, 'count': len(items), 'unread_count': unread,
                        'notifications': [n.to_dict() for n in items]}), 200
    except (OperationalError, DatabaseError):
        return _db_unavailable()


@notifications_bp.route('/<notification_id>/read', methods=['POST'])
@token_required
def mark_notification_read(notification_id):
    """POST /api/notifications/<id>/read -> mark one of the caller's notifications as read."""
    try:
        note = db.session.get(Notification, int(notification_id)) if str(notification_id).isdigit() else None
        if not note or note.user_id != current_user().id:
            return not_found('Notification not found.')
        note.is_read = True
        db.session.commit()
        return jsonify({'success': True, 'notification': note.to_dict()}), 200
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return _db_unavailable()


@notifications_bp.route('/read-all', methods=['POST'])
@token_required
def mark_all_notifications_read():
    """POST /api/notifications/read-all -> mark all of the caller's notifications as read."""
    try:
        updated = Notification.query.filter_by(user_id=current_user().id, is_read=False).update({'is_read': True})
        db.session.commit()
        return jsonify({'success': True, 'updated': updated}), 200
    except (OperationalError, DatabaseError):
        db.session.rollback()
        return _db_unavailable()
