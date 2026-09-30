import React, { useEffect, useState } from 'react';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Logo from './brand/Logo';

// Public navigation. Section links scroll within the Home page using
// element.scrollIntoView so the hash-based router (#/...) is never disturbed.
export const PUBLIC_SECTIONS = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About CKD' },
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
  { id: 'about-us', label: 'About Us' },
];

export function scrollToSection(id, currentPath, onNavigate) {
  const go = () => {
    if (id === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  if (currentPath !== '/') {
    onNavigate('/');
    setTimeout(go, 80);
  } else {
    // Defer so layout changes (e.g. closing the mobile menu) settle first
    setTimeout(go, 30);
  }
}

export default function Navbar({ currentPath, onNavigate }) {
  const { currentUser, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeId, setActiveId] = useState('home');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Highlight the section currently in view on the Home page
  useEffect(() => {
    if (currentPath !== '/' || typeof IntersectionObserver === 'undefined') return undefined;
    const els = PUBLIC_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean);
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveId(visible.target.id === 'stages' || visible.target.id === 'prevention' ? 'about' : visible.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5] },
    );
    els.forEach((el) => obs.observe(el));
    ['stages', 'prevention'].forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [currentPath]);

  const go = (id) => {
    setOpen(false);
    setActiveId(id);
    scrollToSection(id, currentPath, onNavigate);
  };

  const loggedIn = Boolean(currentUser?.loggedIn);
  const dashboardPath = loggedIn ? `/${currentUser.role}` : '/login';

  const handleLogout = () => {
    logout();
    setOpen(false);
    onNavigate('/');
  };

  return (
    <header className={`site-header ${scrolled || open ? 'scrolled' : ''}`}>
      <div className="container site-nav">
        <Logo onClick={() => go('home')} />

        <nav className="nav-links" aria-label="Main">
          {PUBLIC_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className={currentPath === '/' && activeId === s.id ? 'active' : ''}
              onClick={() => go(s.id)}
            >
              {s.label}
            </button>
          ))}
        </nav>

        <div className="nav-actions">
          {loggedIn ? (
            <>
              <button className="btn btn-ghost desktop-only" onClick={handleLogout}>
                <LogOut /> Logout
              </button>
              <button className="btn btn-primary desktop-only" onClick={() => onNavigate(dashboardPath)}>
                <LayoutDashboard /> My Dashboard
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost desktop-only" onClick={() => onNavigate('/login')}>Login</button>
              <button className="btn btn-primary desktop-only" onClick={() => onNavigate('/login')}>Get Started</button>
            </>
          )}
          <button
            className="icon-btn nav-toggle"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      <div className={`mobile-menu ${open ? 'open' : ''}`}>
        <div className="container">
          {PUBLIC_SECTIONS.map((s) => (
            <button key={s.id} className="item" onClick={() => go(s.id)}>{s.label}</button>
          ))}
          <div className="mobile-actions">
            {loggedIn ? (
              <>
                <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
                <button className="btn btn-primary" onClick={() => { setOpen(false); onNavigate(dashboardPath); }}>Dashboard</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => { setOpen(false); onNavigate('/login'); }}>Login</button>
                <button className="btn btn-primary" onClick={() => { setOpen(false); onNavigate('/login'); }}>Get Started</button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
