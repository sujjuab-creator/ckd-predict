"""
Tests for email-OTP self-registration, the patient/doctor relationship,
password reset, admin account management, and regression checks for the
prediction / SHAP / report APIs.

Emails are captured through app.extensions['ckd_email_sender'] (a test hook in
services/email_service.py) so no real email is sent and no OTP is hard-coded:
the test reads the randomly generated code from the captured message body,
exactly like a user reading their inbox.

Run from backend/:  python -m unittest -v
"""
import os
import re
import sys
import json
import unittest
import secrets

# Test-only admin password generated per run (there is no default admin password)
TEST_ADMIN_PASSWORD = 'Test-Admin-' + secrets.token_hex(8)
from datetime import timedelta

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FLASK_ENV'] = 'testing'
os.environ.setdefault('FRONTEND_URL', 'http://localhost:5173')

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models.user import User  # noqa: E402
from models.patient import Patient  # noqa: E402
from models.auth_tokens import EmailOTP, PasswordResetToken  # noqa: E402
from utils.security import hash_password  # noqa: E402

try:
    import shap as _shap  # noqa: F401
    SHAP_AVAILABLE = hasattr(_shap, '__version__')
except Exception:  # pragma: no cover
    SHAP_AVAILABLE = False

OTP_RE = re.compile(r'verification code is: (\d{6})')
RESET_RE = re.compile(r'/#/reset-password/([A-Za-z0-9_\-]+)')

FEATURES = json.load(open(os.path.join(backend_dir, 'ml', 'artifacts', 'feature_names.json')))


class BaseCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.outbox = []
        self.app.extensions['ckd_email_sender'] = lambda to, subject, text, html: self.outbox.append(
            {'to': to, 'subject': subject, 'text': text, 'html': html})
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
            admin = User.query.filter_by(role='admin').first()
            if not admin:
                admin = User(name='System Administrator', email='admin@ckdpredict.com',
                             password_hash=hash_password(TEST_ADMIN_PASSWORD), role='admin', status='Active',
                             is_temporary_password=False)
                db.session.add(admin)
            else:
                admin.password_hash = hash_password(TEST_ADMIN_PASSWORD)
                admin.status = 'Active'
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    # ---- helpers -------------------------------------------------------
    def post(self, url, body, token=None):
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        res = self.client.post(url, json=body, headers=headers)
        return res.status_code, res.get_json()

    def get(self, url, token=None):
        headers = {'Authorization': f'Bearer {token}'} if token else {}
        res = self.client.get(url, headers=headers)
        return res.status_code, res.get_json()

    def login(self, email, password, role=None):
        body = {'email': email, 'password': password}
        if role:
            body['role'] = role
        return self.post('/api/auth/login', body)

    def admin_token(self):
        return self.login('admin@ckdpredict.com', TEST_ADMIN_PASSWORD, 'admin')[1]['token']

    def request_otp(self, email, purpose):
        status, data = self.post('/api/auth/send-otp', {'email': email, 'purpose': purpose})
        self.assertEqual(status, 200, data)
        self.assertNotIn('otp', json.dumps(data).lower().replace('send-otp', ''))
        match = OTP_RE.search(self.outbox[-1]['text'])
        self.assertIsNotNone(match, 'OTP email not captured')
        return match.group(1)

    def verified_token(self, email, purpose):
        otp = self.request_otp(email, purpose)
        status, data = self.post('/api/auth/verify-otp', {'email': email, 'otp': otp, 'purpose': purpose})
        self.assertEqual(status, 200, data)
        self.assertTrue(data['verified'])
        return data['verification_token']

    def expire_cooldown(self, email):
        with self.app.app_context():
            for rec in EmailOTP.query.filter_by(email=email).all():
                rec.created_at = rec.created_at - timedelta(minutes=2)
            db.session.commit()

    def register_doctor(self, email='dr.rao@gmail.com', code='DOC-001', name='Dr. Anita Rao', password='Doctor123'):
        """Doctors are created by the Admin (there is no doctor self-registration)."""
        return self.post('/api/admin/users', {
            'email': email, 'name': name, 'role': 'doctor',
            'doctor_id': code, 'password': password, 'specialty': 'Nephrology'}, self.admin_token())

    def doctor_user_id(self, email):
        with self.app.app_context():
            return User.query.filter_by(email=email).first().id


