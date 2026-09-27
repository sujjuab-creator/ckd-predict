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


if __name__ == '__main__':
    unittest.main()
