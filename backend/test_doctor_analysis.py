"""
Tests for Doctor Patient Analysis (single report) and Batch Analysis.

Covers: report extraction (TXT/CSV/XLSX/JSON/text-PDF), missing/invalid values (never invented),
single prediction, batch validation & prediction with partial failures, assigned-patient
authorization, unassigned/patient/unauthenticated rejection, admin access, unified history,
PDF report generation and existing RBAC.
Run: python -m unittest -v
"""
import io
import json
import os
import unittest
from unittest import mock

import test_registration_otp as base  # sets the test environment before the app is imported
from extensions import db
from models.patient import Patient
from models.prediction import Prediction
from ml.feature_schema import FEATURE_SCHEMA, FEATURE_NAMES
from services import analysis_service as svc


def complete_features():
    """A complete, valid set of all 51 model inputs (values inside the training ranges)."""
    values = {}
    for f in FEATURE_SCHEMA:
        if f['type'] == 'select':
            values[f['name']] = min(f['options'])
        else:
            lo, hi = f['range']
            values[f['name']] = round((lo + hi) / 2, 2)
    values.update({'Age': 61, 'SerumCreatinine': 2.1, 'GFR': 45, 'SystolicBP': 142, 'BMI': 28})
    return values


def csv_bytes(header, rows):
    lines = [','.join(header)] + [','.join('' if v is None else str(v) for v in row) for row in rows]
    return ('\n'.join(lines) + '\n').encode()


LAB_TEXT = """CITY LAB - RENAL PANEL
Patient: Test
Age: 61 years
Serum Creatinine: 2.1 mg/dL (0.6-1.2)
BUN 35 mg/dL
eGFR (CKD-EPI) 45 mL/min/1.73m2
Hemoglobin A1c 7.2 %
Blood pressure: 142/91 mmHg
Sodium 140 mEq/L
"""


class DoctorAnalysisBase(base.BaseCase):
    PASSWORD = 'temp1234'

    def setUp(self):
        super().setUp()
        self.admin = self.admin_token()
        self.doc_a = self._create('doctor', 'Dr. Asha Menon', 'asha@hospital.org', doctor_id='DOC-A01')
        self.doc_b = self._create('doctor', 'Dr. Bala Iyer', 'bala@hospital.org', doctor_id='DOC-B01')
        self.p1_user = self._create('patient', 'Priya One', 'priya@gmail.com', treating_doctor_id=self.doc_a)
        self.p2_user = self._create('patient', 'Ravi Two', 'ravi@gmail.com', treating_doctor_id=self.doc_b)
        with self.app.app_context():
            self.p1 = Patient.query.filter_by(user_id=self.p1_user).first()
            self.p2 = Patient.query.filter_by(user_id=self.p2_user).first()
            self.p1_id, self.p1_code = self.p1.id, self.p1.patient_id
            self.p2_id, self.p2_code = self.p2.id, self.p2.patient_id
        self.tok_a = self.login('asha@hospital.org', self.PASSWORD, 'doctor')[1]['token']
        self.tok_b = self.login('bala@hospital.org', self.PASSWORD, 'doctor')[1]['token']
        self.tok_p1 = self.login('priya@gmail.com', self.PASSWORD, 'patient')[1]['token']

    def _create(self, role, name, email, **extra):
        status, data = self.post('/api/admin/users', {'name': name, 'email': email, 'password': self.PASSWORD,
                                                      'role': role, **extra}, self.admin)
        self.assertEqual(status, 201, data)
        return data['user']['id']

    def upload(self, url, filename, content, token, **form):
        data = {k: str(v) for k, v in form.items()}
        data['file'] = (io.BytesIO(content), filename)
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        res = self.client.post(url, data=data, headers=headers, content_type='multipart/form-data')
        return res.status_code, res.get_json()

    def prediction_count(self):
        with self.app.app_context():
            return Prediction.query.count()

    def field(self, data, name):
        return next(f for f in data['fields'] if f['name'] == name)


