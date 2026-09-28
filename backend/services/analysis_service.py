"""
Doctor Patient/Batch Analysis: validation, prediction and history helpers.

Reuses the existing ML pipeline (ml/predict.predict_ckd_risk with the saved model and
preprocessor). A prediction is only run when ALL 51 model features are present and valid
(ml.feature_schema.validate_features) - predict_ckd_risk's internal default of 0.0 for a
missing feature can therefore never be reached from these workflows.
"""
import io
import os
import sys
import uuid
from datetime import datetime

from extensions import db
from models.patient import Patient
from models.prediction import Prediction
from models.report import Report
from models.user import User
from ml.feature_schema import validate_features, ordered_model_input
from utils.access import can_access_patient, resolve_patient

_ml_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml'))
if _ml_dir not in sys.path:
    sys.path.insert(0, _ml_dir)

from predict import predict_ckd_risk, MEDICAL_DISCLAIMER  # noqa: E402  (existing pipeline)
from model_registry import load_artifacts  # noqa: E402

RESULT_HEADLINE = 'AI-Assisted CKD Risk Prediction — Not a Medical Diagnosis'
SOURCE_LABELS = {'single_report': 'Single Report', 'batch': 'Batch Analysis', 'manual': 'Manual Entry', None: 'Manual Entry'}
MAX_BATCH_ROWS = 1000
MAX_BATCH_BYTES = 5 * 1024 * 1024
PATIENT_COLUMNS = ('patient_id', 'patientid', 'patient id', 'patient code', 'patient_code', 'patient')

STATUS_VALID = 'valid'
STATUS_INCOMPLETE = 'incomplete'
STATUS_NEEDS_REVIEW = 'needs_review'
STATUS_INVALID = 'invalid'
STATUS_LABELS = {
    STATUS_VALID: 'Ready', STATUS_INCOMPLETE: 'Incomplete Data', STATUS_NEEDS_REVIEW: 'Needs Review',
    STATUS_INVALID: 'Failed',
}
PATIENT_NOT_AVAILABLE = 'Patient ID not found among your assigned patients'


class BatchFileError(ValueError):
    pass


# ---------------------------------------------------------------------------
# Patients / model
# ---------------------------------------------------------------------------
def patient_summary(patient):
    user = db.session.get(User, patient.user_id) if patient.user_id else None
    return {
        'id': patient.id,
        'patient_id': patient.patient_id,
        'name': user.name if user else None,
        'gender': patient.gender,
        'date_of_birth': patient.date_of_birth.isoformat() if patient.date_of_birth else None,
    }


def accessible_patient(user, patient_ref):
    """The patient if it exists AND the caller may access it, else None (no distinction is revealed)."""
    if patient_ref in (None, ''):
        return None
    patient = resolve_patient(patient_ref)
    if patient is None or not can_access_patient(user, patient):
        return None
    return patient


def model_version():
    try:
        _m, _p, _f, metadata = load_artifacts()
        trained = metadata.get('trained_at') or ''
        return f"{metadata.get('model_name', 'model')} {trained[:19]}".strip()[:60]
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------
def create_prediction(patient, values, doctor, source, report_reference=None, batch_id=None):
    """
    Run the existing model on a COMPLETE validated feature set and add the Prediction to the session.
    The caller commits. Raises ValueError if the feature set is incomplete.
    """
    features = ordered_model_input(values)  # KeyError-free only for complete sets
    if len(features) != 51:
        raise ValueError('Incomplete feature set')
    result = predict_ckd_risk(features)
    record = Prediction(
        patient_id=patient.id,
        prediction_result=result['prediction_result'],
        prediction_probability=result['prediction_probability'],
        model_name=result['model_name'],
        input_features=features,
        doctor_user_id=doctor.id if doctor else None,
        source=source,
        report_reference=(report_reference or None) and str(report_reference)[:255],
        batch_id=batch_id,
        model_version=model_version(),
        created_at=datetime.utcnow(),
    )
    db.session.add(record)
    return record, result


def prediction_view(pred, patients=None, users=None, reports=None):
    """Prediction with patient/doctor names, source label and report reference (for history & results)."""
    patients = patients if patients is not None else {}
    users = users if users is not None else {}
    patient = patients.get(pred.patient_id) or db.session.get(Patient, pred.patient_id)
    patient_user = None
    if patient and patient.user_id:
        patient_user = users.get(patient.user_id) or db.session.get(User, patient.user_id)
    doctor = None
    if pred.doctor_user_id:
        doctor = users.get(pred.doctor_user_id) or db.session.get(User, pred.doctor_user_id)
    report = (reports or {}).get(pred.id) if reports is not None else Report.query.filter_by(prediction_id=pred.id).first()
    data = pred.to_dict()
    data.update({
        'patient_code': patient.patient_id if patient else None,
        'patient_name': patient_user.name if patient_user else None,
        'doctor_name': doctor.name if doctor else None,
        'source_label': SOURCE_LABELS.get(pred.source, 'Manual Entry'),
        'report': {'id': report.id, 'report_id': report.report_id} if report else None,
        'headline': RESULT_HEADLINE,
        'disclaimer': MEDICAL_DISCLAIMER,
    })
    return data


