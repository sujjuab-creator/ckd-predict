"""
Outbound email for OTP codes and password-reset links.

All settings come from environment variables (never hard-coded):

  MAIL_PROVIDER   brevo (recommended for production) | smtp (default if unset) | sendgrid | resend
  MAIL_FROM       sender address, e.g. your-email@example.com (must be a verified sender at the provider)
  MAIL_FROM_NAME  optional display name (default "CKD PREDICT")

  SMTP:           MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
                  MAIL_USE_TLS (STARTTLS, default true), MAIL_USE_SSL (default false)
  Brevo:          BREVO_API_KEY      (HTTPS transactional API v3, works where SMTP ports are blocked)
  SendGrid:       SENDGRID_API_KEY   (HTTPS API, works where SMTP ports are blocked)
  Resend:         RESEND_API_KEY     (HTTPS API, works where SMTP ports are blocked)

Message bodies and credentials are never logged.
"""
import html
import json
import logging
import os
import re
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

from flask import current_app

logger = logging.getLogger('ckd.email')

_SECRET_ENV_KEYS = ('RESEND_API_KEY', 'BREVO_API_KEY', 'SENDGRID_API_KEY', 'MAIL_PASSWORD')
_MAX_LOGGED_ERROR_CHARS = 500


class EmailNotConfigured(Exception):
    """Raised when no email provider is configured."""


class EmailDeliveryError(Exception):
    """Raised when the provider refused or could not accept the message."""


def _env(name, default=''):
    return (os.getenv(name) or default).strip()


def _bool_env(name, default):
    raw = _env(name)
    if not raw:
        return default
    return raw.lower() in ('1', 'true', 'yes', 'on')


def provider_name():
    return _env('MAIL_PROVIDER', 'smtp').lower()


def is_configured():
    """True when the selected provider has every required setting."""
    if not _env('MAIL_FROM'):
        return False
    provider = provider_name()
    if provider == 'smtp':
        return all(_env(k) for k in ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD'))
    if provider == 'brevo':
        return bool(_env('BREVO_API_KEY'))
    if provider == 'sendgrid':
        return bool(_env('SENDGRID_API_KEY'))
    if provider == 'resend':
        return bool(_env('RESEND_API_KEY'))
    return False


def _send_smtp(to_email, subject, text_body, html_body):
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = formataddr((_env('MAIL_FROM_NAME', 'CKD PREDICT'), _env('MAIL_FROM')))
    msg['To'] = to_email
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype='html')

    host = _env('MAIL_SERVER')
    port = int(_env('MAIL_PORT', '587'))
    use_ssl = _bool_env('MAIL_USE_SSL', False)
    use_tls = _bool_env('MAIL_USE_TLS', not use_ssl)
    context = ssl.create_default_context()
    try:
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=20, context=context)
        else:
            server = smtplib.SMTP(host, port, timeout=20)
        with server:
            if use_tls and not use_ssl:
                server.starttls(context=context)
            server.login(_env('MAIL_USERNAME'), _env('MAIL_PASSWORD'))
            server.send_message(msg)
    except (smtplib.SMTPException, OSError) as err:
        # Log only the error class / SMTP code, never credentials or message content
        log_delivery_failure('smtp', getattr(err, 'smtp_code', None), err.__class__.__name__)
        raise EmailDeliveryError(f'SMTP delivery failed ({err.__class__.__name__}).') from None


def _redact(text):
    """Remove anything secret-looking from provider error text before logging."""
    text = str(text or '')
    for key in _SECRET_ENV_KEYS:
        secret = _env(key)
        if secret:
            text = text.replace(secret, '[REDACTED]')
    text = re.sub(r'(?i)bearer\s+[A-Za-z0-9._\-]+', 'Bearer [REDACTED]', text)
    text = re.sub(r'\b(re|SG|xkeysib)[_.\-][A-Za-z0-9._\-]{8,}', '[REDACTED]', text)  # API-key shapes
    text = re.sub(r'\b\d{6}\b', '[REDACTED]', text)  # never let a 6-digit code reach the logs
    text = ' '.join(text.split())
    return text[:_MAX_LOGGED_ERROR_CHARS]


def _provider_error_message(raw_body):
    """Extract the provider's error message from a JSON (or plain text) error body."""
    if not raw_body:
        return ''
    try:
        data = json.loads(raw_body)
    except (ValueError, TypeError):
        return raw_body
    if isinstance(data, dict):
        parts = []
        for key in ('name', 'code', 'message', 'error'):
            value = data.get(key)
            if isinstance(value, (str, int)) and str(value) not in parts:
                parts.append(str(value))
            elif isinstance(value, dict) and value.get('message'):
                parts.append(str(value['message']))
        errors = data.get('errors')
        if isinstance(errors, list):
            parts.extend(str(e.get('message', e)) if isinstance(e, dict) else str(e) for e in errors[:3])
        return ' | '.join(parts) if parts else raw_body
    return raw_body


