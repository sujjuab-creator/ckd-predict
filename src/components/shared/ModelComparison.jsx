import React, { useState } from 'react';
import { GitCompare, Trophy, Info } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { Card, Loading, ErrorState, EmptyState } from '../ui/UI';
import { BarChart } from '../ui/Charts';

const METRICS = [
  { key: 'accuracy', label: 'Accuracy' },
  { key: 'precision', label: 'Precision' },
  { key: 'recall', label: 'Recall' },
  { key: 'f1_score', label: 'F1-Score' },
  { key: 'roc_auc', label: 'ROC-AUC' },
];

const pct = (v) => (v === null || v === undefined ? '—' : `${(Number(v) * 100).toFixed(1)}%`);

/** Stored evaluation metrics from GET /api/analytics/model-comparison. */
export default function ModelComparison({ compact = false }) {
  const res = useApiData(async () => unwrap(await apiService.getModelComparison()), []);
  const [metric, setMetric] = useState('f1_score');

  if (res.loading) return <Loading label="Loading model comparison…" />;
  if (res.error) return <ErrorState message={res.error} onRetry={res.reload} />;

  const data = res.data;
  const evals = Array.isArray(data?.evaluations) ? data.evaluations : [];
  if (!evals.length) return <Card><EmptyState icon={GitCompare} title="No evaluation results" message="Model comparison metrics have not been generated on the server." /></Card>;

  const selected = data.selected_model;
  const best = (key) => Math.max(...evals.map((e) => Number(e[key]) || 0));

  return (
    <div className="stack-lg">
      <div className="card card-pad" style={{ background: 'linear-gradient(120deg,#fff,#ecfdf5)' }}>
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <span className="stat-icon tone-green"><Trophy /></span>
          <div>
            <div className="strong" style={{ fontSize: 17 }}>Selected model: {selected}</div>
            {data.selection_criterion && <p className="small muted" style={{ marginTop: 4, maxWidth: 820 }}>{data.selection_criterion}</p>}
          </div>
        </div>
      </div>

      <Card title="Evaluation metrics" subtitle="Measured on the held-out test set during training" icon={GitCompare} noBody>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Model</th>
                {METRICS.map((m) => <th key={m.key}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {evals.map((e) => (
                <tr key={e.model_name} style={e.model_name === selected ? { background: '#f0fdf4' } : undefined}>
                  <td className="strong">
                    {e.model_name} {e.model_name === selected && <span className="badge badge-green" style={{ marginLeft: 6 }}>Selected</span>}
                  </td>
                  {METRICS.map((m) => (
                    <td key={m.key} style={Number(e[m.key]) === best(m.key) ? { fontWeight: 700, color: '#047857' } : undefined}>{pct(e[m.key])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {!compact && (
        <Card
          title="Compare by metric"
          icon={GitCompare}
          actions={(
            <div className="segmented" style={{ gridAutoColumns: 'auto' }}>
              {METRICS.map((m) => (
                <button key={m.key} className={metric === m.key ? 'active' : ''} onClick={() => setMetric(m.key)} style={{ padding: '0 12px', height: 34, fontSize: 13 }}>{m.label}</button>
              ))}
            </div>
          )}
        >
          <BarChart
            data={evals.map((e) => ({ label: e.model_name, value: Math.round((Number(e[metric]) || 0) * 1000) / 1000 }))}
            valueFormat={(v) => `${Math.round(v * 100)}%`}
            highlightMax
          />
          <div className="alert alert-info mt-16">
            <Info />
            <div>
              Metrics are computed on imbalanced test data. Recall measures how many CKD cases the model identified;
              review precision, ROC-AUC and the confusion matrix together before drawing conclusions.
            </div>
          </div>
        </Card>
      )}

      {!compact && (
        <div className="grid-3">
          {evals.filter((e) => Array.isArray(e.confusion_matrix)).map((e) => {
            const [[tn, fp], [fn, tp]] = e.confusion_matrix;
            return (
              <Card key={e.model_name} title={e.model_name} subtitle="Confusion matrix (test set)">
                <div className="cm" role="table" aria-label={`${e.model_name} confusion matrix`}>
                  <span />
                  <span className="cm-h">Predicted no risk</span>
                  <span className="cm-h">Predicted risk</span>
                  <span className="cm-h left">Actual no risk</span>
                  <span className="cm-c good">{tn}</span>
                  <span className="cm-c">{fp}</span>
                  <span className="cm-h left">Actual risk</span>
                  <span className="cm-c">{fn}</span>
                  <span className="cm-c good">{tp}</span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