class SingleReportAnalysisTests(DoctorAnalysisBase):
    URL = '/api/doctor/analysis/report'

    def test_text_report_extraction_never_invents_values(self):
        status, data = self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['patient']['patient_id'], self.p1_code)
        self.assertEqual(self.field(data, 'SerumCreatinine')['value'], 2.1)
        self.assertEqual(self.field(data, 'GFR')['value'], 45)
        self.assertEqual(self.field(data, 'SystolicBP')['value'], 142)
        self.assertEqual(self.field(data, 'DiastolicBP')['value'], 91)
        self.assertEqual(self.field(data, 'HbA1c')['value'], 7.2)
        # Not in the report -> empty, marked missing (Incomplete Data), never defaulted
        smoking = self.field(data, 'Smoking')
        self.assertIsNone(smoking['value'])
        self.assertEqual(smoking['status'], 'missing')
        self.assertIn('Smoking', data['missing'])
        self.assertEqual(data['summary']['total_features'], 51)
        self.assertEqual(self.prediction_count(), 0)  # extraction saves nothing

    def test_conflicting_values_and_wrong_units_need_review(self):
        text = LAB_TEXT + 'Calcium 9.1 mg/dL\nCalcium 9.6 mg/dL\nFasting glucose 6.1 mmol/L\nPotassium 4,5\n'
        status, data = self.upload(self.URL, 'lab.txt', text.encode(), self.tok_a, patient_id=self.p1_id)
        self.assertEqual(status, 200)
        for name in ('SerumElectrolytesCalcium', 'FastingBloodSugar', 'SerumElectrolytesPotassium'):
            f = self.field(data, name)
            self.assertEqual(f['status'], 'invalid', name)   # shown as "Needs Review"
            self.assertIsNone(f['value'], name)
            self.assertIn(name, data['needs_review'])

    def test_csv_long_and_wide_layouts(self):
        long_csv = csv_bytes(['Test', 'Value', 'Unit'], [['Serum Creatinine', '1.8', 'mg/dL'], ['eGFR', '52', ''],
                                                         ['Serum Creatinine umol', '', '']])
        status, data = self.upload(self.URL, 'labs.csv', long_csv, self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(self.field(data, 'SerumCreatinine')['value'], 1.8)
        self.assertEqual(self.field(data, 'GFR')['value'], 52)

        values = complete_features()
        wide = csv_bytes(list(values), [list(values.values())])
        status, data = self.upload(self.URL, 'wide.csv', wide, self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['missing'], [])
        self.assertEqual(data['needs_review'], [])

        two_rows = csv_bytes(list(values), [list(values.values()), list(values.values())])
        status, data = self.upload(self.URL, 'two.csv', two_rows, self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 422)
        self.assertIn('Batch Analysis', data['error'])

    def test_xlsx_and_json_reports(self):
        import pandas as pd
        buf = io.BytesIO()
        pd.DataFrame([{'GFR': 40, 'SerumCreatinine': 2.4, 'BUNLevels': 30}]).to_excel(buf, index=False)
        status, data = self.upload(self.URL, 'labs.xlsx', buf.getvalue(), self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(self.field(data, 'GFR')['value'], 40)

        payload = json.dumps({'features': {'GFR': 38, 'HbA1c': 'abc'}}).encode()
        status, data = self.upload(self.URL, 'labs.json', payload, self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(self.field(data, 'GFR')['value'], 38)
        self.assertEqual(self.field(data, 'HbA1c')['status'], 'invalid')

    def test_text_pdf_extracted_and_scanned_pdf_rejected(self):
        from reportlab.lib.pagesizes import A4
        from reportlab.pdfgen import canvas
        buf = io.BytesIO()
        c = canvas.Canvas(buf, pagesize=A4)
        y = 800
        for line in LAB_TEXT.splitlines():
            c.drawString(50, y, line)
            y -= 16
        c.save()
        status, data = self.upload(self.URL, 'lab.pdf', buf.getvalue(), self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 200, data)
        self.assertEqual(self.field(data, 'SerumCreatinine')['value'], 2.1)
        self.assertEqual(self.field(data, 'GFR')['value'], 45)

        blank = io.BytesIO()
        c = canvas.Canvas(blank, pagesize=A4)
        c.rect(50, 50, 200, 200, fill=1)   # graphics only, no text layer (like a scanned image)
        c.save()
        status, data = self.upload(self.URL, 'scan.pdf', blank.getvalue(), self.tok_a, patient_id=self.p1_code)
        self.assertEqual(status, 422)
        self.assertIn('OCR', data['error'])

    def test_unsupported_or_empty_files_rejected(self):
        self.assertEqual(self.upload(self.URL, 'photo.jpg', b'\xff\xd8', self.tok_a, patient_id=self.p1_code)[0], 422)
        self.assertEqual(self.upload(self.URL, 'lab.txt', b'', self.tok_a, patient_id=self.p1_code)[0], 422)

    def test_report_upload_authorization(self):
        # unassigned patient
        self.assertEqual(self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), self.tok_a, patient_id=self.p2_code)[0], 403)
        # unknown patient
        self.assertEqual(self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), self.tok_a, patient_id='PAT-9999')[0], 404)
        # patients and anonymous users cannot use doctor analysis
        self.assertEqual(self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), self.tok_p1, patient_id=self.p1_code)[0], 403)
        self.assertEqual(self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), None, patient_id=self.p1_code)[0], 401)
        # admin keeps system-wide access
        self.assertEqual(self.upload(self.URL, 'lab.txt', LAB_TEXT.encode(), self.admin, patient_id=self.p2_code)[0], 200)