class OtpTests(BaseCase):
    def test_01_patient_otp_request(self):
        status, data = self.post('/api/auth/send-otp', {'email': ' New.Patient@Gmail.com ', 'purpose': 'patient_signup'})
        self.assertEqual(status, 200)
        self.assertTrue(data['success'])
        self.assertEqual(self.outbox[-1]['to'], 'new.patient@gmail.com')
        otp = OTP_RE.search(self.outbox[-1]['text']).group(1)
        self.assertNotIn(otp, json.dumps(data))
        with self.app.app_context():
            rec = EmailOTP.query.filter_by(email='new.patient@gmail.com').first()
            self.assertNotEqual(rec.otp_hash, otp)
            self.assertNotIn(otp, rec.otp_hash)

    def test_02_doctor_otp_request_refused(self):
        # Doctor self-registration is disabled: no doctor sign-up code is ever issued
        status, data = self.post('/api/auth/send-otp', {'email': 'new.doc@gmail.com', 'purpose': 'doctor_signup'})
        self.assertEqual(status, 403)
        self.assertEqual(data['code'], 'doctor_self_registration_disabled')
        self.assertEqual(self.outbox, [])

    def test_02b_admin_purpose_rejected(self):
        status, _ = self.post('/api/auth/send-otp', {'email': 'x@gmail.com', 'purpose': 'admin_signup'})
        self.assertEqual(status, 400)
        self.assertEqual(self.outbox, [])

    def test_03_invalid_otp_rejected(self):
        otp = self.request_otp('p1@gmail.com', 'patient_signup')
        wrong = '000000' if otp != '000000' else '111111'
        status, data = self.post('/api/auth/verify-otp', {'email': 'p1@gmail.com', 'otp': wrong, 'purpose': 'patient_signup'})
        self.assertEqual(status, 400)
        self.assertFalse(data['verified'])
        # A code for the wrong purpose is also rejected
        status, _ = self.post('/api/auth/verify-otp', {'email': 'p1@gmail.com', 'otp': otp, 'purpose': 'doctor_signup'})
        self.assertEqual(status, 403)

    def test_04_expired_otp_rejected(self):
        otp = self.request_otp('p2@gmail.com', 'patient_signup')
        with self.app.app_context():
            rec = EmailOTP.query.filter_by(email='p2@gmail.com').first()
            rec.expires_at = rec.expires_at - timedelta(minutes=11)
            db.session.commit()
        status, data = self.post('/api/auth/verify-otp', {'email': 'p2@gmail.com', 'otp': otp, 'purpose': 'patient_signup'})
        self.assertEqual(status, 400)
        self.assertFalse(data['verified'])

    def test_05_otp_cannot_be_reused(self):
        otp = self.request_otp('p3@gmail.com', 'patient_signup')
        first = self.post('/api/auth/verify-otp', {'email': 'p3@gmail.com', 'otp': otp, 'purpose': 'patient_signup'})
        self.assertEqual(first[0], 200)
        second = self.post('/api/auth/verify-otp', {'email': 'p3@gmail.com', 'otp': otp, 'purpose': 'patient_signup'})
        self.assertEqual(second[0], 400)

    def test_06_excessive_attempts_rejected(self):
        otp = self.request_otp('p4@gmail.com', 'patient_signup')
        wrong = '000000' if otp != '000000' else '111111'
        codes = []
        for _ in range(5):
            codes.append(self.post('/api/auth/verify-otp', {'email': 'p4@gmail.com', 'otp': wrong, 'purpose': 'patient_signup'})[0])
        self.assertEqual(codes[-1], 429)
        # Even the correct code is now refused
        status, _ = self.post('/api/auth/verify-otp', {'email': 'p4@gmail.com', 'otp': otp, 'purpose': 'patient_signup'})
        self.assertEqual(status, 400)

    def test_06b_resend_rate_limited(self):
        self.request_otp('p5@gmail.com', 'patient_signup')
        status, data = self.post('/api/auth/send-otp', {'email': 'p5@gmail.com', 'purpose': 'patient_signup'})
        self.assertEqual(status, 429)
        self.assertIn('retry_after_seconds', data)
        # After the cooldown, up to the hourly cap
        for _ in range(4):
            self.expire_cooldown('p5@gmail.com')
            self.assertEqual(self.post('/api/auth/send-otp', {'email': 'p5@gmail.com', 'purpose': 'patient_signup'})[0], 200)
        self.expire_cooldown('p5@gmail.com')
        # 2 minutes shifted per loop keeps all 5 within the hour -> capped
        self.assertEqual(self.post('/api/auth/send-otp', {'email': 'p5@gmail.com', 'purpose': 'patient_signup'})[0], 429)

    def test_06c_resend_invalidates_previous_code(self):
        old = self.request_otp('p6@gmail.com', 'patient_signup')
        self.expire_cooldown('p6@gmail.com')
        new = self.request_otp('p6@gmail.com', 'patient_signup')
        if old != new:
            self.assertEqual(self.post('/api/auth/verify-otp', {'email': 'p6@gmail.com', 'otp': old, 'purpose': 'patient_signup'})[0], 400)
        self.assertEqual(self.post('/api/auth/verify-otp', {'email': 'p6@gmail.com', 'otp': new, 'purpose': 'patient_signup'})[0], 200)

    def test_06d_existing_email_not_enumerated(self):
        status, data = self.post('/api/auth/send-otp', {'email': 'admin@ckdpredict.com', 'purpose': 'patient_signup'})
        self.assertEqual(status, 200)
        self.assertIsNone(OTP_RE.search(self.outbox[-1]['text']))  # notice email, no code
        self.assertIn('already', self.outbox[-1]['text'])

    def test_06e_email_not_configured_returns_503(self):
        del self.app.extensions['ckd_email_sender']
        for key in ('MAIL_FROM', 'BREVO_API_KEY', 'SENDGRID_API_KEY', 'MAIL_SERVER'):
            os.environ.pop(key, None)
        status, data = self.post('/api/auth/send-otp', {'email': 'x@gmail.com', 'purpose': 'patient_signup'})
        self.assertEqual(status, 503)
        self.assertEqual(data['code'], 'email_not_configured')


