import React from 'react';
import { IdCard } from 'lucide-react';
import ProfilePanel from '../shared/ProfilePanel';
import { PageHeader, Card, Loading } from '../ui/UI';
import { formatDate } from '../../utils/format';
import NoPatientRecord from './NoPatientRecord';

export default function PatientProfile({ record }) {
  const p = record.patient;
  return (
    <div className="stack-lg">
      <PageHeader title="My Profile" subtitle="Your account and patient record details." />
      <ProfilePanel
        extra={(
          <Card title="Patient record" icon={IdCard}>
            {record.loading ? <Loading /> : p ? (
              <dl className="kv">
                <dt>Patient ID</dt><dd className="mono">{p.patient_id}</dd>
                <dt>Gender</dt><dd>{p.gender || '—'}</dd>
                <dt>Date of birth</dt><dd>{formatDate(p.date_of_birth)}</dd>
                <dt>Record created</dt><dd>{formatDate(p.created_at)}</dd>
              </dl>
            ) : <NoPatientRecord />}
          </Card>
        )}
      />
    </div>
  );
}
