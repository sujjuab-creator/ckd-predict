import React, { useState } from 'react';
import { 
  LayoutDashboard, PlusCircle, History, BarChart3, 
  FileText, User, LogOut, Menu, X, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function PatientSidebar({ currentPath, onNavigate }) {
  const { logout, currentUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Overview', path: '/patient', icon: LayoutDashboard },
    { label: 'New CKD Prediction', path: '/patient/prediction', icon: PlusCircle },
    { label: 'Prediction History', path: '/patient/history', icon: History },
    { label: 'SHAP Explanation', path: '/patient/shap', icon: BarChart3 },
    { label: 'Medical Reports', path: '/patient/reports', icon: FileText },
    { label: 'Profile', path: '/patient/profile', icon: User }
  ];

  const handleLogout = () => {
    logout();
    onNavigate('/login');
  };

  const handleNavClick = (path) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Toggle Bar */}
      <div className="lg:hidden flex items-center justify-between p-4 glass-panel border-b border-slate-800 bg-slate-950/90">
        <div className="flex items-center space-x-2">
          <Activity className="w-5 h-5 text-sky-400" />
          <span className="font-bold text-sm text-white">Patient Portal</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Content (Desktop + Mobile Drawer) */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-slate-800/80 p-5 flex flex-col justify-between transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="space-y-6">
          
          {/* Patient Card Header */}
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center space-x-3">
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
              alt={currentUser?.name || 'Patient'}
              className="w-10 h-10 rounded-xl object-cover border border-sky-500/40"
            />
            <div className="truncate">
              <p className="text-xs font-bold text-white truncate">{currentUser?.name || 'Johnathan Doe'}</p>
              <p className="text-[10px] text-slate-400 font-mono">Patient Portal</p>
            </div>
          </div>

          {/* Navigation Items List */}
          <nav className="space-y-1 text-xs">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
              Menu Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path || (item.path !== '/patient' && currentPath.startsWith(item.path));

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavClick(item.path)}
                  className={`
                    w-full py-2.5 px-3 rounded-xl font-semibold flex items-center space-x-2.5 transition-all text-left
                    ${isActive 
                      ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer Logout Button */}
        <div className="pt-4 border-t border-slate-800/80 space-y-2">
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
