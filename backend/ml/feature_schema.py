"""
Authoritative definition of the 51 model input features (backend side).

Mirrors src/data/featureSchema.js (same names, order, units, category codes, hard limits and
training-data ranges) and ml/artifacts/feature_names.json (same order - checked at import).

Validation rules used by Doctor Patient/Batch Analysis (NEVER invents values):
  missing  -> status "missing"  (shown as "Incomplete Data")
  invalid  -> status "invalid"  (shown as "Needs Review"): not a number, ambiguous format,
              outside the plausible (hard) limit, or not a valid category code
  outside the training-data range -> status "warning" (value is kept; model may be less reliable)
"""
import json
import math
import os
import re

ARTIFACTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'artifacts')


def _num(name, label, section, unit, range_, limit):
    return {'name': name, 'label': label, 'section': section, 'type': 'number', 'unit': unit,
            'range': range_, 'limit': limit}


def _sel(name, label, section, options):
    return {'name': name, 'label': label, 'section': section, 'type': 'select', 'options': options}


FEATURE_SCHEMA = [
    _num('Age', 'Age', 'demographics', 'years', range_=(20, 90), limit=(1, 120)),
    _sel('Gender', 'Gender', 'demographics', {0: 'Male', 1: 'Female'}),
    _sel('Ethnicity', 'Ethnicity', 'demographics', {0: 'Caucasian', 1: 'African American', 2: 'Asian', 3: 'Other'}),
    _sel('SocioeconomicStatus', 'Socioeconomic Status', 'demographics', {0: 'Low', 1: 'Middle', 2: 'High'}),
    _sel('EducationLevel', 'Education Level', 'demographics', {0: 'None', 1: 'High School', 2: "Bachelor's", 3: 'Higher'}),
    _num('BMI', 'Body Mass Index', 'lifestyle', 'kg/m²', range_=(15, 40), limit=(8, 80)),
    _sel('Smoking', 'Smoking', 'lifestyle', {0: 'No', 1: 'Yes'}),
    _num('AlcoholConsumption', 'Alcohol Consumption', 'lifestyle', 'units/week', range_=(0, 20), limit=(0, 100)),
    _num('PhysicalActivity', 'Physical Activity', 'lifestyle', 'hours/week', range_=(0, 10), limit=(0, 80)),
    _num('DietQuality', 'Diet Quality', 'lifestyle', 'score 0–10', range_=(0, 10), limit=(0, 10)),
    _num('SleepQuality', 'Sleep Quality', 'lifestyle', 'score 4–10', range_=(4, 10), limit=(0, 10)),
    _sel('FamilyHistoryKidneyDisease', 'Family History of Kidney Disease', 'history', {0: 'No', 1: 'Yes'}),
    _sel('FamilyHistoryHypertension', 'Family History of Hypertension', 'history', {0: 'No', 1: 'Yes'}),
    _sel('FamilyHistoryDiabetes', 'Family History of Diabetes', 'history', {0: 'No', 1: 'Yes'}),
    _sel('PreviousAcuteKidneyInjury', 'Previous Acute Kidney Injury', 'history', {0: 'No', 1: 'Yes'}),
    _sel('UrinaryTractInfections', 'Urinary Tract Infections', 'history', {0: 'No', 1: 'Yes'}),
    _num('SystolicBP', 'Systolic Blood Pressure', 'clinical', 'mmHg', range_=(90, 179), limit=(50, 260)),
    _num('DiastolicBP', 'Diastolic Blood Pressure', 'clinical', 'mmHg', range_=(60, 119), limit=(30, 160)),
    _num('FastingBloodSugar', 'Fasting Blood Sugar', 'clinical', 'mg/dL', range_=(70, 200), limit=(20, 700)),
    _num('HbA1c', 'HbA1c', 'clinical', '%', range_=(4, 10), limit=(2, 20)),
    _num('SerumCreatinine', 'Serum Creatinine', 'kidney', 'mg/dL', range_=(0.5, 5), limit=(0.1, 25)),
    _num('BUNLevels', 'Blood Urea Nitrogen (BUN)', 'kidney', 'mg/dL', range_=(5, 50), limit=(1, 250)),
    _num('GFR', 'Glomerular Filtration Rate (GFR)', 'kidney', 'mL/min/1.73m²', range_=(15, 120), limit=(1, 200)),
    _num('ProteinInUrine', 'Protein in Urine', 'kidney', 'g/day', range_=(0, 5), limit=(0, 30)),
    _num('ACR', 'Albumin-to-Creatinine Ratio (ACR)', 'kidney', 'mg/g', range_=(0, 300), limit=(0, 5000)),
    _num('SerumElectrolytesSodium', 'Serum Sodium', 'blood', 'mEq/L', range_=(135, 145), limit=(100, 180)),
    _num('SerumElectrolytesPotassium', 'Serum Potassium', 'blood', 'mEq/L', range_=(3.5, 5.5), limit=(1, 10)),
    _num('SerumElectrolytesCalcium', 'Serum Calcium', 'blood', 'mg/dL', range_=(8.5, 10.5), limit=(4, 16)),
    _num('SerumElectrolytesPhosphorus', 'Serum Phosphorus', 'blood', 'mg/dL', range_=(2.5, 4.5), limit=(0.5, 15)),
    _num('HemoglobinLevels', 'Hemoglobin', 'blood', 'g/dL', range_=(10, 18), limit=(3, 25)),
    _num('CholesterolTotal', 'Total Cholesterol', 'lipids', 'mg/dL', range_=(150, 300), limit=(50, 700)),
    _num('CholesterolLDL', 'LDL Cholesterol', 'lipids', 'mg/dL', range_=(50, 200), limit=(10, 500)),
    _num('CholesterolHDL', 'HDL Cholesterol', 'lipids', 'mg/dL', range_=(20, 100), limit=(5, 200)),
    _num('CholesterolTriglycerides', 'Triglycerides', 'lipids', 'mg/dL', range_=(50, 400), limit=(10, 3000)),
    _sel('ACEInhibitors', 'ACE Inhibitors', 'medications', {0: 'No', 1: 'Yes'}),
    _sel('Diuretics', 'Diuretics', 'medications', {0: 'No', 1: 'Yes'}),
    _num('NSAIDsUse', 'NSAIDs Use', 'medications', 'times/week', range_=(0, 10), limit=(0, 50)),
    _sel('Statins', 'Statins', 'medications', {0: 'No', 1: 'Yes'}),
    _sel('AntidiabeticMedications', 'Antidiabetic Medications', 'medications', {0: 'No', 1: 'Yes'}),
    _sel('Edema', 'Edema (swelling)', 'symptoms', {0: 'No', 1: 'Yes'}),
    _num('FatigueLevels', 'Fatigue Level', 'symptoms', 'score 0–10', range_=(0, 10), limit=(0, 10)),
    _num('NauseaVomiting', 'Nausea / Vomiting', 'symptoms', 'episodes/week', range_=(0, 7), limit=(0, 50)),
    _num('MuscleCramps', 'Muscle Cramps', 'symptoms', 'episodes/week', range_=(0, 7), limit=(0, 50)),
    _num('Itching', 'Itching', 'symptoms', 'score 0–10', range_=(0, 10), limit=(0, 10)),
    _num('QualityOfLifeScore', 'Quality of Life Score', 'symptoms', 'score 0–100', range_=(0, 100), limit=(0, 100)),
    _sel('HeavyMetalsExposure', 'Heavy Metals Exposure', 'environment', {0: 'No', 1: 'Yes'}),
    _sel('OccupationalExposureChemicals', 'Occupational Chemical Exposure', 'environment', {0: 'No', 1: 'Yes'}),
    _sel('WaterQuality', 'Drinking Water Quality', 'environment', {0: 'Good', 1: 'Poor'}),
    _num('MedicalCheckupsFrequency', 'Medical Check-ups', 'environment', 'per year', range_=(0, 4), limit=(0, 52)),
    _num('MedicationAdherence', 'Medication Adherence', 'environment', 'score 0–10', range_=(0, 10), limit=(0, 10)),
    _num('HealthLiteracy', 'Health Literacy', 'environment', 'score 0–10', range_=(0, 10), limit=(0, 10)),
]