# ---------------------------------------------------------------------------
# Batch files
# ---------------------------------------------------------------------------
def parse_batch_file(filename, data):
    """CSV/XLSX -> (rows, info). Each row: {row_number, patient_ref, features {name: raw}}."""
    from services.report_extraction import file_extension, match_feature, read_table, ReportExtractionError
    from ml.feature_schema import FEATURE_NAMES

    ext = file_extension(filename)
    if ext not in ('.csv', '.xlsx'):
        raise BatchFileError('Upload a CSV (.csv) or Excel (.xlsx) file.')
    if not data:
        raise BatchFileError('The uploaded file is empty.')
    if len(data) > MAX_BATCH_BYTES:
        raise BatchFileError('The file is larger than 5 MB.')
    try:
        df = read_table(data, ext)
    except ReportExtractionError as err:
        raise BatchFileError(str(err))

    columns = [str(c).strip() for c in df.columns]
    patient_col = next((c for c in columns if c.lower().replace('-', ' ') in PATIENT_COLUMNS), None)
    if patient_col is None:
        raise BatchFileError('The file needs a "PatientID" column containing each patient\'s ID (e.g. PAT-0004).')
    feature_cols = {}
    unknown_cols = []
    for col in columns:
        if col == patient_col:
            continue
        feature = match_feature(col)
        if feature and feature not in feature_cols.values():
            feature_cols[col] = feature
        else:
            unknown_cols.append(col)
    missing_cols = [f for f in FEATURE_NAMES if f not in feature_cols.values()]

    df = df.fillna('')
    df.columns = columns
    rows = []
    for idx, record in enumerate(df.to_dict(orient='records')):
        values = [str(v).strip() for v in record.values()]
        if not any(values):
            continue  # skip completely blank lines
        features = {name: '' for name in FEATURE_NAMES}
        for col, feature in feature_cols.items():
            features[feature] = str(record.get(col, '')).strip()
        rows.append({'row_number': idx + 2, 'patient_ref': str(record.get(patient_col, '')).strip(),
                     'features': features})
    if not rows:
        raise BatchFileError('The file contains no data rows.')
    if len(rows) > MAX_BATCH_ROWS:
        raise BatchFileError(f'The file has {len(rows)} rows; the maximum per batch is {MAX_BATCH_ROWS}.')
    return rows, {'patient_column': patient_col, 'missing_columns': missing_cols, 'ignored_columns': unknown_cols}


def validate_row(row, user, seen_patients=None):
    """Validate one batch row (never trusts earlier client-side validation)."""
    patient_ref = str(row.get('patient_ref') or row.get('patient_id') or '').strip()
    raw = row.get('features') or {}
    validation = validate_features(raw)
    result = {
        'row_number': row.get('row_number'),
        'patient_ref': patient_ref,
        'patient': None,
        'features': {f['name']: ('' if raw.get(f['name']) is None else str(raw.get(f['name']))) for f in validation['fields']},
        'issues': [],
        'warnings': [],
    }
    for f in validation['fields']:
        if f['status'] in ('missing', 'invalid'):
            result['issues'].append({'feature': f['name'], 'label': f['label'], 'status': f['status'],
                                     'message': f['message']})
        elif f['status'] == 'warning':
            result['warnings'].append({'feature': f['name'], 'label': f['label'], 'message': f['message']})

    patient = accessible_patient(user, patient_ref) if patient_ref else None
    if not patient_ref:
        status, reason = STATUS_INVALID, 'Missing patient ID'
    elif patient is None:
        status, reason = STATUS_INVALID, PATIENT_NOT_AVAILABLE
    elif validation['invalid']:
        status, reason = STATUS_NEEDS_REVIEW, f'{len(validation["invalid"])} value(s) need review'
    elif validation['missing']:
        status, reason = STATUS_INCOMPLETE, f'{len(validation["missing"])} required value(s) missing'
    else:
        status, reason = STATUS_VALID, 'All 51 values present and valid'

    if patient is not None:
        result['patient'] = patient_summary(patient)
        if seen_patients is not None:
            if patient.id in seen_patients:
                result['warnings'].append({'feature': None, 'label': 'Patient',
                                           'message': f'Same patient as row {seen_patients[patient.id]}'})
            else:
                seen_patients[patient.id] = row.get('row_number')
    result.update(status=status, status_label=STATUS_LABELS[status], reason=reason)
    return result, validation, patient


def summarize(rows):
    counts = {'total': len(rows), STATUS_VALID: 0, STATUS_INCOMPLETE: 0, STATUS_NEEDS_REVIEW: 0, STATUS_INVALID: 0}
    for r in rows:
        counts[r['status']] = counts.get(r['status'], 0) + 1
    return counts


def new_batch_id():
    return f"BATCH-{datetime.utcnow():%Y%m%d%H%M%S}-{uuid.uuid4().hex[:6]}"


def results_csv(rows):
    """CSV text for a list of batch result rows (used by tests; the UI builds the same file client-side)."""
    import csv

    def safe(value):
        text = '' if value is None else str(value)
        return f"'{text}" if text[:1] in ('=', '+', '-', '@', '\t', '\r') and not isinstance(value, (int, float)) else text

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(['Row', 'Patient ID', 'Patient Name', 'Prediction', 'Risk Probability', 'Status', 'Date', 'Prediction ID'])
    for r in rows:
        pred = r.get('prediction') or {}
        writer.writerow([safe(v) for v in (
            r.get('row_number'), r.get('patient_ref'), (r.get('patient') or {}).get('name') or '',
            pred.get('prediction_result', ''), pred.get('prediction_probability', ''),
            r.get('status_label'), pred.get('created_at', ''), pred.get('prediction_id', ''))])
    return buf.getvalue()
