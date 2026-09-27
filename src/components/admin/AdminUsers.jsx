import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Filter, Eye, Edit3, UserX, UserCheck, 
  CheckCircle2, X, AlertCircle, PlusCircle, Key, Trash2, Shield, Stethoscope, UserCheck as PatientIcon
} from 'lucide-react';
import apiService from '../../services/api';
import { MOCK_USERS } from '../../data/mockUsers';

export default function AdminUsers({ onNavigate }) {
  const [usersList, setUsersList] = useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [loading, setLoading] = useState(false);
  const [toastNotice, setToastNotice] = useState(null);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState(null);

  // Create Form State
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'doctor',
    specialty_or_department: '',
    phone: '',
    gender: 'Unspecified'
  });
  const [formError, setFormError] = useState('');
  const [resetPasswordInput, setResetPasswordInput] = useState('');

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiService.getUsers();
      if (res.ok && res.data?.users) {
        setUsersList(res.data.users);
      }
    } catch (err) {
      // Fallback to local state if offline
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 4000);
  };

  // 1. Create Doctor / Patient Account
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password.trim()) {
      setFormError('Full Name, Email, and Temporary Password are required.');
      return;
    }

    if (createForm.role === 'admin') {
      setFormError('Creation of additional Admin accounts is strictly prohibited.');
      return;
    }

    try {
      const res = await apiService.createUser(createForm);
      if (res.ok && res.data?.success) {
        showToast(`Account successfully created for ${createForm.name} (${createForm.role.toUpperCase()})`);
        setIsCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          password: '',
          role: 'doctor',
          specialty_or_department: '',
          phone: '',
          gender: 'Unspecified'
        });
        fetchUsers();
      } else {
        setFormError(res.data?.error || 'Failed to create account.');
      }
    } catch (err) {
      setFormError('Network error while creating account.');
    }
  };

  // 2. Toggle Status (Activate / Deactivate)
  const handleToggleDeactivate = async (user) => {
    if (user.role === 'admin') {
      showToast('The System Administrator account cannot be deactivated.');
      return;
    }

    try {
      const res = await apiService.toggleUserStatus(user.id);
      if (res.ok && res.data?.success) {
        showToast(`Account status updated to ${res.data.status} for ${user.name}`);
        fetchUsers();
      } else {
        // Local state toggle fallback
        setUsersList(prev => prev.map(u => {
          if (u.id === user.id) {
            const nextStatus = u.status === 'Active' ? 'Inactive' : 'Active';
            showToast(`User ${u.name} status updated to ${nextStatus}`);
            return { ...u, status: nextStatus };
          }
          return u;
        }));
      }
    } catch {
      showToast('Failed to toggle status.');
    }
  };

  // 3. Reset Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetPasswordInput || resetPasswordInput.length < 6) {
      showToast('Password must be at least 6 characters long.');
      return;
    }

    try {
      const res = await apiService.resetUserPassword(isResetModalOpen.id, resetPasswordInput);
      if (res.ok && res.data?.success) {
        showToast(`Temporary password updated for ${isResetModalOpen.name}`);
        setIsResetModalOpen(null);
        setResetPasswordInput('');
      } else {
        showToast(res.data?.error || 'Failed to reset password.');
      }
    } catch {
      showToast('Network error reset password.');
    }
  };

  // 4. Update User Details
  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserModal) return;

    try {
      const res = await apiService.updateUser(selectedUserModal.id, selectedUserModal);
      if (res.ok && res.data?.success) {
        showToast(`Account details updated for ${selectedUserModal.name}`);
        setSelectedUserModal(null);
        fetchUsers();
      } else {
        showToast(res.data?.error || 'Failed to update user details.');
      }
    } catch {
      showToast('Update failed.');
    }
  };

  // 5. Delete User
  const handleDeleteUser = async (user) => {
    if (user.role === 'admin') {
      showToast('The System Administrator account cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete account ${user.name} (${user.email})?`)) {
      return;
    }

    try {
      const res = await apiService.deleteUser(user.id);
      if (res.ok && res.data?.success) {
        showToast(`Account ${user.name} removed successfully.`);
        fetchUsers();
      } else {
        showToast(res.data?.error || 'Failed to delete user account.');
      }
    } catch {
      showToast('Delete operation failed.');
    }
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || (
      String(u.id).toLowerCase().includes(q) ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q))
    );

    const matchesRole = roleFilter === 'All' || (u.role && u.role.toLowerCase() === roleFilter.toLowerCase());

    return matchesQuery && matchesRole;
  });

  return (
    <div className="space-y-8">
      
      {/* Toast Notice */}
      {toastNotice && (
        <div className="fixed top-24 right-4 z-50 bg-slate-900 border-2 border-indigo-500 text-indigo-300 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
          <p className="text-xs font-bold">{toastNotice}</p>
        </div>
      )}

      {/* Clinical Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-slate-300 text-xs">
        <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-400">Hospital Administrative Notice: </span>
          <span>This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.</span>
        </div>
      </div>

      {/* Header & Create Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Hospital Account Management</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            System Administrator portal: Provision Doctor & Patient accounts, manage access credentials and security roles.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError('');
            setIsCreateModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-500 hover:from-indigo-500 hover:to-sky-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2 shrink-0 transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Provision New Account</span>
        </button>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by User ID, Name, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs w-full md:w-auto overflow-x-auto">
          <span className="text-slate-400 font-medium flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Role Filter:</span>
          </span>
          {['All', 'Patient', 'Doctor', 'Admin'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                roleFilter.toLowerCase() === r.toLowerCase()
                  ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-indigo-400" />
          <span>System User Accounts ({filteredUsers.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">USR-{String(u.id).padStart(3, '0')}</td>
                  <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2">
                    {u.role === 'admin' && <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    {u.role === 'doctor' && <Stethoscope className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
                    {u.role === 'patient' && <PatientIcon className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{u.email}</td>
                  <td className="py-3.5 px-4 capitalize">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'admin' 
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : u.role === 'doctor'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      u.status === 'Active' || u.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {u.status || 'Active'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => setSelectedUserModal({ ...u, editMode: false })}
                        title="View Account"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-[11px] flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => setSelectedUserModal({ ...u, editMode: true })}
                        title="Edit Details"
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-all text-[11px] flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => {
                          setResetPasswordInput('');
                          setIsResetModalOpen(u);
                        }}
                        title="Reset Temp Password"
                        className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all text-[11px] flex items-center space-x-1"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Password</span>
                      </button>

                      {u.role !== 'admin' && (
                        <>
                          <button
                            onClick={() => handleToggleDeactivate(u)}
                            title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                            className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] flex items-center space-x-1 ${
                              u.status === 'Active'
                                ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {u.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            onClick={() => handleDeleteUser(u)}
                            title="Delete User"
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Provision Account (Doctor / Patient)</h3>
                <p className="text-xs text-slate-400">Admin-initiated account creation & initial credentials setup</p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Account Role</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'doctor' })}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 ${
                      createForm.role === 'doctor' ? 'bg-teal-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <Stethoscope className="w-4 h-4" />
                    <span>Doctor</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, role: 'patient' })}
                    className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center space-x-2 ${
                      createForm.role === 'patient' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    <PatientIcon className="w-4 h-4" />
                    <span>Patient</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    placeholder={createForm.role === 'doctor' ? 'Dr. Sarah Lin' : 'Jane Smith'}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email Address * (Normalized)</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="user@hospital.org"
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Temporary Initial Password *</label>
                <input
                  type="text"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="TempPassword123"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              {createForm.role === 'doctor' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Specialty / Department</label>
                    <input
                      type="text"
                      value={createForm.specialty_or_department}
                      onChange={(e) => setCreateForm({ ...createForm, specialty_or_department: e.target.value })}
                      placeholder="Nephrology & Renal Medicine"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+1 (555) 019-2831"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Gender</label>
                    <select
                      value={createForm.gender}
                      onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Unspecified">Unspecified</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="+1 (555) 928-1100"
                      className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200"
                    />
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20"
                >
                  Create {createForm.role.toUpperCase()} Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Key className="w-5 h-5 text-amber-400" />
              <span>Reset Password: {isResetModalOpen.name}</span>
            </h3>
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">New Temporary Password</label>
                <input
                  type="text"
                  required
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="NewTempPass123"
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-slate-400 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold shadow-lg shadow-amber-500/20"
                >
                  Save Temporary Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT / VIEW MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">
                {selectedUserModal.editMode ? 'Edit Account Details' : 'Account Overview'}
              </h3>
              <button
                onClick={() => setSelectedUserModal(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  disabled={!selectedUserModal.editMode}
                  value={selectedUserModal.name || ''}
                  onChange={(e) => setSelectedUserModal({ ...selectedUserModal, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  disabled={!selectedUserModal.editMode}
                  value={selectedUserModal.email || ''}
                  onChange={(e) => setSelectedUserModal({ ...selectedUserModal, email: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role</label>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-bold capitalize block">
                  {selectedUserModal.role}
                </span>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Specialty / Department</label>
                <input
                  type="text"
                  disabled={!selectedUserModal.editMode}
                  value={selectedUserModal.specialty_or_department || selectedUserModal.department || ''}
                  onChange={(e) => setSelectedUserModal({ ...selectedUserModal, specialty_or_department: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 disabled:opacity-80"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedUserModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-slate-400 font-bold"
                >
                  Close
                </button>
                {selectedUserModal.editMode && (
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20"
                  >
                    Save Changes
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
