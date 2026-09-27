import React, { useState } from 'react';
import { UserRound, KeyRound, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { Card, Alert, Loading, StatusBadge, RoleBadge } from '../ui/UI';
import { formatDate, initials } from '../../utils/format';

/**
 * Account details (GET /api/auth/me) and password change
 * (POST /api/auth/change-password). Shared by all three roles.
 */
export default function ProfilePanel({ extra = null, roleNote = null }) {
  const { currentUser, updateCurrentUser } = useAuth();
  const me = useApiData(async () => unwrap(await apiService.getCurrentUser()).user, []);
  const user = me.data || {};

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
    <div className="grid-main-side">
      <div className="stack-lg">
        <Card title="Account details" icon={UserRound}>
          {me.loading ? <Loading /> : (
            <>
              {me.error && <Alert type="warn" className="mt-8">Showing details from your current session. ({me.error})</Alert>}
              <div className="row" style={{ gap: 16, margin: me.error ? '16px 0 20px' : '0 0 20px' }}>
                <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, borderRadius: 16 }}>{initials(user.name || currentUser?.name)}</div>
                <div>
                  <div className="strong" style={{ fontSize: 18 }}>{user.name || currentUser?.name}</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <RoleBadge role={user.role || currentUser?.role} />
                    <StatusBadge status={user.status || currentUser?.status} />
                  </div>
                </div>
              </div>
              <dl className="kv">
                <dt>Email</dt><dd>{user.email || currentUser?.email}</dd>
                <dt>Account ID</dt><dd className="mono">{user.id ?? currentUser?.id}</dd>
                {(user.specialty_or_department) && (<><dt>Specialty / Department</dt><dd>{user.specialty_or_department}</dd></>)}
                {user.phone && (<><dt>Phone</dt><dd>{user.phone}</dd></>)}
                <dt>Member since</dt><dd>{formatDate(user.created_at)}</dd>
              </dl>
            </>
          )}
        </Card>
        {extra}
      </div>

      <div className="stack-lg">
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
        {roleNote}
      </div>
    </div>
  );
}
