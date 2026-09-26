import React, { useState } from 'react';
import { 
  Stethoscope, Search, Eye, Edit3, AlertTriangle, Users, Building, CheckCircle2, X 
} from 'lucide-react';
import { MOCK_DOCTORS_LIST } from '../../data/mockUsers';

export default function AdminDoctors({ onNavigate }) {
  const [doctors] = useState(MOCK_DOCTORS_LIST);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDoctorModal, setSelectedDoctorModal] = useState(null);
  const [toastNotice, setToastNotice] = useState(null);

  const showToast = (msg) => {
    setToastNotice(msg);
    setTimeout(() => setToastNotice(null), 3500);
  };

  const filteredDoctors = doctors.filter(doc => {
    const q = searchQuery.toLowerCase();
    return !q || (
      doc.id.toLowerCase().includes(q) ||
      doc.name.toLowerCase().includes(q) ||
      doc.email.toLowerCase().includes(q) ||
      doc.department.toLowerCase().includes(q)
    );
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
          <span className="font-bold text-amber-400">PRACTITIONER ROSTER (DEMO): </span>
          <span>Verified doctor accounts and clinic affiliations demo dataset.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Medical Staff Roster</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Inspect practitioner credentials, department assignments, and active patient loads.
        </p>
      </div>

      {/* SEARCH TOOLBAR */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search Doctor ID, Name, Email, or Department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* DOCTORS TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Stethoscope className="w-5 h-5 text-indigo-400" />
          <span>Doctor Roster ({filteredDoctors.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Doctor ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Department / Specialty</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Patients</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredDoctors.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{doc.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{doc.name}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{doc.email}</td>
                  <td className="py-3.5 px-4 text-slate-300">{doc.department}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                      {doc.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-sky-400">{doc.patientsCount} patients</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedDoctorModal({ ...doc, editMode: false })}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-400" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => setSelectedDoctorModal({ ...doc, editMode: true })}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all flex items-center space-x-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOCTOR MODAL */}
      {selectedDoctorModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-base font-bold text-white">
                {selectedDoctorModal.editMode ? 'Edit Doctor Profile (Demo)' : 'Doctor Credentials'}
              </h3>
              <button
                onClick={() => setSelectedDoctorModal(null)}
                className="p-1 rounded-lg bg-slate-900 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Doctor ID</label>
                <input
                  type="text"
                  disabled
                  value={selectedDoctorModal.id}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-indigo-400 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Doctor Name</label>
                <input
                  type="text"
                  disabled={!selectedDoctorModal.editMode}
                  defaultValue={selectedDoctorModal.name}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white font-bold disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email</label>
                <input
                  type="email"
                  disabled={!selectedDoctorModal.editMode}
                  defaultValue={selectedDoctorModal.email}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-mono disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Department / Specialty</label>
                <input
                  type="text"
                  disabled={!selectedDoctorModal.editMode}
                  defaultValue={selectedDoctorModal.department}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 font-semibold disabled:opacity-80"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Affiliated Hospital</label>
                <input
                  type="text"
                  disabled={!selectedDoctorModal.editMode}
                  defaultValue={selectedDoctorModal.hospital}
                  className="w-full px-3.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 disabled:opacity-80"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => {
                  if (selectedDoctorModal.editMode) {
                    showToast('Doctor details updated (Demo State)');
                  }
                  setSelectedDoctorModal(null);
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
              >
                {selectedDoctorModal.editMode ? 'Save Doctor Changes' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
