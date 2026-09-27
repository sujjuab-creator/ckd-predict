"""
Tests for email_service module including Resend provider configuration,
header formatting, REST API request building, error handling, and provider selection.
"""
import io
import json
import os
import sys
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services import email_service
from services.email_service import EmailDeliveryError, EmailNotConfigured, is_configured, provider_name, send_email


class EmailServiceTests(unittest.TestCase):
    def setUp(self):
        self.env_patcher = patch.dict(os.environ, {}, clear=False)
        self.env_patcher.start()

    def tearDown(self):
        self.env_patcher.stop()

    def test_provider_name_default_and_custom(self):
        os.environ.pop('MAIL_PROVIDER', None)
        self.assertEqual(provider_name(), 'smtp')

        os.environ['MAIL_PROVIDER'] = 'resend'
        self.assertEqual(provider_name(), 'resend')

        os.environ['MAIL_PROVIDER'] = 'RESEND'
        self.assertEqual(provider_name(), 'resend')

    def test_resend_is_configured(self):
        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['RESEND_API_KEY'] = 're_test_key_123'

        self.assertTrue(is_configured())

        os.environ.pop('RESEND_API_KEY', None)
        self.assertFalse(is_configured())

        os.environ['RESEND_API_KEY'] = 're_test_key_123'
        os.environ.pop('MAIL_FROM', None)
        self.assertFalse(is_configured())

    def test_other_providers_is_configured(self):
        os.environ['MAIL_FROM'] = 'sender@example.com'

        os.environ['MAIL_PROVIDER'] = 'brevo'
        os.environ['BREVO_API_KEY'] = 'brevo_key'
        self.assertTrue(is_configured())

        os.environ['MAIL_PROVIDER'] = 'sendgrid'
        os.environ['SENDGRID_API_KEY'] = 'sendgrid_key'
        self.assertTrue(is_configured())

        os.environ['MAIL_PROVIDER'] = 'smtp'
        for var in ('MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD'):
            os.environ[var] = 'test_val'
        self.assertTrue(is_configured())

    @patch('urllib.request.urlopen')
    def test_send_email_resend_success(self, mock_urlopen):
        mock_response = MagicMock()
        mock_response.status = 200
        mock_response.__enter__.return_value = mock_response
        mock_urlopen.return_value = mock_response

        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['MAIL_FROM_NAME'] = 'CKD PREDICT'
        os.environ['RESEND_API_KEY'] = 're_secret_12345'

        send_email('patient@example.com', 'OTP Verification Code', 'Your OTP is 123456', '<p>Your OTP is 123456</p>')

        self.assertEqual(mock_urlopen.call_count, 1)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.full_url, 'https://api.resend.com/emails')
        self.assertEqual(req.get_header('Authorization'), 'Bearer re_secret_12345')
        self.assertEqual(req.get_header('Content-type'), 'application/json')

        payload = json.loads(req.data.decode('utf-8'))
        self.assertEqual(payload['from'], 'CKD PREDICT <sender@example.com>')
        self.assertEqual(payload['to'], ['patient@example.com'])
        self.assertEqual(payload['subject'], 'OTP Verification Code')
        self.assertEqual(payload['text'], 'Your OTP is 123456')
        self.assertEqual(payload['html'], '<p>Your OTP is 123456</p>')

    def test_send_email_resend_not_configured_raises(self):
        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ.pop('RESEND_API_KEY', None)

        with self.assertRaises(EmailNotConfigured):
            send_email('patient@example.com', 'OTP Code', '123456')

    @patch('urllib.request.urlopen')
    def test_send_email_resend_http_error_raises(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='https://api.resend.com/emails',
            code=401,
            msg='Unauthorized',
            hdrs={},
            fp=io.BytesIO(b'{"message":"Invalid API key"}')
        )

        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['RESEND_API_KEY'] = 're_invalid_secret'

        with self.assertRaises(EmailDeliveryError) as cm:
            send_email('patient@example.com', 'OTP Code', '123456')

        self.assertIn('HTTP 401', str(cm.exception))
        self.assertNotIn('re_invalid_secret', str(cm.exception))

    @patch('urllib.request.urlopen')
    def test_send_email_resend_network_error_raises(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError('Connection timed out')

        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['RESEND_API_KEY'] = 're_secret_123'

        with self.assertRaises(EmailDeliveryError) as cm:
            send_email('patient@example.com', 'OTP Code', '123456')

        self.assertIn('Email API unreachable', str(cm.exception))
        self.assertNotIn('re_secret_123', str(cm.exception))

    def test_send_email_unsupported_provider(self):
        os.environ['MAIL_PROVIDER'] = 'unsupported_provider'
        os.environ['MAIL_FROM'] = 'sender@example.com'

        with self.assertRaises(EmailNotConfigured):
            send_email('patient@example.com', 'OTP Code', '123456')


    @patch('urllib.request.urlopen')
    def test_resend_http_error_logs_safe_diagnostics(self, mock_urlopen):
        """Provider/status/message are logged; API key, auth header and OTP never are."""
        secret = 're_live_SuperSecretKey_987654321'
        body = json.dumps({
            'statusCode': 403,
            'name': 'validation_error',
            'message': 'The gmail.com domain is not verified. Echo: Bearer ' + secret + ' code 482913',
        }).encode('utf-8')
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='https://api.resend.com/emails', code=403, msg='Forbidden', hdrs={}, fp=io.BytesIO(body))

        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@gmail.com'
        os.environ['RESEND_API_KEY'] = secret

        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError) as cm:
                send_email('patient@example.com', 'Your code', 'Your CKD PREDICT verification code is: 482913',
                           '<p>482913</p>')

        output = '\n'.join(logs.output)
        self.assertIn('provider=resend', output)
        self.assertIn('status=403', output)
        self.assertIn('validation_error', output)
        self.assertIn('domain is not verified', output)
        self.assertNotIn(secret, output)
        self.assertNotIn('SuperSecretKey', output)
        self.assertNotIn('482913', output)          # OTP never logged
        self.assertNotIn('Authorization', output)
        # API response/exception behaviour unchanged
        self.assertEqual(str(cm.exception), 'Email API returned HTTP 403.')

    @patch('urllib.request.urlopen')
    def test_resend_http_error_with_plain_text_body(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.HTTPError(
            url='https://api.resend.com/emails', code=500, msg='Server Error', hdrs={},
            fp=io.BytesIO(b'upstream failure'))
        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['RESEND_API_KEY'] = 're_another_secret_value'
        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError):
                send_email('patient@example.com', 'Subject', 'Body')
        output = '\n'.join(logs.output)
        self.assertIn('provider=resend status=500 error=upstream failure', output)
        self.assertNotIn('re_another_secret_value', output)

    @patch('urllib.request.urlopen')
    def test_resend_network_error_logs_without_secrets(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError('timed out')
        os.environ['MAIL_PROVIDER'] = 'resend'
        os.environ['MAIL_FROM'] = 'sender@example.com'
        os.environ['RESEND_API_KEY'] = 're_network_secret_value'
        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError):
                send_email('patient@example.com', 'Subject', 'Body 654321')
        output = '\n'.join(logs.output)
        self.assertIn('provider=resend status=n/a', output)
        self.assertIn('URLError', output)
        self.assertNotIn('re_network_secret_value', output)
        self.assertNotIn('654321', output)

    def test_send_otp_route_still_returns_502_on_delivery_failure(self):
        """The public API response is unchanged: generic 502, no provider details, no OTP."""
        os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
        os.environ['FLASK_ENV'] = 'testing'
        from app import create_app
        from extensions import db
        app = create_app()
        with app.app_context():
            db.create_all()

        def failing_sender(*_args, **_kwargs):
            raise EmailDeliveryError('Email API returned HTTP 403.')

        app.extensions['ckd_email_sender'] = failing_sender
        res = app.test_client().post('/api/auth/send-otp', json={'email': 'new.user@gmail.com', 'purpose': 'patient_signup'})
        self.assertEqual(res.status_code, 502)
        data = res.get_json()
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], 'The verification email could not be sent. Please try again later.')
        self.assertNotIn('403', json.dumps(data))
        with app.app_context():
            db.session.remove()
            db.drop_all()

if __name__ == '__main__':
    unittest.main()
