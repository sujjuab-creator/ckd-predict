import React, { useState } from 'react';
import { Users } from 'lucide-react';
import PredictionForm from '../prediction/PredictionForm';
import { PageHeader, Card, Loading, ErrorState, EmptyState } from '../ui/UI';
import { rawPredId } from '../../utils/format';

/** Doctor runs a prediction for a selected patient via POST /api/predictions. */
export default function DoctorPredictions({ onNavigate, patients, reloadAll, reloadPredictions, preselectPatient }) {
  const [patientId, setPatientId] = useState(preselectPatient ? String(preselectPatient) : '');

  if (patients.loading) return <Loading label="Loading patients…" />;
  if (patients.error) return <ErrorState message={patients.error} onRetry={reloadAll} />;
  if (patients.list.length === 0) {
    return (
      <Card>
        <EmptyState icon={Users} title="No patients registered" message="A patient record is required before a prediction can be saved. Patient accounts are created by the administrator." />
      </Card>
    );
  }

  const handlePredicted = async (data) => {
    await reloadPredictions();
    const id = rawPredId(data.prediction_id);
    onNavigate(id ? `/doctor/result/${id}` : '/doctor/history');
  };

  const selected = patients.list.find((p) => String(p.id) === String(patientId));

  return (
    <PredictionForm
      key={patientId || 'none'}
      patientDbId={selected ? Number(selected.id) : undefined}
      onPredicted={handlePredicted}
      disabledReason={selected ? '' : 'Select the patient this prediction belongs to before running it.'}
      header={(
        <>
          <PageHeader title="CKD Risk Prediction" subtitle="Enter the patient's health information to generate an AI-assisted risk prediction." />
          <div className="card card-pad">
            <div className="field" style={{ maxWidth: 460 }}>
              <label className="label" htmlFor="doc-patient">Patient <span className="req">*</span></label>
              <select id="doc-patient" className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                <option value="">Select a patient…</option>
                {patients.list.map((p) => (
                  <option key={p.id} value={p.id}>{p.patient_id}{p.gender ? ` · ${p.gender}` : ''}</option>
                ))}
              </select>
              <span className="hint">The prediction will be saved to this patient's record.</span>
            </div>
          </div>
        </>
      )}
    />
  );
}
