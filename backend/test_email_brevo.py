"""
Brevo (HTTPS transactional API) provider tests.

All HTTP calls are mocked (urllib.request.urlopen) so no real email is sent and
no real API key is needed. Run from backend/:  python -m unittest -v
"""
import io
import json
import os
import re
import sys
import unittest
import urllib.error
from unittest.mock import MagicMock, patch

os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['FLASK_ENV'] = 'testing'

backend_dir = os.path.abspath(os.path.dirname(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services.email_service import (  # noqa: E402
    BREVO_API_URL, EmailDeliveryError, EmailNotConfigured, is_configured, send_email,
)

FAKE_KEY = 'xkeysib-' + 'a1b2c3d4e5f6' * 5 + '-FakeTestKey99'
MAIL_KEYS = ('MAIL_PROVIDER', 'MAIL_FROM', 'MAIL_FROM_NAME', 'BREVO_API_KEY', 'RESEND_API_KEY',
             'SENDGRID_API_KEY', 'MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD', 'FRONTEND_URL')


def ok_response(status=201):
    resp = MagicMock()
    resp.status = status
    resp.__enter__.return_value = resp
    return resp


def http_error(code, body):
    return urllib.error.HTTPError(url=BREVO_API_URL, code=code, msg='error', hdrs={}, fp=io.BytesIO(body))


class BrevoTestBase(unittest.TestCase):
    def setUp(self):
        self._saved = {k: os.environ.get(k) for k in MAIL_KEYS}
        for k in MAIL_KEYS:
            os.environ.pop(k, None)
        os.environ.update({
            'MAIL_PROVIDER': 'brevo',
            'MAIL_FROM': 'noreply.ckdpredict@gmail.com',
            'MAIL_FROM_NAME': 'CKD Predict',
            'BREVO_API_KEY': FAKE_KEY,
            'FRONTEND_URL': 'https://ckd-predict.example.com',
        })

    def tearDown(self):
        for k, v in self._saved.items():
            if v is None:
                os.environ.pop(k, None)
            else:
                os.environ[k] = v


class BrevoProviderTests(BrevoTestBase):
    def test_brevo_is_configured(self):
        self.assertTrue(is_configured())
        os.environ.pop('BREVO_API_KEY')
        self.assertFalse(is_configured())
        os.environ['BREVO_API_KEY'] = FAKE_KEY
        os.environ.pop('MAIL_FROM')
        self.assertFalse(is_configured())

    def test_brevo_not_configured_raises(self):
        os.environ.pop('BREVO_API_KEY')
        with self.assertRaises(EmailNotConfigured):
            send_email('patient@example.com', 'Subject', 'Body')

    @patch('urllib.request.urlopen')
    def test_brevo_request_format(self, mock_urlopen):
        mock_urlopen.return_value = ok_response(201)
        send_email('patient@example.com', 'Your code', 'Plain text body', '<p>HTML body</p>')

        self.assertEqual(mock_urlopen.call_count, 1)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.full_url, 'https://api.brevo.com/v3/smtp/email')
        self.assertEqual(req.get_method(), 'POST')
        self.assertEqual(req.get_header('Api-key'), FAKE_KEY)          # key only in the api-key header
        self.assertIsNone(req.get_header('Authorization'))
        self.assertEqual(req.get_header('Content-type'), 'application/json')
        payload = json.loads(req.data.decode('utf-8'))
        self.assertEqual(payload['sender'], {'email': 'noreply.ckdpredict@gmail.com', 'name': 'CKD Predict'})
        self.assertEqual(payload['to'], [{'email': 'patient@example.com'}])
        self.assertEqual(payload['subject'], 'Your code')
        self.assertEqual(payload['textContent'], 'Plain text body')
        self.assertEqual(payload['htmlContent'], '<p>HTML body</p>')
        self.assertNotIn(FAKE_KEY, req.data.decode('utf-8'))           # key never in the body

    @patch('urllib.request.urlopen')
    def test_brevo_text_only_html_is_escaped(self, mock_urlopen):
        mock_urlopen.return_value = ok_response(201)
        send_email('patient@example.com', 'Subject', 'a <b>tag</b> & text')
        payload = json.loads(mock_urlopen.call_args[0][0].data.decode('utf-8'))
        self.assertEqual(payload['htmlContent'], '<pre>a &lt;b&gt;tag&lt;/b&gt; &amp; text</pre>')

    @patch('urllib.request.urlopen')
    def test_brevo_error_is_generic_and_logged_safely(self, mock_urlopen):
        body = json.dumps({
            'code': 'unauthorized',
            'message': f'We have detected you are using an unrecognised IP address 203.0.113.7. key={FAKE_KEY} code 482913',
        }).encode('utf-8')
        mock_urlopen.side_effect = http_error(401, body)

        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError) as cm:
                send_email('patient@example.com', 'Code', 'Your CKD PREDICT verification code is: 482913')

        self.assertEqual(str(cm.exception), 'Email API returned HTTP 401.')
        output = '\n'.join(logs.output)
        self.assertIn('provider=brevo', output)
        self.assertIn('status=401', output)
        self.assertIn('unauthorized', output)
        self.assertIn('unrecognised IP address', output)
        self.assertNotIn(FAKE_KEY, output)
        self.assertNotIn('xkeysib', output)
        self.assertNotIn('482913', output)
        self.assertNotIn(FAKE_KEY, str(cm.exception))

    @patch('urllib.request.urlopen')
    def test_brevo_sender_not_verified_error(self, mock_urlopen):
        body = b'{"code":"invalid_parameter","message":"Sender is not valid"}'
        mock_urlopen.side_effect = http_error(400, body)
        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError):
                send_email('patient@example.com', 'Subject', 'Body')
        self.assertIn('provider=brevo status=400 error=invalid_parameter | Sender is not valid', '\n'.join(logs.output))

    @patch('urllib.request.urlopen')
    def test_brevo_network_error(self, mock_urlopen):
        mock_urlopen.side_effect = urllib.error.URLError('timed out')
        with self.assertLogs('ckd.email', level='WARNING') as logs:
            with self.assertRaises(EmailDeliveryError) as cm:
                send_email('patient@example.com', 'Subject', 'Body')
        self.assertIn('unreachable', str(cm.exception))
        self.assertIn('provider=brevo status=n/a', '\n'.join(logs.output))

    @patch('urllib.request.urlopen')
    def test_brevo_selected_over_other_configured_providers(self, mock_urlopen):
        os.environ['RESEND_API_KEY'] = 're_should_not_be_used_123456'
        os.environ['SENDGRID_API_KEY'] = 'SG.should_not_be_used_123456'
        mock_urlopen.return_value = ok_response(201)
        send_email('patient@example.com', 'Subject', 'Body')
        self.assertEqual(mock_urlopen.call_args[0][0].full_url, BREVO_API_URL)


