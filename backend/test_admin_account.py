"""
Tests for creating/updating the single admin account (services/admin_account.py and manage_admin.py).

The admin email is admin@predict.com. The real admin password is not stored in the repository:
set CKD_TEST_ADMIN_PASSWORD to run these tests with your exact password, e.g. (PowerShell)
    $env:CKD_TEST_ADMIN_PASSWORD = "<your admin password>"; python -m unittest test_admin_account -v
Otherwise a test-only password is used.
"""
import io
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FLASK_ENV'] = 'testing'

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models.user import User  # noqa: E402
from models.patient import Patient  # noqa: E402
from utils.security import hash_password, verify_password  # noqa: E402
from services.admin_account import upsert_single_admin, AdminAccountError  # noqa: E402
import manage_admin  # noqa: E402

try:
    import pymysql  # noqa: F401
    PYMYSQL_AVAILABLE = True
except ImportError:  # pragma: no cover
    PYMYSQL_AVAILABLE = False

ADMIN_EMAIL = 'admin@predict.com'
FAKE_DB_PASSWORD = 'Fake-Db-Secret#9'
# Aiven-style Service URI with fake credentials
FAKE_AIVEN_URL = 'mysql://avnadmin:Fake-Db-Secret%239@mysql-ckd.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED'
ADMIN_PASSWORD = os.environ.get('CKD_TEST_ADMIN_PASSWORD') or 'Test-Only@12345'


