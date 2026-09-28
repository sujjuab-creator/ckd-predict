import React, { useMemo, useRef, useState } from 'react';
import {
  UserRound, Upload, FileText, ClipboardCheck, Zap, ArrowLeft, ArrowRight, Loader2, Search, PencilLine,
  RotateCcw, History,
} from 'lucide-react';
import apiService from '../../../services/api';
import useApiData, { unwrap } from '../../../hooks/useApiData';
import { PageHeader, Card, Alert, Loading, ErrorState, EmptyState, Disclaimer } from '../../ui/UI';
import PredictionResult from '../../prediction/PredictionResult';
import { FEATURES, emptyFeatureForm, validateFeatures } from '../../../data/featureSchema';
import StepIndicator from './StepIndicator';
import FeatureReview, { fieldState } from './FeatureReview';

const STEPS = ['Select Patient', 'Upload Report', 'Review Extracted Data', 'Run Prediction', 'View Result / Report'];
const ACCEPT = '.pdf,.txt,.csv,.xlsx,.json';
export const RESULT_HEADLINE = 'AI-Assisted CKD Risk Prediction — Not a Medical Diagnosis';

function toFormValue(v) {
  return v === null || v === undefined ? '' : String(v);
}

/**
 * Doctor → select assigned patient → upload report → extracted values → doctor review →
 * validated prediction (existing model) → result with SHAP + PDF (existing endpoints).
 * Values missing from the report are never filled in automatically.
 */
