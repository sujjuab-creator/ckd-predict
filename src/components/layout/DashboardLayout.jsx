import React, { useEffect, useState } from 'react';
import { LogOut, Menu, ChevronRight, KeyRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Logo from '../brand/Logo';
import { initials, capitalize } from '../../utils/format';
import { Alert } from '../ui/UI';

/**
 * Shared shell for the Patient, Doctor and Admin dashboards.
 * - Dark navy sidebar that becomes an off-canvas menu on tablet/mobile
 * - Sticky top bar with breadcrumb and user chip
 * Navigation uses the app's existing hash navigation (onNavigate).
 */
export default function DashboardLayout({ navGroups, currentPath, onNavigate, title, profilePath, children }) {
  const { currentUser, logout, backendAvailable } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [currentPath]);

  const role = currentUser?.role || '';
  const home = `/${role}`;

  const isActive = (item) => {
    const p = currentPath.toLowerCase();
    if (item.path === home) return p === home || p === `${home}/`;
    if (item.match) return item.match.some((m) => p === m || p.startsWith(`${m}/`));
    return p === item.path || p.startsWith(`${item.path}/`);
  };

  const showPwBanner = Boolean(currentUser?.isTemporaryPassword && profilePath && !currentPath.startsWith(profilePath));

  const handleLogout = () => {
    logout();
    onNavigate('/');
  };

  return (
    <div className="dash">
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label={`${capitalize(role)} navigation`}>
        <div className="sidebar-brand">
          <Logo light tagline={false} onClick={() => onNavigate(home)} />
        </div>

        <div className="sidebar-role">
          <div className="avatar">{initials(currentUser?.name)}</div>
          <div style={{ minWidth: 0 }}>
            <div className="name">{currentUser?.name || 'User'}</div>
            <div className="role">{capitalize(role)} account</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="group">{group.label}</div>
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <button
                    key={item.path}
                    type="button"
                    className={`nav-item ${active ? 'active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => onNavigate(item.path)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-status" title="Backend API health check">
            <span className="d" style={{ background: backendAvailable ? '#10b981' : '#f59e0b' }} />
            {backendAvailable ? 'Connected to server' : 'Server status unknown'}
          </div>
          <button type="button" className="nav-item" onClick={handleLogout}>
            <LogOut />
            <span>Logout</span>
          </button>
        </div>
      </aside>
      <div className={`scrim ${open ? 'open' : ''}`} onClick={() => setOpen(false)} />

      <div className="dash-main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu />
          </button>
          <div className="topbar-title">
            <span className="crumb">{capitalize(role)} Dashboard</span>
            <ChevronRight className="sep" size={16} />
            <span className="cur">{title}</span>
          </div>
          <div className="topbar-right">
            <button type="button" className="user-chip" onClick={() => profilePath && onNavigate(profilePath)} title="My profile">
              <span className="avatar">{initials(currentUser?.name)}</span>
              <span className="txt">
                <span className="n" style={{ display: 'block' }}>{currentUser?.name}</span>
                <span className="r" style={{ display: 'block' }}>{capitalize(role)}</span>
              </span>
            </button>
            <button type="button" className="btn btn-sm btn-ghost" onClick={handleLogout}>
              <LogOut />
              <span className="hide-sm">Logout</span>
            </button>
          </div>
        </header>

        <main className="dash-content">
          {showPwBanner && (
            <Alert type="warn" title="You are using a temporary password">
              Your account was created with a temporary password. Please set a new password from{' '}
              <button className="link" onClick={() => onNavigate(profilePath)}>
                <KeyRound size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> your profile
              </button>.
            </Alert>
          )}
          <div style={{ marginTop: showPwBanner ? 20 : 0 }}>{children}</div>
        </main>
        <footer className="dash-footer">
          CKD PREDICT provides AI-assisted CKD risk prediction and is not a medical diagnosis.
        </footer>
      </div>
    </div>
  );
}