class AdminAccountTests(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in ('ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CKD_NEW_ADMIN_PASSWORD', 'DATABASE_URL')}
        for k in ('ADMIN_EMAIL', 'ADMIN_PASSWORD', 'CKD_NEW_ADMIN_PASSWORD'):
            os.environ.pop(k, None)
        # An empty .env file so the command never reads the developer's real backend/.env in tests
        fd, self.empty_env = tempfile.mkstemp(suffix='.env')
        os.close(fd)
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        os.remove(self.empty_env)
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    # ---- helpers -------------------------------------------------------
    def login(self, email, password, role='admin'):
        return self.client.post('/api/auth/login', json={'email': email, 'password': password, 'role': role}).status_code

    def add_user(self, email, role, password='Other-Pass-1'):
        with self.app.app_context():
            user = User(name=f'{role} user', email=email, password_hash=hash_password(password), role=role,
                        status='Active', is_temporary_password=False)
            db.session.add(user)
            db.session.commit()
            if role == 'patient':
                db.session.add(Patient(user_id=user.id, patient_id=f'PAT-{user.id:04d}'))
                db.session.commit()
            return user.id, user.password_hash

    def upsert(self, email=ADMIN_EMAIL, password=ADMIN_PASSWORD):
        with self.app.app_context():
            action, user = upsert_single_admin(email, password)
            return action, user.id

    def admins(self):
        with self.app.app_context():
            return [(u.email, u.role, u.status, u.is_temporary_password, u.password_hash)
                    for u in User.query.filter_by(role='admin').all()]

    # ---- tests ---------------------------------------------------------
    def test_admin_created_and_can_log_in(self):
        action, _ = self.upsert()
        self.assertEqual(action, 'created')
        admins = self.admins()
        self.assertEqual(len(admins), 1)
        email, role, status, temp, pw_hash = admins[0]
        self.assertEqual((email, role, status, temp), (ADMIN_EMAIL, 'admin', 'Active', False))
        self.assertNotEqual(pw_hash, ADMIN_PASSWORD)            # stored only as a hash
        self.assertTrue(verify_password(ADMIN_PASSWORD, pw_hash))
        self.assertEqual(self.login(ADMIN_EMAIL, ADMIN_PASSWORD), 200)
        self.assertEqual(self.login(ADMIN_EMAIL, ADMIN_PASSWORD + 'x'), 401)

    def test_existing_admin_is_updated_not_duplicated(self):
        with self.app.app_context():
            db.session.add(User(name='Old Admin', email='old.admin@hospital.org', password_hash=hash_password('Old-Pass-123'),
                                role='admin', status='Inactive', is_temporary_password=True))
            db.session.commit()
            old_id = User.query.filter_by(role='admin').first().id
        action, admin_id = self.upsert()
        self.assertEqual((action, admin_id), ('updated', old_id))
        admins = self.admins()
        self.assertEqual(len(admins), 1)
        self.assertEqual(admins[0][:4], (ADMIN_EMAIL, 'admin', 'Active', False))
        self.assertEqual(self.login(ADMIN_EMAIL, ADMIN_PASSWORD), 200)
        self.assertEqual(self.login('old.admin@hospital.org', 'Old-Pass-123'), 401)

    def test_admin_email_never_duplicated(self):
        for email in (ADMIN_EMAIL, 'ADMIN@Predict.com', ' admin@predict.com '):
            self.upsert(email=email)
        with self.app.app_context():
            self.assertEqual(User.query.filter(User.email.ilike(ADMIN_EMAIL)).count(), 1)
            self.assertEqual(User.query.filter_by(role='admin').count(), 1)
        self.assertEqual(self.login(ADMIN_EMAIL, ADMIN_PASSWORD), 200)

    def test_patient_and_doctor_accounts_unchanged(self):
        doc_id, doc_hash = self.add_user('doctor@hospital.org', 'doctor')
        pat_id, pat_hash = self.add_user('patient@gmail.com', 'patient')
        self.upsert()
        with self.app.app_context():
            doc, pat = db.session.get(User, doc_id), db.session.get(User, pat_id)
            self.assertEqual((doc.role, doc.email, doc.password_hash), ('doctor', 'doctor@hospital.org', doc_hash))
            self.assertEqual((pat.role, pat.email, pat.password_hash), ('patient', 'patient@gmail.com', pat_hash))
        self.assertEqual(self.login('doctor@hospital.org', 'Other-Pass-1', 'doctor'), 200)
        self.assertEqual(self.login('patient@gmail.com', 'Other-Pass-1', 'patient'), 200)

    def test_email_owned_by_patient_or_doctor_is_refused(self):
        doc_id, doc_hash = self.add_user(ADMIN_EMAIL, 'doctor')
        with self.assertRaises(AdminAccountError):
            self.upsert()
        with self.app.app_context():
            doc = db.session.get(User, doc_id)
            self.assertEqual((doc.role, doc.password_hash), ('doctor', doc_hash))
            self.assertEqual(User.query.filter_by(role='admin').count(), 0)

    def test_weak_or_missing_password_rejected(self):
        for bad in ('', '   ', 'short'):
            with self.assertRaises(AdminAccountError):
                self.upsert(password=bad)
        self.assertEqual(self.admins(), [])

    # ---- manage_admin.py command ----------------------------------------
    def run_command(self, env_file='__empty__'):
        os.environ['CKD_NEW_ADMIN_PASSWORD'] = ADMIN_PASSWORD
        env_file = self.empty_env if env_file == '__empty__' else env_file
        out = io.StringIO()
        with redirect_stdout(out):
            try:
                code = manage_admin.main(['--email', ADMIN_EMAIL], env_file=env_file)
                error = None
            except SystemExit as exc:
                code, error = 1, str(exc.code)
        return code, error, out.getvalue()

    def test_command_refuses_when_database_url_missing(self):
        os.environ.pop('DATABASE_URL', None)
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('DATABASE_URL is not set', error)
        self.assertIn('Nothing was changed', error)
        self.assertEqual(self.admins(), [])

    def test_command_refuses_sqlite(self):
        for url in ('sqlite:///ckd_db.sqlite', 'sqlite:///:memory:'):
            os.environ['DATABASE_URL'] = url
            code, error, output = self.run_command()
            self.assertEqual(code, 1)
            self.assertIn('never uses SQLite', error)
            self.assertNotIn('Target database', output)
        self.assertEqual(self.admins(), [])

    def test_command_reads_database_url_from_env_file(self):
        os.environ.pop('DATABASE_URL', None)
        with open(self.empty_env, 'w') as f:
            f.write('DATABASE_URL=sqlite:///from_env_file.sqlite\n')
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('never uses SQLite', error)   # proves backend/.env-style loading happened
        self.assertEqual(self.admins(), [])

    @unittest.skipUnless(PYMYSQL_AVAILABLE, 'PyMySQL is not installed')
    def test_command_masks_destination_and_stops_if_mysql_unreachable(self):
        # Aiven-style URL (ssl-mode=REQUIRED) pointing at a closed local port: must fail to CONNECT
        # (not with the old "unexpected keyword argument 'ssl-mode'" TypeError) and change nothing.
        os.environ['DATABASE_URL'] = ('mysql://avnadmin:Fake-Db-Secret%239@127.0.0.1:1/defaultdb'
                                      '?ssl-mode=REQUIRED')
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('Target database: 127.0.0.1:1/defaultdb (TLS on)', output)
        self.assertIn('Could not connect to the MySQL database', error)
        self.assertNotIn('TypeError', error)
        for secret in (FAKE_DB_PASSWORD, 'Fake-Db-Secret%239', 'avnadmin', ADMIN_PASSWORD):
            self.assertNotIn(secret, output + error)
        self.assertEqual(self.admins(), [])

    def test_command_success_path_uses_mysql_target_and_prints_no_secrets(self):
        os.environ['DATABASE_URL'] = FAKE_AIVEN_URL
        captured = {}

        def fake_app(uri, connect_args):
            captured['uri'], captured['connect_args'] = uri, connect_args
            return self.app  # stands in for the MySQL-bound app (no real network in tests)

        with mock.patch.object(manage_admin, 'check_connection') as check, \
                mock.patch.object(manage_admin, 'create_admin_app', side_effect=fake_app):
            code, error, output = self.run_command()
        self.assertEqual(code, 0, error)
        check.assert_called_once()
        # database_config conversion was reused: pymysql driver, ssl-mode removed, TLS context supplied
        self.assertTrue(captured['uri'].startswith('mysql+pymysql://'))
        self.assertNotIn('ssl-mode', captured['uri'])
        self.assertIsNotNone(captured['connect_args'].get('ssl'))
        self.assertIn('Target database: mysql-ckd.aivencloud.com:12345/defaultdb (TLS on)', output)
        self.assertIn('Login check with the new credentials: OK', output)
        for secret in (ADMIN_PASSWORD, FAKE_DB_PASSWORD, 'pbkdf2', 'scrypt'):
            self.assertNotIn(secret, output)
        self.assertEqual(self.admins()[0][:4], (ADMIN_EMAIL, 'admin', 'Active', False))

    # ---- backend/.env loading ------------------------------------------
    UNREACHABLE_URL = 'mysql://avnadmin:Fake-Db-Secret%239@mysql-ckd.aivencloud.com:12345/defaultdb?ssl-mode=REQUIRED'

    def write_env(self, text, encoding='utf-8', bom=b''):
        with open(self.empty_env, 'wb') as f:
            f.write(bom + text.encode(encoding))

    def run_until_target(self, env_file='__empty__'):
        """Run the command but stop right after it resolves/prints the target (no DB access)."""
        with mock.patch.object(manage_admin, 'check_connection',
                               side_effect=manage_admin.CommandError('stopped by test before any change')):
            return self.run_command(env_file)

    def assert_loaded_from_file(self, output, error):
        self.assertIn('DATABASE_URL source: backend/.env', output)
        self.assertIn('Target database: mysql-ckd.aivencloud.com:12345/defaultdb (TLS on)', output)
        self.assertIn('stopped by test', error)
        for secret in (FAKE_DB_PASSWORD, 'Fake-Db-Secret%239', 'avnadmin', ADMIN_PASSWORD):
            self.assertNotIn(secret, output + error)
        self.assertEqual(self.admins(), [])

    def test_default_env_file_is_absolute_path_next_to_script(self):
        expected = os.path.join(os.path.dirname(os.path.abspath(manage_admin.__file__)), '.env')
        self.assertTrue(os.path.isabs(manage_admin.DEFAULT_ENV_FILE))
        self.assertEqual(manage_admin.DEFAULT_ENV_FILE, expected)

    def test_database_url_loaded_from_backend_env_regardless_of_working_directory(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env(f'SECRET_KEY=not-printed\nDATABASE_URL={self.UNREACHABLE_URL}\n')
        cwd = os.getcwd()
        other_dir = tempfile.mkdtemp()
        try:
            os.chdir(other_dir)  # run from a different folder: must still find backend/.env
            with mock.patch.object(manage_admin, 'DEFAULT_ENV_FILE', self.empty_env):
                code, error, output = self.run_until_target(env_file=None)   # uses DEFAULT_ENV_FILE
        finally:
            os.chdir(cwd)
            os.rmdir(other_dir)
        self.assertEqual(code, 1)
        self.assert_loaded_from_file(output, error)
        self.assertNotIn('not-printed', output + error)

    def test_env_file_with_utf8_bom_is_loaded(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env(f'DATABASE_URL={self.UNREACHABLE_URL}\r\nFLASK_ENV=development\r\n', bom=b'\xef\xbb\xbf')
        code, error, output = self.run_until_target()
        self.assertEqual(code, 1)
        self.assert_loaded_from_file(output, error)

    def test_env_file_saved_as_utf16_is_loaded(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env(f'DATABASE_URL={self.UNREACHABLE_URL}\r\n', encoding='utf-16')
        code, error, output = self.run_until_target()
        self.assertEqual(code, 1)
        self.assert_loaded_from_file(output, error)

    def test_env_file_wins_over_empty_or_stale_environment_variable(self):
        self.write_env(f'DATABASE_URL="{self.UNREACHABLE_URL}"\n')
        for stale in ('', '   ', 'sqlite:///ckd_db.sqlite'):
            os.environ['DATABASE_URL'] = stale
            code, error, output = self.run_until_target()
            self.assertEqual(code, 1)
            self.assert_loaded_from_file(output, error)

    def test_empty_database_url_line_is_reported_without_values(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env('SECRET_KEY=super-secret-value\nDATABASE_URL=\n')
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('DATABASE_URL is present', error)
        self.assertIn('value is empty', error)
        self.assertNotIn('super-secret-value', output + error)

    def test_missing_database_url_lists_only_variable_names(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env('SECRET_KEY=super-secret-value\nMAIL_FROM=x@y.z\n')
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('no DATABASE_URL line', error)
        self.assertIn('SECRET_KEY', error)
        self.assertNotIn('super-secret-value', output + error)

    def test_sqlite_url_in_backend_env_is_refused(self):
        os.environ.pop('DATABASE_URL', None)
        self.write_env('DATABASE_URL=sqlite:///ckd_db.sqlite\n')
        code, error, output = self.run_command()
        self.assertEqual(code, 1)
        self.assertIn('never uses SQLite', error)
        self.assertEqual(self.admins(), [])

if __name__ == '__main__':
    unittest.main()
