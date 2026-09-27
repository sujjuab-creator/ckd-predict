// Small formatting helpers shared across dashboards.
// These only format data returned by the backend; they never invent values.

export function formatDate(value, withTime = false) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const opts = withTime
    ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' };
  return d.toLocaleString(undefined, opts);
}

export function formatPercent(prob, digits = 1) {
  if (prob === null || prob === undefined || Number.isNaN(Number(prob))) return '—';
  return `${(Number(prob) * 100).toFixed(digits)}%`;
}

export function formatPredId(id) {
  if (id === null || id === undefined || id === '') return '—';
  const s = String(id);
  if (s.toUpperCase().startsWith('PRED-')) return s.toUpperCase();
  return /^\d+$/.test(s) ? `PRED-${s.padStart(4, '0')}` : s;
}

/** Extract the numeric database id from "PRED-0012" or 12. */
export function rawPredId(id) {
  if (id === null || id === undefined) return null;
  const s = String(id).toUpperCase().replace('PRED-', '');
  return /^\d+$/.test(s) ? Number(s) : null;
}

/** Backend labels are "CKD Risk" or "No CKD Risk". */
export function isRiskResult(result) {
  if (!result) return false;
  const r = String(result).toLowerCase();
  return r.includes('ckd risk') && !r.includes('no ckd');
}

export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export function sortByDateDesc(list, key = 'created_at') {
  return [...(list || [])].sort((a, b) => new Date(b?.[key] || 0) - new Date(a?.[key] || 0));
}

export function capitalize(s = '') {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/** Normalises a prediction from POST /predictions or GET list endpoints. */
export function normalizePrediction(p) {
  if (!p) return null;
  return {
    id: rawPredId(p.id ?? p.prediction_id),
    code: formatPredId(p.prediction_id ?? p.id),
    label: p.prediction_result ?? p.prediction ?? '',
    probability: p.prediction_probability ?? p.probability ?? null,
    model: p.model_name ?? p.model ?? '',
    createdAt: p.created_at ?? null,
    inputFeatures: p.input_features ?? null,
    patientId: p.patient_id ?? null,
    disclaimer: p.disclaimer ?? null,
  };
}

/** Counts items per calendar day (local), oldest → newest, last `days` days that have data. */
export function countByDay(list, key = 'created_at', days = 14) {
  const map = new Map();
  (list || []).forEach((item) => {
    const d = new Date(item?.[key]);
    if (Number.isNaN(d.getTime())) return;
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    map.set(k, (map.get(k) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-days).map(([label, value]) => ({ label, value }));
}

/** Splits predictions into risk / no-risk counts using the backend label. */
export function riskSplit(list) {
  let risk = 0; let noRisk = 0;
  (list || []).forEach((p) => { if (isRiskResult(p.prediction_result ?? p.prediction)) risk += 1; else noRisk += 1; });
  return { risk, noRisk };
}

/** Histogram of prediction probabilities in 10 bins. */
export function probabilityBins(list) {
  const bins = Array.from({ length: 10 }, (_, i) => ({ label: `${i * 10}–${i * 10 + 10}%`, value: 0 }));
  (list || []).forEach((p) => {
    const v = Number(p.prediction_probability ?? p.probability);
    if (Number.isNaN(v)) return;
    const idx = Math.min(9, Math.max(0, Math.floor(v * 10)));
    bins[idx].value += 1;
  });
  return bins;
}
