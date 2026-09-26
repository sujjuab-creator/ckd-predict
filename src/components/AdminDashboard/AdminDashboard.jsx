import React from 'react';
import AdminSidebar from '../admin/AdminSidebar';
import AdminOverview from '../admin/AdminOverview';
import AdminUsers from '../admin/AdminUsers';
import AdminPatients from '../admin/AdminPatients';
import AdminDoctors from '../admin/AdminDoctors';
import AdminPredictions from '../admin/AdminPredictions';
import AdminAnalytics from '../admin/AdminAnalytics';
import AdminProfile from '../admin/AdminProfile';

export default function AdminDashboard({ currentUser, currentPath = '/admin', onNavigate }) {
  
  // Parse sub-route to render subview component
  const renderAdminSubView = () => {
    const path = currentPath.toLowerCase();

    if (path.startsWith('/admin/users')) {
      return <AdminUsers onNavigate={onNavigate} />;
    }

    if (path.startsWith('/admin/patients')) {
      return <AdminPatients onNavigate={onNavigate} />;
    }

    if (path.startsWith('/admin/doctors')) {
      return <AdminDoctors onNavigate={onNavigate} />;
    }

    if (path.startsWith('/admin/predictions')) {
      return <AdminPredictions onNavigate={onNavigate} />;
    }

    if (path.startsWith('/admin/analytics')) {
      return <AdminAnalytics onNavigate={onNavigate} />;
    }

    if (path.startsWith('/admin/profile')) {
      return <AdminProfile onNavigate={onNavigate} />;
    }

    // Default overview (/admin)
    return <AdminOverview onNavigate={onNavigate} />;
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] flex flex-col lg:flex-row max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Reusable Admin Sidebar */}
      <AdminSidebar currentPath={currentPath} onNavigate={onNavigate} />

      {/* Main Admin Content Area */}
      <div className="flex-1 py-6 lg:pl-8 overflow-hidden">
        {renderAdminSubView()}
      </div>
    </div>
  );
}
