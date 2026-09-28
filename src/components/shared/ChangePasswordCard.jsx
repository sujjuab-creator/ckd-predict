import React, { useState } from 'react';
import { KeyRound, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { Card, Alert } from '../ui/UI';

/** Change password (POST /api/auth/change-password), same form as in ProfilePanel. Used by Doctor Settings. */
export default function ChangePasswordCard() {
  const { currentUser, updateCurrentUser } = useAuth();
  const [pw, setPw] = useState({ next: '', confirm: '' });
  const [pwState, setPwState] = useState({ busy: false, error: '', ok: '' });

  const submit = async (e) => {
    e.preventDefault();
    setPwState({ busy: false, error: '', ok: '' });
    if (pw.next.length < 6) return setPwState({ busy: false, error: 'New password must be at least 6 characters.', ok: '' });
    if (pw.next !== pw.confirm) return setPwState({ busy: false, error: 'Passwords do not match.', ok: '' });
    setPwState({ busy: true, error: '', ok: '' });
    const res = await apiService.changePassword(pw.next);
    if (res.ok && res.data?.success) {
      updateCurrentUser({ isTemporaryPassword: false });
      setPw({ next: '', confirm: '' });
      setPwState({ busy: false, error: '', ok: res.data.message || 'Password updated successfully.' });
    } else {
      setPwState({ busy: false, error: res.data?.error || 'Password update failed.', ok: '' });
    }
    return undefined;
  };

  return (
    <Card title="Change password" icon={KeyRound}>
      {currentUser?.isTemporaryPassword && (
        <Alert type="warn" className="mt-8">You are signed in with a temporary password. Please choose a new one.</Alert>
      )}
      <form className="stack" onSubmit={submit} style={{ marginTop: currentUser?.isTemporaryPassword ? 16 : 0 }}>
        <div className="field">
          <label className="label" htmlFor="pw-new">New password</label>
          <div className="input-icon"><Lock /><input id="pw-new" type="password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} autoComplete="new-password" /></div>
        </div>
        <div className="field">
          <label className="label" htmlFor="pw-confirm">Confirm new password</label>
          <div className="input-icon"><Lock /><input id="pw-confirm" type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} autoComplete="new-password" /></div>
        </div>
        {pwState.error && <Alert type="error">{pwState.error}</Alert>}
        {pwState.ok && <Alert type="success">{pwState.ok}</Alert>}
        <button className="btn btn-primary" disabled={pwState.busy}>
          {pwState.busy ? <Loader2 className="spin" /> : <KeyRound />} Update password
        </button>
      </form>
    </Card>
  );
}
