"""
Extract CKD model input values from an uploaded medical report.

Supported formats (only what can be read reliably - no OCR, no guessing):
  .csv / .xlsx  either one row with feature columns (e.g. GFR, SerumCreatinine, ...) or two columns
                "test name, value" (optionally a third "unit" column)
  .json         {"GFR": 45, ...} or {"features": {...}}
  .txt          one "Test name: value unit" per line
  .pdf          TEXT-BASED PDFs only (lab printouts with a text layer), read line by line like .txt.
                Scanned/image PDFs have no text layer and are rejected with a clear message.

Rules - the system NEVER invents medical values:
  * a feature not found in the report is left empty -> "Incomplete Data" (the doctor may enter it)
  * the same test reported with different values -> "Needs Review", no value is chosen
  * a value written with a different unit than the model expects (e.g. creatinine in umol/L)
    -> "Needs Review", the value is shown but not converted
  * every value is then checked by ml.feature_schema.validate_features (limits, categories)
Every extracted value must be reviewed by the doctor before a prediction is run.
"""
import io
import json
import os
import re

from ml.feature_schema import FEATURE_SCHEMA, FEATURES_BY_NAME, validate_features

MAX_REPORT_BYTES = 5 * 1024 * 1024
SUPPORTED_REPORT_EXTENSIONS = ('.pdf', '.txt', '.csv', '.xlsx', '.json')


class ReportExtractionError(ValueError):
    """The file cannot be processed (unsupported, unreadable, scanned PDF, too large...)."""


# Report wording -> model feature. Feature names and labels are always accepted too.
EXTRA_ALIASES = {
    'Age': ['age', 'age (years)', 'patient age'],
    'Gender': ['gender', 'sex'],
    'BMI': ['bmi', 'body mass index'],
    'SystolicBP': ['systolic', 'systolic bp', 'systolic blood pressure', 'sbp'],
    'DiastolicBP': ['diastolic', 'diastolic bp', 'diastolic blood pressure', 'dbp'],
    'FastingBloodSugar': ['fasting blood sugar', 'fasting blood glucose', 'fasting glucose',
                          'fasting plasma glucose', 'fbs', 'fbg', 'glucose fasting', 'blood sugar fasting'],
    'HbA1c': ['hba1c', 'hb a1c', 'a1c', 'hemoglobin a1c', 'haemoglobin a1c', 'glycated hemoglobin', 'glycated haemoglobin',
              'glycosylated hemoglobin', 'glycosylated haemoglobin'],
    'SerumCreatinine': ['serum creatinine', 'creatinine', 'creatinine serum', 's. creatinine', 's creatinine',
                        'creatinine, serum'],
    'BUNLevels': ['bun', 'blood urea nitrogen', 'urea nitrogen', 'bun levels'],
    'GFR': ['gfr', 'egfr', 'estimated gfr', 'glomerular filtration rate', 'estimated glomerular filtration rate'],
    'ProteinInUrine': ['protein in urine', 'urine protein', 'proteinuria', '24 hour urine protein',
                       '24h urine protein', 'urine protein 24h'],
    'ACR': ['acr', 'uacr', 'albumin creatinine ratio', 'albumin-to-creatinine ratio', 'albumin/creatinine ratio',
            'urine albumin creatinine ratio', 'microalbumin/creatinine ratio', 'urine acr'],
    'SerumElectrolytesSodium': ['sodium', 'serum sodium', 'sodium (na)', 'na+', 'na'],
    'SerumElectrolytesPotassium': ['potassium', 'serum potassium', 'potassium (k)', 'k+', 'k'],
    'SerumElectrolytesCalcium': ['calcium', 'serum calcium', 'total calcium', 'ca'],
    'SerumElectrolytesPhosphorus': ['phosphorus', 'serum phosphorus', 'phosphate', 'serum phosphate',
                                    'inorganic phosphorus'],
    'HemoglobinLevels': ['hemoglobin', 'haemoglobin', 'hb', 'hgb', 'hemoglobin levels'],
    'CholesterolTotal': ['total cholesterol', 'cholesterol total', 'cholesterol, total', 'cholesterol', 'tc'],
    'CholesterolLDL': ['ldl', 'ldl cholesterol', 'ldl-c', 'ldl-cholesterol', 'cholesterol ldl', 'ldl cholesterol (calculated)'],
    'CholesterolHDL': ['hdl', 'hdl cholesterol', 'hdl-c', 'hdl-cholesterol', 'cholesterol hdl'],
    'CholesterolTriglycerides': ['triglycerides', 'triglyceride', 'tg', 'serum triglycerides'],
}

# Units that mean the value is NOT in the unit the model expects (flag, never convert).
CONFLICTING_UNITS = {
    'SerumCreatinine': ['umol/l', 'µmol/l', 'μmol/l', 'mmol/l'],
    'BUNLevels': ['mmol/l'],
    'FastingBloodSugar': ['mmol/l'],
    'HbA1c': ['mmol/mol'],
    'HemoglobinLevels': ['g/l', 'mmol/l'],
    'CholesterolTotal': ['mmol/l'],
    'CholesterolLDL': ['mmol/l'],
    'CholesterolHDL': ['mmol/l'],
    'CholesterolTriglycerides': ['mmol/l'],
    'SerumElectrolytesCalcium': ['mmol/l'],
    'SerumElectrolytesPhosphorus': ['mmol/l'],
    'ACR': ['mg/mmol'],
    'ProteinInUrine': ['mg/dl', 'mg/l', 'g/l'],
}

