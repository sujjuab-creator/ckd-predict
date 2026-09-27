import React from 'react';
import { PlusCircle, Gauge } from 'lucide-react';
import { PageHeader, Loading, ErrorState, Card, EmptyState } from '../ui/UI';
import PredictionResult from '../prediction/PredictionResult';
import { normalizePrediction, formatDate } from '../../utils/format';

/** Results & SHAP for one of the patient's own saved predictions. */
export default function PatientResult({ onNavigate, record, predictions, reports, reload, predictionId }) {
  if (predictions.loading || record.loading) return <Loading label="Loading your results…" />;
  if (predictions.error) return <ErrorState message={predictions.error} onRetry={reload} />;

  const list = predictions.list;
  const selected = predictionId
    ? list.find((p) => Number(p.id) === Number(predictionId))
    : list[0];

  const header = (
    <PageHeader
      title="Results"
      subtitle="Your prediction result, SHAP explanation and medical report."
      actions={(
        <>
          {list.length > 1 && (
            <select
              className="select"
              style={{ width: 'auto', minWidth: 240 }}
              value={selected?.id || ''}
              onChange={(e) => onNavigate(`/patient/result/${e.target.value}`)}
              aria-label="Select prediction"
            >
              {list.map((p) => {
                const n = normalizePrediction(p);
                return <option key={n.id} value={n.id}>{n.code} · {formatDate(n.createdAt)} · {n.label}</option>;
              })}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => onNavigate('/patient/prediction')} disabled={!record.patient}>
            <PlusCircle /> New Prediction
          </button>
        </>
      )}
    />
  );

  if (!selected) {
    return (
      <div className="stack-lg">
        {header}
        <Card>
          <EmptyState
            icon={Gauge}
            title={predictionId ? 'Prediction not found' : 'No results yet'}
            message={predictionId ? 'This prediction does not belong to your record or no longer exists.' : 'Run a CKD risk prediction to see your result and its explanation here.'}
            action={record.patient && <button className="btn btn-primary" onClick={() => onNavigate('/patient/prediction')}><PlusCircle /> Start prediction</button>}
          />
        </Card>
      </div>
    );
  }

  const report = reports.list.find((r) => Number(r.prediction_id) === Number(selected.id));

  return (
    <div className="stack-lg">
      {header}
      <PredictionResult key={selected.id} prediction={selected} existingReportId={report?.report_id || null} />
    </div>
  );
}
