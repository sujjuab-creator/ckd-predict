"""
Tests for creation of the single System Administrator at startup (init_system_admin).
There is no default admin password: ADMIN_PASSWORD must be provided.
Run from backend/:  python -m unittest -v
"""
import io
import os
import sys
import unittest
from contextlib import redirect_stdout

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FLASK_ENV'] = 'testing'

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

import app as app_module  # noqa: E402
from app import create_app, init_system_admin, AdminConfigurationError  # noqa: E402
from extensions import db  # noqa: E402
from models.user import User  # noqa: E402
from utils.security import hash_password, verify_password  # noqa: E402

ADMIN_ENV_KEYS = ('ADMIN_EMAIL', 'ADMIN_PASSWORD', 'ADMIN_NAME', 'FLASK_ENV')


class AdminBootstrapTests(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in ADMIN_ENV_KEYS}
        # Start every test with no admin credentials configured
        os.environ.pop('ADMIN_PASSWORD', None)
        os.environ.pop('ADMIN_EMAIL', None)
        os.environ.pop('ADMIN_NAME', None)
        os.environ['FLASK_ENV'] = 'testing'
        self.app = create_app()
        with self.app.app_context():
            db.create_all()
            User.query.filter_by(role='admin').delete()
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def admins(self):
        with self.app.app_context():
            return User.query.filter_by(role='admin').all()

    def test_missing_password_does_not_create_admin_in_development(self):
        init_system_admin(self.app)
        self.assertEqual(self.admins(), [])

    def test_empty_or_short_password_does_not_create_admin(self):
        for value in ('', '   ', 'short'):
            os.environ['ADMIN_PASSWORD'] = value
            init_system_admin(self.app)
            self.assertEqual(self.admins(), [], f'admin created with ADMIN_PASSWORD={value!r}')

    def test_missing_password_fails_in_production(self):
        os.environ['FLASK_ENV'] = 'production'
        with self.assertRaises(AdminConfigurationError) as ctx:
            init_system_admin(self.app)
        self.assertIn('ADMIN_PASSWORD', str(ctx.exception))
        self.assertEqual(self.admins(), [])

    def test_error_message_never_contains_password(self):
        os.environ['FLASK_ENV'] = 'production'
        os.environ['ADMIN_PASSWORD'] = 'abc12'  # too short -> rejected
        with self.assertRaises(AdminConfigurationError) as ctx:
            init_system_admin(self.app)
        self.assertNotIn('abc12', str(ctx.exception))

    def test_admin_created_from_environment(self):
        os.environ['ADMIN_EMAIL'] = ' Chief.Admin@Hospital.org '
        os.environ['ADMIN_PASSWORD'] = 'Env-Provided-Pass-9'
        init_system_admin(self.app)
        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertEqual(admins[0].email, 'chief.admin@hospital.org')
        self.assertTrue(verify_password('Env-Provided-Pass-9', admins[0].password_hash))

    # ---- existing admin ------------------------------------------------
    def add_admin(self, email='existing.admin@hospital.org', password='Original-Pass-1', status='Active'):
        with self.app.app_context():
            db.session.add(User(name='Existing Admin', email=email, password_hash=hash_password(password),
                                role='admin', status=status, is_temporary_password=False))
            db.session.commit()
            return User.query.filter_by(role='admin').first().password_hash

    def admin_login_status(self, email, password):
        res = self.app.test_client().post('/api/auth/login', json={'email': email, 'password': password, 'role': 'admin'})
        return res.status_code

    def test_existing_admin_with_different_email_is_not_overwritten(self):
        original_hash = self.add_admin()
        os.environ['ADMIN_EMAIL'] = 'other.admin@hospital.org'
        os.environ['ADMIN_PASSWORD'] = 'Different-Pass-2'
        os.environ['FLASK_ENV'] = 'production'
        for _ in range(3):  # repeated startups
            init_system_admin(self.app)

        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertEqual(admins[0].email, 'existing.admin@hospital.org')
        self.assertEqual(admins[0].password_hash, original_hash)
        self.assertTrue(verify_password('Original-Pass-1', admins[0].password_hash))
        with self.app.app_context():
            self.assertIsNone(User.query.filter_by(email='other.admin@hospital.org').first())

    def test_existing_admin_password_synchronized(self):
        self.add_admin()
        os.environ['ADMIN_EMAIL'] = 'existing.admin@hospital.org'
        os.environ['ADMIN_PASSWORD'] = 'Rotated-Pass-3'
        os.environ['FLASK_ENV'] = 'production'
        out = io.StringIO()
        with redirect_stdout(out):
            init_system_admin(self.app)
        self.assertNotIn('Rotated-Pass-3', out.getvalue())    # never logged

        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertEqual(admins[0].role, 'admin')
        self.assertEqual(admins[0].status, 'Active')
        self.assertFalse(admins[0].is_temporary_password)
        self.assertTrue(verify_password('Rotated-Pass-3', admins[0].password_hash))
        self.assertEqual(self.admin_login_status('existing.admin@hospital.org', 'Rotated-Pass-3'), 200)
        self.assertEqual(self.admin_login_status('existing.admin@hospital.org', 'Original-Pass-1'), 401)

    def test_existing_admin_email_matches_case_insensitively(self):
        self.add_admin(email='Existing.Admin@Hospital.org')
        os.environ['ADMIN_EMAIL'] = '  EXISTING.admin@HOSPITAL.ORG '
        os.environ['ADMIN_PASSWORD'] = 'Case-Insensitive-4'
        init_system_admin(self.app)
        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertTrue(verify_password('Case-Insensitive-4', admins[0].password_hash))

    def test_synchronization_reactivates_admin(self):
        self.add_admin(status='Inactive')
        os.environ['ADMIN_EMAIL'] = 'existing.admin@hospital.org'
        os.environ['ADMIN_PASSWORD'] = 'Reactivate-Pass-5'
        init_system_admin(self.app)
        self.assertEqual(self.admins()[0].status, 'Active')

    def test_no_duplicate_admin_on_repeated_startups(self):
        self.add_admin()
        os.environ['ADMIN_EMAIL'] = 'existing.admin@hospital.org'
        os.environ['ADMIN_PASSWORD'] = 'Repeated-Pass-6'
        for _ in range(3):
            init_system_admin(self.app)
        self.assertEqual(len(self.admins()), 1)
        # A different ADMIN_EMAIL never creates a second admin either
        os.environ['ADMIN_EMAIL'] = 'second.admin@hospital.org'
        init_system_admin(self.app)
        self.assertEqual(len(self.admins()), 1)

    def test_invalid_or_missing_password_leaves_existing_admin_unchanged(self):
        original_hash = self.add_admin()
        os.environ['ADMIN_EMAIL'] = 'existing.admin@hospital.org'
        os.environ['FLASK_ENV'] = 'production'
        for value in (None, '', 'short'):
            if value is None:
                os.environ.pop('ADMIN_PASSWORD', None)
            else:
                os.environ['ADMIN_PASSWORD'] = value
            init_system_admin(self.app)  # must not raise: an admin already exists
            self.assertEqual(self.admins()[0].password_hash, original_hash)

    def test_new_admin_created_when_none_exists(self):
        self.assertEqual(self.admins(), [])
        os.environ['ADMIN_EMAIL'] = 'New.Admin@Hospital.org'
        os.environ['ADMIN_PASSWORD'] = 'Brand-New-Pass-7'
        os.environ['FLASK_ENV'] = 'production'
        init_system_admin(self.app)
        init_system_admin(self.app)
        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertEqual((admins[0].email, admins[0].role, admins[0].status), ('new.admin@hospital.org', 'admin', 'Active'))
        self.assertEqual(self.admin_login_status('new.admin@hospital.org', 'Brand-New-Pass-7'), 200)

    def test_no_default_admin_password_in_source(self):
        with open(app_module.__file__, 'r', encoding='utf-8') as f:
            source = f.read()
        self.assertNotIn('admin123', source)
        self.assertNotIn("os.getenv('ADMIN_PASSWORD') or '", source.replace("or ''", ''))
        # A commonly used default password must not be able to log in to a fresh system
        init_system_admin(self.app)
        client = self.app.test_client()
        res = client.post('/api/auth/login', json={'email': 'admin@ckdpredict.com', 'password': 'admin123', 'role': 'admin'})
        self.assertEqual(res.status_code, 401)


if __name__ == '__main__':
    unittest.main()