_NUM = r'([+-]?\d+(?:[.,]\d+)?)'


def _norm(text):
    return re.sub(r'\s+', ' ', str(text).strip().lower().replace('_', ' '))


def _build_alias_index():
    index = {}
    for feat in FEATURE_SCHEMA:
        names = {feat['name'].lower(), _norm(feat['label']),
                 _norm(re.sub(r'([a-z])([A-Z])', r'\1 \2', feat['name']))}
        names.update(EXTRA_ALIASES.get(feat['name'], []))
        for alias in names:
            index[_norm(alias)] = feat['name']
    return index


ALIASES = _build_alias_index()
# Longest first so "ldl cholesterol" wins over "cholesterol"
_ALIASES_BY_LENGTH = sorted(ALIASES.items(), key=lambda kv: -len(kv[0]))


def match_feature(label):
    """Exact (normalised) label -> feature name, or None."""
    return ALIASES.get(_norm(label).rstrip(':').strip())


class _Collector:
    """Collects candidate values per feature and detects conflicts."""

    def __init__(self):
        self.candidates = {}   # name -> list of (raw_value, source_text)
        self.unit_problems = {}

    def add(self, feature, raw, source):
        self.candidates.setdefault(feature, []).append((raw, source))

    def flag_unit(self, feature, unit):
        self.unit_problems[feature] = unit


def _check_unit(collector, feature, text):
    lowered = text.lower().replace(' ', '')
    for unit in CONFLICTING_UNITS.get(feature, []):
        if unit.replace(' ', '') in lowered:
            collector.flag_unit(feature, unit)
            return


def _parse_text_line(line, collector):
    clean = line.strip().strip('•*-–|').strip()
    if len(clean) < 2:
        return
    lowered = _norm(clean)

    # "Blood pressure: 140/90 mmHg"
    bp = re.match(r'^(blood pressure|bp)\b[^0-9]*(\d{2,3})\s*/\s*(\d{2,3})', lowered)
    if bp:
        collector.add('SystolicBP', bp.group(2), clean)
        collector.add('DiastolicBP', bp.group(3), clean)
        return

    for alias, feature in _ALIASES_BY_LENGTH:
        if not lowered.startswith(alias):
            continue
        rest = lowered[len(alias):]
        # the alias must end at a word boundary ("k" must not match "kidney")
        if rest and (rest[0].isalnum() or rest[0] in '+-'):
            continue
        feat = FEATURES_BY_NAME[feature]
        # skip separators and qualifiers such as "(CKD-EPI)" or "(mg/dL)" before the value
        qualifiers = ''
        while True:
            rest = rest.lstrip(' :=\t-–.,')
            paren = re.match(r'^\([^)]*\)', rest)
            if not paren:
                break
            qualifiers += paren.group(0)
            rest = rest[paren.end():]
        if feat['type'] == 'select':
            word = re.match(r'^([a-z][a-z /\'-]*[a-z]|\d+)', rest)
            if word:
                collector.add(feature, word.group(1).strip(), clean)
            return
        num = re.match(_NUM, rest)
        if num:
            collector.add(feature, num.group(1), clean)
            # unit written in a qualifier or right after the number (not in a later reference range)
            _check_unit(collector, feature, qualifiers + ' ' + rest[num.end():num.end() + 12])
        return


def _extract_from_lines(lines, collector):
    for line in lines:
        _parse_text_line(line, collector)


def _read_pdf_text(data):
    try:
        from pypdf import PdfReader
    except ImportError:  # pragma: no cover - dependency listed in requirements.txt
        raise ReportExtractionError('PDF reading is not available on the server (pypdf is not installed).')
    try:
        reader = PdfReader(io.BytesIO(data))
        if reader.is_encrypted:
            raise ReportExtractionError('The PDF is password-protected. Upload an unprotected copy.')
        text = '\n'.join((page.extract_text() or '') for page in reader.pages)
    except ReportExtractionError:
        raise
    except Exception:
        raise ReportExtractionError('The PDF could not be read. It may be damaged.')
    if len(re.sub(r'\s', '', text)) < 20:
        raise ReportExtractionError(
            'No readable text was found in this PDF (it is probably a scanned image). Text recognition (OCR) '
            'is not supported - enter the values manually or upload a text-based report.')
    return text


def _decode_text(data):
    for encoding in ('utf-8-sig', 'utf-16'):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode('latin-1')


