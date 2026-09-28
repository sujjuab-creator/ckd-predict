import React, { useMemo, useRef, useState } from 'react';
import {
  Upload, FileSpreadsheet, ListChecks, Zap, Download, Loader2, Search, ArrowLeft, ArrowRight, RotateCcw,
  ChevronDown, ChevronUp, ArrowUpDown, Eye, RefreshCw,
} from 'lucide-react';
import apiService from '../../../services/api';
import { PageHeader, Card, Alert, Disclaimer } from '../../ui/UI';
import { FEATURES, featureLabel } from '../../../data/featureSchema';
import { formatDate, formatPercent } from '../../../utils/format';
import StepIndicator from './StepIndicator';
import { RESULT_HEADLINE } from './PatientAnalysis';

const STEPS = ['Upload CSV/Excel', 'Validate', 'Review Validation', 'Run Analysis', 'View / Download Results'];
const ACCEPT = '.csv,.xlsx';

const STATUS = {
  valid: { cls: 'badge-blue', text: 'Ready' },
  incomplete: { cls: 'badge-gray', text: 'Incomplete Data' },
  needs_review: { cls: 'badge-amber', text: 'Needs Review' },
  invalid: { cls: 'badge-red', text: 'Failed' },
  processing: { cls: 'badge-blue', text: 'Processing' },
  failed: { cls: 'badge-red', text: 'Failed' },
};

function statusBadge(row) {
  if (row.status === 'predicted') {
    const risk = row.prediction?.prediction_result === 'CKD Risk';
    return <span className={`badge badge-dot ${risk ? 'badge-red' : 'badge-green'}`}>{row.prediction?.prediction_result}</span>;
  }
  const s = STATUS[row.status] || STATUS.failed;
  return <span className={`badge ${s.cls}`}>{row.status === 'processing' && <Loader2 className="spin" />} {s.text}</span>;
}

function statusText(row) {
  return row.status === 'predicted' ? row.prediction?.prediction_result : (STATUS[row.status]?.text || row.status);
}

function csvCell(v) {
  let s = v === null || v === undefined ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v !== 'number') s = `'${s}`;   // no spreadsheet formula injection
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const SORTERS = {
  row: (r) => r.row_number,
  patient: (r) => r.patient_ref || '',
  name: (r) => r.patient?.name || '',
  prediction: (r) => r.prediction?.prediction_result || '',
  probability: (r) => (r.prediction ? r.prediction.prediction_probability : -1),
  status: (r) => statusText(r),
  date: (r) => r.prediction?.created_at || '',
};

/**
 * Batch Analysis: upload → server validation (patient IDs, assignment, all 51 features) → review/correct →
 * run on valid rows only → results (search/filter/sort/details/download/retry).
 * Unassigned or unknown patients are reported as "Failed" without exposing any patient data.
 */
