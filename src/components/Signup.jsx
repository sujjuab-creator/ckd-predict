import React, { useState } from 'react';
import { UserCheck, Stethoscope, Lock, Mail, User, Activity, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup({ onNavigate }) {
  const { signupDemo } = useAuth();
  
  const [role, setRole] = useState('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const result = signupDemo({ name, email, password, confirmPassword, role });
    if (result.success) {
      setSuccessMessage('Demo account created successfully.');
      setTimeout(() => {
        onNavigate('login');
      }, 1500);
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="max-w-lg mx-auto my-8 px-4">
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
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/30">
            Registration
          </span>
        </div>

        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 mb-1">
            <Activity className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <h2 className="text-2xl font-bold text-white">Create CKD PREDICT Account</h2>
          <p className="text-xs text-slate-400">Chronic Kidney Disease Prediction System</p>
        </div>

        {/* Role Selector Tabs (ONLY Patient and Doctor, Admin disabled) */}
        <div>
          <label className="block text-slate-300 text-xs font-semibold mb-1.5">Select Role for Signup</label>
          <div className="grid grid-cols-2 gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setRole('patient')}
              className={`py-2.5 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                role === 'patient' ? 'bg-sky-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Patient</span>
            </button>

            <button
              type="button"
              onClick={() => setRole('doctor')}
              className={`py-2.5 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all ${
                role === 'doctor' ? 'bg-teal-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Doctor</span>
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Admin accounts cannot be created via self-registration.</p>
        </div>

        {/* Alert Messages */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-xl text-rose-400 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 p-3.5 rounded-xl text-emerald-400 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMessage} Redirecting to login...</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder={role === 'doctor' ? 'Dr. Sarah Jenkins' : 'John Doe'}
              />
            </div>
          </div>

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
                placeholder="name@domain.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Password (Min. 6 characters)</label>
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

          <div>
            <label className="block text-slate-300 font-medium mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-sky-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-sky-500/20 transition-all mt-2"
          >
            Create Demo {role.toUpperCase()} Account
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
          <span>Already registered? </span>
          <button
            onClick={() => onNavigate('login')}
            className="text-sky-400 hover:underline font-semibold"
          >
            Sign In Here
          </button>
        </div>

      </div>
    </div>
  );
}
