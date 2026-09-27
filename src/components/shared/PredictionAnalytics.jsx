import React from 'react';
import { ChartBar, ShieldAlert, Activity, Cpu, TrendingUp } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { Card, StatCard, Loading, ErrorState } from '../ui/UI';
import { TrendChart, DonutChart, BarChart, HBarList, CHART_COLORS } from '../ui/Charts';
import { probabilityBins } from '../../utils/format';

/**
 * Prediction analytics from GET /api/analytics plus the prediction list
 * (GET /api/predictions) for the probability distribution.
 */
export default function PredictionAnalytics({ predictions }) {
  const analytics = useApiData(async () => unwrap(await apiService.getAnalytics()), []);
  const a = analytics.data;

  if (analytics.loading) return <Loading label="Loading analytics…" />;
  if (analytics.error) return <ErrorState message={analytics.error} onRetry={analytics.reload} />;

  const total = a.total_predictions || 0;
  const riskPct = total ? Math.round((a.ckd_risk_predictions / total) * 100) : 0;
  const trend = (a.prediction_trends || []).map((t) => ({ label: t.date, value: t.count }));
  const usage = (a.model_usage || []).map((m) => ({ label: m.model_name, value: m.count }));
  const bins = probabilityBins(predictions?.list || []);
  // Doctors receive statistics for their assigned patients only (scope: "assigned_patients").
  const assigned = a.scope === 'assigned_patients';
  const ofAll = assigned ? "of your assigned patients' predictions" : 'of all predictions';

  return (
    <div className="stack-lg">
      <div className="grid-4">
        <StatCard featured label="Total Predictions" value={total} sub={assigned ? 'For your assigned patients' : 'Stored in the database'} icon={Activity} />
        <StatCard label="CKD Risk" value={a.ckd_risk_predictions} sub={`${riskPct}% ${ofAll}`} icon={ShieldAlert} tone="red" />
        <StatCard label="No CKD Risk" value={a.no_ckd_risk_predictions} sub={`${total ? 100 - riskPct : 0}% ${ofAll}`} icon={ShieldAlert} tone="green" />
        <StatCard label="Reports Generated" value={a.total_reports} sub={assigned ? 'PDF reports for your assigned patients' : 'PDF medical reports'} icon={ChartBar} tone="navy" />
      </div>

      <div className="grid-main-side">
        <Card title="Prediction trend" subtitle={`${assigned ? 'Predictions for your assigned patients' : 'Predictions'} per day (most recent 14 days with activity)`} icon={TrendingUp}>
          {trend.length ? <TrendChart data={trend} valueLabel="Predictions" /> : <p className="muted small">No predictions recorded yet.</p>}
        </Card>
        <Card title="Risk distribution" icon={ShieldAlert}>
          <DonutChart
            centerLabel="Predictions"
            data={[
              { label: 'CKD Risk', value: a.ckd_risk_predictions || 0, color: CHART_COLORS.red },
              { label: 'No CKD Risk', value: a.no_ckd_risk_predictions || 0, color: CHART_COLORS.green },
            ]}
          />
        </Card>
      </div>

      <div className="grid-main-side">
        <Card title="Probability distribution" subtitle={`Model CKD-risk probability across ${predictions?.list?.length || 0} predictions${assigned ? ' for your assigned patients' : ''}`} icon={ChartBar}>
          {predictions?.loading ? <Loading /> : (predictions?.list?.length ? (
            <BarChart data={bins} color={CHART_COLORS.navy} />
          ) : <p className="muted small">No predictions to chart yet.</p>)}
        </Card>
        <Card title="Model usage" subtitle={assigned ? "Which model produced your assigned patients' predictions" : 'Which model produced saved predictions'} icon={Cpu}>
          {usage.length ? <HBarList data={usage} /> : <p className="muted small">No model usage recorded yet.</p>}
        </Card>
      </div>
    </div>
  );
}