export default function BatchAnalysis({ onNavigate, reloadPredictions }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(null);         // file_name, missing_columns, ignored_columns
  const [rows, setRows] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [edits, setEdits] = useState({});
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ key: 'row', dir: 1 });
  const fileInput = useRef(null);

  const counts = useMemo(() => {
    const c = { total: rows.length, valid: 0, incomplete: 0, needs_review: 0, invalid: 0, predicted: 0, failed: 0, processing: 0, risk: 0, norisk: 0 };
    rows.forEach((r) => {
      c[r.status] = (c[r.status] || 0) + 1;
      if (r.status === 'predicted') c[r.prediction?.prediction_result === 'CKD Risk' ? 'risk' : 'norisk'] += 1;
    });
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter((r) => {
      const matchQ = !q || String(r.patient_ref).toLowerCase().includes(q) || String(r.patient?.name || '').toLowerCase().includes(q)
        || String(r.prediction?.prediction_id || '').toLowerCase().includes(q);
      const matchF = filter === 'all'
        || (filter === 'risk' ? r.prediction?.prediction_result === 'CKD Risk'
          : filter === 'norisk' ? r.status === 'predicted' && r.prediction?.prediction_result !== 'CKD Risk'
            : r.status === filter);
      return matchQ && matchF;
    });
    const key = SORTERS[sort.key];
    return [...list].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * sort.dir);
  }, [rows, query, filter, sort]);

  const reset = () => {
    setStep(1); setFile(null); setInfo(null); setRows([]); setExpanded(null); setEdits({}); setFilter('all');
    setQuery(''); setError('');
  };

  const chooseFile = (f) => {
    setError('');
    if (!f) return;
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (!ACCEPT.split(',').includes(ext)) { setError('Upload a CSV (.csv) or Excel (.xlsx) file.'); return; }
    if (f.size > 5 * 1024 * 1024) { setError('The file is larger than 5 MB.'); return; }
    setFile(f);
  };

  const downloadTemplate = () => {
    downloadText('ckd_batch_template.csv', `${['PatientID', ...FEATURES.map((f) => f.name)].join(',')}\n`);
  };

  const validate = async () => {
    setStep(2); setBusy('validate'); setError('');
    const res = await apiService.validateBatchFile(file);
    setBusy('');
    if (!(res.ok && res.data?.success)) {
      setError(res.data?.error || 'The file could not be validated.');
      setStep(1);
      return;
    }
    setInfo({ file_name: res.data.file_name, missing_columns: res.data.missing_columns || [], ignored_columns: res.data.ignored_columns || [] });
    setRows(res.data.rows);
    setFilter('all');
    setStep(3);
  };

  const replaceRows = (updated) => {
    const byRow = Object.fromEntries(updated.map((r) => [r.row_number, r]));
    setRows((rs) => rs.map((r) => byRow[r.row_number] || r));
  };

  const revalidateRow = async (row) => {
    const edit = edits[row.row_number] || {};
    const payload = {
      row_number: row.row_number,
      patient_ref: edit.patient_ref ?? row.patient_ref,
      features: { ...row.features, ...(edit.features || {}) },
    };
    setBusy(`row-${row.row_number}`); setError('');
    const res = await apiService.revalidateBatchRows([payload]);
    setBusy('');
    if (res.ok && res.data?.success) {
      replaceRows(res.data.rows);
      setEdits((e) => { const n = { ...e }; delete n[row.row_number]; return n; });
    } else {
      setError(res.data?.error || 'The row could not be validated.');
    }
  };

  const run = async (targetRows) => {
    const toRun = targetRows.filter((r) => r.status === 'valid' || r.status === 'failed');
    if (!toRun.length) return;
    const ids = new Set(toRun.map((r) => r.row_number));
    setRows((rs) => rs.map((r) => (ids.has(r.row_number) ? { ...r, status: 'processing' } : r)));
    setBusy('run'); setError(''); setStep(4);
    const res = await apiService.runBatchPrediction(info?.file_name || file?.name || 'batch upload',
      toRun.map((r) => ({ row_number: r.row_number, patient_ref: r.patient_ref, features: r.features })));
    setBusy('');
    if (res.ok && res.data?.success) {
      replaceRows(res.data.rows);
      reloadPredictions?.();
    } else {
      setRows((rs) => rs.map((r) => (ids.has(r.row_number) ? { ...r, status: 'failed', reason: res.data?.error || 'Request failed' } : r)));
      setError(res.data?.error || 'The analysis could not be completed.');
    }
    setStep(5);
  };

  const downloadResults = () => {
    const header = ['Row', 'Patient ID', 'Patient Name', 'Prediction', 'Risk Probability', 'Status', 'Details', 'Date', 'Prediction ID'];
    const lines = [header.join(',')].concat(rows.map((r) => [
      r.row_number, r.patient_ref, r.patient?.name || '', r.prediction?.prediction_result || '',
      r.prediction ? r.prediction.prediction_probability : '', statusText(r), r.reason || '',
      r.prediction?.created_at || '', r.prediction?.prediction_id || '',
    ].map(csvCell).join(',')));
    const base = (info?.file_name || 'batch').replace(/\.[^.]+$/, '');
    downloadText(`${base}_ckd_results.csv`, `${lines.join('\n')}\n`);
  };

  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : 1 }));
  const SortHead = ({ k, children }) => (
    <th><button type="button" className="th-sort" onClick={() => sortBy(k)}>{children} {sort.key === k ? (sort.dir > 0 ? <ChevronUp /> : <ChevronDown />) : <ArrowUpDown />}</button></th>
  );

  const tiles = step >= 5
    ? [['all', 'Total', counts.total], ['risk', 'CKD Risk', counts.risk], ['norisk', 'No CKD Risk', counts.norisk],
      ['needs_review', 'Needs Review', counts.needs_review], ['incomplete', 'Incomplete Data', counts.incomplete],
      ['invalid', 'Invalid patient', counts.invalid], ['failed', 'Failed', counts.failed]]
    : [['all', 'Total', counts.total], ['valid', 'Valid', counts.valid], ['incomplete', 'Incomplete Data', counts.incomplete],
      ['needs_review', 'Needs Review', counts.needs_review], ['invalid', 'Invalid', counts.invalid]];

  return (
    <div className="stack-lg">
      <PageHeader
        title="Batch Analysis"
        subtitle="Validate and analyse several assigned patients from one CSV or Excel file."
        actions={step > 1 && <button className="btn btn-ghost" onClick={reset}><RotateCcw /> New batch</button>}
      />
      <StepIndicator steps={STEPS} current={step} />
      {error && <Alert type="error" title="Something needs attention">{error}</Alert>}

      {step === 1 && (
        <Card title="Step 1 — Upload CSV/Excel" icon={Upload}>
          <div className="stack">
            <div className={`drop-zone ${drag ? 'drag' : ''}`} role="button" tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files?.[0]); }}>
              <FileSpreadsheet />
              <div className="t">{file ? file.name : 'Choose or drop a CSV / XLSX file'}</div>
              <div className="s">One row per patient · a PatientID column plus the 51 model feature columns · max 1,000 rows, 5 MB</div>
              <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
            </div>
            <Alert type="info" title="File format">
              Use the patient IDs shown in My Patients (for example PAT-0004). Column names may be the model feature names or
              their labels. Yes/No fields accept 0/1 or Yes/No. Only your assigned patients can be analysed; rows with missing
              or invalid values are listed for review and are never sent to the model.
            </Alert>
            <div className="row-between">
              <button className="btn btn-ghost" onClick={downloadTemplate}><Download /> Download empty template</button>
              <button className="btn btn-primary" disabled={!file} onClick={validate}>Validate file <ArrowRight /></button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card title="Step 2 — Validate" icon={ListChecks}>
          <div className="loading" role="status"><Loader2 className="spin" /><span>Checking patient IDs, assignments and all 51 values…</span></div>
        </Card>
      )}

      {step >= 3 && (
        <>
          {step === 5 && (
            <Alert type="warn" title={RESULT_HEADLINE}>
              Each result is an AI-assisted risk estimate for review by a qualified healthcare professional.
            </Alert>
          )}
          <Card title={step === 3 ? 'Step 3 — Review Validation Results' : step === 4 ? 'Step 4 — Run Analysis' : 'Step 5 — Results'}
            subtitle={info?.file_name} icon={step >= 5 ? Zap : ListChecks}
            actions={step >= 5 && <button className="btn btn-sm btn-primary" onClick={downloadResults}><Download /> Download results (CSV)</button>}>
            <div className="stack">
              <div className="summary-tiles">
                {tiles.map(([key, label, n]) => (
                  <button key={key} type="button" className={`summary-tile ${filter === key ? 'active' : ''}`} onClick={() => setFilter(key)}>
                    <div className="n">{n}</div><div className="l">{label}</div>
                  </button>
                ))}
              </div>
              {info?.missing_columns?.length > 0 && (
                <Alert type="warn" title={`${info.missing_columns.length} model column(s) not found in the file`}>
                  {info.missing_columns.map(featureLabel).join(', ')}. Rows cannot be analysed until these values are provided.
                </Alert>
              )}
              {info?.ignored_columns?.length > 0 && (
                <div className="small muted">Ignored columns (not model features): {info.ignored_columns.join(', ')}</div>
              )}
              {step === 3 && (
                <div className="row-between">
                  <span className="small muted">
                    {counts.valid} of {counts.total} rows are ready. Expand a row to see its issues and correct values.
                  </span>
                  <button className="btn btn-primary" disabled={!counts.valid || busy === 'run'} onClick={() => run(rows)}>
                    <Zap /> Run analysis on {counts.valid} valid row{counts.valid === 1 ? '' : 's'}
                  </button>
                </div>
              )}
              {step === 4 && <div className="loading" role="status"><Loader2 className="spin" /><span>Running the CKD risk model on valid rows…</span></div>}
              {step === 5 && (counts.valid > 0 || counts.failed > 0) && (
                <div className="row-between">
                  <span className="small muted">{counts.valid} corrected row(s) ready, {counts.failed} failed.</span>
                  <button className="btn btn-outline" disabled={busy === 'run'} onClick={() => run(rows)}><RefreshCw /> Run ready &amp; retry failed rows</button>
                </div>
              )}
            </div>
          </Card>

          <Card noBody>
            <div className="toolbar">
              <div className="search-box">
                <Search />
                <input className="input" placeholder="Search patient ID, name or prediction ID…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search rows" />
              </div>
              <span className="small muted" style={{ marginLeft: 'auto' }}>{visible.length} of {rows.length} rows</span>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <SortHead k="row">Row</SortHead>
                    <SortHead k="patient">Patient ID</SortHead>
                    <SortHead k="name">Patient Name</SortHead>
                    <SortHead k="prediction">Prediction</SortHead>
                    <SortHead k="probability">Risk Probability</SortHead>
                    <SortHead k="status">Status</SortHead>
                    <SortHead k="date">Date</SortHead>
                    <th className="right">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <React.Fragment key={r.row_number}>
                      <tr>
                        <td className="mono">{r.row_number}</td>
                        <td className="mono strong">{r.patient_ref || '—'}</td>
                        <td>{r.patient?.name || '—'}</td>
                        <td>{r.prediction?.prediction_result || '—'}</td>
                        <td>{r.prediction ? formatPercent(r.prediction.prediction_probability) : '—'}</td>
                        <td>{statusBadge(r)}<div className="xs muted">{r.status !== 'predicted' && r.reason}</div></td>
                        <td>{r.prediction ? formatDate(r.prediction.created_at, true) : '—'}</td>
                        <td className="right">
                          <div className="actions">
                            {r.prediction && <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/doctor/result/${r.prediction.id}`)}><Eye /> View</button>}
                            {r.status !== 'predicted' && r.status !== 'processing' && (
                              <button className="btn btn-sm btn-ghost" onClick={() => setExpanded(expanded === r.row_number ? null : r.row_number)}>
                                {expanded === r.row_number ? <ChevronUp /> : <ChevronDown />} {r.issues?.length ? `${r.issues.length} issue${r.issues.length > 1 ? 's' : ''}` : 'Details'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded === r.row_number && r.status !== 'predicted' && (
                        <tr className="row-detail">
                          <td colSpan={8}>
                            <RowEditor row={r} edit={edits[r.row_number] || {}} busy={busy === `row-${r.row_number}`}
                              onEdit={(e) => setEdits((all) => ({ ...all, [r.row_number]: e }))}
                              onRevalidate={() => revalidateRow(r)}
                              onRetry={() => run([r])} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {visible.length === 0 && <tr><td colSpan={8} className="muted center">No rows match this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          {step === 3 && <div className="row"><button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft /> Choose another file</button></div>}
          <Disclaimer />
        </>
      )}
    </div>
  );
}

function RowEditor({ row, edit, busy, onEdit, onRevalidate, onRetry }) {
  const featureEdits = edit.features || {};
  const setFeature = (name, value) => onEdit({ ...edit, features: { ...featureEdits, [name]: value } });
  const issueFeatures = (row.issues || []).map((i) => i.feature).filter(Boolean);

  return (
    <div className="stack" style={{ padding: '6px 4px' }}>
      <div className="small"><b>Row {row.row_number}:</b> {row.reason}</div>
      {row.status === 'invalid' && (
        <div className="field" style={{ maxWidth: 320 }}>
          <label className="label" htmlFor={`pid-${row.row_number}`}>Patient ID</label>
          <input id={`pid-${row.row_number}`} className="input" value={edit.patient_ref ?? row.patient_ref}
            onChange={(e) => onEdit({ ...edit, patient_ref: e.target.value })} />
          <span className="hint">Only patients assigned to you can be analysed.</span>
        </div>
      )}
      {issueFeatures.length > 0 && (
        <div className="form-grid">
          {row.issues.filter((i) => i.feature).map((i) => (
            <div className="field" key={i.feature}>
              <label className="label" htmlFor={`b-${row.row_number}-${i.feature}`}>{i.label}</label>
              <input id={`b-${row.row_number}-${i.feature}`} className="input invalid"
                value={featureEdits[i.feature] ?? row.features[i.feature] ?? ''}
                onChange={(e) => setFeature(i.feature, e.target.value)} placeholder="Not provided" />
              <span className="error-text">{i.status === 'missing' ? 'Incomplete Data — ' : 'Needs Review — '}{i.message}</span>
            </div>
          ))}
        </div>
      )}
      {row.warnings?.length > 0 && (
        <ul className="issue-list">
          {row.warnings.map((w) => <li key={`${w.feature}-${w.message}`}><span className="badge badge-amber">Note</span> {w.label}: {w.message}</li>)}
        </ul>
      )}
      <div className="row wrap" style={{ gap: 8 }}>
        {row.status !== 'failed' && (
          <button className="btn btn-sm btn-primary" disabled={busy} onClick={onRevalidate}>
            {busy ? <Loader2 className="spin" /> : <RefreshCw />} Re-validate row
          </button>
        )}
        {row.status === 'failed' && <button className="btn btn-sm btn-primary" onClick={onRetry}><RefreshCw /> Retry prediction</button>}
        <span className="xs muted">Values you enter must come from the patient&apos;s records; nothing is filled in automatically.</span>
      </div>
    </div>
  );
}
