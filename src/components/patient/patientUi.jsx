import React, { useState } from 'react';
import { CheckCircle2, Clock } from 'lucide-react';
import apiService from '../../services/api';
import { isRiskResult } from '../../utils/format';

/** Disclaimer wording used throughout the patient portal. */
export const PATIENT_DISCLAIMER =
  'This system provides AI-assisted CKD risk information based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.';

/** "Reviewed" / "Awaiting review" status coming from the backend. */
export function ReviewStatusBadge({ status }) {
  if (!status) return <span className="badge badge-gray">No result yet</span>;
  const reviewed = status === 'Reviewed';
  return (
    <span className={`badge ${reviewed ? 'badge-green' : 'badge-amber'}`}>
      {reviewed ? <CheckCircle2 /> : <Clock />} {reviewed ? 'Reviewed by doctor' : 'Awaiting doctor review'}
    </span>
  );
}

/** Plain-language explanation of the model label shown to patients. */
export function resultExplanation(result) {
  if (!result) return '';
  return isRiskResult(result)
    ? 'The AI model found patterns associated with chronic kidney disease risk. Please discuss this with your doctor.'
    : 'The AI model did not find patterns associated with chronic kidney disease risk in the supplied data.';
}

/** Download helper with per-report busy/error state. */
export function useReportDownload() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const download = async (report) => {
    const code = report?.report_id || report?.id;
    if (!code) return;
    setError('');
    setBusy(String(code));
    const res = await apiService.downloadReport(report.id ?? code, report.report_id || `report-${report.id}`);
    setBusy('');
    if (!res.ok) setError(res.error || 'The report could not be downloaded. Please try again later.');
  };
  return { busy, error, download, clearError: () => setError('') };
}
