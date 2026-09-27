import React from 'react';
import {
  Users, UserRound, Stethoscope, Activity, ShieldAlert, FileText, ArrowRight, ChartBar, GitCompare, Server, ShieldCheck, History,
} from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { Card, StatCard, ErrorState, Disclaimer, StatusBadge } from '../ui/UI';
import { TrendChart, DonutChart, HBarList, CHART_COLORS } from '../ui/Charts';
import { PredictionsTable } from '../prediction/Tables';
import { formatDate, initials } from '../../utils/format';
import { LogoMark } from '../brand/Logo';

export default function AdminOverview({ onNavigate, users, predictions, reloadAll, patientName }) {
  const { currentUser } = useAuth();
  const analytics = useApiData(async () => unwrap(await apiService.getAnalytics()), []);
  const a = analytics.data || {};
  const loading = analytics.loading;

  const trend = (a.prediction_trends || []).map((t) => ({ label: t.date, value: t.count }));
  const active = users.list.filter((u) => u.status === 'Active').length;
  const recentUsers = users.list.slice(0, 5);

  return (
    <div className="stack-lg">
      <div className="welcome">
        <LogoMark className="deco" />
        <div>
          <span className="badge badge-navy"><ShieldCheck /> System Administrator</span>
          <h1 style={{ marginTop: 12 }}>Welcome, {currentUser?.name || 'Administrator'}</h1>
          <p>Manage accounts, monitor prediction activity and review model performance across CKD PREDICT.</p>
        </div>
        <div className="row wrap">
          <button className="btn btn-ghost" onClick={() => onNavigate('/admin/system')}><Server /> System status</button>
          <button className="btn btn-primary" onClick={() => onNavigate('/admin/users')}><Users /> Manage users</button>
        </div>
      </div>

      {(analytics.error || users.error) && <ErrorState message={analytics.error || users.error} onRetry={() => { analytics.reload(); reloadAll(); }} />}

      <div className="grid-4">
        <StatCard featured label="Total Users" value={a.total_users} sub={users.loading ? '' : `${active} active accounts`} icon={Users} loading={loading} />
        <StatCard label="Patients" value={a.total_patients} sub="Patient records" icon={UserRound} tone="green" loading={loading} />
        <StatCard label="Doctors" value={a.total_doctors} sub="Doctor accounts" icon={Stethoscope} tone="blue" loading={loading} />
        <StatCard label="Predictions" value={a.total_predictions} sub={`${a.total_reports ?? 0} reports generated`} icon={Activity} tone="navy" loading={loading} />
      </div>

      <div className="grid-main-side">
        <Card title="Prediction activity" subtitle="Predictions per day" icon={ChartBar} actions={<button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/admin/analytics')}>Analytics</button>}>
          {loading ? null : trend.length ? <TrendChart data={trend} valueLabel="Predictions" /> : <p className="muted small">No prediction activity yet.</p>}
        </Card>
        <Card title="Prediction results" icon={ShieldAlert}>
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
        <Card title="Recent predictions" icon={History} noBody actions={<button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/admin/analytics')}>View all</button>}>
          <PredictionsTable compact predictions={predictions.list} limit={6} patientName={(p) => patientName(p.patient_id)} />
        </Card>
        <div className="stack-lg">
          <Card title="Accounts by role" icon={Users}>
            <HBarList
              data={[
                { label: 'Patients', value: users.list.filter((u) => u.role === 'patient').length, color: CHART_COLORS.green },
                { label: 'Doctors', value: users.list.filter((u) => u.role === 'doctor').length, color: CHART_COLORS.blue },
                { label: 'Administrator', value: users.list.filter((u) => u.role === 'admin').length, color: CHART_COLORS.navy },
              ]}
            />
          </Card>
          <Card title="Newest accounts" icon={UserRound} actions={<button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/admin/users')}>Manage</button>}>
            {recentUsers.length === 0 ? <p className="muted small">No accounts yet.</p> : recentUsers.map((u) => (
              <div className="list-item" key={u.id}>
                <span className="avatar" style={{ width: 34, height: 34, fontSize: 12, borderRadius: 9 }}>{initials(u.name)}</span>
                <div className="grow">
                  <div className="t">{u.name}</div>
                  <div className="s">{u.role} · {formatDate(u.created_at)}</div>
                </div>
                <StatusBadge status={u.status} />
              </div>
            ))}
          </Card>
        </div>
      </div>

      <div className="grid-4">
        {[
          { icon: UserRound, tone: 'tone-green', t: 'Manage Patients', s: 'Patient accounts', to: '/admin/patients' },
          { icon: Stethoscope, tone: 'tone-blue', t: 'Manage Doctors', s: 'Doctor accounts', to: '/admin/doctors' },
          { icon: GitCompare, tone: 'tone-amber', t: 'Model Comparison', s: 'Evaluation metrics', to: '/admin/models' },
          { icon: FileText, tone: 'tone-navy', t: 'System Statistics', s: 'Health & data counts', to: '/admin/system' },
        ].map((q) => (
          <button key={q.t} className="card card-hover quick" onClick={() => onNavigate(q.to)}>
            <span className={`ic ${q.tone}`}><q.icon /></span>
            <div><b>{q.t}</b><span>{q.s}</span></div>
            <ArrowRight />
          </button>
        ))}
      </div>

      <Disclaimer />
    </div>
  );
}
