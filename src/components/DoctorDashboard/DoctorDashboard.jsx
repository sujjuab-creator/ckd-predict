import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Users, Search, PlusCircle, History, Sparkles, FileText, ChartBar, UserRound,
} from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import apiService from '../../services/api';
import { sortByDateDesc } from '../../utils/format';
import DoctorOverview from '../doctor/DoctorOverview';
import DoctorPatients from '../doctor/DoctorPatients';
import DoctorPatientDetails from '../doctor/DoctorPatientDetails';
import DoctorPredictions from '../doctor/DoctorPredictions';
import DoctorHistory from '../doctor/DoctorHistory';
import DoctorShap from '../doctor/DoctorShap';
import DoctorResult from '../doctor/DoctorResult';
import DoctorReports from '../doctor/DoctorReports';
import DoctorAnalytics from '../doctor/DoctorAnalytics';
import DoctorProfile from '../doctor/DoctorProfile';

const NAV = [
  {
    label: 'Clinical',
    items: [
      { label: 'Overview', path: '/doctor', icon: LayoutDashboard },
      { label: 'My Patients', path: '/doctor/patients', icon: Users },
      { label: 'Patient Search', path: '/doctor/search', icon: Search },
      { label: 'CKD Predictions', path: '/doctor/predictions', icon: PlusCircle, match: ['/doctor/predictions', '/doctor/result'] },
      { label: 'Prediction History', path: '/doctor/history', icon: History },
      { label: 'SHAP Explanation', path: '/doctor/shap', icon: Sparkles },
      { label: 'Medical Reports', path: '/doctor/reports', icon: FileText },
      { label: 'Analytics', path: '/doctor/analytics', icon: ChartBar },
    ],
  },
  { label: 'Account', items: [{ label: 'My Profile', path: '/doctor/profile', icon: UserRound }] },
];

const TITLES = {
  '/doctor': 'Overview',
  '/doctor/patients': 'My Patients',
  '/doctor/search': 'Patient Search',
  '/doctor/predictions': 'CKD Predictions',
  '/doctor/result': 'Prediction Result',
  '/doctor/history': 'Prediction History',
  '/doctor/shap': 'SHAP Explanation',
  '/doctor/reports': 'Medical Reports',
  '/doctor/analytics': 'Analytics',
  '/doctor/profile': 'My Profile',
};

function useList(loader, key) {
  const [state, setState] = useState({ loading: true, error: '', list: [] });
  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: '' }));
    const res = await loader();
    if (res.ok && res.data?.success) setState({ loading: false, error: '', list: sortByDateDesc(res.data[key] || []) });
    else setState({ loading: false, error: res.data?.error || 'Unable to load data from the server.', list: [] });
  }, [loader, key]);
  return [state, load];
}

const loadPatients = () => apiService.getPatients();
const loadPredictions = () => apiService.getPredictions();
const loadReports = () => apiService.getReports();

/**
 * Doctor data comes from existing endpoints only:
 * GET /api/patients, /api/predictions, /api/reports, /api/analytics.
 */
export default function DoctorDashboard({ currentPath = '/doctor', onNavigate }) {
  const [patients, reloadPatients] = useList(loadPatients, 'patients');
  const [predictions, reloadPredictions] = useList(loadPredictions, 'predictions');
  const [reports, reloadReports] = useList(loadReports, 'reports');

  const reloadAll = useCallback(() => Promise.all([reloadPatients(), reloadPredictions(), reloadReports()]), [reloadPatients, reloadPredictions, reloadReports]);
  useEffect(() => { reloadAll(); }, [reloadAll]);

  const patientById = useMemo(() => Object.fromEntries(patients.list.map((p) => [Number(p.id), p])), [patients.list]);
  const patientLabel = useCallback((dbId) => patientById[Number(dbId)]?.patient_id || (dbId ? `Patient #${dbId}` : '—'), [patientById]);

  const path = currentPath.toLowerCase().replace(/\/+$/, '') || '/doctor';
  const parts = path.split('/');
  const base = parts.slice(0, 3).join('/');
  const param = parts[3];

  const ctx = {
    onNavigate, patients, predictions, reports, reloadAll, reloadPredictions, reloadReports, patientById, patientLabel,
  };

  const renderSubView = () => {
    if (base === '/doctor/patients' && param) return <DoctorPatientDetails {...ctx} patientDbId={Number(param)} />;
    if (base === '/doctor/patients') return <DoctorPatients {...ctx} />;
    if (base === '/doctor/search') return <DoctorPatients {...ctx} searchMode />;
    if (base === '/doctor/predictions') return <DoctorPredictions {...ctx} preselectPatient={param ? Number(param) : null} />;
    if (base === '/doctor/result') return <DoctorResult {...ctx} predictionId={param ? Number(param) : null} />;
    if (base === '/doctor/history') return <DoctorHistory {...ctx} />;
    if (base === '/doctor/shap') return <DoctorShap {...ctx} predictionId={param ? Number(param) : null} />;
    if (base === '/doctor/reports') return <DoctorReports {...ctx} />;
    if (base === '/doctor/analytics') return <DoctorAnalytics {...ctx} />;
    if (base === '/doctor/profile') return <DoctorProfile />;
    return <DoctorOverview {...ctx} />;
  };

  return (
    <DashboardLayout
      navGroups={NAV}
      currentPath={currentPath}
      onNavigate={onNavigate}
      title={TITLES[base] || 'Overview'}
      profilePath="/doctor/profile"
    >
      {renderSubView()}
    </DashboardLayout>
  );
}
