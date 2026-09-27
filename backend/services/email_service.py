"""
Outbound email for OTP codes and password-reset links.

All settings come from environment variables (never hard-coded):

  MAIL_PROVIDER   smtp (default) | brevo | sendgrid
  MAIL_FROM       sender address, e.g. your-email@example.com
  MAIL_FROM_NAME  optional display name (default "CKD PREDICT")

  SMTP:           MAIL_SERVER, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD,
                  MAIL_USE_TLS (STARTTLS, default true), MAIL_USE_SSL (default false)
  Brevo:          BREVO_API_KEY      (HTTPS API, works where SMTP ports are blocked)
  SendGrid:       SENDGRID_API_KEY   (HTTPS API, works where SMTP ports are blocked)
  Resend:         RESEND_API_KEY     (HTTPS API, works where SMTP ports are blocked)

Message bodies and credentials are never logged.
"""
import json
import os
import smtplib
import ssl
import urllib.error
import urllib.request
from email.message import EmailMessage
from email.utils import formataddr

from flask import current_app


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
        # Log only the error class, never credentials or message content
        raise EmailDeliveryError(f'SMTP delivery failed ({err.__class__.__name__}).') from None


def _post_json(url, headers, payload):
    req = urllib.request.Request(url, data=json.dumps(payload).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status >= 300:
                raise EmailDeliveryError(f'Email API returned HTTP {resp.status}.')
    except urllib.error.HTTPError as err:
        raise EmailDeliveryError(f'Email API returned HTTP {err.code}.') from None
    except (urllib.error.URLError, OSError) as err:
        raise EmailDeliveryError(f'Email API unreachable ({err.__class__.__name__}).') from None


def _send_brevo(to_email, subject, text_body, html_body):
    _post_json(
        'https://api.brevo.com/v3/smtp/email',
        {'api-key': _env('BREVO_API_KEY'), 'Content-Type': 'application/json', 'Accept': 'application/json'},
        {
            'sender': {'email': _env('MAIL_FROM'), 'name': _env('MAIL_FROM_NAME', 'CKD PREDICT')},
            'to': [{'email': to_email}],
            'subject': subject,
            'textContent': text_body,
            'htmlContent': html_body or f'<pre>{text_body}</pre>',
        },
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
