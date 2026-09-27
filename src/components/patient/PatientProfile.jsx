import React from 'react';
import { UserRound, IdCard, Stethoscope, Lock, Settings } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, Loading, ErrorState, Alert, StatusBadge } from '../ui/UI';
import { formatDate, initials } from '../../utils/format';
import NoPatientRecord from './NoPatientRecord';

function ageFrom(dob) {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : null;
}

/**
 * GET /api/patient/profile. The backend does not allow patients to edit their
 * personal or medical record, so these details are read-only; the password can
 * be changed from Settings.
 */
export default function PatientProfile({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getPatientProfile(), 'Unable to load your profile.'), []);
  const { user, patient, doctor } = res.data || {};
  const age = ageFrom(patient?.date_of_birth);

  return (
    <div className="stack-lg">
      <PageHeader title="My Profile" subtitle="Your personal details and patient record." />
      {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : (
        <>
          <div className="grid-main-side">
            <Card title="Personal details" icon={UserRound}>
              <div className="row" style={{ gap: 16, marginBottom: 20 }}>
                <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, borderRadius: 16 }}>{initials(user?.name)}</div>
                <div>
                  <div className="strong" style={{ fontSize: 18 }}>{user?.name}</div>
                  <div className="row" style={{ gap: 6, marginTop: 4 }}>
                    <span className="badge badge-green">Patient</span>
                    <StatusBadge status={user?.status} />
                  </div>
                </div>
              </div>
              <dl className="kv">
                <dt>Full name</dt><dd>{user?.name || '—'}</dd>
                <dt>Email</dt><dd>{user?.email || '—'}</dd>
                <dt>Phone</dt><dd>{user?.phone || 'Not provided'}</dd>
                <dt>Date of birth</dt><dd>{patient?.date_of_birth ? `${formatDate(patient.date_of_birth)}${age !== null ? ` (age ${age})` : ''}` : 'Not provided'}</dd>
                <dt>Gender</dt><dd>{patient?.gender && patient.gender !== 'Unspecified' ? patient.gender : 'Not provided'}</dd>
                <dt>Member since</dt><dd>{formatDate(user?.created_at)}</dd>
              </dl>
            </Card>

            <div className="stack-lg">
              <Card title="Patient record" icon={IdCard}>
                {patient ? (
                  <dl className="kv">
                    <dt>Patient ID</dt><dd className="mono">{patient.patient_id}</dd>
                    <dt>Record created</dt><dd>{formatDate(patient.created_at)}</dd>
                  </dl>
                ) : <NoPatientRecord />}
              </Card>
              <Card title="Treating doctor" icon={Stethoscope}>
                {doctor ? (
                  <div className="stack">
                    <div className="strong">{doctor.name}</div>
                    <div className="small muted">{[doctor.specialty, doctor.doctor_id].filter(Boolean).join(' · ') || 'Doctor'}</div>
                    <button className="btn btn-sm btn-outline" onClick={() => onNavigate('/patient/doctor')}>View doctor details</button>
                  </div>
                ) : <p className="small muted">No treating doctor has been assigned yet.</p>}
              </Card>
            </div>
          </div>

          <Alert type="info" title="Need to update your details?">
            <span>
              <Lock size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Your personal details, patient ID and
              doctor assignment are managed by the hospital and can&apos;t be edited here. Please contact the hospital
              administrator if anything is incorrect. You can change your password in{' '}
              <button className="link" onClick={() => onNavigate('/patient/settings')}>
                <Settings size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Settings
              </button>.
            </span>
          </Alert>
        </>
      )}
    </div>
  );
}
