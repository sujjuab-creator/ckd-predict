import React from 'react';
import {
  Activity, FileText, PlusCircle, History, Gauge, Clock, ShieldAlert, ArrowRight, Sparkles, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, StatCard, Disclaimer, ErrorState, RiskBadge } from '../ui/UI';
import { PredictionsTable } from '../prediction/Tables';
import { normalizePrediction, formatDate, formatPercent, isRiskResult } from '../../utils/format';
import { LogoMark } from '../brand/Logo';
import NoPatientRecord from './NoPatientRecord';

export default function PatientOverview({ onNavigate, record, predictions, reports, reload }) {
  const { currentUser } = useAuth();
  const latest = normalizePrediction(predictions.list[0]);
  const loading = predictions.loading || record.loading;

  return (
    <div className="stack-lg">
      <div className="welcome">
        <LogoMark className="deco" />
        <div>
          <span className="badge badge-green"><Sparkles /> Patient Portal</span>
          <h1 style={{ marginTop: 12 }}>Welcome back, {currentUser?.name?.split(' ')[0] || 'there'}</h1>
          <p>Run an AI-assisted CKD risk prediction, review your results and download your medical reports.</p>
        </div>
        <button className="btn btn-primary btn-lg" onClick={() => onNavigate('/patient/prediction')} disabled={!record.patient && !record.loading}>
          <PlusCircle /> New Prediction
        </button>
      </div>

      {record.error && <ErrorState message={record.error} onRetry={reload} />}
      {!record.loading && !record.error && !record.patient && <NoPatientRecord />}

      <div className="grid-4">
        <StatCard featured label="Total Predictions" value={predictions.list.length} sub="Saved to your record" icon={Activity} loading={loading} />
        <StatCard
          label="Latest Result"
          value={latest ? <span style={{ fontSize: 20 }}>{latest.label}</span> : '—'}
          sub={latest ? `Probability ${formatPercent(latest.probability)}` : 'No predictions yet'}
          icon={ShieldAlert}
          tone={latest && isRiskResult(latest.label) ? 'red' : 'green'}
          loading={loading}
        />
        <StatCard label="Last Prediction" value={<span style={{ fontSize: 20 }}>{latest ? formatDate(latest.createdAt) : '—'}</span>} sub={latest ? latest.code : 'No predictions yet'} icon={Clock} tone="blue" loading={loading} />
        <StatCard label="Medical Reports" value={reports.list.length} sub="Generated PDF reports" icon={FileText} tone="navy" loading={reports.loading} />
      </div>

      <div className="grid-4">
        {[
          { icon: PlusCircle, tone: 'tone-green', t: 'CKD Prediction', s: 'Enter health information', to: '/patient/prediction' },
          { icon: History, tone: 'tone-blue', t: 'Prediction History', s: 'All saved predictions', to: '/patient/history' },
          { icon: Gauge, tone: 'tone-amber', t: 'Results & SHAP', s: 'See what influenced a result', to: '/patient/result' },
          { icon: Stethoscope, tone: 'tone-navy', t: 'My Doctor', s: 'Your treating doctor', to: '/patient/doctor' },
        ].map((q) => (
          <button key={q.t} className="card card-hover quick" onClick={() => onNavigate(q.to)}>
            <span className={`ic ${q.tone}`}><q.icon /></span>
            <div><b>{q.t}</b><span>{q.s}</span></div>
            <ArrowRight />
          </button>
        ))}
      </div>

      <div className="grid-main-side">
        <Card
          title="Recent predictions"
          icon={History}
          noBody
          actions={<button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/patient/history')}>View all</button>}
        >
          <PredictionsTable
            compact
            predictions={predictions.list}
            limit={5}
            onView={(p) => onNavigate(`/patient/result/${p.id}`)}
            emptyAction={record.patient && <button className="btn btn-primary" onClick={() => onNavigate('/patient/prediction')}><PlusCircle /> Run your first prediction</button>}
          />
        </Card>
        <Card title="Latest result" icon={Gauge}>
          {latest ? (
            <div className="stack">
              <RiskBadge result={latest.label} />
              <div className="stat-value">{formatPercent(latest.probability)}</div>
              <div className="small muted">Model CKD-risk probability · {latest.model}</div>
              <div className="small muted">{formatDate(latest.createdAt, true)}</div>
              <button className="btn btn-outline btn-block" onClick={() => onNavigate(`/patient/result/${latest.id}`)}>
                View explanation <ArrowRight />
              </button>
            </div>
          ) : (
            <p className="muted small">Your most recent prediction will be summarised here.</p>
          )}
        </Card>
      </div>

      <Disclaimer />
    </div>
  );
}
