import React from 'react';
import { ArrowLeft } from 'lucide-react';
import PredictionForm from '../prediction/PredictionForm';
import { PageHeader, Loading, ErrorState } from '../ui/UI';
import { rawPredId } from '../../utils/format';

export default function PatientPredictionForm({ onNavigate, record, reload }) {
  if (record.loading) return <Loading label="Loading your patient record…" />;
  if (record.error) return <ErrorState message={record.error} onRetry={reload} />;

  const handlePredicted = async (data) => {
    await reload();
    const id = rawPredId(data.prediction_id);
    onNavigate(id ? `/patient/result/${id}` : '/patient/result');
  };

  return (
    <PredictionForm
      patientDbId={record.patient?.id}
      onPredicted={handlePredicted}
      disabledReason={record.patient ? '' : 'Your account is not linked to a patient record yet. Please contact the hospital administrator before running a prediction.'}
      header={(
        <PageHeader
          title="CKD Risk Prediction"
          subtitle="Enter your most recent health information. The trained model will estimate your CKD risk."
          actions={<button type="button" className="btn btn-ghost" onClick={() => onNavigate('/patient')}><ArrowLeft /> Back to overview</button>}
        />
      )}
    />
  );
}
