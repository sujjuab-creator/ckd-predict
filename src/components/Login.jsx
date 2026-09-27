import React, { useState } from 'react';
import { UserCheck, Stethoscope, ShieldCheck, Lock, Mail, Activity, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function Login({ onNavigate, initialRole = 'patient' }) {
  const { login } = useAuth();
  
  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const res = await login(email, password, role);
    if (res.success) {
      onNavigate(res.redirectPath.substring(1)); // Navigate to 'patient', 'doctor', or 'admin'
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 px-4">
      <div className="glass-panel rounded-3xl p-8 border border-slate-800 space-y-6 glow-cyan">
        
        {/* Header & Back to Home */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onNavigate('home')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-1">
            <Activity className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <h2 className="text-2xl font-bold text-white">Sign In to CKD PREDICT</h2>
          <p className="text-xs text-slate-400">Chronic Kidney Disease Prediction System</p>
        </div>

        {/* Role Selector Tabs */}
        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">Select Account Role</label>
          <div className="grid grid-cols-3 gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => handleRoleChange('patient')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center space-x-1 transition-all ${
                role === 'patient' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('doctor')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center space-x-1 transition-all ${
                role === 'doctor' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>Doctor</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              className={`py-2 rounded-lg font-semibold flex items-center justify-center space-x-1 transition-all ${
                role === 'admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {/* Error Alert Box */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="name@hospital.org"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-medium">Password</label>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-[11px] text-sky-400 hover:underline"
              >
                Forgot Password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all"
            >
              Sign In as {role.toUpperCase()}
            </button>

            <button
              type="button"
              onClick={() => onNavigate('home')}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 text-xs font-semibold border border-slate-800 transition-all"
            >
              Back to Home
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800 space-y-1">
          <p className="text-[11px] text-slate-400 font-medium">
            Account registration is managed by Hospital Administration.
          </p>
          <p className="text-[10px] text-slate-500">
            Please contact your System Administrator for access credentials.
          </p>
        </div>

      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
      />
    </div>
  );
}

