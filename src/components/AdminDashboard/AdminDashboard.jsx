import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Users, Stethoscope, UserRound, ChartBar, GitCompare, Server, Settings,
} from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import apiService from '../../services/api';
import { sortByDateDesc } from '../../utils/format';
import AdminOverview from '../admin/AdminOverview';
import AdminUsers from '../admin/AdminUsers';
import AdminAnalytics from '../admin/AdminAnalytics';
import AdminModels from '../admin/AdminModels';
import AdminSystem from '../admin/AdminSystem';
import AdminProfile from '../admin/AdminProfile';

const NAV = [
  {
    label: 'Administration',
    items: [
      { label: 'Overview', path: '/admin', icon: LayoutDashboard },
      { label: 'Manage Patients', path: '/admin/patients', icon: UserRound },
      { label: 'Manage Doctors', path: '/admin/doctors', icon: Stethoscope },
      { label: 'User Management', path: '/admin/users', icon: Users },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Prediction Analytics', path: '/admin/analytics', icon: ChartBar, match: ['/admin/analytics', '/admin/predictions'] },
      { label: 'Model Comparison', path: '/admin/models', icon: GitCompare },
      { label: 'System Statistics', path: '/admin/system', icon: Server },
    ],
  },
  { label: 'Account', items: [{ label: 'Settings', path: '/admin/settings', icon: Settings, match: ['/admin/settings', '/admin/profile'] }] },
];

const TITLES = {
  '/admin': 'Overview',
  '/admin/patients': 'Manage Patients',
  '/admin/doctors': 'Manage Doctors',
  '/admin/users': 'User Management',
  '/admin/analytics': 'Prediction Analytics',
  '/admin/predictions': 'Prediction Analytics',
  '/admin/models': 'Model Comparison',
  '/admin/system': 'System Statistics',
  '/admin/settings': 'Settings',
  '/admin/profile': 'Settings',
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

const loadUsers = () => apiService.getUsers();
const loadPatients = () => apiService.getPatients();
const loadPredictions = () => apiService.getPredictions();

export default function AdminDashboard({ currentPath = '/admin', onNavigate }) {
  const [users, reloadUsers] = useList(loadUsers, 'users');
  const [patients, reloadPatients] = useList(loadPatients, 'patients');
  const [predictions, reloadPredictions] = useList(loadPredictions, 'predictions');

  const reloadAll = useCallback(() => Promise.all([reloadUsers(), reloadPatients(), reloadPredictions()]), [reloadUsers, reloadPatients, reloadPredictions]);
  useEffect(() => { reloadAll(); }, [reloadAll]);

  const patientsByUserId = useMemo(() => Object.fromEntries(patients.list.filter((p) => p.user_id).map((p) => [p.user_id, p])), [patients.list]);
  const usersById = useMemo(() => Object.fromEntries(users.list.map((u) => [u.id, u])), [users.list]);
  const predictionCountByPatient = useMemo(() => {
    const m = {};
    predictions.list.forEach((p) => { m[p.patient_id] = (m[p.patient_id] || 0) + 1; });
    return m;
  }, [predictions.list]);
  const patientName = useCallback((patientDbId) => {
    const rec = patients.list.find((p) => Number(p.id) === Number(patientDbId));
    if (!rec) return patientDbId ? `Patient #${patientDbId}` : '—';
    const u = usersById[rec.user_id];
    return u ? `${u.name} (${rec.patient_id})` : rec.patient_id;
  }, [patients.list, usersById]);

  const path = currentPath.toLowerCase().replace(/\/+$/, '') || '/admin';
  const base = path.split('/').slice(0, 3).join('/');
  const ctx = { onNavigate, users, patients, predictions, reloadAll, patientName };

  const renderSubView = () => {
    if (base === '/admin/patients') {
      return (
        <AdminUsers
          key="patients"
          fixedRole="patient"
          title="Manage Patients"
          subtitle="Patient accounts, their patient records and prediction counts."
          patientsByUserId={patientsByUserId}
          predictionCountByPatient={predictionCountByPatient}
          onUsersChanged={reloadAll}
        />
      );
    }
    if (base === '/admin/doctors') {
      return <AdminUsers key="doctors" fixedRole="doctor" title="Manage Doctors" subtitle="Doctor accounts and their access status." onUsersChanged={reloadAll} />;
    }
    if (base === '/admin/users') return <AdminUsers key="all-users" onUsersChanged={reloadAll} />;
    if (base === '/admin/analytics' || base === '/admin/predictions') return <AdminAnalytics {...ctx} />;
    if (base === '/admin/models') return <AdminModels />;
    if (base === '/admin/system') return <AdminSystem {...ctx} />;
    if (base === '/admin/settings' || base === '/admin/profile') return <AdminProfile />;
    return <AdminOverview {...ctx} />;
  };

  return (
    <DashboardLayout
      navGroups={NAV}
      currentPath={currentPath}
      onNavigate={onNavigate}
      title={TITLES[base] || 'Overview'}
      profilePath="/admin/settings"
    >
      {renderSubView()}
    </DashboardLayout>
  );
}
