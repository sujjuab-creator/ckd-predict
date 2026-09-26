import React, { useState } from 'react';
import { 
  LayoutDashboard, Users, Search, Activity, 
  FileText, User, LogOut, Menu, X, Stethoscope, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DoctorSidebar({ currentPath, onNavigate }) {
  const { logout, currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/doctor', icon: LayoutDashboard },
    { label: 'Patients', path: '/doctor/patients', icon: Users },
    { label: 'Search Patients', path: '/doctor/patients', icon: Search, highlightSearch: true },
    { label: 'Predictions', path: '/doctor/predictions', icon: Activity },
    { label: 'Reports', path: '/doctor/reports', icon: FileText },
    { label: 'Profile', path: '/doctor/profile', icon: User }
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

    if (normItem === '/doctor') {
      return normCurrent === '/doctor' || normCurrent === '/doctor/';
    }
    return normCurrent.startsWith(normItem);
  };

  return (
    <>
      {/* Mobile Header Bar with Toggle */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-panel border-b border-slate-800 bg-slate-950/90 mb-4 rounded-xl">
        <div className="flex items-center space-x-2">
          <Stethoscope className="w-5 h-5 text-teal-400" />
          <span className="font-bold text-sm text-white">Doctor Clinical Portal</span>
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
          
          {/* Doctor Header Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150'}
              alt={currentUser?.name || 'Doctor'}
              className="w-10 h-10 rounded-xl object-cover border border-teal-500/40"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Dr. Aris Thorne'}</p>
              <p className="text-[10px] text-teal-400 font-semibold truncate">Nephrologist (Demo)</p>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="space-y-1 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Clinical Menu
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
                      ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
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
            This interface uses demo data for development only.
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
