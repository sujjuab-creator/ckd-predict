"""
Tests for creation of the single System Administrator at startup (init_system_admin).
There is no default admin password: ADMIN_PASSWORD must be provided.
Run from backend/:  python -m unittest -v
"""
import os
import sys
import unittest

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

    def test_existing_admin_is_not_overwritten(self):
        with self.app.app_context():
            db.session.add(User(name='Existing Admin', email='existing.admin@hospital.org',
                                password_hash=hash_password('Original-Pass-1'), role='admin', status='Active',
                                is_temporary_password=False))
            db.session.commit()
            original_hash = User.query.filter_by(role='admin').first().password_hash

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