class SinglePredictionTests(DoctorAnalysisBase):
    URL = '/api/doctor/analysis/predict'

    def test_single_prediction_saved_with_audit_fields(self):
        status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': complete_features(),
                                            'source': 'single_report', 'report_reference': 'lab.pdf'}, self.tok_a)
        self.assertEqual(status, 201, data)
        pred = data['prediction']
        self.assertIn(pred['prediction_result'], ('CKD Risk', 'No CKD Risk'))
        self.assertTrue(0 <= pred['prediction_probability'] <= 1)
        self.assertEqual(pred['source'], 'single_report')
        self.assertEqual(pred['source_label'], 'Single Report')
        self.assertEqual(pred['report_reference'], 'lab.pdf')
        self.assertEqual(pred['doctor_user_id'], self.doc_a)
        self.assertEqual(pred['doctor_name'], 'Dr. Asha Menon')
        self.assertEqual(pred['patient_code'], self.p1_code)
        self.assertEqual(pred['patient_name'], 'Priya One')
        self.assertTrue(pred['model_version'])
        self.assertEqual(sorted(pred['input_features']), sorted(FEATURE_NAMES))
        self.assertIn('Not a Medical Diagnosis', data['headline'])
        self.assertIn('not a medical diagnosis', data['disclaimer'])

    def test_missing_features_block_prediction(self):
        values = complete_features()
        del values['GFR']
        values['Smoking'] = ''
        with mock.patch.object(svc, 'predict_ckd_risk') as model:
            status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': values}, self.tok_a)
        model.assert_not_called()                  # the model never sees an incomplete record
        self.assertEqual(status, 422, data)
        self.assertEqual(data['status'], 'incomplete')
        self.assertEqual(data['status_label'], 'Incomplete Data')
        self.assertEqual(sorted(data['missing']), ['GFR', 'Smoking'])
        self.assertEqual(self.prediction_count(), 0)

    def test_invalid_features_need_review(self):
        for bad in ({'GFR': 'high'}, {'SerumCreatinine': 99}, {'Gender': 7}, {'BMI': '2,5'}):
            values = {**complete_features(), **bad}
            status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': values}, self.tok_a)
            self.assertEqual(status, 422, bad)
            self.assertEqual(data['status'], 'needs_review')
            self.assertEqual(data['invalid'], list(bad))
        self.assertEqual(self.prediction_count(), 0)

    def test_out_of_training_range_is_a_warning_not_a_block(self):
        values = {**complete_features(), 'GFR': 150}   # plausible, but outside training range
        status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': values}, self.tok_a)
        self.assertEqual(status, 201, data)
        self.assertEqual([w['name'] for w in data['warnings']], ['GFR'])

    def test_prediction_authorization(self):
        body = {'patient_id': self.p2_code, 'features': complete_features()}
        self.assertEqual(self.post(self.URL, body, self.tok_a)[0], 403)           # unassigned
        self.assertEqual(self.post(self.URL, body, self.tok_p1)[0], 403)          # patient
        self.assertEqual(self.post(self.URL, body)[0], 401)                        # anonymous
        self.assertEqual(self.prediction_count(), 0)
        self.assertEqual(self.post(self.URL, body, self.tok_b)[0], 201)           # assigned doctor
        self.assertEqual(self.post(self.URL, body, self.admin)[0], 201)           # admin

    def test_manual_source_and_invalid_source(self):
        body = {'patient_id': self.p1_code, 'features': complete_features()}
        status, data = self.post(self.URL, {**body, 'source': 'manual'}, self.tok_a)
        self.assertEqual((status, data['prediction']['source_label']), (201, 'Manual Entry'))
        self.assertEqual(self.post(self.URL, {**body, 'source': 'batch'}, self.tok_a)[0], 400)

    def test_existing_prediction_endpoint_records_doctor_and_source(self):
        status, data = self.post('/api/predictions', {**complete_features(), 'patient_id': self.p1_id}, self.tok_a)
        self.assertEqual(status, 201, data)
        with self.app.app_context():
            pred = Prediction.query.order_by(Prediction.id.desc()).first()
            self.assertEqual((pred.doctor_user_id, pred.source), (self.doc_a, 'manual'))

    def test_unassigned_doctor_cannot_use_existing_shap_or_report_endpoints(self):
        status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': complete_features()}, self.tok_a)
        pred_id = data['prediction']['id']
        self.assertEqual(self.post(f'/api/predictions/{pred_id}/explanation', {}, self.tok_b)[0], 403)
        self.assertEqual(self.post(f'/api/reports/{pred_id}', {}, self.tok_b)[0], 403)
        self.assertEqual(self.post(f'/api/reports/{pred_id}', {}, self.tok_p1)[0], 403)

    @unittest.skipUnless(base.SHAP_AVAILABLE, 'PDF generation uses SHAP; shap is not installed here')
    def test_pdf_report_generated_for_analysis_prediction(self):
        import tempfile, shutil, sys as _sys
        report_service = _sys.modules.get('report_service') or _sys.modules.get('services.report_service')
        original = report_service.REPORTS_PDF_DIR
        report_service.REPORTS_PDF_DIR = tempfile.mkdtemp(prefix='ckd_reports_test_')
        try:
            status, data = self.post(self.URL, {'patient_id': self.p1_code, 'features': complete_features()}, self.tok_a)
            pred_id = data['prediction']['id']
            status, rep = self.post(f'/api/reports/{pred_id}', {}, self.tok_a)
            self.assertEqual(status, 201, rep)
            res = self.client.get(f"/api/reports/{rep['report_id']}/download", headers={'Authorization': f'Bearer {self.tok_a}'})
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.data.startswith(b'%PDF'))
            res.close()
        finally:
            shutil.rmtree(report_service.REPORTS_PDF_DIR, ignore_errors=True)
            report_service.REPORTS_PDF_DIR = original


