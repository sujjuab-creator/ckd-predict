import React from 'react';
import { ArrowLeft, Gauge, UserRound } from 'lucide-react';
import { PageHeader, Loading, ErrorState, Card, EmptyState } from '../ui/UI';
import PredictionResult from '../prediction/PredictionResult';

export default function DoctorResult({ onNavigate, predictions, reports, reloadAll, patientLabel, predictionId }) {
  if (predictions.loading) return <Loading label="Loading prediction…" />;
  if (predictions.error) return <ErrorState message={predictions.error} onRetry={reloadAll} />;

  const pred = predictions.list.find((p) => Number(p.id) === Number(predictionId));
  if (!pred) {
    return (
      <Card>
        <EmptyState icon={Gauge} title="Prediction not found" message="Select a prediction from the history list."
          action={<button className="btn btn-primary" onClick={() => onNavigate('/doctor/history')}>Prediction history</button>} />
      </Card>
    );
  }
  const report = reports.list.find((r) => Number(r.prediction_id) === Number(pred.id));

  return (
    <div className="stack-lg">
      <PageHeader
        title="Prediction Result"
        subtitle="Model output, SHAP explanation and report for clinical review."
        actions={(
          <>
            <button className="btn btn-ghost" onClick={() => onNavigate('/doctor/history')}><ArrowLeft /> History</button>
            <button className="btn btn-outline" onClick={() => onNavigate(`/doctor/patients/${pred.patient_id}`)}><UserRound /> Patient details</button>
          </>
        )}
      />
      <PredictionResult key={pred.id} prediction={pred} patientLabel={patientLabel(pred.patient_id)} existingReportId={report?.report_id || null} />
    </div>
  );
}
