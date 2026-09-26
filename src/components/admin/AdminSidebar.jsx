import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Activity, BarChart3, 
  User, LogOut, Menu, X, ShieldCheck, Stethoscope, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar({ currentPath, onNavigate }) {
  const { logout, currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/admin', icon: LayoutDashboard },
    { label: 'Users', path: '/admin/users', icon: Users },
    { label: 'Patients', path: '/admin/patients', icon: Activity },
    { label: 'Doctors', path: '/admin/doctors', icon: Stethoscope },
    { label: 'Predictions', path: '/admin/predictions', icon: Activity },
    { label: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { label: 'Profile', path: '/admin/profile', icon: User }
  ];

  const handleLogout = () => {
    logout();
    onNavigate('/login');
  };

  const handleNavClick = (path) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  const isCurrentActive = (itemPath) => {
    const normCurrent = currentPath.toLowerCase();
    const normItem = itemPath.toLowerCase();

    if (normItem === '/admin') {
      return normCurrent === '/admin' || normCurrent === '/admin/';
    }
    return normCurrent.startsWith(normItem);
  };

  return (
    <>
      {/* Mobile Header Bar with Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-panel border-b border-slate-800 bg-slate-950/90 mb-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-sm text-white">Admin Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 p-5 flex flex-col justify-between transition-transform duration-300 min-h-screen lg:min-h-0
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          
          {/* Admin Header Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150'}
              alt={currentUser?.name || 'Admin'}
              className="w-10 h-10 rounded-xl object-cover border border-indigo-500/40"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Dr. Elena Rostova'}</p>
              <p className="text-[10px] text-indigo-400 font-semibold truncate">System Admin (Demo)</p>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="space-y-1 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Admin Navigation
            </p>
            {navItems.map((item, idx) => {
              const Icon = item.icon;
              const active = isCurrentActive(item.path);

              return (
                <button
                  key={`${item.path}-${idx}`}
                  onClick={() => handleNavClick(item.path)}
                  className={`
                    w-full py-2.5 px-3 rounded-xl font-semibold flex items-center space-x-2.5 transition-all text-left
                    ${active 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Demo Disclaimer & Logout Footer */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300/90 leading-tight">
            <div className="flex items-center space-x-1 font-bold mb-1 text-amber-400">
              <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
              <span>DEMO MODE</span>
            </div>
            Demonstration data is used during development.
          </div>

          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-xl font-semibold text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all flex items-center space-x-2"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/80 backdrop-blur-xs lg:hidden"
        ></div>
      )}
    </>
  );
}
