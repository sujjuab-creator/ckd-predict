"""
Tests for DATABASE_URL normalisation (Aiven MySQL + PyMySQL).

Regression: Render failed with
    TypeError: Connection.__init__() got an unexpected keyword argument 'ssl-mode'
because SQLAlchemy passed the Aiven URL's ?ssl-mode=REQUIRED straight to PyMySQL.

All credentials below are fake placeholders; no network connection is made.
Run: python -m unittest -v
"""
import json
import os
import shutil
import ssl
import subprocess
import sys
import tempfile
import unittest
from unittest import mock

# Never touch a real database from these tests (config.py loads backend/.env on import)
os.environ['FLASK_ENV'] = 'testing'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from database_config import normalize_database_url, describe_url  # noqa: E402
import config  # noqa: E402
from config import build_database_settings, load_config_environment  # noqa: E402

try:
    import pymysql  # noqa: F401
    from pymysql.connections import Connection as PyMySQLConnection
    PYMYSQL_AVAILABLE = True
except ImportError:  # pragma: no cover
    PYMYSQL_AVAILABLE = False

FAKE_PASSWORD = 'Fake-p@ss/w0rd#1'
# Same shape as an Aiven "Service URI" (password is URL-encoded, as Aiven provides it)
AIVEN_URL = ('mysql://avnadmin:Fake-p%40ss%2Fw0rd%231@mysql-ckd-test.aivencloud.com:12345/'
             'defaultdb?ssl-mode=REQUIRED')
AIVEN_PYMYSQL_URL = AIVEN_URL.replace('mysql://', 'mysql+pymysql://', 1)
SYSTEM_CA = ssl.get_default_verify_paths().cafile


class NormalizeDatabaseUrlTests(unittest.TestCase):
    def assert_aiven_normalized(self, raw):
        uri, connect_args = normalize_database_url(raw, environ={})
        self.assertNotIn('ssl-mode', uri)
        self.assertNotIn('ssl_mode', uri)
        url = make_url(uri)
        self.assertEqual(url.drivername, 'mysql+pymysql')
        self.assertEqual(url.username, 'avnadmin')
        self.assertEqual(url.password, FAKE_PASSWORD)          # special characters preserved
        self.assertEqual(url.host, 'mysql-ckd-test.aivencloud.com')
        self.assertEqual(url.port, 12345)
        self.assertEqual(url.database, 'defaultdb')
        self.assertEqual(dict(url.query), {})
        ctx = connect_args['ssl']
        self.assertIsInstance(ctx, ssl.SSLContext)               # TLS is ON, never disabled
        self.assertGreaterEqual(ctx.minimum_version, ssl.TLSVersion.TLSv1_2)
        return uri, connect_args

    def test_aiven_service_uri_is_normalized(self):
        _, connect_args = self.assert_aiven_normalized(AIVEN_URL)
        # REQUIRED without a configured CA: encrypted, like the mysql client's REQUIRED mode
        self.assertEqual(connect_args['ssl'].verify_mode, ssl.CERT_NONE)
        self.assertFalse(connect_args['ssl'].check_hostname)

    def test_pymysql_scheme_with_ssl_mode_is_normalized(self):
        self.assert_aiven_normalized(AIVEN_PYMYSQL_URL)

    def test_ssl_mode_key_and_value_variants(self):
        for raw in (AIVEN_URL.replace('ssl-mode=REQUIRED', 'ssl-mode=required'),
                    AIVEN_URL.replace('ssl-mode=REQUIRED', 'ssl_mode=REQUIRED'),
                    AIVEN_URL.replace('ssl-mode=REQUIRED', 'sslmode=require')):
            self.assert_aiven_normalized(raw)

    def test_other_query_options_are_kept(self):
        uri, _ = normalize_database_url(AIVEN_URL + '&charset=utf8mb4', environ={})
        self.assertEqual(dict(make_url(uri).query), {'charset': 'utf8mb4'})

    @unittest.skipUnless(SYSTEM_CA and os.path.exists(SYSTEM_CA), 'no system CA bundle file available')
    def test_ca_certificate_enables_verification(self):
        _, args = normalize_database_url(AIVEN_URL, environ={'DATABASE_SSL_CA': SYSTEM_CA})
        self.assertEqual(args['ssl'].verify_mode, ssl.CERT_REQUIRED)
        self.assertFalse(args['ssl'].check_hostname)
        _, args = normalize_database_url(AIVEN_URL.replace('REQUIRED', 'VERIFY_IDENTITY'),
                                         environ={'DATABASE_SSL_CA': SYSTEM_CA})
        self.assertEqual(args['ssl'].verify_mode, ssl.CERT_REQUIRED)
        self.assertTrue(args['ssl'].check_hostname)

    def test_verify_ca_mode_requires_certificate(self):
        _, args = normalize_database_url(AIVEN_URL.replace('REQUIRED', 'VERIFY_CA'), environ={})
        self.assertEqual(args['ssl'].verify_mode, ssl.CERT_REQUIRED)

    def test_explicit_disabled_is_respected_only_when_requested(self):
        uri, args = normalize_database_url(AIVEN_URL.replace('REQUIRED', 'DISABLED'), environ={})
        self.assertEqual(args, {})
        self.assertNotIn('ssl-mode', uri)

    def test_invalid_ssl_mode_rejected(self):
        with self.assertRaises(ValueError):
            normalize_database_url(AIVEN_URL.replace('REQUIRED', 'SOMETIMES'), environ={})

    def test_local_urls_unchanged(self):
        local = 'mysql+pymysql://root:localpass@localhost:3306/ckd_db'
        self.assertEqual(normalize_database_url(local, environ={}), (local, {}))
        sqlite_url = 'sqlite:///ckd_db.sqlite'
        self.assertEqual(normalize_database_url(sqlite_url, environ={}), (sqlite_url, {}))
        self.assertEqual(normalize_database_url('', environ={}), ('', {}))

    def test_log_description_hides_password(self):
        uri, _ = normalize_database_url(AIVEN_URL, environ={})
        self.assertNotIn(FAKE_PASSWORD, describe_url(uri))
        self.assertNotIn('Fake-p%40ss', describe_url(uri))


