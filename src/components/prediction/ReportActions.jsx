import React, { useState } from 'react';
import { FileText, Download, Loader2 } from 'lucide-react';
import apiService from '../../services/api';

/**
 * Generate (POST /api/reports/:predictionId) and download
 * (GET /api/reports/:reportId/download) the server-side PDF report.
 */
export default function ReportActions({ predictionId, existingReportId = null, onGenerated, size = 'btn-sm' }) {
  const [reportId, setReportId] = useState(existingReportId);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const generate = async () => {
    setBusy('generate');
    setError('');
    const res = await apiService.generateMedicalReport(predictionId);
    setBusy('');
    if (res.ok && res.data?.success) {
      setReportId(res.data.report_id);
      onGenerated?.(res.data);
      return res.data.report_id;
    }
    setError(res.data?.error || 'Report generation failed.');
    return null;
  };

  const download = async () => {
    setError('');
    setBusy('download');
    const res = await apiService.downloadReport(reportId);
    setBusy('');
    if (!res.ok) setError(`Download failed: ${res.error}. Try generating the report again.`);
  };

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div className="row wrap">
        <button type="button" className={`btn ${size} ${reportId ? 'btn-ghost' : 'btn-primary'}`} onClick={generate} disabled={Boolean(busy)}>
          {busy === 'generate' ? <Loader2 className="spin" /> : <FileText />}
          {reportId ? 'Regenerate PDF' : 'Generate PDF Report'}
        </button>
        {reportId && (
          <button type="button" className={`btn ${size} btn-primary`} onClick={download} disabled={Boolean(busy)}>
            {busy === 'download' ? <Loader2 className="spin" /> : <Download />} Download {reportId}
          </button>
        )}
      </div>
      {error && <span className="error-text">{error}</span>}
    </div>
  );
}
