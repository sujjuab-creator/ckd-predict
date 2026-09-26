import React, { useState } from 'react';
import { 
  Users, Search, Filter, Eye, Edit3, UserX, UserCheck, 
  CheckCircle2, X, AlertTriangle, PlusCircle 
} from 'lucide-react';
import { MOCK_USERS } from '../../data/mockUsers';

export default function AdminUsers({ onNavigate }) {
  const [usersList, setUsersList] = useState(MOCK_USERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All'); // 'All' | 'patient' | 'doctor' | 'admin'
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  const showToast = (msg) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const handleToggleDeactivate = (userId) => {
    setUsersList(prev => prev.map(u => {
      if (u.id === userId) {
        const nextStatus = u.status === 'Active' ? 'Deactivated' : 'Active';
        showToast(`User ${u.name} status updated to ${nextStatus} (Demo Action)`);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleEditClick = (user) => {
    showToast(`Edit mode opened for ${user.name} (Frontend Demo)`);
    setSelectedUserModal({ ...user, editMode: true });
  };

  const handleViewClick = (user) => {
    setSelectedUserModal({ ...user, editMode: false });
  };

  const filteredUsers = usersList.filter(u => {
    const q = searchQuery.toLowerCase();
    const matchesQuery = !q || (
      u.id.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );

    const matchesRole = roleFilter === 'All' || u.role.toLowerCase() === roleFilter.toLowerCase();

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

      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400">DEMO ACTIONS: </span>
          <span>Deactivation and edit actions are demonstration state changes only. No real account deletion is performed.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">User Management</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View, search, edit and manage system user accounts across all roles.
        </p>
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
          <span>System Users ({filteredUsers.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{u.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
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
                      u.status === 'Active' 
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{u.createdDate}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => handleViewClick(u)}
                        title="View User"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-[11px] flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleEditClick(u)}
                        title="Edit User"
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 transition-all text-[11px] flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>

                      <button
                        onClick={() => handleToggleDeactivate(u.id)}
                        title={u.status === 'Active' ? 'Deactivate User' : 'Activate User'}
                        className={`px-2.5 py-1.5 rounded-lg border transition-all text-[11px] flex items-center space-x-1 ${
                          u.status === 'Active'
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {u.status === 'Active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        <span>{u.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* USER MODAL */}
      {selectedUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">
                {selectedUserModal.editMode ? 'Edit User Details (Demo)' : 'User Account View'}
              </h3>
              <button
                onClick={() => setSelectedUserModal(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">User ID</label>
                <input
                  type="text"
                  disabled
                  value={selectedUserModal.id}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-indigo-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Name</label>
                <input
                  type="text"
                  disabled={!selectedUserModal.editMode}
                  defaultValue={selectedUserModal.name}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  disabled={!selectedUserModal.editMode}
                  defaultValue={selectedUserModal.email}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Role</label>
                <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 font-bold capitalize block">
                  {selectedUserModal.role}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => {
                  if (selectedUserModal.editMode) {
                    showToast('User updates saved (Frontend state)');
                  }
                  setSelectedUserModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {selectedUserModal.editMode ? 'Save Changes' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
