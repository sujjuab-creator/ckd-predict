import React, { useMemo, useState } from 'react';
import { FileText, Download, Eye, RefreshCw, Loader2 } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, Loading, ErrorState, EmptyState, Alert, RiskBadge, Disclaimer } from '../ui/UI';
import { formatDate, formatPercent, capitalize } from '../../utils/format';
import { PATIENT_DISCLAIMER, ReviewStatusBadge, useReportDownload } from './patientUi';

const FILTERS = [
  { id: 'all', label: 'All reports' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'awaiting', label: 'Pending review' },
];

/** GET /api/patient/reports – only the signed-in patient's reports. */
export default function PatientReports({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getPatientReports(), 'Unable to load your reports.').reports || [], []);
  const [filter, setFilter] = useState('all');
  const dl = useReportDownload();

  const list = useMemo(() => {
    const all = res.data || [];
    if (filter === 'reviewed') return all.filter((r) => r.review_status === 'Reviewed');
    if (filter === 'awaiting') return all.filter((r) => r.review_status !== 'Reviewed');
    return all;
  }, [res.data, filter]);

  return (
    <div className="stack-lg">
      <PageHeader
        title="My Reports"
        subtitle="Your CKD risk assessment reports. Download a PDF to keep or share with your healthcare provider."
        actions={<button className="btn btn-ghost" onClick={res.reload} disabled={res.loading}><RefreshCw /> Refresh</button>}
      />

      {dl.error && <Alert type="error">{dl.error}</Alert>}

      {res.loading ? <Loading label="Loading your reports…" /> : res.error ? (
        <Card><ErrorState message={res.error} onRetry={res.reload} /></Card>
      ) : (res.data || []).length === 0 ? (
        <Card>
          <EmptyState
            icon={FileText}
            title="No reports yet"
            message="When your doctor completes a CKD risk assessment and generates a report for you, it will appear here."
          />
        </Card>
      ) : (
        <>
          <div className="segmented" role="tablist" aria-label="Filter reports" style={{ maxWidth: 520 }}>
            {FILTERS.map((f) => (
              <button key={f.id} role="tab" aria-selected={filter === f.id} className={filter === f.id ? 'active' : ''} onClick={() => setFilter(f.id)}>
                {f.label}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <Card><EmptyState icon={FileText} title="No reports match this filter" message="Try another filter." /></Card>
          ) : (
            <div className="report-grid">
              {list.map((r) => {
                const p = r.prediction;
                const busy = dl.busy === String(r.report_id);
                return (
                  <div className="card report-card" key={r.id}>
                    <div className="row-between">
                      <div>
                        <div className="strong mono">{r.report_id}</div>
                        <div className="small muted">{formatDate(r.created_at, true)}</div>
                      </div>
                      <span className="badge badge-green badge-dot">{capitalize(r.status || 'generated')}</span>
                    </div>
                    <div className="row wrap" style={{ gap: 8 }}>
                      {p ? <RiskBadge result={p.result} /> : <span className="badge badge-gray">No result linked</span>}
                      <ReviewStatusBadge status={r.review_status} />
                    </div>
                    <div className="meta">
                      <div><span>Result</span><b>{p?.result || '—'}</b></div>
                      <div><span>Estimated probability</span><b>{p ? formatPercent(p.probability) : '—'}</b></div>
                      <div><span>Assessment date</span><b>{p ? formatDate(p.created_at) : '—'}</b></div>
                      <div><span>Model</span><b>{p?.model_name || '—'}</b></div>
                    </div>
                    <div className="row wrap" style={{ gap: 8 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => onNavigate(`/patient/reports/${r.id}`)}><Eye /> View report</button>
                      <button className="btn btn-sm btn-primary" onClick={() => dl.download(r)} disabled={busy}>
                        {busy ? <Loader2 className="spin" /> : <Download />} Download PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <Disclaimer text={PATIENT_DISCLAIMER} />
    </div>
  );
}