class BrevoRouteTests(BrevoTestBase):
    """OTP and password-reset emails go through Brevo; API responses stay generic."""

    def setUp(self):
        super().setUp()
        from app import create_app
        from extensions import db
        from models.user import User
        from utils.security import hash_password
        self.db = db
        self.app = create_app()
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
            db.session.add(User(name='Dr. Reset', email='dr.reset@gmail.com', password_hash=hash_password('Doctor123'),
                                role='doctor', status='Active', is_temporary_password=False))
            db.session.commit()

    def tearDown(self):
        with self.app.app_context():
            self.db.session.remove()
            self.db.drop_all()
        super().tearDown()

    @staticmethod
    def sent_payload(mock_urlopen):
        return json.loads(mock_urlopen.call_args[0][0].data.decode('utf-8'))

    @patch('urllib.request.urlopen')
    def test_otp_email_sent_via_brevo_and_verifiable(self, mock_urlopen):
        mock_urlopen.return_value = ok_response(201)
        res = self.client.post('/api/auth/send-otp', json={'email': 'New.Patient@Gmail.com', 'purpose': 'patient_signup'})
        self.assertEqual(res.status_code, 200)
        req = mock_urlopen.call_args[0][0]
        self.assertEqual(req.full_url, BREVO_API_URL)
        payload = self.sent_payload(mock_urlopen)
        self.assertEqual(payload['to'], [{'email': 'new.patient@gmail.com'}])
        otp = re.search(r'verification code is: (\d{6})', payload['textContent']).group(1)
        self.assertNotIn(otp, res.get_data(as_text=True))       # OTP never in the API response

        verify = self.client.post('/api/auth/verify-otp', json={'email': 'new.patient@gmail.com', 'otp': otp,
                                                                'purpose': 'patient_signup'})
        self.assertEqual(verify.status_code, 200)
        self.assertTrue(verify.get_json()['verified'])

    @patch('urllib.request.urlopen')
    def test_otp_brevo_failure_returns_generic_502(self, mock_urlopen):
        mock_urlopen.side_effect = http_error(401, b'{"code":"unauthorized","message":"Key not found"}')
        with self.assertLogs('ckd.email', level='WARNING'):
            res = self.client.post('/api/auth/send-otp', json={'email': 'x.user@gmail.com', 'purpose': 'doctor_signup'})
        self.assertEqual(res.status_code, 502)
        body = res.get_data(as_text=True)
        self.assertIn('could not be sent', body)
        self.assertNotIn('Key not found', body)
        self.assertNotIn('401', body)
        self.assertNotIn(FAKE_KEY, body)
        # Failed delivery does not consume the resend cooldown
        mock_urlopen.side_effect = None
        mock_urlopen.return_value = ok_response(201)
        again = self.client.post('/api/auth/send-otp', json={'email': 'x.user@gmail.com', 'purpose': 'doctor_signup'})
        self.assertEqual(again.status_code, 200)

    @patch('urllib.request.urlopen')
    def test_password_reset_email_sent_via_brevo(self, mock_urlopen):
        mock_urlopen.return_value = ok_response(201)
        res = self.client.post('/api/auth/forgot-password', json={'email': 'dr.reset@gmail.com'})
        self.assertEqual(res.status_code, 200)
        self.assertEqual(mock_urlopen.call_args[0][0].full_url, BREVO_API_URL)
        payload = self.sent_payload(mock_urlopen)
        self.assertEqual(payload['to'], [{'email': 'dr.reset@gmail.com'}])
        token = re.search(r'https://ckd-predict\.example\.com/#/reset-password/([A-Za-z0-9_\-]+)',
                          payload['textContent']).group(1)
        self.assertNotIn(token, res.get_data(as_text=True))

        reset = self.client.post('/api/auth/reset-password', json={'token': token, 'new_password': 'NewPass123'})
        self.assertEqual(reset.status_code, 200)
        login = self.client.post('/api/auth/login', json={'email': 'dr.reset@gmail.com', 'password': 'NewPass123',
                                                          'role': 'doctor'})
        self.assertEqual(login.status_code, 200)

    @patch('urllib.request.urlopen')
    def test_password_reset_brevo_failure_returns_generic_502(self, mock_urlopen):
        mock_urlopen.side_effect = http_error(500, b'{"message":"internal"}')
        with self.assertLogs('ckd.email', level='WARNING'):
            res = self.client.post('/api/auth/forgot-password', json={'email': 'dr.reset@gmail.com'})
        self.assertEqual(res.status_code, 502)
        self.assertIn('could not be sent', res.get_json()['error'])

    @patch('urllib.request.urlopen')
    def test_unknown_email_reset_sends_nothing(self, mock_urlopen):
        res = self.client.post('/api/auth/forgot-password', json={'email': 'nobody@gmail.com'})
        self.assertEqual(res.status_code, 200)
        mock_urlopen.assert_not_called()


if __name__ == '__main__':
    unittest.main()
