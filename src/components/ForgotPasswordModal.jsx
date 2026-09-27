import React, { useState } from 'react';
import { Mail, Send, Loader2 } from 'lucide-react';
import apiService from '../services/api';
import { Modal, Alert } from './ui/UI';

// Requests a single-use password reset link by email
// (POST /api/auth/forgot-password). The response is intentionally the same
// whether or not an account exists for the address.
export default function ForgotPasswordModal({ isOpen, onClose }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { type, title, text }

  if (!isOpen) return null;

  const close = () => {
    setEmail('');
    setResult(null);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setResult({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }
    setBusy(true);
    const res = await apiService.forgotPassword(email.trim().toLowerCase());
    setBusy(false);
    if (res.ok && res.data?.success) {
      setResult({ type: 'success', title: 'Check your email', text: res.data.message });
    } else if (res.data?.code === 'email_not_configured') {
      setResult({
        type: 'warn',
        title: 'Email reset is not available',
        text: 'Password reset by email is not configured on the server. Please contact the hospital administrator, who can set a temporary password for you.',
      });
    } else {
      setResult({ type: 'error', text: res.data?.error || 'The request could not be completed. Please try again later.' });
    }
  };

  const done = result?.type === 'success';

  return (
    <Modal
      title="Forgot your password?"
      onClose={close}
      footer={done ? (
        <button className="btn btn-primary" onClick={close}>Back to Sign In</button>
      ) : (
        <>
          <button className="btn btn-ghost" onClick={close}>Cancel</button>
          <button className="btn btn-primary" form="forgot-form" disabled={busy}>
            {busy ? <Loader2 className="spin" /> : <Send />} Send reset link
          </button>
        </>
      )}
    >
      <div className="stack">
        {!done && (
          <p className="muted">
            Enter the email address of your account. If it matches an active account, we'll email you a secure link to
            choose a new password. The link expires in 30 minutes and can be used once.
          </p>
        )}
        {result && <Alert type={result.type} title={result.title}>{result.text}</Alert>}
        {!done && (
          <form id="forgot-form" onSubmit={submit} noValidate>
            <div className="field">
              <label className="label" htmlFor="forgot-email">Email address</label>
              <div className="input-icon">
                <Mail />
                <input id="forgot-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="email" />
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
