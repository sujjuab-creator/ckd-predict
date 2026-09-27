import React from 'react';
import { Stethoscope, IdCard, BadgeCheck } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, EmptyState, Alert, Loading, ErrorState, StatusBadge } from '../ui/UI';
import { initials } from '../../utils/format';

/** Treating doctor from GET /api/auth/me/doctor (patients.doctor_id relationship). */
export default function PatientDoctor({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getMyDoctor()), []);
  const doctor = res.data?.doctor;

  return (
    <div className="stack-lg">
      <PageHeader title="My Doctor" subtitle="Your treating doctor for CKD risk review." />
      {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : doctor ? (
        <Card title="Treating doctor" icon={Stethoscope}>
          <div className="row" style={{ gap: 16, marginBottom: 20 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 20, borderRadius: 16 }}>{initials(doctor.name)}</div>
            <div>
              <div className="strong" style={{ fontSize: 18 }}>{doctor.name}</div>
              <div className="row" style={{ gap: 6, marginTop: 4 }}>
                <span className="badge badge-blue"><BadgeCheck /> Doctor</span>
                <StatusBadge status={doctor.status} />
              </div>
            </div>
          </div>
          <dl className="kv">
            <dt>Doctor ID</dt><dd className="mono">{doctor.doctor_id || '—'}</dd>
            <dt>Specialty</dt><dd>{doctor.specialty || '—'}</dd>
          </dl>
          {doctor.status !== 'Active' && (
            <Alert type="warn" className="mt-16">This doctor's account is currently inactive. Please contact the hospital administrator.</Alert>
          )}
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={Stethoscope}
            title="No treating doctor assigned yet"
            message="A treating doctor has not been linked to your account. Please contact the hospital administrator to have a doctor assigned."
            action={<button className="btn btn-outline" onClick={() => onNavigate('/patient/reports')}>View my reports</button>}
          />
        </Card>
      )}
      <Alert type="info" title="Sharing your results">
        <span>
          Your treating doctor can review your saved predictions and reports. You can also download a PDF report from <b>Results</b> or <b>Medical Reports</b>.
        </span>
      </Alert>
      <div className="small muted row"><IdCard size={14} /> Doctor details shown here come from your hospital account.</div>
    </div>
  );
}
