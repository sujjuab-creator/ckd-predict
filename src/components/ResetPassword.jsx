import React, { useState } from 'react';
import { Lock, KeyRound, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/api';
import { AuthAside } from './Login';
import { Alert } from './ui/UI';

/** #/reset-password/:token — completes the emailed password reset (POST /api/auth/reset-password). */
export default function ResetPassword({ token, onNavigate }) {
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (pw.next.length < 8 || !/[A-Za-z]/.test(pw.next) || !/\d/.test(pw.next)) {
      setError('Use at least 8 characters with a letter and a number.');
      return;
    }
    if (pw.next !== pw.confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const res = await apiService.resetPassword(token, pw.next);
    setBusy(false);
    if (res.ok && res.data?.success) {
      setDone(res.data.message || 'Your password has been reset.');
      setPw({ next: '', confirm: '' });
    } else {
      setError(res.data?.error || 'This reset link is invalid or has expired.');
    }
  };

  return (
    <div className="auth-page">
      <AuthAside title="Choose a new password" text="Reset links are single-use and expire after 30 minutes." />
      <div className="auth-main">
        <div className="auth-card">
          <button className="back-link" onClick={() => onNavigate('/login')}><ArrowLeft /> Back to Sign In</button>
          <h1>Reset Password</h1>
          <p className="sub">Enter a new password for your CKD PREDICT account.</p>

          {!token && <Alert type="error">This reset link is incomplete. Please request a new one from the sign-in page.</Alert>}

          {done ? (
            <div className="stack">
              <Alert type="success">{done}</Alert>
              <button className="btn btn-primary btn-lg btn-block" onClick={() => onNavigate('/login')}>Go to Sign In</button>
            </div>
          ) : token && (
            <form className="stack" onSubmit={submit} noValidate>
              {error && <Alert type="error">{error}</Alert>}
              <div className="field">
                <label className="label" htmlFor="rp-new">New password</label>
                <div className="input-icon">
                  <Lock />
                  <input id="rp-new" type={show ? 'text' : 'password'} className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" style={{ paddingRight: 44 }} />
                  <button type="button" className="toggle" onClick={() => setShow((v) => !v)} aria-label="Toggle password visibility">{show ? <EyeOff /> : <Eye />}</button>
                </div>
                <span className="hint">8+ characters, letters and numbers</span>
              </div>
              <div className="field">
                <label className="label" htmlFor="rp-confirm">Confirm new password</label>
                <div className="input-icon">
                  <Lock />
                  <input id="rp-confirm" type={show ? 'text' : 'password'} className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" />
                </div>
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Loader2 className="spin" /> : <KeyRound />} Reset password
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
