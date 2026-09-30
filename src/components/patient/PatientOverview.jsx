import React from 'react';
import {
  FileText, Stethoscope, MessageSquareText, Bell, BookOpen, ArrowRight, Sparkles,
  Download, Eye, CalendarDays,
} from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { Card, StatCard, Disclaimer, ErrorState, Alert } from '../ui/UI';
import { formatDate } from '../../utils/format';
import { LogoMark } from '../brand/Logo';
import NoPatientRecord from './NoPatientRecord';
import { PATIENT_DISCLAIMER, ReviewStatusBadge, useReportDownload } from './patientUi';

/** GET /api/patient/overview – built only from the signed-in patient's own data. */
export default function PatientOverview({ onNavigate }) {
  const { currentUser } = useAuth();
  const res = useApiData(async () => unwrap(await apiService.getPatientOverview(), 'Unable to load your overview.'), []);
  const d = res.data || {};
  const loading = res.loading;
  const report = d.latest_report;
  const dl = useReportDownload();
  const name = d.user?.name || currentUser?.name || '';

  return (
    <div className="stack-lg">
      <div className="welcome">
        <LogoMark className="deco" />
        <div>
          <span className="badge badge-green"><Sparkles /> Patient Portal</span>
          <h1 style={{ marginTop: 12 }}>Welcome, {name.split(' ')[0] || 'there'}</h1>
          <p>
            View your reports, doctor&apos;s reviews and trusted information about kidney health.
            {d.patient?.patient_id && <> Your patient ID is <b className="mono">{d.patient.patient_id}</b>.</>}
          </p>
        </div>
        <div className="row wrap" style={{ gap: 10 }}>
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('/patient/reports')}>
            <FileText /> My Reports
          </button>
          <button className="btn btn-outline btn-lg" onClick={() => onNavigate('/patient/doctor')}>
            <Stethoscope /> My Doctor
          </button>
        </div>
      </div>

      {res.error && <ErrorState message={res.error} onRetry={res.reload} />}
      {!loading && !res.error && !d.patient && <NoPatientRecord />}

      <div className="grid-4">
        <StatCard
          featured
          label="Treating Doctor"
          value={<span style={{ fontSize: 19 }}>{d.doctor?.name || 'Not assigned'}</span>}
          sub={d.doctor ? (d.doctor.specialty || d.doctor.doctor_id || 'Your treating doctor') : 'Contact the hospital administrator'}
          icon={Stethoscope}
          loading={loading}
        />
        <StatCard
          label="Doctor Reviews"
          value={d.review_count || 0}
          sub={(d.review_count || 0) === 1 ? 'Doctor review on record' : 'Doctor reviews on record'}
          icon={MessageSquareText}
          tone="purple"
          loading={loading}
        />
        <StatCard
          label="Latest Report"
          value={<span style={{ fontSize: 19 }}>{report ? formatDate(report.created_at) : 'No reports yet'}</span>}
          sub={report ? report.report_id : `${d.report_count || 0} reports in total`}
          icon={CalendarDays}
          tone="blue"
          loading={loading}
        />
        <StatCard
          label="Notifications"
          value={d.unread_notifications ?? 0}
          sub={(d.unread_notifications || 0) === 1 ? 'Unread notification' : 'Unread notifications'}
          icon={Bell}
          tone="navy"
          loading={loading}
        />
      </div>

      <div className="grid-main-side">
        <Card
          title="My Reports"
          icon={FileText}
          actions={report && <button className="btn btn-sm btn-ghost" onClick={() => onNavigate('/patient/reports')}><Eye /> View all</button>}
        >
          {loading ? <div className="skeleton" style={{ height: 120 }} /> : report ? (
            <div className="stack">
              <div className="row-between">
                <div>
                  <div className="strong mono">{report.report_id}</div>
                  <div className="small muted">Report generated · {formatDate(report.created_at, true)}</div>
                </div>
                <ReviewStatusBadge status={d.review_status} />
              </div>
              {dl.error && <Alert type="error">{dl.error}</Alert>}
              <div className="row wrap" style={{ gap: 10 }}>
                <button className="btn btn-primary btn-sm" onClick={() => dl.download(report)} disabled={dl.busy === String(report.report_id)}>
                  <Download /> Download PDF
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => onNavigate(`/patient/reports/${report.id}`)}>
                  <Eye /> View Details
                </button>
              </div>
            </div>
          ) : (
            <p className="muted small">
              You don&apos;t have any reports yet. When your doctor generates a report for you, it will appear here.
            </p>
          )}
        </Card>

        <Card title="Doctor review" icon={MessageSquareText}>
          {loading ? <div className="skeleton" style={{ height: 80 }} /> : (
            <div className="stack">
              <ReviewStatusBadge status={d.review_status} />
              <p className="small muted">
                {d.review_count
                  ? `Your doctor has written ${d.review_count} review${d.review_count === 1 ? '' : 's'} on your record.`
                  : 'No doctor reviews have been added to your record yet.'}
              </p>
              <button className="btn btn-outline btn-block" onClick={() => onNavigate('/patient/reviews')}>
                Read reviews <ArrowRight />
              </button>
            </div>
          )}
        </Card>
      </div>

      <div className="grid-4">
        {[
          { icon: FileText, tone: 'tone-green', t: 'My Reports', s: 'View and download PDFs', to: '/patient/reports' },
          { icon: Stethoscope, tone: 'tone-navy', t: 'My Doctor', s: 'Your treating doctor', to: '/patient/doctor' },
          { icon: BookOpen, tone: 'tone-blue', t: 'Kidney Education', s: 'Learn about kidney health', to: '/patient/kidney-health' },
          { icon: Bell, tone: 'tone-amber', t: 'Notifications', s: 'Updates on your record', to: '/patient/notifications' },
        ].map((q) => (
          <button key={q.t} className="card card-hover quick" onClick={() => onNavigate(q.to)}>
            <span className={`ic ${q.tone}`}><q.icon /></span>
            <div><b>{q.t}</b><span>{q.s}</span></div>
            <ArrowRight />
          </button>
        ))}
      </div>

      <Disclaimer text={PATIENT_DISCLAIMER} />
    </div>
  );
}
