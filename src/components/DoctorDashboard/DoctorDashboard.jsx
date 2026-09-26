import React from 'react';
import DoctorSidebar from '../doctor/DoctorSidebar';
import DoctorOverview from '../doctor/DoctorOverview';
import DoctorPatients from '../doctor/DoctorPatients';
import DoctorPatientDetails from '../doctor/DoctorPatientDetails';
import DoctorPredictions from '../doctor/DoctorPredictions';
import DoctorReports from '../doctor/DoctorReports';
import DoctorProfile from '../doctor/DoctorProfile';

export default function DoctorDashboard({ currentUser, currentPath = '/doctor', onNavigate }) {
  
  // Parse sub-route to determine view component
  const renderDoctorSubView = () => {
    const path = currentPath.toLowerCase();

    if (path === '/doctor/patients' || path === '/doctor/patients/') {
      return <DoctorPatients onNavigate={onNavigate} />;
    }

    if (path.startsWith('/doctor/patients/')) {
      const patientId = currentPath.split('/doctor/patients/')[1]?.split('/')[0];
      return <DoctorPatientDetails patientId={patientId} onNavigate={onNavigate} />;
    }

    if (path.startsWith('/doctor/predictions')) {
      return <DoctorPredictions onNavigate={onNavigate} />;
    }

    if (path.startsWith('/doctor/reports')) {
      return <DoctorReports onNavigate={onNavigate} />;
    }

    if (path.startsWith('/doctor/profile')) {
      return <DoctorProfile onNavigate={onNavigate} />;
    }

    // Default overview (/doctor)
    return <DoctorOverview onNavigate={onNavigate} />;
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Reusable Doctor Sidebar */}
      <DoctorSidebar currentPath={currentPath} onNavigate={onNavigate} />

      {/* Main Doctor Dashboard Content */}
      <div className="flex-1 py-6 lg:pl-8 overflow-hidden">
        {renderDoctorSubView()}
      </div>
    </div>
  );
}