export default function PatientAnalysis({ onNavigate, reloadPredictions, preselectPatient }) {
  const mine = useApiData(async () => unwrap(await apiService.getMyPatients(), 'Unable to load your patients.').patients || [], []);
  const patients = mine.data || [];

  const [step, setStep] = useState(1);
  const [patientId, setPatientId] = useState(preselectPatient ? String(preselectPatient) : '');
  const [search, setSearch] = useState('');
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [extraction, setExtraction] = useState(null);   // server response (fields, summary, file_name)
  const [source, setSource] = useState('single_report');
  const [values, setValues] = useState(emptyFeatureForm);
  const [meta, setMeta] = useState({});
  const [edited, setEdited] = useState(() => new Set());
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState(null);
  const fileInput = useRef(null);

  const patient = patients.find((p) => String(p.id) === String(patientId));
  const patientLabel = patient ? `${patient.patient_id}${patient.name ? ` · ${patient.name}` : ''}` : '';
  const { errors, warnings } = useMemo(() => validateFeatures(values), [values]);
  const states = useMemo(() => Object.fromEntries(FEATURES.map((f) => [f.name, fieldState(f.name, values, meta, errors, warnings, edited)])), [values, meta, errors, warnings, edited]);
  const counts = useMemo(() => {
    const c = { extracted: 0, edited: 0, warning: 0, invalid: 0, missing: 0 };
    Object.values(states).forEach((s) => { c[s] += 1; });
    return c;
  }, [states]);
  const ready = counts.invalid === 0 && counts.missing === 0;

  const filteredPatients = patients.filter((p) => {
    const q = search.trim().toLowerCase();
    return !q || String(p.patient_id).toLowerCase().includes(q) || String(p.name || '').toLowerCase().includes(q);
  });

  const resetAll = () => {
    setStep(1); setFile(null); setExtraction(null); setValues(emptyFeatureForm()); setMeta({}); setEdited(new Set());
    setConfirmed(false); setResult(null); setError(''); setSource('single_report'); setOnlyAttention(false);
  };

  const chooseFile = (f) => {
    setError('');
    if (!f) return;
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf('.'));
    if (!ACCEPT.split(',').includes(ext)) {
      setError('Unsupported file type. Upload a text-based PDF, TXT, CSV, XLSX or JSON report.');
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('The file is larger than 5 MB.');
      return;
    }
    setFile(f);
  };

  const extract = async () => {
    setBusy('extract'); setError('');
    const res = await apiService.analyzeReport(patient.id, file);
    setBusy('');
    if (!(res.ok && res.data?.success)) {
      setError(res.data?.error || 'The report could not be processed.');
      return;
    }
    const next = emptyFeatureForm();
    const m = {};
    res.data.fields.forEach((f) => {
      next[f.name] = toFormValue(f.value);
      m[f.name] = { status: f.status, message: f.message, source: f.source, extracted: f.extracted };
    });
    setValues(next); setMeta(m); setEdited(new Set()); setExtraction(res.data); setSource('single_report');
    setOnlyAttention(res.data.missing.length + res.data.needs_review.length > 0);
    setStep(3);
  };

  const enterManually = () => {
    setValues(emptyFeatureForm()); setMeta({}); setEdited(new Set()); setExtraction(null); setSource('manual');
    setFile(null); setError(''); setStep(3);
  };

  const changeValue = (name, value) => {
    setValues((v) => ({ ...v, [name]: value }));
    setEdited((s) => new Set(s).add(name));
    setConfirmed(false);
  };

  const run = async () => {
    setBusy('predict'); setError('');
    const features = Object.fromEntries(FEATURES.map((f) => [f.name, values[f.name]]));
    const res = await apiService.runAnalysisPrediction({
      patient_id: patient.id, features, source, report_reference: extraction?.file_name || null,
    });
    setBusy('');
    if (res.ok && res.data?.success) {
      setResult(res.data.prediction);
      setStep(5);
      reloadPredictions?.();
      return;
    }
    if (res.status === 422 && res.data?.fields) {
      // Server-side validation found problems: show them on the review step
      const m = { ...meta };
      res.data.fields.forEach((f) => {
        if (f.status === 'invalid' || f.status === 'missing') m[f.name] = { ...m[f.name], status: f.status, message: f.message };
      });
      setMeta(m);
      setEdited((s) => { const n = new Set(s); res.data.fields.forEach((f) => f.status === 'invalid' && n.delete(f.name)); return n; });
      setOnlyAttention(true);
      setStep(3);
    }
    setError(res.data?.error || 'The prediction could not be completed.');
  };

  if (mine.loading) return <Loading label="Loading your patients…" />;
  if (mine.error) return <ErrorState message={mine.error} onRetry={mine.reload} />;

  return (
    <div className="stack-lg">
      <PageHeader
        title="Patient Analysis"
        subtitle="Upload a patient's report, review the extracted values and run an AI-assisted CKD risk prediction."
        actions={step > 1 && step < 5 && <button className="btn btn-ghost" onClick={resetAll}><RotateCcw /> Start over</button>}
      />
      <StepIndicator steps={STEPS} current={step} />
      {error && <Alert type="error" title="Something needs attention">{error}</Alert>}

      {step === 1 && (
        patients.length === 0 ? (
          <Card><EmptyState icon={UserRound} title="No assigned patients" message="Patients assigned to you by the hospital administrator will appear here." /></Card>
        ) : (
          <Card title="Step 1 — Select Patient" subtitle="Only patients assigned to you are listed." icon={UserRound}>
            <div className="stack">
              <div className="search-box" style={{ maxWidth: 'none' }}>
                <Search />
                <input className="input" placeholder="Search by patient ID or name…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search patients" />
              </div>
              <div className="field">
                <label className="label" htmlFor="pa-patient">Patient <span className="req">*</span></label>
                <select id="pa-patient" className="select" value={patientId} onChange={(e) => setPatientId(e.target.value)} size={Math.min(8, Math.max(3, filteredPatients.length + 1))}>
                  <option value="">Select a patient…</option>
                  {filteredPatients.map((p) => <option key={p.id} value={p.id}>{p.patient_id}{p.name ? ` · ${p.name}` : ''}</option>)}
                </select>
              </div>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn btn-primary" disabled={!patient} onClick={() => setStep(2)}>Continue <ArrowRight /></button>
              </div>
            </div>
          </Card>
        )
      )}

      {step === 2 && (
        <Card title="Step 2 — Upload Report" subtitle={`Patient: ${patientLabel}`} icon={Upload}>
          <div className="stack">
            <div
              className={`drop-zone ${drag ? 'drag' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => fileInput.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && fileInput.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); chooseFile(e.dataTransfer.files?.[0]); }}
            >
              <Upload />
              <div className="t">{file ? file.name : 'Choose or drop a report file'}</div>
              <div className="s">Text-based PDF, TXT, CSV, XLSX or JSON · max 5 MB</div>
              <input ref={fileInput} type="file" accept={ACCEPT} hidden onChange={(e) => chooseFile(e.target.files?.[0])} />
            </div>
            <Alert type="info" title="What can be read">
              Lab values are read from reports that contain text (for example a lab system&apos;s PDF export, or a CSV/XLSX with
              test names and values). Scanned images and photos cannot be read. Anything not found is left empty for you to
              complete — values are never guessed.
            </Alert>
            <div className="row-between">
              <button className="btn btn-ghost" onClick={() => setStep(1)}><ArrowLeft /> Back</button>
              <div className="row wrap" style={{ gap: 8 }}>
                <button className="btn btn-outline" onClick={enterManually}><PencilLine /> Enter values manually</button>
                <button className="btn btn-primary" disabled={!file || busy === 'extract'} onClick={extract}>
                  {busy === 'extract' ? <Loader2 className="spin" /> : <FileText />} Extract values
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {step === 3 && (
        <>
          <Card title="Step 3 — Review Extracted Data" icon={ClipboardCheck}
            subtitle={`${patientLabel} · ${extraction ? `from ${extraction.file_name}` : 'manual entry'}`}>
            <div className="stack">
              <div className="summary-tiles">
                <div className="summary-tile"><div className="n">{counts.extracted}</div><div className="l">Extracted from report</div></div>
                <div className="summary-tile"><div className="n">{counts.edited}</div><div className="l">Entered by you</div></div>
                <div className="summary-tile"><div className="n">{counts.invalid}</div><div className="l">Needs Review</div></div>
                <div className="summary-tile"><div className="n">{counts.missing}</div><div className="l">Incomplete Data</div></div>
                <div className="summary-tile"><div className="n">{counts.warning}</div><div className="l">Outside training range</div></div>
              </div>
              {extraction?.notice && <Alert type="warn">{extraction.notice}</Alert>}
              {!ready && (
                <Alert type="info">
                  The model needs all 51 values. Complete or correct the highlighted fields using the patient&apos;s record.
                  If a value is not available, the prediction cannot be run — it will not be estimated.
                </Alert>
              )}
              <label className="review-check">
                <input type="checkbox" checked={onlyAttention} onChange={(e) => setOnlyAttention(e.target.checked)} />
                <span>Show only fields that need attention</span>
              </label>
            </div>
          </Card>
          <FeatureReview values={values} meta={meta} errors={errors} warnings={warnings} edited={edited}
            onChange={changeValue} showOnlyAttention={onlyAttention} />
          {onlyAttention && ready && <Alert type="success">All fields are complete. Untick the filter to review every value.</Alert>}
          <div className="sticky-actions">
            <div className="small muted" style={{ flex: 1, minWidth: 200 }}>
              {ready ? 'All 51 values are present and valid.' : `${counts.missing + counts.invalid} field(s) still need attention.`}
            </div>
            <div className="row wrap">
              <button className="btn btn-ghost" onClick={() => setStep(2)}><ArrowLeft /> Back</button>
              <button className="btn btn-primary" disabled={!ready} onClick={() => { setConfirmed(false); setStep(4); }}>Continue <ArrowRight /></button>
            </div>
          </div>
        </>
      )}

      {step === 4 && (
        <Card title="Step 4 — Run Prediction" icon={Zap} subtitle="Confirm the reviewed values and run the existing CKD risk model.">
          <div className="stack">
            <dl className="kv">
              <dt>Patient</dt><dd>{patientLabel}</dd>
              <dt>Source</dt><dd>{source === 'manual' ? 'Manual entry' : `Report: ${extraction?.file_name}`}</dd>
              <dt>Values</dt><dd>{FEATURES.length} of {FEATURES.length} complete ({counts.extracted} extracted, {counts.edited} entered or corrected by you)</dd>
            </dl>
            {counts.warning > 0 && (
              <Alert type="warn" title={`${counts.warning} value(s) outside the training-data range`}>
                {FEATURES.filter((f) => warnings[f.name]).map((f) => f.label).join(', ')}. The model may be less reliable for these values.
              </Alert>
            )}
            <label className="review-check">
              <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
              <span>I have reviewed every value against the patient&apos;s report. I understand this is an AI-assisted risk estimate, not a diagnosis.</span>
            </label>
            <div className="row-between">
              <button className="btn btn-ghost" onClick={() => setStep(3)}><ArrowLeft /> Back to review</button>
              <button className="btn btn-primary" disabled={!confirmed || busy === 'predict'} onClick={run}>
                {busy === 'predict' ? <Loader2 className="spin" /> : <Zap />} {busy === 'predict' ? 'Running…' : 'Run AI-assisted prediction'}
              </button>
            </div>
            <Disclaimer />
          </div>
        </Card>
      )}

      {step === 5 && result && (
        <>
          <Alert type="warn" title={RESULT_HEADLINE}>
            <span>
              {result.source_label}{result.report_reference ? ` · ${result.report_reference}` : ''} · recorded by {result.doctor_name || 'you'}.
              The PDF report below includes the inputs, SHAP explanation and disclaimer.
            </span>
          </Alert>
          <PredictionResult prediction={result} patientLabel={patientLabel} existingReportId={result.report?.report_id || null} />
          <div className="row wrap" style={{ gap: 8 }}>
            <button className="btn btn-primary" onClick={resetAll}><RotateCcw /> Analyse another report</button>
            <button className="btn btn-ghost" onClick={() => onNavigate('/doctor/history')}><History /> Prediction history</button>
          </div>
        </>
      )}
    </div>
  );
}
