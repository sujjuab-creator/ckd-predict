import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './components/Home';
import Login from './components/Login';
import Signup from './components/Signup';
import PatientDashboard from './components/PatientDashboard/PatientDashboard';
import DoctorDashboard from './components/DoctorDashboard/DoctorDashboard';
import AdminDashboard from './components/AdminDashboard/AdminDashboard';
import CKDForm from './components/CKDForm';
import PredictionResultView from './components/PredictionResultView';
import PdfReportModal from './components/PdfReportModal';
import { predictCKD } from './utils/ckdPredictor';

function getHashPath() {
  const hash = window.location.hash;
  if (!hash || hash === '#' || hash === '#/') return '/';
  let path = hash.startsWith('#') ? hash.substring(1) : hash;
  if (!path.startsWith('/')) path = '/' + path;
  return path;
}

function MainApp() {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState(getHashPath);

  // Active Standalone Assessment Prediction Result
  const [activeAssessmentResult, setActiveAssessmentResult] = useState(null);
  const [showPdfReport, setShowPdfReport] = useState(false);

  // Sync Hash changes & browser back/forward buttons
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

  // Protected Route Guard
  useEffect(() => {
    const path = currentPath.toLowerCase();

    if (path.startsWith('/patient')) {
      if (!currentUser || !currentUser.loggedIn || currentUser.role !== 'patient') {
        navigateTo('/login');
      }
    } else if (path.startsWith('/doctor')) {
      if (!currentUser || !currentUser.loggedIn || currentUser.role !== 'doctor') {
        navigateTo('/login');
      }
    } else if (path.startsWith('/admin')) {
      if (!currentUser || !currentUser.loggedIn || currentUser.role !== 'admin') {
        navigateTo('/login');
      }
    }
  }, [currentPath, currentUser]);

  const navigateTo = (targetPath) => {
    if (!targetPath) return;
    let cleanPath = targetPath;
    if (cleanPath.startsWith('#')) {
      cleanPath = cleanPath.substring(1);
    }
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    if (window.location.hash !== `#${cleanPath}`) {
      window.location.hash = cleanPath;
    }
    setCurrentPath(cleanPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAssessmentSubmit = (formData) => {
    const result = predictCKD(formData);
    setActiveAssessmentResult(result);
    navigateTo('/assessment-result');
  };

  // Determine view component to render
  const renderView = () => {
    const path = currentPath.toLowerCase();

    if (path === '/login') {
      return (
        <Login 
          initialRole={currentUser?.role || 'patient'}
          onNavigate={navigateTo}
        />
      );
    }

    if (path === '/signup') {
      return (
        <Login 
          initialRole="patient"
          onNavigate={navigateTo}
        />
      );
    }

    if (path.startsWith('/patient')) {
      if (currentUser && currentUser.loggedIn && currentUser.role === 'patient') {
        return (
          <PatientDashboard
            currentPath={currentPath}
            onNavigate={navigateTo}
          />
        );
      }
      return null;
    }

    if (path.startsWith('/doctor')) {
      if (currentUser && currentUser.loggedIn && currentUser.role === 'doctor') {
        return (
          <DoctorDashboard
            currentUser={currentUser}
            currentPath={currentPath}
            onNavigate={navigateTo}
          />
        );
      }
      return null;
    }

    if (path.startsWith('/admin')) {
      if (currentUser && currentUser.loggedIn && currentUser.role === 'admin') {
        return (
          <AdminDashboard
            currentUser={currentUser}
            currentPath={currentPath}
            onNavigate={navigateTo}
          />
        );
      }
      return null;
    }

    if (path === '/assessment') {
      return (
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          <div className="text-center space-y-2 mb-8">
            <h1 className="text-3xl font-extrabold text-white">CKD Risk Prediction</h1>
            <p className="text-xs text-slate-400">Enter physiological patient data for machine learning risk prediction</p>
          </div>
          <CKDForm onSubmitPrediction={handleAssessmentSubmit} />
        </div>
      );
    }

    if (path === '/assessment-result' && activeAssessmentResult) {
      return (
        <div className="px-4 py-6">
          <PredictionResultView
            predictionResult={activeAssessmentResult}
            currentUser={currentUser}
            onBackToForm={() => navigateTo('/assessment')}
            onOpenPdfReport={() => setShowPdfReport(true)}
          />
        </div>
      );
    }

    // Default Home view (path '/' or unrecognized)
    return <Home onNavigate={navigateTo} />;
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-slate-950 font-sans">
      <Navbar
        currentPath={currentPath}
        onNavigate={navigateTo}
      />

      <main className="flex-grow py-6">
        {renderView()}
      </main>

      {showPdfReport && activeAssessmentResult && (
        <PdfReportModal
          predictionResult={activeAssessmentResult}
          patientData={currentUser || { name: 'Anonymous Patient', mrn: 'MRN-NEW-001' }}
          onClose={() => setShowPdfReport(false)}
        />
      )}

      <Footer onNavigate={navigateTo} />
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
