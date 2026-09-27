import React from 'react';
import { Stethoscope, BadgeCheck, Mail, Phone, MessageSquareText } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, EmptyState, Alert, Loading, ErrorState, StatusBadge } from '../ui/UI';
import { initials } from '../../utils/format';

/** Treating doctor of the signed-in patient only (GET /api/patient/profile). */
export default function PatientDoctor({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getPatientProfile(), 'Unable to load your doctor.'), []);
  const doctor = res.data?.doctor;

  return (
    <div className="stack-lg">
      <PageHeader title="My Doctor" subtitle="The doctor responsible for reviewing your CKD risk results." />
      {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : doctor ? (
        <div className="grid-main-side">
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
              <dt>Specialty / Department</dt><dd>{doctor.specialty || '—'}</dd>
              <dt>Email</dt><dd>{doctor.email ? <a className="link" href={`mailto:${doctor.email}`}>{doctor.email}</a> : '—'}</dd>
              <dt>Phone</dt><dd>{doctor.phone ? <a className="link" href={`tel:${doctor.phone}`}>{doctor.phone}</a> : '—'}</dd>
            </dl>
            {doctor.status !== 'Active' && (
              <Alert type="warn" className="mt-16">This doctor&apos;s account is currently inactive. Please contact the hospital administrator.</Alert>
            )}
          </Card>
          <div className="stack-lg">
            <Card title="Contact" icon={Mail}>
              <div className="stack">
                {doctor.email && <a className="btn btn-outline btn-block" href={`mailto:${doctor.email}`}><Mail /> Send an email</a>}
                {doctor.phone && <a className="btn btn-outline btn-block" href={`tel:${doctor.phone}`}><Phone /> Call</a>}
                {!doctor.email && !doctor.phone && <p className="small muted">No contact details are available. Please contact the hospital.</p>}
              </div>
            </Card>
            <Card title="Reviews" icon={MessageSquareText}>
              <p className="small muted">Read the notes and recommendations your doctor has added to your record.</p>
              <button className="btn btn-primary btn-block mt-8" onClick={() => onNavigate('/patient/reviews')}>Doctor reviews</button>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <EmptyState
            icon={Stethoscope}
            title="No treating doctor assigned yet"
            message="A treating doctor has not been linked to your account. Please contact the hospital administrator to have a doctor assigned."
          />
        </Card>
      )}
      <Alert type="info">
        For urgent symptoms or medical emergencies, contact your local emergency services or go to the nearest hospital.
      </Alert>
    </div>
  );
}
