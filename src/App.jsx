import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import ResetPassword from './components/ResetPassword';
import PatientDashboard from './components/PatientDashboard/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';

// ---------------------------------------------------------------------------
// HASH ROUTING (required for the Render Static Site deployment).
// Paths live after "#", e.g. #/login, #/patient/history, #/doctor/patients.
// Do not replace with BrowserRouter.
// ---------------------------------------------------------------------------
function getHashPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  let path = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

const ROLE_PREFIXES = ['patient', 'doctor', 'admin'];

function MainApp() {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState(getHashPath);

  // Sync hash changes & browser back/forward buttons
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(getHashPath());
    };

    // If initial URL has a pathname instead of hash, migrate to hash route
    if (!window.location.hash && window.location.pathname && window.location.pathname !== '/') {
      window.location.hash = window.location.pathname;
    }

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  const navigateTo = useCallback((targetPath) => {
    if (!targetPath) return;
    let cleanPath = targetPath;
    if (cleanPath.startsWith('#')) {
      cleanPath = cleanPath.substring(1);
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }
    if (cleanPath === '/home') cleanPath = '/';

    if (window.location.hash !== `#${cleanPath}`) {
      window.location.hash = cleanPath;
    }
    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  // Protected Route Guard
  // - Unauthenticated users are sent to #/login
  // - Signed-in users who open another role's dashboard are sent to their own
  useEffect(() => {
    const path = currentPath.toLowerCase();
    const section = path.split('/')[1];

    if (ROLE_PREFIXES.includes(section)) {
      if (!currentUser || !currentUser.loggedIn) {
        navigateTo('/login');
      } else if (currentUser.role !== section) {
        navigateTo(`/${currentUser.role}`);
      }
    }

    // The old public "assessment" pages exposed prediction without login.
    // Prediction is now available only inside authenticated dashboards.
    if (path === '/assessment' || path === '/assessment-result') {
      navigateTo(currentUser?.loggedIn ? `/${currentUser.role}` : '/login');
    }
  }, [currentPath, currentUser, navigateTo]);

  const path = currentPath.toLowerCase();
  const section = path.split('/')[1];
  const isDashboard = ROLE_PREFIXES.includes(section);

  // Authenticated dashboards render their own full-screen layout
  if (isDashboard) {
    if (!currentUser || !currentUser.loggedIn || currentUser.role !== section) return null;
    if (section === 'patient') return <PatientDashboard currentPath={currentPath} onNavigate={navigateTo} />;
    if (section === 'doctor') return <DoctorDashboard currentUser={currentUser} currentPath={currentPath} onNavigate={navigateTo} />;
    return <AdminDashboard currentUser={currentUser} currentPath={currentPath} onNavigate={navigateTo} />;
  }

  const renderPublicView = () => {
    if (path === '/login' || path.startsWith('/login/')) {
      const r = path.split('/')[2];
      const role = ROLE_PREFIXES.includes(r) ? r : 'patient';
      return <Login key={role} initialRole={role} onNavigate={navigateTo} />;
    }
    if (path === '/signup' || path.startsWith('/signup/')) {
      const r = path.split('/')[2];
      const role = r === 'doctor' ? 'doctor' : 'patient';
      return <Signup key={role} role={role} onNavigate={navigateTo} />;
    }
    if (path.startsWith('/reset-password')) {
      // Token is case-sensitive: read it from the original (non-lowercased) path
      const token = decodeURIComponent(currentPath.split('/')[2] || '');
      return <ResetPassword token={token} onNavigate={navigateTo} />;
    }
    // Default Home view (path '/' or unrecognized)
    return <Home onNavigate={navigateTo} />;
  };

  const isAuthPage = path.startsWith('/login') || path.startsWith('/signup') || path.startsWith('/reset-password');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentPath={currentPath} onNavigate={navigateTo} />
      <main style={{ flex: 1 }}>{renderPublicView()}</main>
      {!isAuthPage && <Footer currentPath={currentPath} onNavigate={navigateTo} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