def _extract_from_table(df, collector):
    """DataFrame (all strings): wide layout (feature columns) or long layout (name, value[, unit])."""
    df = df.fillna('')
    columns = [str(c) for c in df.columns]
    matched = {c: match_feature(c) for c in columns}
    feature_cols = {c: f for c, f in matched.items() if f}
    if len(feature_cols) >= 3:
        if len(df) != 1:
            raise ReportExtractionError(
                f'The file has {len(df)} data rows. A single-patient report must have exactly one row '
                '- use Batch Analysis for several patients.')
        row = df.iloc[0]
        for col, feature in feature_cols.items():
            value = str(row[col]).strip()
            if value != '':
                collector.add(feature, value, f'{col} = {value}')
        return
    if df.shape[1] < 2:
        raise ReportExtractionError('The table must have feature columns, or "test name" and "value" columns.')
    # Long layout: include the header row itself as a possible data row
    rows = [columns] + df.astype(str).values.tolist()
    for row in rows:
        cells = [str(c).strip() for c in row]
        feature = match_feature(cells[0])
        if not feature or cells[1] == '':
            continue
        unit = cells[2] if len(cells) > 2 else ''
        collector.add(feature, cells[1], ' '.join(c for c in cells[:3] if c))
        if unit:
            _check_unit(collector, feature, unit)


def read_table(data, extension):
    import pandas as pd
    try:
        if extension == '.csv':
            return pd.read_csv(io.BytesIO(data), dtype=str, keep_default_na=False, skip_blank_lines=True)
        return pd.read_excel(io.BytesIO(data), dtype=str, keep_default_na=False, engine='openpyxl')
    except ImportError:  # pragma: no cover
        raise ReportExtractionError('Excel support is not available on the server (openpyxl is not installed).')
    except Exception:
        raise ReportExtractionError('The spreadsheet could not be read. Check that it is a valid CSV/XLSX file.')


def _extract_from_json(data, collector):
    try:
        payload = json.loads(_decode_text(data))
    except ValueError:
        raise ReportExtractionError('The JSON file could not be parsed.')
    if isinstance(payload, dict) and isinstance(payload.get('features'), dict):
        payload = payload['features']
    if not isinstance(payload, dict):
        raise ReportExtractionError('The JSON file must contain an object of "feature": value pairs.')
    for key, value in payload.items():
        feature = match_feature(key)
        if feature and value is not None and not isinstance(value, (dict, list)):
            collector.add(feature, str(value), f'{key}: {value}')


def file_extension(filename):
    return os.path.splitext(str(filename or '').lower())[1]


def extract_report(filename, data):
    """
    Returns dict:
      format, fields [{name,label,unit,section,value,status,message,source}], summary counts,
      extracted_count, missing / needs_review lists. Nothing is stored.
    """
    ext = file_extension(filename)
    if ext not in SUPPORTED_REPORT_EXTENSIONS:
        raise ReportExtractionError(
            f'Unsupported file type "{ext or "unknown"}". Supported: PDF (text-based), TXT, CSV, XLSX, JSON.')
    if not data:
        raise ReportExtractionError('The uploaded file is empty.')
    if len(data) > MAX_REPORT_BYTES:
        raise ReportExtractionError('The file is larger than 5 MB.')

    collector = _Collector()
    if ext == '.pdf':
        _extract_from_lines(_read_pdf_text(data).splitlines(), collector)
    elif ext == '.txt':
        _extract_from_lines(_decode_text(data).splitlines(), collector)
    elif ext == '.json':
        _extract_from_json(data, collector)
    else:
        _extract_from_table(read_table(data, ext), collector)

    raw_values, notes = {}, {}
    for feature, candidates in collector.candidates.items():
        distinct = []
        for raw, _src in candidates:
            key = raw.strip().lower()
            if key not in [d.strip().lower() for d in distinct]:
                distinct.append(raw)
        if len(distinct) > 1:
            notes[feature] = ('ambiguous', f'Found different values in the report ({", ".join(distinct)}); '
                                            'confirm the correct one')
        else:
            raw_values[feature] = distinct[0]

    validation = validate_features(raw_values)
    fields = []
    for field in validation['fields']:
        name = field['name']
        feat = FEATURES_BY_NAME[name]
        entry = dict(field, section=feat['section'], type=feat['type'],
                     source=(collector.candidates.get(name) or [(None, None)])[0][1],
                     extracted=name in collector.candidates)
        if name in notes:
            entry.update(value=None, status='invalid', message=notes[name][1])
        elif name in collector.unit_problems and entry['status'] != 'missing':
            entry.update(value=None, status='invalid',
                         message=f'Reported in {collector.unit_problems[name]}; the model expects {feat.get("unit")}. '
                                 'Convert and enter the value manually.')
        elif entry['status'] == 'missing':
            entry['message'] = 'Not found in the report - enter it manually if available'
        fields.append(entry)

    missing = [f['name'] for f in fields if f['status'] == 'missing']
    review = [f['name'] for f in fields if f['status'] == 'invalid']
    return {
        'format': ext.lstrip('.'),
        'fields': fields,
        'extracted_count': sum(1 for f in fields if f['extracted']),
        'missing': missing,
        'needs_review': review,
        'summary': {
            'total_features': len(fields),
            'extracted': sum(1 for f in fields if f['extracted'] and f['status'] in ('ok', 'warning')),
            'needs_review': len(review),
            'missing': len(missing),
        },
    }
