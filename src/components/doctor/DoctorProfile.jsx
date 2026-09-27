import React, { useState } from 'react';
import { 
  User, Mail, Shield, Building, Stethoscope, Save, Edit3, CheckCircle2, AlertTriangle 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DoctorProfile({ onNavigate }) {
  const { currentUser } = useAuth();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser?.name || 'Dr. Aris Thorne',
    email: currentUser?.email || '',
    doctorId: currentUser?.license || currentUser?.id || 'DOC-001',
    department: currentUser?.specialty || 'Nephrology & Renal Medicine',
    hospital: currentUser?.hospital || 'St. Jude Kidney & Metabolic Institute',
    phone: currentUser?.phone || '+1 (555) 987-6543'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Doctor Profile & Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Manage your clinical practitioner details and department configuration.
        </p>
      </div>

      {savedSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>Doctor profile changes saved successfully (Frontend State).</span>
        </div>
      )}

      {/* Profile Form Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        
        {/* Doctor Header Badge */}
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-5 border-b border-slate-800 pb-6">
          <img
            src={currentUser?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
            alt={formData.name}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-teal-500/40 shadow-xl"
          />
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-bold text-white">{formData.name}</h2>
            <p className="text-xs text-teal-400 font-semibold">{formData.department}</p>
            <p className="text-xs text-slate-400 font-mono">License ID: {formData.doctorId}</p>
          </div>

          <div className="sm:ml-auto">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold text-xs transition-all flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Profile Fields Form */}
        <form onSubmit={handleSave} className="space-y-5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Doctor Name */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium flex items-center space-x-1.5">
                <User className="w-4 h-4 text-teal-400" />
                <span>Doctor Name</span>
              </label>
              <input
                type="text"
                name="name"
                disabled={!isEditing}
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-semibold disabled:opacity-60 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium flex items-center space-x-1.5">
                <Mail className="w-4 h-4 text-teal-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                name="email"
                disabled={!isEditing}
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono disabled:opacity-60 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Doctor ID */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium flex items-center space-x-1.5">
                <Shield className="w-4 h-4 text-teal-400" />
                <span>Doctor ID / License</span>
              </label>
              <input
                type="text"
                name="doctorId"
                disabled={!isEditing}
                value={formData.doctorId}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-mono disabled:opacity-60 focus:outline-none focus:border-teal-500"
              />
            </div>

            {/* Department */}
            <div className="space-y-1.5">
              <label className="text-slate-400 font-medium flex items-center space-x-1.5">
                <Building className="w-4 h-4 text-teal-400" />
                <span>Department / Specialty</span>
              </label>
              <input
                type="text"
                name="department"
                disabled={!isEditing}
                value={formData.department}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 font-semibold disabled:opacity-60 focus:outline-none focus:border-teal-500"
              />
            </div>

          </div>

          {/* Form Action Buttons */}
          {isEditing && (
            <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </form>

      </div>

    </div>
  );
}
