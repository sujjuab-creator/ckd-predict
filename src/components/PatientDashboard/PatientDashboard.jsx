import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, UserRound, Stethoscope, FileText, MessageSquareText, Bell, BookOpen, Settings, Activity, Sparkles, Upload,
} from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import apiService from '../../services/api';
import PatientOverview from '../patient/PatientOverview';
import PatientProfile from '../patient/PatientProfile';
import PatientDoctor from '../patient/PatientDoctor';
import PatientReports from '../patient/PatientReports';
import PatientReportDetail from '../patient/PatientReportDetail';
import PatientReviews from '../patient/PatientReviews';
import PatientNotifications from '../patient/PatientNotifications';
import PatientKidneyHealth from '../patient/PatientKidneyHealth';
import PatientSettings from '../patient/PatientSettings';
import PatientCsvPredict from '../patient/PatientCsvPredict';

const TITLES = {
  '/patient': 'Overview',
  '/patient/profile': 'My Profile',
  '/patient/doctor': 'My Doctor',
  '/patient/predict': 'CKD Risk Assessment (CSV)',
  '/patient/prediction': 'CKD Risk Assessment (CSV)',
  '/patient/reports': 'My Reports',
  '/patient/reviews': 'Doctor Reviews',
  '/patient/notifications': 'Notifications',
  '/patient/kidney-health': 'Kidney Health',
  '/patient/settings': 'Settings',
};

// Retired path list
const RETIRED_PATHS = [
  '/patient/predictions', '/patient/history', '/patient/result',
  '/patient/shap', '/patient/analytics', '/patient/models', '/patient/model-comparison',
];

/**
 * Patient portal. Allows patients to view their profile, doctor details,
 * upload CSV data for CKD risk prediction & report generation, and view reports/reviews.
 */
export default function PatientDashboard({ currentPath = '/patient', onNavigate }) {
  const [unread, setUnread] = useState(0);

  const path = currentPath.toLowerCase().replace(/\/+$/, '') || '/patient';
  const parts = path.split('/');
  const base = parts.slice(0, 3).join('/');
  const param = parts[3];
  const retired = RETIRED_PATHS.includes(base);
  const known = Boolean(TITLES[base]);

  useEffect(() => {
    if (retired || (!known && base !== '/patient')) onNavigate('/patient');
  }, [retired, known, base, onNavigate]);

  const refreshUnread = useCallback(async () => {
    const res = await apiService.getNotifications();
    if (res.ok && res.data?.success) setUnread(res.data.unread_count || 0);
  }, []);

  useEffect(() => { refreshUnread(); }, [refreshUnread, base]);
  useEffect(() => {
    const t = setInterval(refreshUnread, 60000); // keep the unread badge current
    return () => clearInterval(t);
  }, [refreshUnread]);

  const nav = [
    {
      label: 'My Health',
      items: [
        { label: 'Overview', path: '/patient', icon: LayoutDashboard },
        { label: 'My Profile', path: '/patient/profile', icon: UserRound },
        { label: 'My Doctor', path: '/patient/doctor', icon: Stethoscope },
        { label: 'CKD Risk Assessment', path: '/patient/predict', icon: Activity },
        { label: 'My Reports', path: '/patient/reports', icon: FileText },
        { label: 'Doctor Reviews', path: '/patient/reviews', icon: MessageSquareText },
        { label: 'Notifications', path: '/patient/notifications', icon: Bell, badge: unread },
      ],
    },
    {
      label: 'Learn & Account',
      items: [
        { label: 'Kidney Health', path: '/patient/kidney-health', icon: BookOpen },
        { label: 'Settings', path: '/patient/settings', icon: Settings },
      ],
    },
  ];

  const ctx = { onNavigate, unread, refreshUnread, setUnread };

  const renderSubView = () => {
    if (retired) return null;
    if (base === '/patient/profile') return <PatientProfile {...ctx} />;
    if (base === '/patient/doctor') return <PatientDoctor {...ctx} />;
    if (base === '/patient/predict' || base === '/patient/prediction') return <PatientCsvPredict {...ctx} />;
    if (base === '/patient/reports' && param) return <PatientReportDetail key={param} {...ctx} reportId={param} />;
    if (base === '/patient/reports') return <PatientReports {...ctx} />;
    if (base === '/patient/reviews') return <PatientReviews {...ctx} />;
    if (base === '/patient/notifications') return <PatientNotifications {...ctx} />;
    if (base === '/patient/kidney-health') return <PatientKidneyHealth {...ctx} />;
    if (base === '/patient/settings') return <PatientSettings {...ctx} />;
    return <PatientOverview {...ctx} />;
  };

  return (
    <DashboardLayout
      navGroups={nav}
      currentPath={currentPath}
      onNavigate={onNavigate}
      title={TITLES[base] || 'Overview'}
      profilePath="/patient/settings"
    >
      {renderSubView()}
    </DashboardLayout>
  );
}
