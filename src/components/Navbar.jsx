import React from 'react';
import { Activity, ShieldCheck, UserCheck, Stethoscope, LogOut, ChevronRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ currentPath, onNavigate }) {
  const { currentUser, logout, quickDemoLogin } = useAuth();

  const handleLogout = () => {
    logout();
    onNavigate('/login');
  };

  const handleDemoSwitch = (role) => {
    const path = quickDemoLogin(role);
    onNavigate(path);
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Brand */}
          <div 
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => onNavigate('/')}
          >
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-teal-400 p-[2px] transition-transform group-hover:scale-105 duration-300">
                <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                  <Activity className="w-6 h-6 text-sky-400 animate-pulse-subtle" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950"></div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-extrabold tracking-tight text-white font-mono">CKD</span>
                <span className="text-xl font-extrabold tracking-tight gradient-text font-mono">PREDICT</span>
              </div>
              <p className="text-xs text-slate-400 font-medium">Chronic Kidney Disease Prediction System</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate('/')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentPath === '/' || currentPath === '' 
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              Home
            </button>

            {currentUser && (
              <button
                onClick={() => onNavigate(`/${currentUser.role}`)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                  currentPath.startsWith('/patient') || currentPath.startsWith('/doctor') || currentPath.startsWith('/admin')
                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <span>Dashboard</span>
                <span className="capitalize text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentUser.role}
                </span>
              </button>
            )}

            <button
              onClick={() => onNavigate('/assessment')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2 ${
                currentPath === '/assessment'
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Sparkles className="w-4 h-4 text-teal-400" />
              <span>CKD Prediction</span>
            </button>
          </nav>

          {/* User Role Switcher & Auth Actions */}
          <div className="flex items-center space-x-3">
            
            {/* Demo Role Quick Switches */}
            <div className="hidden lg:flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 text-xs">
              <span className="text-slate-500 font-medium px-2">Demo Role:</span>
              <button
                onClick={() => handleDemoSwitch('patient')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  currentUser?.role === 'patient' && currentUser?.loggedIn
                    ? 'bg-sky-500 text-white font-semibold shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Patient</span>
              </button>

              <button
                onClick={() => handleDemoSwitch('doctor')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  currentUser?.role === 'doctor' && currentUser?.loggedIn
                    ? 'bg-teal-500 text-white font-semibold shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                <span>Doctor</span>
              </button>

              <button
                onClick={() => handleDemoSwitch('admin')}
                className={`px-2.5 py-1.5 rounded-lg font-medium transition-all flex items-center space-x-1 ${
                  currentUser?.role === 'admin' && currentUser?.loggedIn
                    ? 'bg-indigo-600 text-white font-semibold shadow-md' 
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Admin</span>
              </button>
            </div>

            {currentUser && currentUser.loggedIn ? (
              <div className="flex items-center space-x-3 border-l border-slate-800 pl-3">
                <div className="flex items-center space-x-2">
                  <img
                    src={currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-sky-500/40"
                  />
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 capitalize">{currentUser.role}</p>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onNavigate('/login')}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onNavigate('/signup')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-500 to-indigo-600 text-white hover:from-sky-400 hover:to-indigo-500 shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-1"
                >
                  <span>Get Started</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
