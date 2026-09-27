import React, { useState, useEffect } from 'react';
import PatientSidebar from '../patient/PatientSidebar';
import PatientOverview from '../patient/PatientOverview';
import PatientPredictionForm from '../patient/PatientPredictionForm';
import PatientResult from '../patient/PatientResult';
import PatientHistory from '../patient/PatientHistory';
import PatientShap from '../patient/PatientShap';
import PatientReports from '../patient/PatientReports';
import PatientProfile from '../patient/PatientProfile';
import { INITIAL_PREDICTIONS } from '../../data/mockData';

export default function PatientDashboard({ currentPath = '/patient', onNavigate }) {
  // Initialize patient history from localStorage or fallback to default
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('ckd_patient_history');
      return saved ? JSON.parse(saved) : INITIAL_PREDICTIONS;
    } catch {
      return INITIAL_PREDICTIONS;
    }
  });

  const [latestPrediction, setLatestPrediction] = useState(() => history[0] || null);

  const handleAddPrediction = (newRecord) => {
    const updated = [newRecord, ...history];
    setHistory(updated);
    setLatestPrediction(newRecord);
    try {
      localStorage.setItem('ckd_patient_history', JSON.stringify(updated));
    } catch {}
  };

  // Determine sub-view component
  const renderSubView = () => {
    const path = currentPath.toLowerCase();

    if (path === '/patient/prediction') {
      return (
        <PatientPredictionForm
          onNavigate={onNavigate}
          onAddPrediction={handleAddPrediction}
        />
      );
    }

    if (path === '/patient/result') {
      return (
        <PatientResult
          onNavigate={onNavigate}
          latestPrediction={latestPrediction}
        />
      );
    }

    if (path === '/patient/history') {
      return (
        <PatientHistory
          onNavigate={onNavigate}
          history={history}
        />
      );
    }

    if (path === '/patient/shap') {
      return (
        <PatientShap
          onNavigate={onNavigate}
        />
      );
    }

    if (path === '/patient/reports') {
      return (
        <PatientReports
          onNavigate={onNavigate}
          history={history}
        />
      );
    }

    if (path === '/patient/profile') {
      return (
        <PatientProfile
          onNavigate={onNavigate}
        />
      );
    }

    // Default overview (/patient)
    return (
      <PatientOverview
        onNavigate={onNavigate}
        history={history}
      />
    );
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Left Sidebar */}
      <PatientSidebar currentPath={currentPath} onNavigate={onNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 py-6 lg:pl-8 overflow-hidden">
        {renderSubView()}
      </div>
    </div>
  );
}