FEATURES_BY_NAME = {f['name']: f for f in FEATURE_SCHEMA}
FEATURES_BY_LOWER = {f['name'].lower(): f for f in FEATURE_SCHEMA}
FEATURE_NAMES = [f['name'] for f in FEATURE_SCHEMA]

with open(os.path.join(ARTIFACTS_DIR, 'feature_names.json'), 'r') as _fh:
    _MODEL_FEATURES = json.load(_fh)
if _MODEL_FEATURES != FEATURE_NAMES:  # pragma: no cover - guards against silent drift
    raise RuntimeError('ml/feature_schema.py does not match ml/artifacts/feature_names.json')

STATUS_OK = 'ok'
STATUS_WARNING = 'warning'
STATUS_MISSING = 'missing'
STATUS_INVALID = 'invalid'

_NUMBER_RE = re.compile(r'^[+-]?(\d+(\.\d+)?|\.\d+)$')
_TRUE_WORDS = {'yes', 'y', 'true', 'positive', 'present'}
_FALSE_WORDS = {'no', 'n', 'false', 'negative', 'absent', 'none'}


def _fmt(n):
    return ('%g' % n)


def parse_value(feature, raw):
    """
    Convert one raw value to the model's numeric value.
    Returns (value_or_None, status, message). Never substitutes a default.
    """
    if raw is None or (isinstance(raw, float) and math.isnan(raw)):
        return None, STATUS_MISSING, 'Missing value'
    if isinstance(raw, bool):
        raw = int(raw)
    text = str(raw).strip()
    if text == '' or text.lower() in ('na', 'n/a', 'nan', 'null', 'none', '-', '--', '?'):
        return None, STATUS_MISSING, 'Missing value'

    if feature['type'] == 'select':
        options = feature['options']
        lowered = text.lower()
        for code, label in options.items():
            if lowered == label.lower():
                return float(code), STATUS_OK, ''
        if set(options) == {0, 1} and set(options.values()) == {'No', 'Yes'}:
            if lowered in _TRUE_WORDS:
                return 1.0, STATUS_OK, ''
            if lowered in _FALSE_WORDS:
                return 0.0, STATUS_OK, ''
        if _NUMBER_RE.match(text):
            num = float(text)
            if num.is_integer() and int(num) in options:
                return float(int(num)), STATUS_OK, ''
        allowed = ', '.join(f'{c} = {l}' for c, l in options.items())
        return None, STATUS_INVALID, f'"{text}" is not a valid option ({allowed})'

    if ',' in text:
        return None, STATUS_INVALID, f'Ambiguous number format "{text}" (use a dot for decimals)'
    if not _NUMBER_RE.match(text):
        return None, STATUS_INVALID, f'"{text}" is not a number'
    num = float(text)
    lo, hi = feature['limit']
    if num < lo or num > hi:
        return None, STATUS_INVALID, (f'{_fmt(num)} is outside the plausible range {_fmt(lo)}–{_fmt(hi)} '
                                      f'{feature["unit"]}; check the value and unit')
    rlo, rhi = feature['range']
    if num < rlo or num > rhi:
        return num, STATUS_WARNING, (f'Outside the training-data range ({_fmt(rlo)}–{_fmt(rhi)}); '
                                     'the model may be less reliable')
    return num, STATUS_OK, ''