class BatchAnalysisTests(DoctorAnalysisBase):
    VALIDATE = '/api/doctor/analysis/batch/validate'
    PREDICT = '/api/doctor/analysis/batch/predict'

    def batch_file(self, rows):
        header = ['PatientID'] + FEATURE_NAMES
        return csv_bytes(header, [[pid] + [values.get(n, '') for n in FEATURE_NAMES] for pid, values in rows])

    def mixed_rows(self):
        good = complete_features()
        incomplete = {**good, 'GFR': '', 'HbA1c': ''}
        review = {**good, 'SerumCreatinine': 'abc'}
        return [(self.p1_code, good), (str(self.p1_id), good), (self.p1_code, incomplete),
                (self.p1_code, review), ('PAT-9999', good), (self.p2_code, good)]

    def test_batch_validation_statuses_and_summary(self):
        before = self.prediction_count()
        status, data = self.upload(self.VALIDATE, 'batch.csv', self.batch_file(self.mixed_rows()), self.tok_a)
        self.assertEqual(status, 200, data)
        self.assertEqual([r['status'] for r in data['rows']],
                         ['valid', 'valid', 'incomplete', 'needs_review', 'invalid', 'invalid'])
        self.assertEqual(data['summary'], {'total': 6, 'valid': 2, 'incomplete': 1, 'needs_review': 1, 'invalid': 2})
        self.assertEqual([r['row_number'] for r in data['rows']], [2, 3, 4, 5, 6, 7])
        # unknown and unassigned patients get the same message and expose no patient data
        unknown, unassigned = data['rows'][4], data['rows'][5]
        self.assertEqual(unknown['reason'], unassigned['reason'])
        self.assertIsNone(unassigned['patient'])
        self.assertNotIn('Ravi', json.dumps(data))
        self.assertEqual(data['rows'][0]['patient']['name'], 'Priya One')
        self.assertEqual(self.prediction_count(), before)   # validation saves nothing

    def test_corrected_rows_can_be_revalidated(self):
        _, data = self.upload(self.VALIDATE, 'batch.csv', self.batch_file(self.mixed_rows()), self.tok_a)
        review_row = data['rows'][3]
        self.assertEqual(review_row['status'], 'needs_review')
        review_row['features']['SerumCreatinine'] = '1.9'          # doctor corrects the value
        status, again = self.post(self.VALIDATE, {'rows': [review_row]}, self.tok_a)
        self.assertEqual(status, 200, again)
        self.assertEqual(again['rows'][0]['status'], 'valid')
        self.assertEqual(self.post(self.VALIDATE, {'rows': [review_row]}, self.tok_p1)[0], 403)

    def test_xlsx_batch_and_missing_columns(self):
        import pandas as pd
        good = complete_features()
        partial = {k: v for k, v in good.items() if k != 'ACR'}
        buf = io.BytesIO()
        pd.DataFrame([{'Patient ID': self.p1_code, **partial}]).to_excel(buf, index=False)
        status, data = self.upload(self.VALIDATE, 'batch.xlsx', buf.getvalue(), self.tok_a)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['missing_columns'], ['ACR'])
        self.assertEqual(data['rows'][0]['status'], 'incomplete')

    def test_invalid_batch_files(self):
        no_patient_col = csv_bytes(FEATURE_NAMES, [[1] * len(FEATURE_NAMES)])
        self.assertEqual(self.upload(self.VALIDATE, 'b.csv', no_patient_col, self.tok_a)[0], 422)
        self.assertEqual(self.upload(self.VALIDATE, 'b.pdf', b'%PDF-1.4', self.tok_a)[0], 422)
        with mock.patch.object(svc, 'MAX_BATCH_ROWS', 2):
            rows = [(self.p1_code, complete_features())] * 3
            status, data = self.upload(self.VALIDATE, 'b.csv', self.batch_file(rows), self.tok_a)
        self.assertEqual(status, 422)
        self.assertIn('maximum', data['error'])

    def test_batch_prediction_only_runs_valid_rows(self):
        _, validated = self.upload(self.VALIDATE, 'batch.csv', self.batch_file(self.mixed_rows()), self.tok_a)
        status, data = self.post(self.PREDICT, {'file_name': 'batch.csv', 'rows': validated['rows']}, self.tok_a)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['summary']['predicted'], 2)
        self.assertEqual((data['summary']['incomplete'], data['summary']['needs_review'], data['summary']['invalid']), (1, 1, 2))
        self.assertEqual(self.prediction_count(), 2)
        predicted = [r for r in data['rows'] if r['status'] == 'predicted']
        self.assertTrue(all(r['prediction']['batch_id'] == data['batch_id'] for r in predicted))
        self.assertEqual(predicted[0]['prediction']['source'], 'batch')
        self.assertEqual(predicted[0]['prediction']['report_reference'], 'batch.csv (row 2)')
        self.assertIn(predicted[0]['status_label'], ('CKD Risk', 'No CKD Risk'))
        self.assertNotIn('Ravi', json.dumps(data))          # unassigned patient's data never returned
        with self.app.app_context():
            self.assertEqual(Prediction.query.filter_by(patient_id=self.p2_id).count(), 0)
        csv_text = svc.results_csv(data['rows'])
        self.assertIn('Patient ID', csv_text.splitlines()[0])
        self.assertEqual(len(csv_text.strip().splitlines()), 7)

    def test_results_csv_neutralises_formulas(self):
        text = svc.results_csv([{'row_number': 2, 'patient_ref': '=HYPERLINK("x")', 'status_label': 'Failed'}])
        self.assertIn("'=HYPERLINK", text)

    def test_server_revalidates_tampered_rows(self):
        tampered = [{'row_number': 2, 'patient_ref': self.p1_code, 'status': 'valid',
                     'features': {'GFR': 45}},                                    # client claims valid
                    {'row_number': 3, 'patient_ref': self.p2_code, 'status': 'valid',
                     'features': complete_features()}]                            # unassigned patient
        status, data = self.post(self.PREDICT, {'rows': tampered}, self.tok_a)
        self.assertEqual(status, 200)
        self.assertEqual([r['status'] for r in data['rows']], ['incomplete', 'invalid'])
        self.assertEqual(self.prediction_count(), 0)

    def test_partial_model_failure_does_not_fail_batch(self):
        rows = [{'row_number': n, 'patient_ref': self.p1_code, 'features': complete_features()} for n in (2, 3, 4)]
        real = svc.predict_ckd_risk
        calls = {'n': 0}

        def flaky(features):
            calls['n'] += 1
            if calls['n'] == 2:
                raise RuntimeError('model crashed')
            return real(features)

        with mock.patch.object(svc, 'predict_ckd_risk', side_effect=flaky):
            status, data = self.post(self.PREDICT, {'rows': rows}, self.tok_a)
        self.assertEqual(status, 200)
        self.assertEqual([r['status'] for r in data['rows']], ['predicted', 'failed', 'predicted'])
        self.assertEqual(data['summary']['failed'], 1)
        self.assertEqual(self.prediction_count(), 2)
        # retry the failed row later
        status, data = self.post(self.PREDICT, {'rows': [rows[1]]}, self.tok_a)
        self.assertEqual(data['rows'][0]['status'], 'predicted')
        self.assertEqual(self.prediction_count(), 3)

    def test_hundred_row_example(self):
        good = complete_features()
        rows = ([{'row_number': i, 'patient_ref': self.p1_code, 'features': good} for i in range(93)]
                + [{'row_number': 100 + i, 'patient_ref': self.p1_code, 'features': {**good, 'GFR': ''}} for i in range(5)]
                + [{'row_number': 200 + i, 'patient_ref': 'PAT-0000', 'features': good} for i in range(2)])
        status, data = self.post(self.PREDICT, {'rows': rows}, self.tok_a)
        self.assertEqual(status, 200)
        s = data['summary']
        self.assertEqual((s['total'], s['predicted'], s['incomplete'], s['invalid']), (100, 93, 5, 2))

    def test_batch_authorization(self):
        body = csv_bytes(['PatientID'] + FEATURE_NAMES, [[self.p2_code] + list(complete_features().values())])
        self.assertEqual(self.upload(self.VALIDATE, 'b.csv', body, self.tok_p1)[0], 403)
        self.assertEqual(self.upload(self.VALIDATE, 'b.csv', body, None)[0], 401)
        rows = [{'row_number': 2, 'patient_ref': self.p2_code, 'features': complete_features()}]
        self.assertEqual(self.post(self.PREDICT, {'rows': rows}, self.tok_p1)[0], 403)
        status, data = self.post(self.PREDICT, {'rows': rows}, self.admin)     # admin: system-wide
        self.assertEqual(data['summary']['predicted'], 1)