class RegistrationTests(BaseCase):
    def test_07_patient_registration_requires_verified_otp(self):
        self.register_doctor()
        doc_id = self.doctor_user_id('dr.rao@gmail.com')
        body = {'email': 'pat@gmail.com', 'name': 'Rahul Mehta', 'treating_doctor_id': doc_id, 'password': 'Patient123'}
        # No token
        self.assertEqual(self.post('/api/auth/register/patient', body)[0], 403)
        # Frontend boolean is not trusted
        self.assertEqual(self.post('/api/auth/register/patient', {**body, 'otpVerified': True, 'verified': True})[0], 403)
        # Forged token
        self.assertEqual(self.post('/api/auth/register/patient', {**body, 'verification_token': 'forged'})[0], 403)
        # Token for another email
        other = self.verified_token('someone.else@gmail.com', 'patient_signup')
        self.assertEqual(self.post('/api/auth/register/patient', {**body, 'verification_token': other})[0], 403)
        # Doctor-signup codes are never issued
        self.assertEqual(self.post('/api/auth/send-otp', {'email': 'pat@gmail.com', 'purpose': 'doctor_signup'})[0], 403)
        # Correct
        self.expire_cooldown('pat@gmail.com')
        token = self.verified_token('pat@gmail.com', 'patient_signup')
        status, data = self.post('/api/auth/register/patient', {**body, 'verification_token': token})
        self.assertEqual(status, 201, data)
        self.assertEqual(data['user']['role'], 'patient')
        self.assertNotIn('password_hash', json.dumps(data))
        # Token is single use
        self.assertIn(self.post('/api/auth/register/patient', {**body, 'verification_token': token})[0], (403, 409))

    def test_08_doctor_self_registration_disabled(self):
        body = {'email': 'doc@gmail.com', 'name': 'Dr. Karan Shah', 'doctor_id': 'DOC-777', 'password': 'Doctor123'}
        for url, payload in (('/api/auth/register/doctor', body),
                             ('/api/auth/register/doctor', {**body, 'verification_token': 'anything'}),
                             ('/api/auth/register', {**body, 'role': 'doctor'})):
            status, data = self.post(url, payload)
            self.assertEqual(status, 403, url)
            self.assertEqual(data['code'], 'doctor_self_registration_disabled')
        with self.app.app_context():
            self.assertIsNone(User.query.filter_by(email='doc@gmail.com').first())
        # The Admin-created doctor account still works
        status, data = self.register_doctor(email='doc@gmail.com', code='DOC-777')
        self.assertEqual(status, 201, data)
        self.assertEqual(data['user']['doctor_id'], 'DOC-777')
        with self.app.app_context():
            u = User.query.filter_by(email='doc@gmail.com').first()
            self.assertEqual(u.status, 'Active')
            self.assertNotEqual(u.password_hash, 'Doctor123')

    def test_09_duplicate_email_rejected_globally(self):
        # Admin email cannot be re-used by self-registration (no OTP is ever issued for it)
        self.post('/api/auth/send-otp', {'email': 'admin@ckdpredict.com', 'purpose': 'patient_signup'})
        self.assertIsNone(OTP_RE.search(self.outbox[-1]['text']))
        # Race: email registered between verification and account creation
        self.register_doctor(email='dup@gmail.com', code='DOC-100')
        with self.app.app_context():
            db.session.query(EmailOTP).delete()
            db.session.commit()
        # simulate a verified token for an email that now has an account
        with self.app.app_context():
            u = User.query.filter_by(email='dup@gmail.com').first()
            u.email = 'temp@gmail.com'
            db.session.commit()
        token = self.verified_token('dup@gmail.com', 'patient_signup')
        with self.app.app_context():
            u = User.query.filter_by(email='temp@gmail.com').first()
            u.email = 'dup@gmail.com'
            db.session.commit()
        doc_id = self.doctor_user_id('dup@gmail.com')
        status, _ = self.post('/api/auth/register/patient', {
            'email': 'DUP@gmail.com', 'verification_token': token, 'name': 'Dup Person',
            'treating_doctor_id': doc_id, 'password': 'Patient123'})
        self.assertEqual(status, 409)

    def test_10_duplicate_doctor_id_rejected(self):
        self.assertEqual(self.register_doctor(email='a.doc@gmail.com', code='DOC-555')[0], 201)
        status, data = self.register_doctor(email='b.doc@gmail.com', code='doc-555')  # case-insensitive
        self.assertEqual(status, 409)
        self.assertIn('doctor id', data['error'].lower())
        # Admin also cannot reuse it
        status, _ = self.post('/api/admin/users', {'name': 'Dr. C', 'email': 'c.doc@gmail.com', 'password': 'temp1234',
                                                   'role': 'doctor', 'doctor_id': 'DOC-555'}, self.admin_token())
        self.assertEqual(status, 409)

    def test_11_patient_linked_to_active_doctor(self):
        self.register_doctor()
        doc_id = self.doctor_user_id('dr.rao@gmail.com')
        token = self.verified_token('linked@gmail.com', 'patient_signup')
        status, _ = self.post('/api/auth/register/patient', {
            'email': 'linked@gmail.com', 'verification_token': token, 'name': 'Linked Patient',
            'treating_doctor_id': doc_id, 'password': 'Patient123'})
        self.assertEqual(status, 201)

        # Public doctor list exposes only safe fields
        status, data = self.get('/api/auth/doctors')
        self.assertEqual(status, 200)
        self.assertEqual(set(data['doctors'][0].keys()), {'id', 'doctor_id', 'name', 'specialty'})

        # Patient sees their doctor
        p_token = self.login('linked@gmail.com', 'Patient123', 'patient')[1]['token']
        status, data = self.get('/api/auth/me/doctor', p_token)
        self.assertEqual(status, 200)
        self.assertEqual(data['doctor']['id'], doc_id)

        # Doctor sees their patient
        d_token = self.login('dr.rao@gmail.com', 'Doctor123', 'doctor')[1]['token']
        status, data = self.get('/api/auth/me/patients', d_token)
        self.assertEqual(status, 200)
        self.assertEqual([p['email'] for p in data['patients']], ['linked@gmail.com'])

        # RBAC on the care-team endpoints
        self.assertEqual(self.get('/api/auth/me/patients', p_token)[0], 403)
        self.assertEqual(self.get('/api/auth/me/doctor', d_token)[0], 403)

    def test_12_inactive_doctor_cannot_be_selected(self):
        self.register_doctor()
        doc_id = self.doctor_user_id('dr.rao@gmail.com')
        self.post(f'/api/admin/users/{doc_id}/toggle-status', {}, self.admin_token())
        status, data = self.get('/api/auth/doctors')
        self.assertEqual(data['doctors'], [])
        token = self.verified_token('late@gmail.com', 'patient_signup')
        status, _ = self.post('/api/auth/register/patient', {
            'email': 'late@gmail.com', 'verification_token': token, 'name': 'Late Patient',
            'treating_doctor_id': doc_id, 'password': 'Patient123'})
        self.assertEqual(status, 400)
        # an admin/patient id is not a doctor either
        with self.app.app_context():
            admin_id = User.query.filter_by(role='admin').first().id
        status, _ = self.post('/api/auth/register/patient', {
            'email': 'late@gmail.com', 'verification_token': token, 'name': 'Late Patient',
            'treating_doctor_id': admin_id, 'password': 'Patient123'})
        self.assertEqual(status, 400)

    def test_13_public_admin_registration_rejected(self):
        status, data = self.post('/api/auth/register', {'role': 'admin', 'email': 'evil@gmail.com',
                                                        'name': 'Evil', 'password': 'Admin12345'})
        self.assertEqual(status, 403)
        self.assertEqual(self.post('/api/auth/send-otp', {'email': 'evil@gmail.com', 'purpose': 'admin'})[0], 400)
        # A role field smuggled into patient registration is ignored
        self.register_doctor()
        token = self.verified_token('sneaky@gmail.com', 'patient_signup')
        status, data = self.post('/api/auth/register/patient', {
            'email': 'sneaky@gmail.com', 'verification_token': token, 'name': 'Sneaky',
            'treating_doctor_id': self.doctor_user_id('dr.rao@gmail.com'), 'password': 'Patient123', 'role': 'admin'})
        self.assertEqual(status, 201)
        self.assertEqual(data['user']['role'], 'patient')
        with self.app.app_context():
            self.assertEqual(User.query.filter_by(role='admin').count(), 1)

    def test_13b_weak_password_rejected(self):
        self.register_doctor()
        token = self.verified_token('weak@gmail.com', 'patient_signup')
        status, _ = self.post('/api/auth/register/patient', {
            'email': 'weak@gmail.com', 'verification_token': token, 'name': 'Weak',
            'treating_doctor_id': self.doctor_user_id('dr.rao@gmail.com'), 'password': 'short'})
        self.assertEqual(status, 400)

    def test_18_patient_login_after_self_registration(self):
        self.register_doctor()
        token = self.verified_token('login.pat@gmail.com', 'patient_signup')
        self.post('/api/auth/register/patient', {
            'email': 'Login.Pat@gmail.com', 'verification_token': token, 'name': 'Login Patient',
            'treating_doctor_id': self.doctor_user_id('dr.rao@gmail.com'), 'password': 'Patient123'})
        status, data = self.login('login.pat@gmail.com', 'Patient123', 'patient')
        self.assertEqual(status, 200)
        self.assertIn('token', data)
        self.assertFalse(data['user']['is_temporary_password'])
        self.assertEqual(self.login('login.pat@gmail.com', 'Wrong123', 'patient')[0], 401)
        self.assertEqual(self.login('login.pat@gmail.com', 'Patient123', 'doctor')[0], 401)

    def test_19_doctor_login_with_admin_created_credentials(self):
        self.register_doctor()
        status, data = self.login('dr.rao@gmail.com', 'Doctor123', 'doctor')
        self.assertEqual(status, 200)
        self.assertEqual(data['user']['role'], 'doctor')
        self.assertIn('token', data)
        self.assertEqual(self.login('dr.rao@gmail.com', 'Wrong123', 'doctor')[0], 401)