def validate_features(raw_values):
    """
    Validate a {feature_name: raw_value} mapping (keys matched case-insensitively).
    Returns dict:
      values     {name: float} for every usable feature
      fields     [{name, label, unit, value, status, message}] in model order
      missing / invalid / warnings  lists of feature names
      complete   True only when all 51 features are present and valid
      unknown    keys that are not model features (ignored)
    """
    by_lower = {}
    unknown = []
    for key, value in (raw_values or {}).items():
        feat = FEATURES_BY_LOWER.get(str(key).strip().lower())
        if feat is None:
            unknown.append(str(key))
        else:
            by_lower[feat['name']] = value

    values, fields, missing, invalid, warnings = {}, [], [], [], []
    for feat in FEATURE_SCHEMA:
        value, status, message = parse_value(feat, by_lower.get(feat['name']))
        if value is not None:
            values[feat['name']] = value
        if status == STATUS_MISSING:
            missing.append(feat['name'])
        elif status == STATUS_INVALID:
            invalid.append(feat['name'])
        elif status == STATUS_WARNING:
            warnings.append(feat['name'])
        fields.append({'name': feat['name'], 'label': feat['label'], 'unit': feat.get('unit'),
                       'value': value, 'status': status, 'message': message})
    return {
        'values': values, 'fields': fields, 'missing': missing, 'invalid': invalid,
        'warnings': warnings, 'unknown': unknown, 'complete': not missing and not invalid,
    }


def ordered_model_input(values):
    """Exact model feature order - only call with a complete validation result."""
    return {name: float(values[name]) for name in FEATURE_NAMES}
