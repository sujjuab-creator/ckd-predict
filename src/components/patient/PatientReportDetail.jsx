import React from 'react';
import { ArrowLeft, FileText, Download, Loader2, MessageSquareText, ShieldAlert } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, Loading, EmptyState, Alert, RiskBadge, Disclaimer } from '../ui/UI';
import { ProbabilityGauge } from '../ui/Charts';
import { formatDate, formatPercent, capitalize, isRiskResult } from '../../utils/format';
import { PATIENT_DISCLAIMER, ReviewStatusBadge, resultExplanation, useReportDownload } from './patientUi';
import ReviewItem from './ReviewItem';

/** GET /api/patient/reports/:id – the backend returns 403 for any report that isn't the caller's. */
export default function PatientReportDetail({ onNavigate, reportId }) {
  const res = useApiData(async () => {
    const r = await apiService.getPatientReport(reportId);
    if (r.status === 403) throw new Error('You can only view your own reports.');
    if (r.status === 404) throw new Error('This report could not be found.');
    return unwrap(r, 'Unable to load this report.');
  }, [reportId]);
  const dl = useReportDownload();
  const report = res.data?.report;
  const reviews = res.data?.reviews || [];
  const p = report?.prediction;

  const back = <button className="btn btn-ghost" onClick={() => onNavigate('/patient/reports')}><ArrowLeft /> All reports</button>;

  if (res.loading) return <Loading label="Loading report…" />;
  if (res.error) {
    return (
      <div className="stack-lg">
        <PageHeader title="Report" actions={back} />
        <Card><EmptyState icon={FileText} title="Report unavailable" message={res.error} /></Card>
      </div>
    );
  }

  const busy = dl.busy === String(report.report_id);

  return (
    <div className="stack-lg">
      <PageHeader
        title={`Report ${report.report_id}`}
        subtitle={`Created ${formatDate(report.created_at, true)}`}
        actions={(
          <>
            {back}
            <button className="btn btn-primary" onClick={() => dl.download(report)} disabled={busy}>
              {busy ? <Loader2 className="spin" /> : <Download />} Download PDF
            </button>
          </>
        )}
      />
      {dl.error && <Alert type="error">{dl.error}</Alert>}

      <div className="grid-main-side">
        <Card title="Assessment result" icon={ShieldAlert}>
          {p ? (
            <div className="grid-2" style={{ alignItems: 'center' }}>
              <div className="center">
                <ProbabilityGauge value={Number(p.probability) || 0} color={isRiskResult(p.result) ? '#dc2626' : '#10b981'} label="Estimated CKD risk" />
              </div>
              <div className="stack">
                <div className="row wrap" style={{ gap: 8 }}>
                  <RiskBadge result={p.result} />
                  <ReviewStatusBadge status={report.review_status} />
                </div>
                <p>{resultExplanation(p.result)}</p>
                <p className="small muted">
                  The probability ({formatPercent(p.probability)}) is the model&apos;s estimate based on the information
                  supplied at the time of the assessment. It is not a diagnosis.
                </p>
              </div>
            </div>
          ) : <p className="muted small">This report is not linked to an assessment result.</p>}
        </Card>

        <Card title="Report details" icon={FileText}>
          <dl className="kv">
            <dt>Report ID</dt><dd className="mono">{report.report_id}</dd>
            <dt>Status</dt><dd>{capitalize(report.status || 'generated')}</dd>
            <dt>Report date</dt><dd>{formatDate(report.created_at)}</dd>
            <dt>Assessment date</dt><dd>{p ? formatDate(p.created_at, true) : '—'}</dd>
            <dt>Assessment ID</dt><dd className="mono">{p?.prediction_id || report.formatted_prediction_id || '—'}</dd>
            <dt>Model</dt><dd>{p?.model_name || '—'}</dd>
          </dl>
        </Card>
      </div>

      <Card title="Doctor reviews for this report" icon={MessageSquareText} noBody>
        {reviews.length ? reviews.map((r) => <ReviewItem key={r.id} review={r} />) : (
          <EmptyState
            icon={MessageSquareText}
            title="Not reviewed yet"
            message="Your doctor hasn't added a review for this report yet. You'll receive a notification when they do."
          />
        )}
      </Card>

      <Disclaimer text={PATIENT_DISCLAIMER} />
    </div>
  );
}
