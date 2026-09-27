import React from 'react';
import { Sparkles, Eye } from 'lucide-react';
import { PageHeader, Card, Loading, ErrorState, EmptyState, RiskBadge, Disclaimer } from '../ui/UI';
import ShapPanel from '../prediction/ShapPanel';
import { normalizePrediction, formatDate, formatPercent } from '../../utils/format';

export default function DoctorShap({ onNavigate, predictions, reloadAll, patientLabel, predictionId }) {
  if (predictions.loading) return <Loading />;
  if (predictions.error) return <ErrorState message={predictions.error} onRetry={reloadAll} />;

  const selected = predictions.list.find((p) => Number(p.id) === Number(predictionId)) || null;
  const n = normalizePrediction(selected);

  return (
    <div className="stack-lg">
      <PageHeader title="SHAP Explanation" subtitle="Understand which inputs pushed an individual prediction towards higher or lower CKD risk." />

      <Card>
        <div className="field" style={{ maxWidth: 560 }}>
          <label className="label" htmlFor="shap-pred">Prediction</label>
          <select id="shap-pred" className="select" value={selected?.id || ''} onChange={(e) => onNavigate(e.target.value ? `/doctor/shap/${e.target.value}` : '/doctor/shap')}>
            <option value="">Select a prediction…</option>
            {predictions.list.map((p) => {
              const x = normalizePrediction(p);
              return <option key={x.id} value={x.id}>{x.code} · {patientLabel(p.patient_id)} · {formatDate(x.createdAt)} · {x.label}</option>;
            })}
          </select>
        </div>
        {n && (
          <div className="row wrap mt-16" style={{ gap: 18 }}>
            <RiskBadge result={n.label} />
            <span className="small">Probability <b>{formatPercent(n.probability)}</b></span>
            <span className="small">Patient <b>{patientLabel(n.patientId)}</b></span>
            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/doctor/result/${n.id}`)}><Eye /> Full result</button>
          </div>
        )}
      </Card>

      {n ? <ShapPanel key={n.id} predictionId={n.id} /> : (
        <Card>
          <EmptyState icon={Sparkles} title={predictions.list.length ? 'Choose a prediction' : 'No predictions yet'}
            message={predictions.list.length ? 'Select a saved prediction above to calculate its SHAP explanation.' : 'SHAP explanations are available for saved predictions.'} />
        </Card>
      )}
      <Disclaimer />
    </div>
  );
}