class BuildDatabaseSettingsTests(unittest.TestCase):
    def test_production_aiven_settings(self):
        uri, options = build_database_settings('production', AIVEN_URL)
        self.assertTrue(uri.startswith('mysql+pymysql://'))
        self.assertNotIn('ssl-mode', uri)
        self.assertIsInstance(options['connect_args']['ssl'], ssl.SSLContext)
        self.assertTrue(options['pool_pre_ping'])

    def test_production_requires_database_url(self):
        with self.assertRaises(ValueError):
            build_database_settings('production', '')

    def test_testing_uses_in_memory_sqlite(self):
        self.assertEqual(build_database_settings('testing', AIVEN_URL), ('sqlite:///:memory:', {}))

    def test_development_without_database_url_uses_sqlite(self):
        uri, options = build_database_settings('development', '')
        self.assertTrue(uri.startswith('sqlite:///') and uri.endswith('ckd_db.sqlite'))
        self.assertEqual(options, {})


class DevelopmentNoSqliteFallbackTests(unittest.TestCase):
    def test_development_mysql_url_is_used_without_sqlite_fallback(self):
        # No connection is attempted at configuration time and SQLite is never substituted
        with mock.patch('sqlalchemy.create_engine', side_effect=AssertionError('must not connect')):
            uri, options = build_database_settings('development', AIVEN_URL)
        self.assertTrue(uri.startswith('mysql+pymysql://'))
        self.assertNotIn('sqlite', uri)
        self.assertNotIn('ssl-mode', uri)
        self.assertIsInstance(options['connect_args']['ssl'], ssl.SSLContext)


