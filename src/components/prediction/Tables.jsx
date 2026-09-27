import React from 'react';
import { Eye, Download, History, FileText } from 'lucide-react';
import { RiskBadge, EmptyState } from '../ui/UI';
import { normalizePrediction, formatDate, formatPercent } from '../../utils/format';
import apiService from '../../services/api';

/** Table of predictions returned by the backend. */
export function PredictionsTable({ predictions = [], onView, patientName, emptyAction, limit, compact = false }) {
  const rows = (limit ? predictions.slice(0, limit) : predictions).map((p) => ({ raw: p, n: normalizePrediction(p) }));
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No predictions yet"
        message="Saved CKD risk predictions will appear here."
        action={emptyAction}
      />
    );
  }
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>Prediction ID</th>
            {patientName && <th>Patient</th>}
            <th>Date</th>
            <th>Result</th>
            <th>Probability</th>
            {!compact && <th>Model</th>}
            {onView && <th className="right">Action</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ raw, n }) => (
            <tr key={n.code}>
              <td className="mono strong">{n.code}</td>
              {patientName && <td>{patientName(raw)}</td>}
              <td>{formatDate(n.createdAt, true)}</td>
              <td><RiskBadge result={n.label} /></td>
              <td>{formatPercent(n.probability)}</td>
              {!compact && <td>{n.model || '—'}</td>}
              {onView && (
                <td className="right">
                  <button className="btn btn-sm btn-ghost" onClick={() => onView(n)}><Eye /> View</button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Table of generated PDF reports. */
export function ReportsTable({ reports = [], patientName, onViewPrediction, emptyMessage = 'Generate a report from any saved prediction result.' }) {
  const [downloading, setDownloading] = React.useState('');
  const [error, setError] = React.useState('');

  const download = async (id) => {
    setError('');
    setDownloading(id);
    const res = await apiService.downloadReport(id);
    setDownloading('');
    if (!res.ok) setError(`Could not download ${id}: ${res.error}. The file may need to be regenerated.`);
  };

  if (reports.length === 0) {
    return <EmptyState icon={FileText} title="No reports yet" message={emptyMessage} />;
  }
  return (
    <>
      {error && <div className="alert alert-error" style={{ margin: 16 }}>{error}</div>}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Report ID</th>
              {patientName && <th>Patient</th>}
              <th>Prediction</th>
              <th>Created</th>
              <th>Status</th>
              <th className="right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="mono strong">{r.report_id}</td>
                {patientName && <td>{patientName(r)}</td>}
                <td className="mono">{r.formatted_prediction_id}</td>
                <td>{formatDate(r.created_at, true)}</td>
                <td><span className="badge badge-green badge-dot">{r.status}</span></td>
                <td>
                  <div className="actions">
                    {onViewPrediction && r.prediction_id && (
                      <button className="btn btn-sm btn-ghost" onClick={() => onViewPrediction(r.prediction_id)}><Eye /> Result</button>
                    )}
                    <button className="btn btn-sm btn-primary" onClick={() => download(r.report_id)} disabled={downloading === r.report_id}>
                      <Download /> PDF
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
