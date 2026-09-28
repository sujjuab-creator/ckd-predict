import React, { useMemo } from 'react';
import { ArrowLeft, IdCard, PlusCircle, History, FileText, Activity, ShieldAlert } from 'lucide-react';
import { Card, PageHeader, Loading, EmptyState, StatCard, Disclaimer } from '../ui/UI';
import { TrendChart } from '../ui/Charts';
import { PredictionsTable, ReportsTable } from '../prediction/Tables';
import { formatDate, riskSplit } from '../../utils/format';
import DoctorReviewPanel from './DoctorReviewPanel';

export default function DoctorPatientDetails({ onNavigate, patients, predictions, reports, patientDbId }) {
  const patient = patients.list.find((p) => Number(p.id) === Number(patientDbId));
  const list = useMemo(() => predictions.list.filter((p) => Number(p.patient_id) === Number(patientDbId)), [predictions.list, patientDbId]);
  const repList = useMemo(() => reports.list.filter((r) => Number(r.patient_id) === Number(patientDbId)), [reports.list, patientDbId]);

  if (patients.loading) return <Loading label="Loading patient…" />;
  if (!patient) {
    return (
      <Card>
        <EmptyState
          icon={IdCard}
          title="Patient not found"
          message="This patient record does not exist or could not be loaded."
          action={<button className="btn btn-primary" onClick={() => onNavigate('/doctor/patients')}>Back to patients</button>}
        />
      </Card>
    );
  }

  const split = riskSplit(list);
  const probTrend = [...list].reverse().map((p) => ({ label: p.created_at, value: Math.round((Number(p.prediction_probability) || 0) * 1000) / 10 }));

  return (
    <div className="stack-lg">
      <PageHeader
        title={`Patient ${patient.patient_id}`}
        subtitle="Patient details, prediction history and reports."
        actions={(
          <>
            <button className="btn btn-ghost" onClick={() => onNavigate('/doctor/patients')}><ArrowLeft /> All patients</button>
            <button className="btn btn-primary" onClick={() => onNavigate(`/doctor/analysis/${patient.id}`)}><PlusCircle /> Patient Analysis</button>
          </>
        )}
      />

      <div className="grid-4">
        <StatCard featured label="Predictions" value={list.length} sub="Saved for this patient" icon={Activity} loading={predictions.loading} />
        <StatCard label="CKD Risk Results" value={split.risk} sub={`${split.noRisk} with no CKD risk`} icon={ShieldAlert} tone="red" loading={predictions.loading} />
        <StatCard label="Reports" value={repList.length} sub="Generated PDFs" icon={FileText} tone="navy" loading={reports.loading} />
        <StatCard label="Last Prediction" value={<span style={{ fontSize: 18 }}>{list[0] ? formatDate(list[0].created_at) : '—'}</span>} icon={History} tone="blue" loading={predictions.loading} />
      </div>

      <div className="grid-main-side">
        <Card title="Model probability over time" subtitle="CKD-risk probability (%) for each saved prediction" icon={Activity}>
          {probTrend.length ? <TrendChart data={probTrend} valueLabel="Probability %" color="#2563eb" /> : <p className="muted small">No predictions for this patient yet.</p>}
        </Card>
        <Card title="Patient record" icon={IdCard}>
          <dl className="kv">
            <dt>Patient ID</dt><dd className="mono">{patient.patient_id}</dd>
            <dt>Record no.</dt><dd className="mono">{patient.id}</dd>
            <dt>Gender</dt><dd>{patient.gender || '—'}</dd>
            <dt>Date of birth</dt><dd>{formatDate(patient.date_of_birth)}</dd>
            <dt>Registered</dt><dd>{formatDate(patient.created_at)}</dd>
          </dl>
        </Card>
      </div>

      <Card title="Prediction history" icon={History} noBody>
        <PredictionsTable
          predictions={list}
          onView={(p) => onNavigate(`/doctor/result/${p.id}`)}
          emptyAction={<button className="btn btn-primary" onClick={() => onNavigate(`/doctor/analysis/${patient.id}`)}><PlusCircle /> Analyse patient</button>}
        />
      </Card>

      <Card title="Medical reports" icon={FileText} noBody>
        <ReportsTable reports={repList} onViewPrediction={(id) => onNavigate(`/doctor/result/${id}`)} />
      </Card>

      <DoctorReviewPanel patientDbId={patient.id} reports={repList} />

      <Disclaimer />
    </div>
  );
}