class ConfigBackendEnvTests(unittest.TestCase):
    """config.py loads backend/.env through env_loader.py."""
    KEYS = ('DATABASE_URL', 'FLASK_ENV', 'SECRET_KEY', 'CKD_TEST_ONLY_VAR')

    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in self.KEYS}
        fd, self.env_file = tempfile.mkstemp(suffix='.env')
        os.close(fd)

    def tearDown(self):
        os.remove(self.env_file)
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v

    def write_env(self, text, encoding='utf-8', bom=b''):
        with open(self.env_file, 'wb') as f:
            f.write(bom + text.encode(encoding))

    def test_config_uses_env_loader_and_absolute_backend_env_path(self):
        self.assertEqual(config.BACKEND_ENV_FILE, os.path.join(backend_dir, '.env'))
        self.assertTrue(os.path.isabs(config.BACKEND_ENV_FILE))

    def test_database_url_loaded_from_backend_env_with_bom_or_utf16(self):
        for encoding, bom in (('utf-8', b''), ('utf-8', b'\xef\xbb\xbf'), ('utf-16', b'')):
            os.environ.pop('DATABASE_URL', None)
            self.write_env(f'DATABASE_URL={AIVEN_URL}\r\n', encoding=encoding, bom=bom)
            load_config_environment(self.env_file)
            self.assertEqual(os.environ['DATABASE_URL'], AIVEN_URL, (encoding, bom))
            uri, options = build_database_settings('production', os.environ['DATABASE_URL'])
            self.assertTrue(uri.startswith('mysql+pymysql://'))
            self.assertIn('ssl', options['connect_args'])

    def test_backend_env_database_url_beats_empty_or_stale_environment(self):
        self.write_env(f'DATABASE_URL={AIVEN_URL}\n')
        for stale in ('', '   ', 'sqlite:///ckd_db.sqlite'):
            os.environ['DATABASE_URL'] = stale
            load_config_environment(self.env_file)
            self.assertEqual(os.environ['DATABASE_URL'], AIVEN_URL)

    def test_other_environment_variables_keep_priority(self):
        os.environ['SECRET_KEY'] = 'from-render-environment'
        os.environ['FLASK_ENV'] = 'testing'
        os.environ.pop('CKD_TEST_ONLY_VAR', None)
        self.write_env('SECRET_KEY=from-env-file\nFLASK_ENV=production\nCKD_TEST_ONLY_VAR=filled-from-file\n')
        load_config_environment(self.env_file)
        self.assertEqual(os.environ['SECRET_KEY'], 'from-render-environment')
        self.assertEqual(os.environ['FLASK_ENV'], 'testing')
        self.assertEqual(os.environ['CKD_TEST_ONLY_VAR'], 'filled-from-file')   # missing vars are filled

    def test_missing_backend_env_keeps_previous_behaviour(self):
        os.environ['DATABASE_URL'] = 'from-environment'
        with mock.patch('config.load_dotenv') as dotenv_mock:
            self.assertIsNone(load_config_environment(os.path.join(tempfile.gettempdir(), 'no-such-dir', '.env')))
        dotenv_mock.assert_called_once_with()
        self.assertEqual(os.environ['DATABASE_URL'], 'from-environment')

    def test_config_class_reads_bom_backend_env_next_to_config_py(self):
        """Import config.py in a clean process from a folder whose .env has a BOM (like on Windows)."""
        workdir = tempfile.mkdtemp()
        try:
            for name in ('config.py', 'env_loader.py', 'database_config.py'):
                shutil.copy(os.path.join(backend_dir, name), workdir)
            with open(os.path.join(workdir, '.env'), 'wb') as f:
                f.write(b'\xef\xbb\xbf' + f'DATABASE_URL={AIVEN_URL}\r\nFLASK_ENV=development\r\n'.encode())
            env = {k: v for k, v in os.environ.items() if k not in ('DATABASE_URL', 'FLASK_ENV')}
            env['PYTHONPATH'] = os.pathsep.join([workdir] + [p for p in sys.path if p])
            code = ('import json, config; from sqlalchemy.engine import make_url; '
                    'u = make_url(config.Config.SQLALCHEMY_DATABASE_URI); '
                    'print(json.dumps({"driver": u.drivername, "host": u.host, "db": u.database, '
                    '"ssl": "ssl" in config.Config.SQLALCHEMY_ENGINE_OPTIONS.get("connect_args", {})}))')
            other_cwd = tempfile.mkdtemp()   # run from a different working directory
            try:
                out = subprocess.run([sys.executable, '-c', code], cwd=other_cwd, env=env,
                                     capture_output=True, text=True, timeout=60)
            finally:
                os.rmdir(other_cwd)
            self.assertEqual(out.returncode, 0, out.stderr[-500:])
            result = json.loads(out.stdout.strip().splitlines()[-1])
            self.assertEqual(result, {'driver': 'mysql+pymysql', 'host': 'mysql-ckd-test.aivencloud.com',
                                      'db': 'defaultdb', 'ssl': True})
            self.assertNotIn(FAKE_PASSWORD, out.stdout + out.stderr)
        finally:
            shutil.rmtree(workdir, ignore_errors=True)


@unittest.skipUnless(PYMYSQL_AVAILABLE, 'PyMySQL is not installed')
class PyMySQLEngineTests(unittest.TestCase):
    def test_raw_aiven_url_reproduces_the_render_error(self):
        engine = create_engine(AIVEN_PYMYSQL_URL)
        _, kwargs = engine.dialect.create_connect_args(engine.url)
        self.assertIn('ssl-mode', kwargs)
        with self.assertRaises(TypeError):
            PyMySQLConnection(**kwargs, defer_connect=True)
        engine.dispose()

    def test_engine_created_from_aiven_url(self):
        uri, options = build_database_settings('production', AIVEN_URL)
        engine = create_engine(uri, **options)
        self.assertEqual(engine.dialect.name, 'mysql')
        self.assertEqual(engine.dialect.driver, 'pymysql')
        _, kwargs = engine.dialect.create_connect_args(engine.url)
        self.assertNotIn('ssl-mode', kwargs)
        self.assertEqual(kwargs['password'], FAKE_PASSWORD)
        # Exactly what SQLAlchemy hands to PyMySQL: must be accepted (no network with defer_connect)
        conn = PyMySQLConnection(**{**kwargs, **options['connect_args']}, defer_connect=True)
        self.assertTrue(conn.ssl)
        self.assertIsInstance(conn.ctx, ssl.SSLContext)
        engine.dispose()


if __name__ == '__main__':
    unittest.main()