class HistoryTests(DoctorAnalysisBase):
    URL = '/api/doctor/analysis/history'

    def test_history_combines_sources_and_is_scoped(self):
        feats = complete_features()
        self.post('/api/doctor/analysis/predict', {'patient_id': self.p1_code, 'features': feats,
                                                   'report_reference': 'lab.pdf'}, self.tok_a)
        self.post('/api/doctor/analysis/batch/predict', {'file_name': 'b.csv', 'rows': [
            {'row_number': 2, 'patient_ref': self.p1_code, 'features': feats}]}, self.tok_a)
        self.post('/api/predictions', {**feats, 'patient_id': self.p1_id}, self.tok_a)
        self.post('/api/doctor/analysis/predict', {'patient_id': self.p2_code, 'features': feats}, self.tok_b)

        status, data = self.get(self.URL, self.tok_a)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['count'], 3)                              # only doctor A's patient
        self.assertEqual(sorted(p['source_label'] for p in data['predictions']),
                         ['Batch Analysis', 'Manual Entry', 'Single Report'])
        for p in data['predictions']:
            self.assertEqual((p['patient_code'], p['doctor_name']), (self.p1_code, 'Dr. Asha Menon'))
            for key in ('prediction_id', 'prediction_result', 'prediction_probability', 'model_name',
                        'input_features', 'created_at', 'source', 'report_reference'):
                self.assertIn(key, p)
        self.assertEqual(self.get(self.URL + '?source=batch', self.tok_a)[1]['count'], 1)
        self.assertEqual(self.get(self.URL, self.admin)[1]['count'], 4)   # admin: all
        self.assertEqual(self.get(self.URL, self.tok_p1)[0], 403)          # patient
        self.assertEqual(self.get(self.URL)[0], 401)

    def test_patient_portal_unchanged(self):
        self.post('/api/doctor/analysis/predict', {'patient_id': self.p1_code, 'features': complete_features()}, self.tok_a)
        status, data = self.get('/api/patient/overview', self.tok_p1)
        self.assertEqual(status, 200)
        self.assertIn(data['latest_prediction']['result'], ('CKD Risk', 'No CKD Risk'))
        self.assertEqual(self.get('/api/analytics/model-comparison', self.tok_p1)[0], 403)
        self.assertEqual(self.post('/api/predictions', complete_features(), self.tok_p1)[0], 403)


if __name__ == '__main__':
    unittest.main()