def log_delivery_failure(provider, status=None, detail=''):
    """Log safe diagnostics only: provider, HTTP status and a redacted provider message."""
    logger.warning(
        'Email delivery failed: provider=%s status=%s error=%s',
        provider, status if status is not None else 'n/a', _redact(detail) or 'n/a',
    )


def _post_json(url, headers, payload, provider='email_api'):
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status >= 300:
                log_delivery_failure(provider, resp.status, 'Unexpected non-success response')
                raise EmailDeliveryError(f'Email API returned HTTP {resp.status}.')
    except urllib.error.HTTPError as err:
        try:
            raw = err.read(4096).decode('utf-8', errors='replace') if err.fp is not None else ''
        except Exception:  # pragma: no cover - body is best-effort diagnostics only
            raw = ''
        log_delivery_failure(provider, err.code, _provider_error_message(raw) or getattr(err, 'reason', ''))
        raise EmailDeliveryError(f'Email API returned HTTP {err.code}.') from None
    except (urllib.error.URLError, OSError) as err:
        reason = getattr(err, 'reason', None)
        log_delivery_failure(provider, None, f'{err.__class__.__name__}: {reason}' if reason else err.__class__.__name__)
        raise EmailDeliveryError(f'Email API unreachable ({err.__class__.__name__}).') from None


BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email'


def _send_brevo(to_email, subject, text_body, html_body):
    """Brevo transactional email API (HTTPS). The API key is sent only in the api-key header."""
    _post_json(
        BREVO_API_URL,
        {'api-key': _env('BREVO_API_KEY'), 'Content-Type': 'application/json', 'Accept': 'application/json'},
        {
            'sender': {'email': _env('MAIL_FROM'), 'name': _env('MAIL_FROM_NAME', 'CKD PREDICT')},
            'to': [{'email': to_email}],
            'subject': subject,
            'textContent': text_body,
            'htmlContent': html_body or f'<pre>{html.escape(text_body or "")}</pre>',
        },
        provider='brevo',
    )


def _send_sendgrid(to_email, subject, text_body, html_body):
    content = [{'type': 'text/plain', 'value': text_body}]
    if html_body:
        content.append({'type': 'text/html', 'value': html_body})
    _post_json(
        'https://api.sendgrid.com/v3/mail/send',
        {'Authorization': f"Bearer {_env('SENDGRID_API_KEY')}", 'Content-Type': 'application/json'},
        {
            'personalizations': [{'to': [{'email': to_email}]}],
            'from': {'email': _env('MAIL_FROM'), 'name': _env('MAIL_FROM_NAME', 'CKD PREDICT')},
            'subject': subject,
            'content': content,
        },
        provider='sendgrid',
    )


def _send_resend(to_email, subject, text_body, html_body):
    payload = {
        'from': formataddr((_env('MAIL_FROM_NAME', 'CKD PREDICT'), _env('MAIL_FROM'))),
        'to': [to_email],
        'subject': subject,
        'text': text_body,
    }
    if html_body:
        payload['html'] = html_body

    _post_json(
        'https://api.resend.com/emails',
        {'Authorization': f"Bearer {_env('RESEND_API_KEY')}", 'Content-Type': 'application/json'},
        payload,
        provider='resend',
    )


_PROVIDERS = {
    'smtp': _send_smtp,
    'brevo': _send_brevo,
    'sendgrid': _send_sendgrid,
    'resend': _send_resend,
}


def send_email(to_email, subject, text_body, html_body=None):
    """
    Send an email through the configured provider.

    Tests may register an alternative sender callable at
    app.extensions['ckd_email_sender'] (signature: to, subject, text, html).
    """
    override = current_app.extensions.get('ckd_email_sender') if current_app else None
    if override is not None:
        override(to_email, subject, text_body, html_body)
        return

    if not is_configured():
        raise EmailNotConfigured('Email service is not configured on the server.')
    sender = _PROVIDERS.get(provider_name())
    if sender is None:
        raise EmailNotConfigured('Unsupported MAIL_PROVIDER.')
    sender(to_email, subject, text_body, html_body)


def email_available():
    """True if emails can be sent (configured provider or a registered override)."""
    try:
        if current_app and current_app.extensions.get('ckd_email_sender') is not None:
            return True
    except RuntimeError:
        pass
    return is_configured()
