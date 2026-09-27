import os
import sys

# Crucial: Set in-memory test database URL BEFORE importing Flask app / config
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FLASK_ENV'] = 'testing'

# Ensure backend path is in sys.path
backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import unittest
import secrets

# Test-only admin password generated per run (there is no default admin password)
TEST_ADMIN_PASSWORD = 'Test-Admin-' + secrets.token_hex(8)
import json
from app import create_app
from extensions import db
from models.user import User
from utils.security import hash_password

class AuthenticationWorkflowTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()
            admin = User.query.filter_by(role='admin').first()
            if not admin:
                admin = User(
                    name='System Administrator',
                    email='admin@ckdpredict.com',
                    password_hash=hash_password(TEST_ADMIN_PASSWORD),
                    role='admin',
                    status='Active',
                    is_temporary_password=False
                )
                db.session.add(admin)
            else:
                admin.password_hash = hash_password(TEST_ADMIN_PASSWORD)
                admin.status = 'Active'
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def test_01_public_signup_requires_verification(self):
        """Public registration without a verified email OTP is rejected (403); admin can never self-register"""
        res = self.client.post('/api/auth/register', json={
            'name': 'Self Register User',
            'email': 'public.user@example.com',
            'password': 'password123',
            'role': 'patient'
        })
        self.assertEqual(res.status_code, 403)
        data = json.loads(res.data)
        self.assertFalse(data['success'])
        self.assertEqual(data.get('code'), 'verification_required')

        admin_res = self.client.post('/api/auth/register', json={
            'name': 'Another Admin',
            'email': 'another.admin@example.com',
            'password': 'password123',
            'role': 'admin'
        })
        self.assertEqual(admin_res.status_code, 403)
        self.assertIn('admin', json.loads(admin_res.data)['error'].lower())

    def test_02_admin_login_success(self):
        """Verify Admin login issues token and user payload"""
        res = self.client.post('/api/auth/login', json={
            'email': 'admin@ckdpredict.com',
            'password': TEST_ADMIN_PASSWORD,
            'role': 'admin'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])
        self.assertIn('token', data)
        self.assertEqual(data['user']['role'], 'admin')

    def test_03_admin_creates_doctor_and_patient(self):
        """Verify Admin can create Doctor and Patient accounts with initial credentials"""
        # Admin login
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@ckdpredict.com',
            'password': TEST_ADMIN_PASSWORD
        })
        token = json.loads(login_res.data)['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Admin creates Doctor
        doc_res = self.client.post('/api/admin/users', headers=headers, json={
            'name': 'Dr. Aris Thorne',
            'email': 'ARIS.THORNE@CKDPREDICT.COM ', # uppercase + trailing space to test normalization
            'password': 'doctorPassword123',
            'role': 'doctor',
            'specialty': 'Nephrology'
        })
        self.assertEqual(doc_res.status_code, 201)
        doc_data = json.loads(doc_res.data)
        self.assertTrue(doc_data['success'])
        self.assertEqual(doc_data['user']['email'], 'aris.thorne@ckdpredict.com')

        # Admin creates Patient
        pat_res = self.client.post('/api/admin/users', headers=headers, json={
            'name': 'Johnathan Doe',
            'email': 'j.doe@ckdpredict.com',
            'password': 'patientPassword123',
            'role': 'patient',
            'gender': 'Male'
        })
        self.assertEqual(pat_res.status_code, 201)
        pat_data = json.loads(pat_res.data)
        self.assertTrue(pat_data['success'])
        self.assertEqual(pat_data['user']['email'], 'j.doe@ckdpredict.com')

        # Doctor logs in with Admin-provided credentials
        doc_login = self.client.post('/api/auth/login', json={
            'email': 'aris.thorne@ckdpredict.com',
            'password': 'doctorPassword123',
            'role': 'doctor'
        })
        self.assertEqual(doc_login.status_code, 200)

        # Patient logs in with Admin-provided credentials
        pat_login = self.client.post('/api/auth/login', json={
            'email': 'j.doe@ckdpredict.com',
            'password': 'patientPassword123',
            'role': 'patient'
        })
        self.assertEqual(pat_login.status_code, 200)

    def test_04_prevent_second_admin(self):
        """Verify backend prevents creating a second Admin account"""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@ckdpredict.com',
            'password': TEST_ADMIN_PASSWORD
        })
        token = json.loads(login_res.data)['token']
        headers = {'Authorization': f'Bearer {token}'}

        res = self.client.post('/api/admin/users', headers=headers, json={
            'name': 'Second Admin',
            'email': 'admin2@ckdpredict.com',
            'password': 'SecondAdmin-Pass1',
            'role': 'admin'
        })
        self.assertEqual(res.status_code, 400)
        data = json.loads(res.data)
        self.assertFalse(data['success'])
        self.assertIn('admin', data['error'].lower())

    def test_05_duplicate_email_rejected(self):
        """Verify duplicate email across roles is rejected with 409 Conflict"""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@ckdpredict.com',
            'password': TEST_ADMIN_PASSWORD
        })
        token = json.loads(login_res.data)['token']
        headers = {'Authorization': f'Bearer {token}'}

        # Create doctor with email
        self.client.post('/api/admin/users', headers=headers, json={
            'name': 'Dr. Test',
            'email': 'shared@hospital.org',
            'password': 'password123',
            'role': 'doctor'
        })

        # Attempt creating patient with same email
        dup_res = self.client.post('/api/admin/users', headers=headers, json={
            'name': 'Patient Test',
            'email': 'SHARED@HOSPITAL.ORG', # Case-insensitive duplicate test
            'password': 'password123',
            'role': 'patient'
        })
        self.assertEqual(dup_res.status_code, 409)
        data = json.loads(dup_res.data)
        self.assertFalse(data['success'])
        self.assertIn('already exists', data['error'].lower())

    def test_06_rbac_protection(self):
        """Verify Doctors and Patients cannot access Admin endpoints"""
        login_res = self.client.post('/api/auth/login', json={
            'email': 'admin@ckdpredict.com',
            'password': TEST_ADMIN_PASSWORD
        })
        admin_token = json.loads(login_res.data)['token']

        # Create Doctor
        self.client.post('/api/admin/users', headers={'Authorization': f'Bearer {admin_token}'}, json={
            'name': 'Dr. Access Test',
            'email': 'doc.access@hospital.org',
            'password': 'docpassword',
            'role': 'doctor'
        })

        # Login as Doctor
        doc_login = self.client.post('/api/auth/login', json={
            'email': 'doc.access@hospital.org',
            'password': 'docpassword'
        })
        doc_token = json.loads(doc_login.data)['token']

        # Doctor attempts to create user via Admin API
        forbidden_res = self.client.post('/api/admin/users', headers={'Authorization': f'Bearer {doc_token}'}, json={
            'name': 'Unapproved User',
            'email': 'unapproved@hospital.org',
            'password': 'password',
            'role': 'patient'
        })
        self.assertEqual(forbidden_res.status_code, 403)

if __name__ == '__main__':
    unittest.main()
