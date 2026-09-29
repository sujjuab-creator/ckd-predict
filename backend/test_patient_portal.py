"""
Patient portal authorization tests.

Covers: patient can read only their own profile / doctor / reports / reviews /
notifications; patients cannot run predictions or generate reports (403 from
the API itself, not just hidden buttons); patients cannot read another
patient's data by changing IDs; doctors can still predict and review their
assigned patients; admin management keeps working.

Run: python -m unittest -v
"""
import unittest

import test_registration_otp as base  # sets test env vars before the app is imported
from extensions import db
from models.user import User
from models.patient import Patient
from models.report import Report
from models.care import DoctorReview, Notification


class PatientPortalTests(base.BaseCase):
    PASSWORD = 'temp1234'

    def setUp(self):
        super().setUp()
        self.admin = self.admin_token()
        self.doc_a_id = self._create('doctor', 'Dr. Asha Menon', 'asha@hospital.org', doctor_id='DOC-A01',
                                     specialty='Nephrology')
        self.doc_b_id = self._create('doctor', 'Dr. Bala Iyer', 'bala@hospital.org', doctor_id='DOC-B01')
        self.p1_user = self._create('patient', 'Priya One', 'priya@gmail.com', treating_doctor_id=self.doc_a_id)
        self.p2_user = self._create('patient', 'Ravi Two', 'ravi@gmail.com', treating_doctor_id=self.doc_b_id)
        with self.app.app_context():
            self.p1 = Patient.query.filter_by(user_id=self.p1_user).first().id
            self.p2 = Patient.query.filter_by(user_id=self.p2_user).first().id

        self.tok_p1 = self.login('priya@gmail.com', self.PASSWORD, 'patient')[1]['token']
        self.tok_p2 = self.login('ravi@gmail.com', self.PASSWORD, 'patient')[1]['token']
        self.tok_da = self.login('asha@hospital.org', self.PASSWORD, 'doctor')[1]['token']
        self.tok_db = self.login('bala@hospital.org', self.PASSWORD, 'doctor')[1]['token']

        # Clinical staff create predictions (patients cannot).
        self.pred1 = self._predict(self.p1, self.tok_da)
        self.pred2 = self._predict(self.p2, self.tok_db)
        # Report rows are inserted directly: PDF generation needs the real SHAP package,
        # which is covered separately in test_registration_otp.
        with self.app.app_context():
            r1 = Report(report_id='RPT-9001', patient_id=self.p1, prediction_id=self.pred1, status='generated')
            r2 = Report(report_id='RPT-9002', patient_id=self.p2, prediction_id=self.pred2, status='generated')
            db.session.add_all([r1, r2])
            db.session.commit()
            self.rep1, self.rep2 = r1.id, r2.id

    # ---- helpers -------------------------------------------------------
    def _create(self, role, name, email, **extra):
        status, data = self.post('/api/admin/users', {'name': name, 'email': email, 'password': self.PASSWORD,
                                                      'role': role, **extra}, self.admin)
        self.assertEqual(status, 201, data)
        return data['user']['id']

    def _features(self):
        values = {f: 1.0 for f in base.FEATURES}
        values.update({'Age': 60, 'SerumCreatinine': 2.1, 'GFR': 45, 'SystolicBP': 140, 'BMI': 28})
        return values

    def _predict(self, patient_id, token):
        status, data = self.post('/api/predictions', {**self._features(), 'patient_id': patient_id}, token)
        self.assertEqual(status, 201, data)
        return data['id'] if 'id' in data else int(str(data['prediction_id']).replace('PRED-', ''))

    def put(self, url, body, token):
        res = self.client.put(url, json=body, headers={'Authorization': f'Bearer {token}'})
        return res.status_code, res.get_json()

    def delete(self, url, token):
        res = self.client.delete(url, headers={'Authorization': f'Bearer {token}'})
        return res.status_code, res.get_json()

    # ---- patient reads own data ----------------------------------------
    def test_patient_login_and_profile_shows_own_record_and_doctor(self):
        status, data = self.get('/api/patient/profile', self.tok_p1)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['user']['email'], 'priya@gmail.com')
        self.assertEqual(data['patient']['id'], self.p1)
        self.assertEqual(data['doctor']['name'], 'Dr. Asha Menon')
        self.assertEqual(data['doctor']['doctor_id'], 'DOC-A01')
        self.assertEqual(data['doctor']['specialty'], 'Nephrology')
        self.assertNotIn('Bala', str(data))  # never another patient's doctor

    def test_patient_overview_uses_own_data(self):
        status, data = self.get('/api/patient/overview', self.tok_p1)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['patient']['id'], self.p1)
        self.assertEqual(data['report_count'], 1)
        self.assertEqual(data['latest_report']['report_id'], 'RPT-9001')
        self.assertEqual(data['latest_prediction']['id'], self.pred1)
        self.assertEqual(data['review_status'], 'Awaiting review')
        self.assertIn('unread_notifications', data)

    def test_patient_sees_only_own_reports(self):
        status, data = self.get('/api/patient/reports', self.tok_p1)
        self.assertEqual(status, 200, data)
        self.assertEqual([r['report_id'] for r in data['reports']], ['RPT-9001'])
        self.assertNotIn('report_path', data['reports'][0])
        self.assertIsNotNone(data['reports'][0]['prediction'])
        # generic list endpoint is also scoped for patients
        status, data = self.get('/api/reports', self.tok_p1)
        self.assertEqual(status, 200, data)
        self.assertEqual({r['patient_id'] for r in data['reports']}, {self.p1})
        # own detail works
        self.assertEqual(self.get(f'/api/patient/reports/{self.rep1}', self.tok_p1)[0], 200)
        self.assertEqual(self.get(f'/api/reports/{self.rep1}', self.tok_p1)[0], 200)

    # ---- patient cannot reach other patients ---------------------------
    def test_patient_cannot_access_another_patients_report(self):
        self.assertEqual(self.get(f'/api/patient/reports/{self.rep2}', self.tok_p1)[0], 403)
        self.assertEqual(self.get('/api/patient/reports/RPT-9002', self.tok_p1)[0], 403)
        self.assertEqual(self.get(f'/api/reports/{self.rep2}', self.tok_p1)[0], 403)
        res = self.client.get(f'/api/reports/{self.rep2}/download', headers={'Authorization': f'Bearer {self.tok_p1}'})
        self.assertEqual(res.status_code, 403)
        res.close()

    def test_patient_cannot_access_another_patients_information(self):
        self.assertEqual(self.get('/api/patients', self.tok_p1)[0], 403)
        self.assertEqual(self.get(f'/api/patients/{self.p2}', self.tok_p1)[0], 403)
        self.assertEqual(self.get(f'/api/patients/{self.p2}/predictions', self.tok_p1)[0], 403)
        self.assertEqual(self.get(f'/api/patients/{self.p1}', self.tok_p1)[0], 200)
        self.assertEqual(self.get(f'/api/patients/{self.p1}/predictions', self.tok_p1)[0], 200)
        # reviews list is forced to the caller's own record
        status, data = self.get(f'/api/reviews?patient_id={self.p1}', self.tok_p2)
        self.assertEqual(status, 200)
        self.assertTrue(all(r['patient_id'] == self.p2 for r in data['reviews']))

    def test_unauthenticated_requests_are_rejected(self):
        for url in (f'/api/patients/{self.p1}', f'/api/reports/{self.rep1}', '/api/patient/profile',
                    '/api/notifications', '/api/predictions'):
            self.assertEqual(self.get(url)[0], 401, url)
        self.assertEqual(self.post('/api/predictions', {**self._features(), 'patient_id': self.p1})[0], 401)

    # ---- patient cannot run predictions or change records --------------
    def test_patient_cannot_run_prediction(self):
        status, data = self.post('/api/predictions', {**self._features(), 'patient_id': self.p1}, self.tok_p1)
        self.assertEqual(status, 403, data)
        self.assertEqual(self.get('/api/predictions', self.tok_p1)[0], 403)
        self.assertEqual(self.post(f'/api/predictions/{self.pred1}/explanation', {}, self.tok_p1)[0], 403)
        self.assertEqual(self.post(f'/api/reports/{self.pred1}', {}, self.tok_p1)[0], 403)

    def test_patient_portal_is_patient_only(self):
        self.assertEqual(self.get('/api/patient/profile', self.tok_da)[0], 403)
        self.assertEqual(self.get('/api/patient/overview', self.admin)[0], 403)

    # ---- doctor reviews -------------------------------------------------
    def test_reviews_only_by_assigned_doctor_and_read_only_for_patients(self):
        body = {'patient_id': self.p1, 'report_id': self.rep1, 'review_text': 'Kidney function is stable.',
                'recommendations': 'Repeat creatinine test in 3 months.'}
        self.assertEqual(self.post('/api/reviews', body, self.tok_p1)[0], 403)   # patient cannot write
        self.assertEqual(self.post('/api/reviews', body, self.tok_db)[0], 403)   # not the treating doctor
        status, data = self.post('/api/reviews', body, self.tok_da)
        self.assertEqual(status, 201, data)
        review_id = data['review']['id']
        self.assertEqual(data['review']['prediction_id'], self.pred1)  # linked via report

        status, data = self.get('/api/patient/reviews', self.tok_p1)
        self.assertEqual((status, data['count']), (200, 1))
        self.assertEqual(data['reviews'][0]['doctor_name'], 'Dr. Asha Menon')
        self.assertEqual(data['reviews'][0]['recommendations'], 'Repeat creatinine test in 3 months.')
        self.assertEqual(self.get('/api/patient/reviews', self.tok_p2)[1]['count'], 0)
        self.assertEqual(self.get('/api/patient/overview', self.tok_p1)[1]['review_status'], 'Reviewed')

        self.assertEqual(self.put(f'/api/reviews/{review_id}', {'review_text': 'changed'}, self.tok_p1)[0], 403)
        self.assertEqual(self.delete(f'/api/reviews/{review_id}', self.tok_p1)[0], 403)
        self.assertEqual(self.put(f'/api/reviews/{review_id}', {'review_text': 'changed'}, self.tok_db)[0], 403)
        self.assertEqual(self.put(f'/api/reviews/{review_id}', {'review_text': 'Updated review text'}, self.tok_da)[0], 200)

        # A doctor cannot attach another patient's report to a review
        bad = {**body, 'report_id': self.rep2}
        self.assertEqual(self.post('/api/reviews', bad, self.tok_da)[0], 400)

        # the treating doctor can review; an unassigned doctor cannot even read the reviews
        self.assertTrue(self.get(f'/api/reviews?patient_id={self.p1}', self.tok_da)[1]['can_review'])
        self.assertEqual(self.get(f'/api/reviews?patient_id={self.p1}', self.tok_db)[0], 403)

    # ---- notifications --------------------------------------------------
    def test_notifications_are_real_and_private(self):
        self.assertEqual(self.get('/api/notifications', self.tok_p1)[1]['count'], 0)  # nothing fake
        self.post('/api/reviews', {'patient_id': self.p1, 'review_text': 'Looks good overall.'}, self.tok_da)
        status, data = self.get('/api/notifications', self.tok_p1)
        self.assertEqual((status, data['unread_count']), (200, 1))
        note_id = data['notifications'][0]['id']
        self.assertEqual(data['notifications'][0]['type'], 'review')
        self.assertEqual(self.get('/api/notifications', self.tok_p2)[1]['count'], 0)
        self.assertEqual(self.post(f'/api/notifications/{note_id}/read', {}, self.tok_p2)[0], 404)
        self.assertEqual(self.post(f'/api/notifications/{note_id}/read', {}, self.tok_p1)[0], 200)
        self.assertEqual(self.get('/api/patient/overview', self.tok_p1)[1]['unread_notifications'], 0)

    def test_password_change_creates_security_notification(self):
        status, _ = self.post('/api/auth/change-password', {'new_password': 'NewPass123'}, self.tok_p1)
        self.assertEqual(status, 200)
        data = self.get('/api/notifications', self.tok_p1)[1]
        self.assertEqual(data['notifications'][0]['type'], 'security')
        self.assertNotIn('NewPass123', str(data))

    # ---- doctor + admin functionality retained --------------------------
    def test_doctor_can_still_predict_and_view_history(self):
        status, data = self.post('/api/predictions', {**self._features(), 'patient_id': self.p1}, self.tok_da)
        self.assertEqual(status, 201, data)
        self.assertIn(data['prediction_result'], ('CKD Risk', 'No CKD Risk'))
        self.assertEqual(self.get('/api/predictions', self.tok_da)[0], 200)
        self.assertEqual(self.get('/api/patients', self.tok_da)[0], 200)
        status, data = self.get(f'/api/patients/{self.p1}/predictions', self.tok_da)
        self.assertEqual((status, data['count']), (200, 2))

    def test_prediction_requires_existing_patient(self):
        status, _ = self.post('/api/predictions', self._features(), self.tok_da)
        self.assertEqual(status, 400)
        status, _ = self.post('/api/predictions', {**self._features(), 'patient_id': 99999}, self.tok_da)
        self.assertEqual(status, 404)

    @unittest.skipUnless(base.SHAP_AVAILABLE, 'report generation uses SHAP; shap package not installed here')
    def test_doctor_can_generate_report_and_patient_is_notified(self):
        import tempfile, shutil, sys
        report_service = sys.modules.get('report_service') or sys.modules.get('services.report_service')
        original = report_service.REPORTS_PDF_DIR
        report_service.REPORTS_PDF_DIR = tempfile.mkdtemp(prefix='ckd_reports_test_')
        try:
            status, rep = self.post(f'/api/reports/{self.pred1}', {}, self.tok_da)
            self.assertEqual(status, 201, rep)
            notes = self.get('/api/notifications', self.tok_p1)[1]['notifications']
            self.assertTrue(any(n['type'] == 'report' for n in notes))
        finally:
            shutil.rmtree(report_service.REPORTS_PDF_DIR, ignore_errors=True)
            report_service.REPORTS_PDF_DIR = original

    def test_admin_management_still_works_and_reassignment_moves_review_rights(self):
        self.assertEqual(self.get('/api/admin/users', self.admin)[0], 200)
        status, data = self.put(f'/api/admin/users/{self.p1_user}', {'treating_doctor_id': self.doc_b_id}, self.admin)
        self.assertEqual(status, 200, data)
        body = {'patient_id': self.p1, 'review_text': 'Second opinion.'}
        self.assertEqual(self.post('/api/reviews', body, self.tok_da)[0], 403)
        self.assertEqual(self.post('/api/reviews', body, self.tok_db)[0], 201)
        self.assertEqual(self.get('/api/patient/profile', self.tok_p1)[1]['doctor']['doctor_id'], 'DOC-B01')
        self.assertEqual(self.post(f'/api/admin/users/{self.p2_user}/toggle-status', {}, self.admin)[0], 200)
        self.assertEqual(self.post(f'/api/admin/users/{self.p2_user}/reset-password',
                                   {'new_password': 'Reset1234'}, self.admin)[0], 200)

    # ---- doctor access limited to assigned patients ----------------------
    def test_doctor_can_access_assigned_patient(self):
        status, data = self.get('/api/patients', self.tok_da)
        self.assertEqual(status, 200)
        self.assertEqual({p['id'] for p in data['patients']}, {self.p1})
        self.assertEqual(self.get(f'/api/patients/{self.p1}', self.tok_da)[0], 200)
        status, data = self.get(f'/api/patients/{self.p1}/predictions', self.tok_da)
        self.assertEqual((status, data['count']), (200, 1))
        self.assertEqual(self.get(f'/api/reports/{self.rep1}', self.tok_da)[0], 200)
        # list endpoints only contain the doctor's own patients
        self.assertEqual({p['patient_id'] for p in self.get('/api/predictions', self.tok_da)[1]['predictions']}, {self.p1})
        self.assertEqual({r['patient_id'] for r in self.get('/api/reports', self.tok_da)[1]['reports']}, {self.p1})

    def test_doctor_cannot_access_unassigned_patient(self):
        self.assertEqual(self.get(f'/api/patients/{self.p2}', self.tok_da)[0], 403)
        self.assertEqual(self.get(f'/api/patients/{self.p2}/predictions', self.tok_da)[0], 403)
        self.assertEqual(self.get(f'/api/reviews?patient_id={self.p2}', self.tok_da)[0], 403)
        self.assertEqual(self.post(f'/api/predictions/{self.pred2}/explanation', {}, self.tok_da)[0], 403)

    def test_doctor_cannot_run_prediction_for_unassigned_patient(self):
        status, data = self.post('/api/predictions', {**self._features(), 'patient_id': self.p2}, self.tok_da)
        self.assertEqual(status, 403, data)
        self.assertEqual(self.get(f'/api/patients/{self.p2}/predictions', self.admin)[1]['count'], 1)  # nothing stored

    def test_doctor_cannot_access_unassigned_patients_report(self):
        self.assertEqual(self.get(f'/api/reports/{self.rep2}', self.tok_da)[0], 403)
        res = self.client.get(f'/api/reports/{self.rep2}/download', headers={'Authorization': f'Bearer {self.tok_da}'})
        self.assertEqual(res.status_code, 403)
        res.close()
        self.assertEqual(self.post(f'/api/reports/{self.pred2}', {}, self.tok_da)[0], 403)

    def test_doctor_cannot_create_or_change_review_for_unassigned_patient(self):
        self.assertEqual(self.post('/api/reviews', {'patient_id': self.p2, 'review_text': 'Not my patient.'}, self.tok_da)[0], 403)
        status, data = self.post('/api/reviews', {'patient_id': self.p1, 'review_text': 'Initial review.'}, self.tok_da)
        self.assertEqual(status, 201)
        review_id = data['review']['id']
        # after the patient is reassigned, the former doctor can no longer edit or delete it
        self.put(f'/api/admin/users/{self.p1_user}', {'treating_doctor_id': self.doc_b_id}, self.admin)
        self.assertEqual(self.put(f'/api/reviews/{review_id}', {'review_text': 'Edited later.'}, self.tok_da)[0], 403)
        self.assertEqual(self.delete(f'/api/reviews/{review_id}', self.tok_da)[0], 403)

    def test_admin_can_access_all_patients(self):
        status, data = self.get('/api/patients', self.admin)
        self.assertEqual({p['id'] for p in data['patients']}, {self.p1, self.p2})
        for pid in (self.p1, self.p2):
            self.assertEqual(self.get(f'/api/patients/{pid}', self.admin)[0], 200)
            self.assertEqual(self.get(f'/api/patients/{pid}/predictions', self.admin)[0], 200)
        for rid in (self.rep1, self.rep2):
            self.assertEqual(self.get(f'/api/reports/{rid}', self.admin)[0], 200)
        self.assertEqual(len(self.get('/api/predictions', self.admin)[1]['predictions']), 2)
        self.assertEqual(len(self.get('/api/reports', self.admin)[1]['reports']), 2)

    def test_patient_can_access_own_data(self):
        self.assertEqual(self.get(f'/api/patients/{self.p1}', self.tok_p1)[0], 200)
        self.assertEqual(self.get(f'/api/reports/{self.rep1}', self.tok_p1)[0], 200)
        self.assertEqual(self.get('/api/patient/profile', self.tok_p1)[1]['patient']['id'], self.p1)
        self.assertEqual(self.get(f'/api/reviews?patient_id={self.p2}', self.tok_p1)[0], 200)  # forced to own record

    # ---- analytics authorization ----------------------------------------
    def test_patient_cannot_access_analytics(self):
        self.assertEqual(self.get('/api/analytics', self.tok_p1)[0], 403)
        self.assertEqual(self.get('/api/analytics/model-comparison', self.tok_p1)[0], 403)

    def test_unauthenticated_user_cannot_access_analytics(self):
        self.assertEqual(self.get('/api/analytics')[0], 401)
        self.assertEqual(self.get('/api/analytics/model-comparison')[0], 401)

    def test_admin_can_access_system_analytics(self):
        status, data = self.get('/api/analytics', self.admin)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['scope'], 'system')
        self.assertEqual((data['total_patients'], data['total_predictions'], data['total_reports']), (2, 2, 2))
        self.assertEqual(data['total_doctors'], 2)
        self.assertIn('total_users', data)
        self.assertEqual(self.get('/api/analytics/model-comparison', self.admin)[0], 200)

    def test_doctor_analytics_limited_to_assigned_patients(self):
        status, data = self.get('/api/analytics', self.tok_da)
        self.assertEqual(status, 200, data)
        self.assertEqual(data['scope'], 'assigned_patients')
        self.assertEqual((data['total_patients'], data['total_predictions'], data['total_reports']), (1, 1, 1))
        self.assertNotIn('total_users', data)
        self.assertNotIn('total_doctors', data)
        self.assertEqual(self.get('/api/analytics/model-comparison', self.tok_da)[0], 200)

    # ---- Patient CSV Validation and Prediction tests -------------------
    def test_patient_csv_validation_and_prediction(self):
        import io
        import csv
        from ml.feature_schema import FEATURE_SCHEMA
        features = {}
        for f in FEATURE_SCHEMA:
            if f['type'] == 'select':
                features[f['name']] = min(f['options'])
            else:
                lo, hi = f['range']
                features[f['name']] = round((lo + hi) / 2, 2)
        features.update({'Age': 61, 'SerumCreatinine': 2.1, 'GFR': 45, 'SystolicBP': 142, 'BMI': 28})

        # Build valid CSV with matching patient ID header
        with self.app.app_context():
            p1_record = Patient.query.get(self.p1)
            p1_code = p1_record.patient_id

        csv_data = {'PatientID': p1_code, **features}
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(list(csv_data.keys()))
        writer.writerow(list(csv_data.values()))
        csv_bytes = buf.getvalue().encode('utf-8')

        # 1. Test Validate CSV endpoint
        response = self.client.post(
            '/api/patient/validate-csv',
            data={'file': (io.BytesIO(csv_bytes), 'patient_data.csv')},
            content_type='multipart/form-data',
            headers={'Authorization': f'Bearer {self.tok_p1}'}
        )
        self.assertEqual(response.status_code, 200)
        val_res = response.get_json()
        self.assertTrue(val_res['success'])
        self.assertEqual(val_res['status'], 'Valid CSV')

        # 2. Test Patient Predict CSV endpoint
        status, pred_res = self.post('/api/patient/predict-csv', {
            'features': val_res['parsed_values'],
            'file_name': 'patient_data.csv'
        }, self.tok_p1)
        self.assertEqual(status, 201)
        self.assertTrue(pred_res['success'])
        self.assertIn(pred_res['prediction_result'], ('CKD Risk', 'No CKD Risk'))
        self.assertIn('report', pred_res)
        self.assertIn('download_url', pred_res['report'])

    def test_patient_csv_scoping_enforcement(self):
        import io
        import csv
        features = self._features()

        # Build CSV with ANOTHER patient's ID (e.g. PAT-9999 or p2's ID)
        csv_data = {'PatientID': 'PAT-9999', **features}
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(list(csv_data.keys()))
        writer.writerow(list(csv_data.values()))
        csv_bytes = buf.getvalue().encode('utf-8')

        response = self.client.post(
            '/api/patient/validate-csv',
            data={'file': (io.BytesIO(csv_bytes), 'patient_data.csv')},
            content_type='multipart/form-data',
            headers={'Authorization': f'Bearer {self.tok_p1}'}
        )
        self.assertEqual(response.status_code, 403)
        res_data = response.get_json()
        self.assertFalse(res_data['success'])
        self.assertIn('does not match your assigned patient ID', res_data['error'])

    def test_report_download_filename_format(self):
        import re
        from routes.reports import get_report_download_filename
        from datetime import datetime, timezone, timedelta

        # 1. Test helper function with specific patient name and time
        IST = timezone(timedelta(hours=5, minutes=30))
        fixed_dt = datetime(2026, 9, 27, 14, 35, 22, tzinfo=IST)

        class DummyUser:
            name = "Rahul Sharma"
        class DummyPatient:
            patient_id = "PAT-0001"

        fname = get_report_download_filename(DummyPatient(), DummyUser(), now_dt=fixed_dt)
        self.assertEqual(fname, "Rahul_Sharma_CKD_Report_2026-09-27_14-35-22.pdf")

        # 2. Test actual download endpoint Content-Disposition header for Patient
        res = self.client.get(
            f'/api/reports/{self.rep1}/download',
            headers={'Authorization': f'Bearer {self.tok_p1}'}
        )
        self.assertEqual(res.status_code, 200)
        disp = res.headers.get('Content-Disposition', '')
        self.assertIn('Priya_One_CKD_Report_', disp)
        self.assertIn('.pdf', disp)

        # 3. Test Doctor download gets the same formatted filename
        res_doc = self.client.get(
            f'/api/reports/{self.rep1}/download',
            headers={'Authorization': f'Bearer {self.tok_da}'}
        )
        self.assertEqual(res_doc.status_code, 200)
        disp_doc = res_doc.headers.get('Content-Disposition', '')
        self.assertIn('Priya_One_CKD_Report_', disp_doc)
        self.assertIn('.pdf', disp_doc)


if __name__ == '__main__':
    unittest.main()
