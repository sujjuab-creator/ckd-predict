import React from 'react';
import {
  Users, Activity, ShieldAlert, FileText, PlusCircle, Search, Sparkles, ChartBar, ArrowRight, History, Stethoscope,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card, StatCard, Disclaimer, ErrorState } from '../ui/UI';
import { TrendChart, DonutChart, CHART_COLORS } from '../ui/Charts';
import { PredictionsTable } from '../prediction/Tables';
import { countByDay, riskSplit } from '../../utils/format';
import { LogoMark } from '../brand/Logo';

export default function DoctorOverview({ onNavigate, patients, predictions, reports, reloadAll, patientLabel }) {
  const { currentUser } = useAuth();
  const split = riskSplit(predictions.list);
  const trend = countByDay(predictions.list);
  const loadError = patients.error || predictions.error;

  return (
    <div className="stack-lg">
      <div className="welcome">
        <LogoMark className="deco" />
        <div>
          <span className="badge badge-blue"><Stethoscope /> Doctor Workspace</span>
          <h1 style={{ marginTop: 12 }}>Welcome, Dr. {currentUser?.name?.replace(/^dr\.?\s*/i, '').split(' ')[0] || ''}</h1>
          <p>Review patient CKD risk predictions, explanations and reports. Predictions support — never replace — your clinical judgement.</p>
        </div>
        <div className="row wrap">
          <button className="btn btn-ghost" onClick={() => onNavigate('/doctor/search')}><Search /> Find patient</button>
          <button className="btn btn-primary" onClick={() => onNavigate('/doctor/predictions')}><PlusCircle /> New Prediction</button>
        </div>
      </div>

      {loadError && <ErrorState message={loadError} onRetry={reloadAll} />}

      <div className="grid-4">
        <StatCard featured label="Registered Patients" value={patients.list.length} sub="Patient records" icon={Users} loading={patients.loading} />
        <StatCard label="Total Predictions" value={predictions.list.length} sub="Saved predictions" icon={Activity} tone="blue" loading={predictions.loading} />
        <StatCard label="CKD Risk Results" value={split.risk} sub={`${split.noRisk} with no CKD risk`} icon={ShieldAlert} tone="red" loading={predictions.loading} />
        <StatCard label="Medical Reports" value={reports.list.length} sub="Generated PDFs" icon={FileText} tone="navy" loading={reports.loading} />
      </div>

      <div className="grid-main-side">
        <Card title="Prediction activity" subtitle="Predictions saved per day" icon={ChartBar}>
          {trend.length ? <TrendChart data={trend} valueLabel="Predictions" /> : <p className="muted small">No prediction activity yet.</p>}
        </Card>
        <Card title="Result distribution" subtitle="Across all saved predictions" icon={ShieldAlert}>
          <DonutChart
            centerLabel="Predictions"
            data={[
              { label: 'CKD Risk', value: split.risk, color: CHART_COLORS.red },
              { label: 'No CKD Risk', value: split.noRisk, color: CHART_COLORS.green },
            ]}
          />
        </Card>
      </div>

      <div className="grid-4">
        {[
          { icon: Users, tone: 'tone-green', t: 'My Patients', s: 'Browse patient records', to: '/doctor/patients' },
          { icon: History, tone: 'tone-blue', t: 'Prediction History', s: 'All saved predictions', to: '/doctor/history' },
          { icon: Sparkles, tone: 'tone-amber', t: 'SHAP Explanation', s: 'Factor contributions', to: '/doctor/shap' },
          { icon: FileText, tone: 'tone-navy', t: 'Medical Reports', s: 'Download PDF reports', to: '/doctor/reports' },
        ].map((q) => (
          <button key={q.t} className="card card-hover quick" onClick={() => onNavigate(q.to)}>
            <span className={`ic ${q.tone}`}><q.icon /></span>
            <div><b>{q.t}</b><span>{q.s}</span></div>
            <ArrowRight />
          </button>
        ))}
      </div>

      <Card title="Recent predictions" icon={History} noBody actions={<button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/doctor/history')}>View all</button>}>
        <PredictionsTable
          predictions={predictions.list}
          limit={6}
          patientName={(p) => patientLabel(p.patient_id)}
          onView={(p) => onNavigate(`/doctor/result/${p.id}`)}
        />
      </Card>

      <Disclaimer />
    </div>
  );
}
