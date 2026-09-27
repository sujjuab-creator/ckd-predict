import React, { useState } from 'react';
import { User, Mail, Shield, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MedicalDisclaimer from './MedicalDisclaimer';

export default function PatientProfile({ onNavigate }) {
  const { currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState(currentUser?.name || 'Patient User');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [patientId, setPatientId] = useState(currentUser?.mrn || 'PAT-0001');
  const [age, setAge] = useState(currentUser?.age || 56);
  const [gender, setGender] = useState(currentUser?.gender || 'Male');

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <button
            onClick={() => onNavigate('/patient')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Patient Profile</h1>
          <p className="text-xs text-slate-400">Personal health profile & account details.</p>
        </div>

        <span className="px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-xs font-bold font-mono">
          Patient Account
        </span>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-2xl text-emerald-400 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">Profile changes saved successfully.</span>
        </div>
      )}

      {/* Profile Form */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 glow-cyan">
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-6">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={fullName}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-sky-500/40"
          />
          <div>
            <h2 className="text-xl font-bold text-white">{fullName}</h2>
            <p className="text-xs text-slate-400">Patient ID: <span className="font-mono text-slate-300">{patientId}</span></p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                disabled={!isEditing}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-200 transition-colors ${
                  isEditing ? 'border-sky-500' : 'border-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                disabled={!isEditing}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-200 transition-colors ${
                  isEditing ? 'border-sky-500' : 'border-slate-800'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-400 mb-1">Patient ID</label>
              <input
                type="text"
                disabled={!isEditing}
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl font-mono text-slate-200 transition-colors ${
                  isEditing ? 'border-sky-500' : 'border-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Age</label>
              <input
                type="number"
                disabled={!isEditing}
                value={age}
                onChange={(e) => setAge(parseInt(e.target.value))}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-200 transition-colors ${
                  isEditing ? 'border-sky-500' : 'border-slate-800'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Gender</label>
              <select
                disabled={!isEditing}
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border rounded-xl text-slate-200 transition-colors ${
                  isEditing ? 'border-sky-500' : 'border-slate-800'
                }`}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all border border-slate-700"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 text-slate-400 text-xs font-semibold hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-sky-500/20"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      <MedicalDisclaimer />

    </div>
  );
}
