import React, { useEffect, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import apiService from '../../services/api';
import { Card, Loading, Alert, EmptyState } from '../ui/UI';
import { featureLabel, featureValueText } from '../../data/featureSchema';

/**
 * SHAP explanation for one saved prediction.
 * Uses POST /api/predictions/:id/explanation (existing SHAP service).
 */
export default function ShapPanel({ predictionId, compact = false }) {
  const [state, setState] = useState({ loading: true, error: '', data: null });

  const load = async () => {
    if (!predictionId) return;
    setState({ loading: true, error: '', data: null });
    const res = await apiService.getPredictionExplanation(predictionId);
    if (res.ok && res.data?.success !== false && Array.isArray(res.data?.features)) {
      setState({ loading: false, error: '', data: res.data });
    } else {
      setState({ loading: false, error: res.data?.error || 'The explanation could not be generated.', data: null });
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [predictionId]);

  const features = state.data?.features || [];
  const maxAbs = Math.max(...features.map((f) => Math.abs(f.shap_value || 0)), 0.0001);

  return (
    <Card
      title="SHAP Explanation"
      subtitle="Top factors that influenced this prediction"
      icon={Sparkles}
      actions={!state.loading && (
        <button className="btn btn-sm btn-ghost" onClick={load}><RefreshCw /> Refresh</button>
      )}
    >
      {state.loading && <Loading label="Calculating SHAP feature contributions…" />}
      {!state.loading && state.error && <Alert type="error">{state.error}</Alert>}
      {!state.loading && !state.error && features.length === 0 && (
        <EmptyState title="No explanation available" message="The server returned no feature contributions for this prediction." />
      )}
      {!state.loading && features.length > 0 && (
        <div className="stack">
          <div className="shap-legend">
            <span><i style={{ background: '#dc2626' }} /> Pushed towards higher predicted CKD risk</span>
            <span><i style={{ background: '#059669' }} /> Pushed towards lower predicted CKD risk</span>
          </div>
          <div>
            {features.map((f) => {
              const v = Number(f.shap_value) || 0;
              const w = (Math.abs(v) / maxAbs) * 50;
              return (
                <div className="shap-row" key={f.feature} title={f.impact}>
                  <div className="shap-name">
                    {featureLabel(f.feature)}
                    <small>Input: {featureValueText(f.feature, f.input_value)}</small>
                  </div>
                  <div className="shap-track">
                    <div className={`shap-bar ${v >= 0 ? 'pos' : 'neg'}`} style={{ width: `${w}%` }} />
                  </div>
                  <div className={`shap-val ${v >= 0 ? 'text-red' : 'text-green'}`}>{v >= 0 ? '+' : ''}{v.toFixed(3)}</div>
                </div>
              );
            })}
          </div>
          {!compact && (
            <div className="small muted">
              Model: <b>{state.data.model}</b> · Base value {state.data.base_value} · Predicted probability {state.data.prediction_value}.
              SHAP values describe how the model reached this output; they do not indicate medical causes.
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
