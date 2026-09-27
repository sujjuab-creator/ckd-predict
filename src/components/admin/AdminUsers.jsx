import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Users, Search, Pencil, UserX, UserCheck, PlusCircle, KeyRound, Trash2, RefreshCw, Loader2,
} from 'lucide-react';
import apiService from '../../services/api';
import {
  Card, PageHeader, Loading, ErrorState, EmptyState, Modal, Toast, Alert, StatusBadge, RoleBadge, Field,
} from '../ui/UI';
import { formatDate, initials } from '../../utils/format';

const EMPTY_CREATE = { name: '', email: '', password: '', role: 'doctor', specialty_or_department: '', phone: '', gender: 'Unspecified', doctor_id: '', treating_doctor_id: '' };

/**
 * Account management using the existing admin endpoints:
 * GET/POST /api/admin/users, PUT/DELETE /api/admin/users/:id,
 * POST /api/admin/users/:id/reset-password, POST /api/admin/users/:id/toggle-status.
 *
 * `fixedRole` limits the view to doctors or patients (Manage Doctors / Manage Patients).
 */
export default function AdminUsers({ fixedRole = null, title, subtitle, patientsByUserId = null, predictionCountByPatient = null, onUsersChanged }) {
  const [users, setUsers] = useState({ loading: true, error: '', list: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState(fixedRole || 'All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [toast, setToast] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_CREATE, role: fixedRole || 'doctor' });
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [deleteUser, setDeleteUser] = useState(null);
  const [activeDoctors, setActiveDoctors] = useState([]);

  // Active doctors for treating-doctor selection (GET /api/auth/doctors)
  const fetchDoctors = useCallback(async () => {
    const res = await apiService.getRegistrationDoctors();
    if (res.ok && res.data?.success) setActiveDoctors(res.data.doctors || []);
  }, []);
  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);
  const doctorLabel = (id) => {
    if (!id) return '—';
    const d = activeDoctors.find((x) => Number(x.id) === Number(id));
    return d ? `${d.name}${d.doctor_id ? ` (${d.doctor_id})` : ''}` : `Doctor #${id} (inactive)`;
  };

  const fetchUsers = useCallback(async () => {
    setUsers((u) => ({ ...u, loading: true, error: '' }));
    const res = await apiService.getUsers(fixedRole ? { role: fixedRole } : {});
    if (res.ok && res.data?.success) {
      setUsers({ loading: false, error: '', list: res.data.users || [] });
    } else {
      setUsers({ loading: false, error: res.data?.error || 'Unable to load user accounts.', list: [] });
    }
  }, [fixedRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const afterChange = (msg) => {
    setToast(msg);
    fetchUsers();
    fetchDoctors();
    onUsersChanged?.();
  };

  // 1. Create Doctor / Patient account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setFormError('Full name, email and temporary password are required.');
      return;
    }
    if (createForm.password.length < 6) {
      setFormError('Temporary password must be at least 6 characters.');
      return;
    }
    if (!['doctor', 'patient'].includes(createForm.role)) {
      setFormError('Only Doctor and Patient accounts can be created. There is exactly one Admin account.');
      return;
    }
    setBusy(true);
    const payload = { ...createForm };
    if (payload.role !== 'doctor') delete payload.doctor_id;
    if (payload.role !== 'patient' || !payload.treating_doctor_id) delete payload.treating_doctor_id;
    const res = await apiService.createUser(payload);
    setBusy(false);
    if (res.ok && res.data?.success) {
      setCreateOpen(false);
      setCreateForm({ ...EMPTY_CREATE, role: fixedRole || 'doctor' });
      afterChange(res.data.message || `Account created for ${createForm.name}.`);
    } else {
      setFormError(res.data?.error || 'Failed to create account.');
    }
  };

  // 2. Toggle status
  const handleToggle = async (user) => {
    if (user.role === 'admin') { setToast('The System Administrator account cannot be deactivated.'); return; }
    const res = await apiService.toggleUserStatus(user.id);
    if (res.ok && res.data?.success) afterChange(res.data.message || `Status updated for ${user.name}.`);
    else setToast(res.data?.error || 'Failed to change account status.');
  };

  // 3. Reset password
  const handleReset = async (e) => {
    e.preventDefault();
    if (resetPassword.length < 6) { setFormError('Password must be at least 6 characters long.'); return; }
    setBusy(true);
    const res = await apiService.resetUserPassword(resetUser.id, resetPassword);
    setBusy(false);
    if (res.ok && res.data?.success) {
      setResetUser(null);
      setResetPassword('');
      setFormError('');
      afterChange(res.data.message || `Temporary password set for ${resetUser.name}.`);
    } else {
      setFormError(res.data?.error || 'Failed to reset password.');
    }
  };

  // 4. Update details
  const handleUpdate = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await apiService.updateUser(editUser.id, editUser);
    setBusy(false);
    if (res.ok && res.data?.success) {
      setEditUser(null);
      setFormError('');
      afterChange(res.data.message || `Account updated for ${editUser.name}.`);
    } else {
      setFormError(res.data?.error || 'Failed to update account.');
    }
  };

  // 5. Delete
  const handleDelete = async () => {
    setBusy(true);
    const res = await apiService.deleteUser(deleteUser.id);
    setBusy(false);
    const name = deleteUser.name;
    setDeleteUser(null);
    if (res.ok && res.data?.success) afterChange(res.data.message || `${name} was removed.`);
    else setToast(res.data?.error || 'Failed to delete account.');
  };

  const filtered = useMemo(() => users.list.filter((u) => {
    const q = searchQuery.trim().toLowerCase();
    const matchQ = !q || String(u.id).includes(q) || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    const matchR = roleFilter === 'All' || u.role === roleFilter;
    const matchS = statusFilter === 'All' || u.status === statusFilter;
    return matchQ && matchR && matchS;
  }), [users.list, searchQuery, roleFilter, statusFilter]);

  const isPatientView = fixedRole === 'patient';
  const noun = fixedRole === 'doctor' ? 'Doctor' : fixedRole === 'patient' ? 'Patient' : 'Account';

  return (
    <div className="stack-lg">
      <PageHeader
        title={title || 'User Management'}
        subtitle={subtitle || 'Create and manage Doctor and Patient accounts. There is exactly one Administrator account.'}
        actions={(
          <>
            <button className="btn btn-ghost" onClick={fetchUsers}><RefreshCw /> Refresh</button>
            <button className="btn btn-primary" onClick={() => { setFormError(''); setCreateForm({ ...EMPTY_CREATE, role: fixedRole || 'doctor' }); setCreateOpen(true); }}>
              <PlusCircle /> Add {noun}
            </button>
          </>
        )}
      />

      <Card noBody>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input className="input" placeholder="Search by name, email or ID…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} aria-label="Search accounts" />
          </div>
          {!fixedRole && (
            <select className="select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filter by role">
              <option value="All">All roles</option>
              <option value="admin">Admin</option>
              <option value="doctor">Doctors</option>
              <option value="patient">Patients</option>
            </select>
          )}
          <select className="select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
            <option value="All">All statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <span className="small muted" style={{ marginLeft: 'auto' }}>{users.loading ? '' : `${filtered.length} of ${users.list.length}`}</span>
        </div>

        {users.loading ? <Loading label="Loading accounts…" /> : users.error ? <ErrorState message={users.error} onRetry={fetchUsers} /> : filtered.length === 0 ? (
          <EmptyState icon={Users} title={users.list.length ? 'No matching accounts' : `No ${noun.toLowerCase()} accounts yet`}
            message={users.list.length ? 'Try a different search or filter.' : `Use "Add ${noun}" to create the first account.`} />
        ) : (
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 820 }}>
              <thead>
                <tr>
                  <th>User</th>
                  {!fixedRole && <th>Role</th>}
                  {isPatientView && <th>Patient ID</th>}
                  {isPatientView && <th>Predictions</th>}
                  {fixedRole === 'doctor' && <th>Doctor ID</th>}
                  {isPatientView && <th>Treating doctor</th>}
                  {fixedRole !== 'patient' && <th>Specialty / Dept.</th>}
                  <th>Status</th>
                  <th>Created</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const rec = patientsByUserId?.[u.id];
                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, borderRadius: 9 }}>{initials(u.name)}</span>
                          <div style={{ minWidth: 0 }}>
                            <div className="strong">{u.name}</div>
                            <div className="xs muted">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      {!fixedRole && <td><RoleBadge role={u.role} /></td>}
                      {isPatientView && <td className="mono">{rec?.patient_id || '—'}</td>}
                      {isPatientView && <td>{rec ? (predictionCountByPatient?.[rec.id] || 0) : '—'}</td>}
                      {fixedRole === 'doctor' && <td className="mono">{u.doctor_id || '—'}</td>}
                      {isPatientView && <td>{doctorLabel(u.treating_doctor_id)}</td>}
                      {fixedRole !== 'patient' && <td>{u.specialty_or_department || '—'}</td>}
                      <td>
                        <StatusBadge status={u.status} />
                        {u.is_temporary_password && u.role !== 'admin' && <div className="xs muted" style={{ marginTop: 4 }}>Temporary password</div>}
                      </td>
                      <td>{formatDate(u.created_at)}</td>
                      <td>
                        {u.role === 'admin' ? (
                          <span className="xs muted" style={{ display: 'block', textAlign: 'right' }}>Protected account</span>
                        ) : (
                          <div className="actions">
                            <button className="icon-btn" title="Edit details" aria-label={`Edit ${u.name}`} onClick={() => { setFormError(''); setEditUser({ ...u }); }}><Pencil /></button>
                            <button className="icon-btn" title="Reset password" aria-label={`Reset password for ${u.name}`} onClick={() => { setFormError(''); setResetPassword(''); setResetUser(u); }}><KeyRound /></button>
                            <button className="icon-btn" title={u.status === 'Active' ? 'Deactivate' : 'Activate'} aria-label={u.status === 'Active' ? `Deactivate ${u.name}` : `Activate ${u.name}`} onClick={() => handleToggle(u)}>
                              {u.status === 'Active' ? <UserX /> : <UserCheck />}
                            </button>
                            <button className="icon-btn" title="Delete" aria-label={`Delete ${u.name}`} style={{ color: '#dc2626' }} onClick={() => setDeleteUser(u)}><Trash2 /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create */}
      {createOpen && (
        <Modal
          title={`Add ${noun === 'Account' ? 'Doctor or Patient' : noun}`}
          onClose={() => setCreateOpen(false)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button className="btn btn-primary" form="create-user-form" disabled={busy}>{busy ? <Loader2 className="spin" /> : <PlusCircle />} Create account</button>
            </>
          )}
        >
          <form id="create-user-form" className="stack" onSubmit={handleCreateSubmit}>
            {formError && <Alert type="error">{formError}</Alert>}
            {!fixedRole && (
              <Field label="Account role" required>
                <div className="segmented">
                  {['doctor', 'patient'].map((r) => (
                    <button type="button" key={r} className={createForm.role === r ? 'active' : ''} onClick={() => setCreateForm({ ...createForm, role: r })}>
                      {r === 'doctor' ? 'Doctor' : 'Patient'}
                    </button>
                  ))}
                </div>
              </Field>
            )}
            <Field label="Full name" required><input className="input" value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} /></Field>
            <Field label="Email (Gmail)" required><input className="input" type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} /></Field>
            <Field label="Temporary password" required hint="The user will be prompted to change it after signing in.">
              <input className="input" type="text" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} autoComplete="off" />
            </Field>
            {createForm.role === 'doctor' ? (
              <>
                <Field label="Doctor ID" hint="Unique hospital / registration ID (optional for admin-created accounts).">
                  <input className="input" value={createForm.doctor_id} onChange={(e) => setCreateForm({ ...createForm, doctor_id: e.target.value })} placeholder="e.g. DOC-001" />
                </Field>
                <Field label="Specialty / Department"><input className="input" value={createForm.specialty_or_department} onChange={(e) => setCreateForm({ ...createForm, specialty_or_department: e.target.value })} placeholder="e.g. Nephrology" /></Field>
              </>
            ) : (
              <>
              <Field label="Treating doctor">
                <select className="select" value={createForm.treating_doctor_id} onChange={(e) => setCreateForm({ ...createForm, treating_doctor_id: e.target.value })}>
                  <option value="">Not assigned</option>
                  {activeDoctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.doctor_id ? ` (${d.doctor_id})` : ''}</option>)}
                </select>
              </Field>
              <Field label="Gender">
                <select className="select" value={createForm.gender} onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}>
                  <option value="Unspecified">Unspecified</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              </>
            )}
            <Field label="Phone"><input className="input" value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></Field>
          </form>
        </Modal>
      )}

      {/* Edit */}
      {editUser && (
        <Modal
          title={`Edit ${editUser.name}`}
          onClose={() => setEditUser(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setEditUser(null)}>Cancel</button>
              <button className="btn btn-primary" form="edit-user-form" disabled={busy}>{busy ? <Loader2 className="spin" /> : <Pencil />} Save changes</button>
            </>
          )}
        >
          <form id="edit-user-form" className="stack" onSubmit={handleUpdate}>
            {formError && <Alert type="error">{formError}</Alert>}
            <Field label="Full name"><input className="input" value={editUser.name || ''} onChange={(e) => setEditUser({ ...editUser, name: e.target.value })} /></Field>
            <Field label="Email"><input className="input" type="email" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} /></Field>
            {editUser.role === 'doctor' && (
              <Field label="Doctor ID"><input className="input" value={editUser.doctor_id || ''} onChange={(e) => setEditUser({ ...editUser, doctor_id: e.target.value })} placeholder="e.g. DOC-001" /></Field>
            )}
            {editUser.role === 'patient' && (
              <Field label="Treating doctor">
                <select className="select" value={editUser.treating_doctor_id || ''} onChange={(e) => setEditUser({ ...editUser, treating_doctor_id: e.target.value })}>
                  <option value="">Not assigned</option>
                  {editUser.treating_doctor_id && !activeDoctors.some((d) => Number(d.id) === Number(editUser.treating_doctor_id)) && (
                    <option value={editUser.treating_doctor_id}>{doctorLabel(editUser.treating_doctor_id)}</option>
                  )}
                  {activeDoctors.map((d) => <option key={d.id} value={d.id}>{d.name}{d.doctor_id ? ` (${d.doctor_id})` : ''}</option>)}
                </select>
              </Field>
            )}
            <Field label="Specialty / Department"><input className="input" value={editUser.specialty_or_department || ''} onChange={(e) => setEditUser({ ...editUser, specialty_or_department: e.target.value })} /></Field>
            <Field label="Phone"><input className="input" value={editUser.phone || ''} onChange={(e) => setEditUser({ ...editUser, phone: e.target.value })} /></Field>
            <Field label="Status">
              <select className="select" value={editUser.status} onChange={(e) => setEditUser({ ...editUser, status: e.target.value })}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </Field>
          </form>
        </Modal>
      )}

      {/* Reset password */}
      {resetUser && (
        <Modal
          title="Reset password"
          onClose={() => setResetUser(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setResetUser(null)}>Cancel</button>
              <button className="btn btn-primary" form="reset-form" disabled={busy}>{busy ? <Loader2 className="spin" /> : <KeyRound />} Set temporary password</button>
            </>
          )}
        >
          <form id="reset-form" className="stack" onSubmit={handleReset}>
            <p className="muted">Set a new temporary password for <b>{resetUser.name}</b> ({resetUser.email}). They will be asked to change it after signing in.</p>
            {formError && <Alert type="error">{formError}</Alert>}
            <Field label="New temporary password" required><input className="input" type="text" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} autoComplete="off" /></Field>
          </form>
        </Modal>
      )}

      {/* Delete confirmation */}
      {deleteUser && (
        <Modal
          title="Delete account?"
          onClose={() => setDeleteUser(null)}
          footer={(
            <>
              <button className="btn btn-ghost" onClick={() => setDeleteUser(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={busy}>{busy ? <Loader2 className="spin" /> : <Trash2 />} Delete permanently</button>
            </>
          )}
        >
          <Alert type="warn">
            This permanently deletes <b>{deleteUser.name}</b> ({deleteUser.email})
            {deleteUser.role === 'patient' ? ' together with their patient record, predictions and reports.' : '.'} This cannot be undone.
          </Alert>
        </Modal>
      )}

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  );
}
