"""
Tests for DATABASE_URL normalisation (Aiven MySQL + PyMySQL).

Regression: Render failed with
    TypeError: Connection.__init__() got an unexpected keyword argument 'ssl-mode'
because SQLAlchemy passed the Aiven URL's ?ssl-mode=REQUIRED straight to PyMySQL.

All credentials below are fake placeholders; no network connection is made.
Run: python -m unittest -v
"""
import os
import ssl
import sys
import unittest

# Never touch a real database from these tests (config.py loads backend/.env on import)
os.environ['FLASK_ENV'] = 'testing'
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from database_config import normalize_database_url, describe_url  # noqa: E402
from config import build_database_settings  # noqa: E402

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
