import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, UserRound, PlusCircle, History, Gauge, FileText, Stethoscope,
} from 'lucide-react';
import DashboardLayout from '../layout/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/api';
import { sortByDateDesc } from '../../utils/format';
import PatientOverview from '../patient/PatientOverview';
import PatientPredictionForm from '../patient/PatientPredictionForm';
import PatientHistory from '../patient/PatientHistory';
import PatientResult from '../patient/PatientResult';
import PatientReports from '../patient/PatientReports';
import PatientProfile from '../patient/PatientProfile';
import PatientDoctor from '../patient/PatientDoctor';

const NAV = [
  {
    label: 'Main',
    items: [
      { label: 'Overview', path: '/patient', icon: LayoutDashboard },
      { label: 'CKD Prediction', path: '/patient/prediction', icon: PlusCircle, match: ['/patient/prediction', '/patient/predictions'] },
      { label: 'Prediction History', path: '/patient/history', icon: History },
      { label: 'Results', path: '/patient/result', icon: Gauge, match: ['/patient/result', '/patient/shap'] },
      { label: 'Medical Reports', path: '/patient/reports', icon: FileText },
    ],
  },
  {
    label: 'Account',
    items: [
      { label: 'My Profile', path: '/patient/profile', icon: UserRound },
      { label: 'My Doctor', path: '/patient/doctor', icon: Stethoscope },
    ],
  },
];

const TITLES = {
  '/patient': 'Overview',
  '/patient/prediction': 'CKD Prediction',
  '/patient/predictions': 'CKD Prediction',
  '/patient/history': 'Prediction History',
  '/patient/result': 'Results',
  '/patient/shap': 'Results',
  '/patient/reports': 'Medical Reports',
  '/patient/profile': 'My Profile',
  '/patient/doctor': 'My Doctor',
};

/**
 * Patient data comes only from existing endpoints:
 *  - GET /api/patients                     -> find this user's patient record (user_id)
 *  - GET /api/patients/:id/predictions     -> prediction history
 *  - GET /api/reports                      -> filtered to this patient
 */
export default function PatientDashboard({ currentPath = '/patient', onNavigate }) {
  const { currentUser } = useAuth();
  const [record, setRecord] = useState({ loading: true, error: '', patient: null });
  const [predictions, setPredictions] = useState({ loading: true, error: '', list: [] });
  const [reports, setReports] = useState({ loading: true, error: '', list: [] });

  const loadAll = useCallback(async () => {
    setRecord((r) => ({ ...r, loading: true, error: '' }));
    const pRes = await apiService.getPatients();
    if (!(pRes.ok && pRes.data?.success)) {
      const error = pRes.data?.error || 'Unable to load your patient record.';
      setRecord({ loading: false, error, patient: null });
      setPredictions({ loading: false, error, list: [] });
      setReports({ loading: false, error, list: [] });
      return;
    }
    const patient = (pRes.data.patients || []).find((p) => Number(p.user_id) === Number(currentUser?.id)) || null;
    setRecord({ loading: false, error: '', patient });
    if (!patient) {
      setPredictions({ loading: false, error: '', list: [] });
      setReports({ loading: false, error: '', list: [] });
      return;
    }

    const [predRes, repRes] = await Promise.all([
      apiService.getPatientPredictions(patient.id),
      apiService.getReports(),
    ]);
    setPredictions(predRes.ok && predRes.data?.success
      ? { loading: false, error: '', list: sortByDateDesc(predRes.data.predictions) }
      : { loading: false, error: predRes.data?.error || 'Unable to load predictions.', list: [] });
    setReports(repRes.ok && repRes.data?.success
      ? { loading: false, error: '', list: sortByDateDesc((repRes.data.reports || []).filter((r) => Number(r.patient_id) === Number(patient.id))) }
      : { loading: false, error: repRes.data?.error || 'Unable to load reports.', list: [] });
  }, [currentUser?.id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const path = currentPath.toLowerCase().replace(/\/+$/, '') || '/patient';
  const base = path.split('/').slice(0, 3).join('/');
  const ctx = { onNavigate, record, predictions, reports, reload: loadAll };

  const renderSubView = () => {
    if (base === '/patient/prediction' || base === '/patient/predictions') {
      return <PatientPredictionForm {...ctx} />;
    }
    if (base === '/patient/result' || base === '/patient/shap') {
      const id = path.split('/')[3];
      return <PatientResult {...ctx} predictionId={id ? Number(id) : null} />;
    }
    if (base === '/patient/history') return <PatientHistory {...ctx} />;
    if (base === '/patient/reports') return <PatientReports {...ctx} />;
    if (base === '/patient/profile') return <PatientProfile {...ctx} />;
    if (base === '/patient/doctor') return <PatientDoctor {...ctx} />;
    return <PatientOverview {...ctx} />;
  };

  return (
    <DashboardLayout
      navGroups={NAV}
      currentPath={currentPath}
      onNavigate={onNavigate}
      title={TITLES[base] || 'Overview'}
      profilePath="/patient/profile"
    >
      {renderSubView()}
    </DashboardLayout>
  );
}
