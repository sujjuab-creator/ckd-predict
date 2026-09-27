"""
DATABASE_URL normalisation for MySQL + PyMySQL (e.g. Aiven MySQL).

Aiven's "Service URI" looks like:

    mysql://avnadmin:<password>@<host>:<port>/defaultdb?ssl-mode=REQUIRED

SQLAlchemy forwards every URL query parameter to the DB-API driver as a keyword
argument, and PyMySQL does not understand the MySQL-client option ``ssl-mode``:

    TypeError: Connection.__init__() got an unexpected keyword argument 'ssl-mode'

``normalize_database_url`` therefore:
  * uses the PyMySQL driver for plain ``mysql://`` URLs,
  * removes ``ssl-mode`` (and the ``ssl-ca`` / ``ssl-cert`` / ``ssl-key`` style
    client options) from the URL, and
  * translates them into a proper ``ssl.SSLContext`` passed to PyMySQL through
    SQLAlchemy ``connect_args`` -- SSL is never silently disabled.

ssl-mode semantics (same as the ``mysql`` command-line client):
  REQUIRED / PREFERRED  encrypted connection. Server certificate is verified
                        against a CA when one is configured (DATABASE_SSL_CA or
                        ssl-ca in the URL); otherwise encryption only.
  VERIFY_CA             encrypted + certificate must chain to the CA.
  VERIFY_IDENTITY       VERIFY_CA + the certificate must match the host name.
  DISABLED              no TLS (only when explicitly requested in the URL).

Optional environment variable (no secrets are hard-coded here):
  DATABASE_SSL_CA   Path to the CA certificate file (e.g. Aiven's ca.pem), or the
                    PEM text itself. Enables certificate verification.

Non-MySQL URLs (SQLite for local development/tests) are returned unchanged.
"""
import os
import ssl

from sqlalchemy.engine import make_url

SSL_MODES = {'DISABLED', 'PREFERRED', 'REQUIRED', 'VERIFY_CA', 'VERIFY_IDENTITY'}
_MODE_ALIASES = {
    'DISABLE': 'DISABLED', 'FALSE': 'DISABLED', 'OFF': 'DISABLED', '0': 'DISABLED',
    'PREFER': 'PREFERRED',
    'REQUIRE': 'REQUIRED', 'TRUE': 'REQUIRED', 'ON': 'REQUIRED', '1': 'REQUIRED',
    'VERIFY-CA': 'VERIFY_CA', 'VERIFY_FULL': 'VERIFY_IDENTITY', 'VERIFY-FULL': 'VERIFY_IDENTITY',
    'VERIFY-IDENTITY': 'VERIFY_IDENTITY',
}
# URL query keys that belong to the mysql client, not to PyMySQL's Connection()
_SSL_MODE_KEYS = {'ssl-mode', 'ssl_mode', 'sslmode'}
_SSL_FILE_KEYS = {
    'ssl-ca': 'ca', 'ssl_ca': 'ca', 'sslrootcert': 'ca',
    'ssl-cert': 'cert', 'ssl_cert': 'cert', 'sslcert': 'cert',
    'ssl-key': 'key', 'ssl_key': 'key', 'sslkey': 'key',
}


def _first(value):
    if isinstance(value, (tuple, list)):
        return value[0] if value else None
    return value


def normalize_ssl_mode(value):
    mode = str(value or '').strip().upper().replace(' ', '_')
    mode = _MODE_ALIASES.get(mode, mode)
    if mode not in SSL_MODES:
        raise ValueError(f'Unsupported ssl-mode "{value}". Use one of: {", ".join(sorted(SSL_MODES))}.')
    return mode


def build_ssl_context(mode, ca=None, cert=None, key=None):
    """Return an ssl.SSLContext for PyMySQL, or None for ssl-mode=DISABLED."""
    if mode == 'DISABLED':
        return None

    ca_text = None
    ca_file = None
    if ca:
        if '-----BEGIN CERTIFICATE-----' in ca:
            ca_text = ca
        else:
            ca_file = ca

    verify = mode in ('VERIFY_CA', 'VERIFY_IDENTITY') or bool(ca_file or ca_text)
    if verify:
        # Uses the given CA, or the system trust store when no CA is configured.
        ctx = ssl.create_default_context(cafile=ca_file, cadata=ca_text)
        ctx.check_hostname = mode == 'VERIFY_IDENTITY'
        ctx.verify_mode = ssl.CERT_REQUIRED
    else:
        # REQUIRED/PREFERRED without a CA: the connection is still encrypted.
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    if cert:
        ctx.load_cert_chain(certfile=cert, keyfile=key)
    return ctx


def normalize_database_url(raw_url, environ=None):
    """
    Returns (sqlalchemy_url_string, connect_args).

    connect_args contains {'ssl': SSLContext} for MySQL URLs that request TLS.
    """
    environ = os.environ if environ is None else environ
    raw_url = (raw_url or '').strip()
    if not raw_url:
        return raw_url, {}

    url = make_url(raw_url)
    backend = url.get_backend_name()
    if backend != 'mysql':
        return raw_url, {}

    # Plain "mysql://" (Aiven Service URI) -> use the PyMySQL driver
    if url.drivername == 'mysql':
        url = url.set(drivername='mysql+pymysql')

    query = dict(url.query)
    mode = None
    files = {}
    for key in list(query.keys()):
        lowered = key.lower()
        if lowered in _SSL_MODE_KEYS:
            mode = normalize_ssl_mode(_first(query.pop(key)))
        elif lowered in _SSL_FILE_KEYS:
            files[_SSL_FILE_KEYS[lowered]] = _first(query.pop(key))
    url = url.set(query=query)

    env_ca = (environ.get('DATABASE_SSL_CA') or '').strip()
    if env_ca and 'ca' not in files:
        files['ca'] = env_ca

    if mode is None:
        # No ssl-mode in the URL: keep plain local MySQL unchanged unless a CA is configured.
        if not files:
            return url.render_as_string(hide_password=False), {}
        mode = 'VERIFY_CA' if files.get('ca') else 'REQUIRED'

    ctx = build_ssl_context(mode, ca=files.get('ca'), cert=files.get('cert'), key=files.get('key'))
    connect_args = {'ssl': ctx} if ctx is not None else {}
    return url.render_as_string(hide_password=False), connect_args


def mysql_engine_options(connect_args):
    """SQLAlchemy engine options for a (possibly remote) MySQL server."""
    options = {
        'pool_pre_ping': True,   # drop connections closed by the server while idle
        'pool_recycle': 280,     # recycle before typical server-side idle timeouts
    }
    if connect_args:
        options['connect_args'] = dict(connect_args)
    return options


def describe_url(url_string):
    """Safe description for logs (never includes the password)."""
    try:
        return make_url(url_string).render_as_string(hide_password=True)
    except Exception:
        return '<unparseable DATABASE_URL>'
