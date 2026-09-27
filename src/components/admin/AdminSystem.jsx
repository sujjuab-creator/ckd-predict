import React from 'react';
import { Server, Database, Cpu, Activity, RefreshCw, Globe, CircleCheck, Users, FileText } from 'lucide-react';
import apiService, { API_BASE_URL } from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, StatCard, Loading, Alert } from '../ui/UI';

/**
 * System information from GET /api/health, GET /api/analytics and
 * GET /api/analytics/model-comparison. No values are hard-coded.
 */
export default function AdminSystem({ users, patients, predictions }) {
  const health = useApiData(async () => {
    const t0 = performance.now();
    const res = await apiService.checkHealth();
    const ms = Math.round(performance.now() - t0);
    return { ok: res.ok, status: res.status, data: res.data, ms };
  }, []);
  const analytics = useApiData(async () => unwrap(await apiService.getAnalytics()), []);
  const models = useApiData(async () => unwrap(await apiService.getModelComparison()), []);

  const h = health.data;
  const apiUp = h?.ok && h.data?.success;
  const dbUp = h?.data?.database === 'connected';
  const a = analytics.data || {};

  const refresh = () => { health.reload(); analytics.reload(); models.reload(); };

  return (
    <div className="stack-lg">
      <PageHeader
        title="System Statistics"
        subtitle="Live service health and data counts."
        actions={<button className="btn btn-ghost" onClick={refresh}><RefreshCw /> Refresh</button>}
      />

      <div className="grid-3">
        <Card title="API service" icon={Server}>
          {health.loading ? <Loading label="Checking…" /> : (
            <div className="stack">
              <span className={`badge badge-dot ${apiUp ? 'badge-green' : 'badge-red'}`}>{apiUp ? 'Online' : 'Unreachable'}</span>
              <dl className="kv small">
                <dt>Service</dt><dd>{h?.data?.service || '—'}</dd>
                <dt>Status</dt><dd>{h?.data?.status || h?.data?.error || '—'}</dd>
                <dt>Response time</dt><dd>{h ? `${h.ms} ms` : '—'}</dd>
              </dl>
            </div>
          )}
        </Card>
        <Card title="Database" icon={Database}>
          {health.loading ? <Loading label="Checking…" /> : (
            <div className="stack">
              <span className={`badge badge-dot ${dbUp ? 'badge-green' : 'badge-amber'}`}>{dbUp ? 'Connected' : (h?.data?.database || 'Unknown')}</span>
              <p className="small muted">Connection status reported by the backend health check.</p>
            </div>
          )}
        </Card>
        <Card title="Frontend" icon={Globe}>
          <dl className="kv small">
            <dt>API base URL</dt><dd className="mono" style={{ wordBreak: 'break-all' }}>{API_BASE_URL}</dd>
            <dt>Routing</dt><dd>Hash routing (#/…)</dd>
          </dl>
        </Card>
      </div>

      {!health.loading && !apiUp && (
        <Alert type="error" title="The backend API is not reachable">{h?.data?.error}</Alert>
      )}

      <div className="grid-4">
        <StatCard featured label="Users" value={a.total_users} sub={`${users.list.filter((u) => u.status === 'Active').length} active`} icon={Users} loading={analytics.loading} />
        <StatCard label="Patient records" value={a.total_patients ?? patients.list.length} icon={Activity} tone="green" loading={analytics.loading} />
        <StatCard label="Predictions" value={a.total_predictions ?? predictions.list.length} icon={Cpu} tone="blue" loading={analytics.loading} />
        <StatCard label="Reports" value={a.total_reports} icon={FileText} tone="navy" loading={analytics.loading} />
      </div>

      <Card title="Prediction model" icon={Cpu}>
        {models.loading ? <Loading /> : models.error ? <Alert type="warn">{models.error}</Alert> : (
          <dl className="kv">
            <dt>Selected model</dt><dd>{models.data.selected_model}</dd>
            <dt>Models evaluated</dt><dd>{(models.data.evaluations || []).map((e) => e.model_name).join(', ') || '—'}</dd>
            <dt>Selection criterion</dt><dd>{models.data.selection_criterion || '—'}</dd>
            <dt>Explainability</dt><dd className="row" style={{ gap: 6 }}><CircleCheck size={16} color="#059669" /> SHAP explanations served by the API</dd>
          </dl>
        )}
      </Card>

      <Alert type="info" title="Administrator account">
        There is exactly one Administrator. Its credentials are configured securely on the server (environment configuration)
        and are never stored in or shown by the frontend. Additional admin accounts cannot be created.
      </Alert>
      {!dbUp && !health.loading && apiUp && (
        <Alert type="warn">The API responded but reported the database as not connected.</Alert>
      )}
    </div>
  );
}