class AdminTests(BaseCase):
    def test_14_second_admin_rejected(self):
        status, _ = self.post('/api/admin/users', {'name': 'Admin 2', 'email': 'admin2@gmail.com',
                                                   'password': 'temp1234', 'role': 'admin'}, self.admin_token())
        self.assertEqual(status, 400)

    def test_15_admin_creates_patient_with_doctor(self):
        tok = self.admin_token()
        status, doc = self.post('/api/admin/users', {'name': 'Dr. Admin Made', 'email': 'admin.made.doc@gmail.com',
                                                     'password': 'temp1234', 'role': 'doctor', 'doctor_id': 'DOC-321'}, tok)
        self.assertEqual(status, 201)
        status, data = self.post('/api/admin/users', {'name': 'Admin Patient', 'email': 'admin.pat@gmail.com',
                                                      'password': 'temp1234', 'role': 'patient',
                                                      'treating_doctor_id': doc['user']['id']}, tok)
        self.assertEqual(status, 201, data)
        self.assertTrue(data['user']['is_temporary_password'])
        self.assertEqual(data['user']['treating_doctor_id'], doc['user']['id'])
        # duplicate email rejected
        status, _ = self.post('/api/admin/users', {'name': 'Dup', 'email': 'ADMIN.PAT@gmail.com',
                                                   'password': 'temp1234', 'role': 'doctor'}, tok)
        self.assertEqual(status, 409)

    def test_16_admin_creates_doctor(self):
        status, data = self.post('/api/admin/users', {'name': 'Dr. New', 'email': 'dr.new@gmail.com', 'password': 'temp1234',
                                                      'role': 'doctor', 'doctor_id': ' doc-42 '}, self.admin_token())
        self.assertEqual(status, 201)
        self.assertEqual(data['user']['doctor_id'], 'DOC-42')
        self.assertEqual(self.login('dr.new@gmail.com', 'temp1234', 'doctor')[0], 200)

    def test_17_admin_activate_deactivate_and_edit(self):
        tok = self.admin_token()
        _, doc = self.post('/api/admin/users', {'name': 'Dr. Toggle', 'email': 'toggle@gmail.com', 'password': 'temp1234',
                                                'role': 'doctor'}, tok)
        uid = doc['user']['id']
        status, data = self.post(f'/api/admin/users/{uid}/toggle-status', {}, tok)
        self.assertEqual((status, data['status']), (200, 'Inactive'))
        self.assertEqual(self.login('toggle@gmail.com', 'temp1234', 'doctor')[0], 403)
        status, data = self.post(f'/api/admin/users/{uid}/toggle-status', {}, tok)
        self.assertEqual(data['status'], 'Active')
        # edit + assign doctor id
        res = self.client.put(f'/api/admin/users/{uid}', json={'name': 'Dr. Toggled', 'doctor_id': 'DOC-9'},
                              headers={'Authorization': f'Bearer {tok}'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.get_json()['user']['doctor_id'], 'DOC-9')
        # reset password keeps temporary-password mechanism
        status, _ = self.post(f'/api/admin/users/{uid}/reset-password', {'new_password': 'newtemp123'}, tok)
        self.assertEqual(status, 200)
        status, data = self.login('toggle@gmail.com', 'newtemp123', 'doctor')
        self.assertTrue(data['user']['is_temporary_password'])

    def test_17a_edit_with_null_fields_and_unassign_doctor(self):
        tok = self.admin_token()
        _, doc = self.post('/api/admin/users', {'name': 'Dr. Null', 'email': 'null.doc@gmail.com', 'password': 'temp1234', 'role': 'doctor'}, tok)
        _, pat = self.post('/api/admin/users', {'name': 'Null Pat', 'email': 'null.pat@gmail.com', 'password': 'temp1234',
                                                'role': 'patient', 'treating_doctor_id': doc['user']['id']}, tok)
        body = {**pat['user'], 'phone': None, 'specialty_or_department': None, 'treating_doctor_id': ''}
        res = self.client.put(f"/api/admin/users/{pat['user']['id']}", json=body, headers={'Authorization': f'Bearer {tok}'})
        self.assertEqual(res.status_code, 200, res.get_json())
        self.assertIsNone(res.get_json()['user']['treating_doctor_id'])

    def test_17b_deleting_doctor_keeps_patients(self):
        tok = self.admin_token()
        _, doc = self.post('/api/admin/users', {'name': 'Dr. Gone', 'email': 'gone@gmail.com', 'password': 'temp1234', 'role': 'doctor'}, tok)
        _, pat = self.post('/api/admin/users', {'name': 'Stays', 'email': 'stays@gmail.com', 'password': 'temp1234',
                                                'role': 'patient', 'treating_doctor_id': doc['user']['id']}, tok)
        res = self.client.delete(f"/api/admin/users/{doc['user']['id']}", headers={'Authorization': f'Bearer {tok}'})
        self.assertEqual(res.status_code, 200)
        with self.app.app_context():
            rec = Patient.query.filter_by(user_id=pat['user']['id']).first()
            self.assertIsNotNone(rec)
            self.assertIsNone(rec.doctor_id)


class PasswordResetTests(BaseCase):
    def test_reset_flow(self):
        tok = self.admin_token()
        self.post('/api/admin/users', {'name': 'Reset Me', 'email': 'reset.me@gmail.com', 'password': 'temp1234', 'role': 'doctor'}, tok)
        status, data = self.post('/api/auth/forgot-password', {'email': 'Reset.Me@gmail.com'})
        self.assertEqual(status, 200)
        link_token = RESET_RE.search(self.outbox[-1]['text']).group(1)
        self.assertNotIn(link_token, json.dumps(data))
        with self.app.app_context():
            self.assertNotEqual(PasswordResetToken.query.first().token_hash, link_token)

        # unknown email: same response, no email
        n = len(self.outbox)
        status, data2 = self.post('/api/auth/forgot-password', {'email': 'nobody@gmail.com'})
        self.assertEqual((status, data2['message']), (200, data['message']))
        self.assertEqual(len(self.outbox), n)

        self.assertEqual(self.post('/api/auth/reset-password', {'token': link_token, 'new_password': 'weak'})[0], 400)
        self.assertEqual(self.post('/api/auth/reset-password', {'token': link_token, 'new_password': 'NewPass123'})[0], 200)
        self.assertEqual(self.post('/api/auth/reset-password', {'token': link_token, 'new_password': 'Other1234'})[0], 400)  # single use
        self.assertEqual(self.login('reset.me@gmail.com', 'NewPass123', 'doctor')[0], 200)

    def test_reset_token_expires(self):
        tok = self.admin_token()
        self.post('/api/admin/users', {'name': 'Exp', 'email': 'exp@gmail.com', 'password': 'temp1234', 'role': 'doctor'}, tok)
        self.post('/api/auth/forgot-password', {'email': 'exp@gmail.com'})
        link_token = RESET_RE.search(self.outbox[-1]['text']).group(1)
        with self.app.app_context():
            rec = PasswordResetToken.query.first()
            rec.expires_at = rec.expires_at - timedelta(hours=1)
            db.session.commit()
        self.assertEqual(self.post('/api/auth/reset-password', {'token': link_token, 'new_password': 'NewPass123'})[0], 400)


class CoreApiRegressionTests(BaseCase):
    def _patient_with_token(self):
        tok = self.admin_token()
        self.post('/api/admin/users', {'name': 'Pred Patient', 'email': 'pred@gmail.com', 'password': 'temp1234', 'role': 'patient'}, tok)
        with self.app.app_context():
            u = User.query.filter_by(email='pred@gmail.com').first()
            rec_id = Patient.query.filter_by(user_id=u.id).first().id
        # Predictions / reports are clinical-staff actions: use the admin token.
        # (Patients are blocked from these endpoints -- see test_patient_portal.py.)
        return rec_id, tok

    def _features(self):
        values = {f: 1.0 for f in FEATURES}
        values.update({'Age': 60, 'SerumCreatinine': 2.1, 'GFR': 45, 'SystolicBP': 140, 'BMI': 28})
        return values

    def test_20_prediction_api_still_works(self):
        rec_id, token = self._patient_with_token()
        status, data = self.post('/api/predictions', {**self._features(), 'patient_id': rec_id}, token)
        self.assertEqual(status, 201, data)
        self.assertIn(data['prediction_result'], ('CKD Risk', 'No CKD Risk'))
        self.assertTrue(0.0 <= data['prediction_probability'] <= 1.0)
        status, data = self.get(f'/api/patients/{rec_id}/predictions', token)
        self.assertEqual((status, data['count']), (200, 1))
        self.assertEqual(self.get('/api/analytics', token)[1]['total_predictions'], 1)
        self.assertEqual(self.get('/api/analytics/model-comparison', token)[0], 200)

    @unittest.skipUnless(SHAP_AVAILABLE, "report generation uses SHAP; shap package not installed in this environment")
    def test_21a_report_api_still_works(self):
        # Write PDFs to a temporary folder so existing reports_pdf/ files are never touched
        import tempfile
        report_service = sys.modules.get('report_service') or sys.modules.get('services.report_service')
        original_dir = report_service.REPORTS_PDF_DIR
        tmp = tempfile.mkdtemp(prefix='ckd_reports_test_')
        report_service.REPORTS_PDF_DIR = tmp
        try:
            rec_id, token = self._patient_with_token()
            _, pred = self.post('/api/predictions', {**self._features(), 'patient_id': rec_id}, token)
            status, rep = self.post(f"/api/reports/{pred['prediction_id']}", {}, token)
            self.assertEqual(status, 201, rep)
            res = self.client.get(f"/api/reports/{rep['report_id']}/download",
                                  headers={'Authorization': f'Bearer {token}'})
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.data.startswith(b'%PDF'))
            res.close()
        finally:
            report_service.REPORTS_PDF_DIR = original_dir
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)

    @unittest.skipUnless(SHAP_AVAILABLE, 'shap package not installed in this environment')
    def test_21b_shap_api_still_works(self):
        rec_id, token = self._patient_with_token()
        _, pred = self.post('/api/predictions', {**self._features(), 'patient_id': rec_id}, token)
        status, data = self.post(f"/api/predictions/{pred['prediction_id']}/explanation", {}, token)
        self.assertEqual(status, 200, data)
        self.assertTrue(data['success'])
        self.assertEqual(len(data['features']), 10)


if __name__ == '__main__':
    unittest.main()
