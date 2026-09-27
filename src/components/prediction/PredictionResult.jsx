import React, { useState } from 'react';
import { ShieldAlert, ShieldCheck, FileText, ClipboardList, ChevronDown } from 'lucide-react';
import { Card, Disclaimer } from '../ui/UI';
import { ProbabilityGauge } from '../ui/Charts';
import ShapPanel from './ShapPanel';
import ReportActions from './ReportActions';
import { normalizePrediction, isRiskResult, formatDate, formatPercent } from '../../utils/format';
import { FEATURES, FEATURE_SECTIONS, featureValueText } from '../../data/featureSchema';

/** Displays a saved prediction exactly as returned by the backend. */
export default function PredictionResult({ prediction, patientLabel, existingReportId = null }) {
  const p = normalizePrediction(prediction);
  const [showInputs, setShowInputs] = useState(false);
  if (!p) return null;
  const risk = isRiskResult(p.label);

  const inputs = p.inputFeatures
    ? Object.fromEntries(Object.entries(p.inputFeatures).map(([k, v]) => [k.toLowerCase(), v]))
    : null;

  return (
    <div className="stack-lg">
      <div className={`result-hero ${risk ? 'risk' : 'norisk'}`}>
        <ProbabilityGauge value={p.probability} color={risk ? '#dc2626' : '#059669'} label="Model CKD-risk probability" />
        <div>
          <span className={`badge ${risk ? 'badge-red' : 'badge-green'}`}>
            {risk ? <ShieldAlert /> : <ShieldCheck />} AI-assisted risk prediction
          </span>
          <h2 style={{ marginTop: 12 }}>{p.label || 'Result unavailable'}</h2>
          <p className="muted" style={{ marginTop: 6, maxWidth: 560 }}>
            {risk
              ? 'The model associated the supplied information with CKD risk. Please discuss this result with a qualified healthcare professional.'
              : 'The model did not associate the supplied information with CKD risk. This is not a guarantee of kidney health — regular check-ups remain important.'}
          </p>
          <div className="result-meta">
            <span>Prediction ID: <b className="mono">{p.code}</b></span>
            <span>Probability: <b>{formatPercent(p.probability)}</b></span>
            {p.model && <span>Model: <b>{p.model}</b></span>}
            {p.createdAt && <span>Date: <b>{formatDate(p.createdAt, true)}</b></span>}
            {patientLabel && <span>Patient: <b>{patientLabel}</b></span>}
          </div>
        </div>
      </div>

      <div className="grid-main-side">
        {p.id ? <ShapPanel predictionId={p.id} /> : <div />}
        <div className="stack-lg">
          <Card title="Medical Report" subtitle="Server-generated PDF for this prediction" icon={FileText}>
            {p.id ? (
              <ReportActions predictionId={p.id} existingReportId={existingReportId} size="" />
            ) : (
              <span className="muted small">Report generation is available for saved predictions.</span>
            )}
          </Card>
          <Disclaimer text={p.disclaimer || undefined} />
        </div>
      </div>

      {inputs && (
        <Card
          title="Submitted health information"
          subtitle="Values stored with this prediction"
          icon={ClipboardList}
          actions={(
            <button className="btn btn-sm btn-ghost" onClick={() => setShowInputs((v) => !v)}>
              {showInputs ? 'Hide' : 'Show'} values <ChevronDown style={{ transform: showInputs ? 'rotate(180deg)' : 'none' }} />
            </button>
          )}
        >
          {showInputs ? (
            <div className="grid-2">
              {FEATURE_SECTIONS.map((sec) => (
                <div key={sec.id}>
                  <div className="strong small" style={{ marginBottom: 8 }}>{sec.title}</div>
                  <dl className="kv small">
                    {FEATURES.filter((f) => f.section === sec.id).map((f) => (
                      <React.Fragment key={f.name}>
                        <dt>{f.label}</dt>
                        <dd>{featureValueText(f.name, inputs[f.name.toLowerCase()])}</dd>
                      </React.Fragment>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <span className="muted small">{FEATURES.length} values were supplied for this prediction.</span>
          )}
        </Card>
      )}
    </div>
  );
}
