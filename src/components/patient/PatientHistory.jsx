import React from 'react';
import { PlusCircle, History } from 'lucide-react';
import { Card, PageHeader, Loading, ErrorState, Disclaimer } from '../ui/UI';
import { PredictionsTable } from '../prediction/Tables';

export default function PatientHistory({ onNavigate, record, predictions, reload }) {
  return (
    <div className="stack-lg">
      <PageHeader
        title="Prediction History"
        subtitle="All CKD risk predictions saved to your patient record."
        actions={<button className="btn btn-primary" onClick={() => onNavigate('/patient/prediction')} disabled={!record.patient}><PlusCircle /> New Prediction</button>}
      />
      <Card title={`Saved predictions${predictions.list.length ? ` (${predictions.list.length})` : ''}`} icon={History} noBody>
        {predictions.loading ? <Loading /> : predictions.error ? <ErrorState message={predictions.error} onRetry={reload} /> : (
          <PredictionsTable
            predictions={predictions.list}
            onView={(p) => onNavigate(`/patient/result/${p.id}`)}
            emptyAction={record.patient && <button className="btn btn-primary" onClick={() => onNavigate('/patient/prediction')}><PlusCircle /> Run a prediction</button>}
          />
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
