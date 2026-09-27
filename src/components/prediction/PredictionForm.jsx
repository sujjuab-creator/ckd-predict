import React, { useMemo, useState } from 'react';
import {
  UserRound, Dumbbell, History, HeartPulse, FlaskConical, Droplets, Activity, Pill, Thermometer, Leaf,
  ChevronDown, RotateCcw, Zap, Loader2,
} from 'lucide-react';
import apiService from '../../services/api';
import {
  FEATURES, FEATURE_SECTIONS, emptyFeatureForm, validateFeatures, buildPredictionPayload,
} from '../../data/featureSchema';
import { Alert, Disclaimer } from '../ui/UI';

const SECTION_ICONS = {
  demographics: UserRound,
  lifestyle: Dumbbell,
  history: History,
  clinical: HeartPulse,
  kidney: FlaskConical,
  blood: Droplets,
  lipids: Activity,
  medications: Pill,
  symptoms: Thermometer,
  environment: Leaf,
};

/**
 * CKD prediction form wired to POST /api/predictions (existing ML endpoint).
 * Sends all 51 model features by their exact backend names plus patient_id.
 */
export default function PredictionForm({ patientDbId, onPredicted, header = null, disabledReason = '' }) {
  const [form, setForm] = useState(emptyFeatureForm);
  const [openSections, setOpenSections] = useState(() => new Set([FEATURE_SECTIONS[0].id]));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const { warnings } = useMemo(() => validateFeatures(form), [form]);
  const filled = FEATURES.filter((f) => form[f.name] !== '').length;
  const pct = Math.round((filled / FEATURES.length) * 100);

  const setValue = (name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    if (errors[name]) setErrors((e) => { const n = { ...e }; delete n[name]; return n; });
  };

  const toggle = (id) => setOpenSections((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const allOpen = openSections.size === FEATURE_SECTIONS.length;

  const handleClear = () => {
    setForm(emptyFeatureForm());
    setErrors({});
    setServerError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    if (disabledReason) return;
    const { errors: errs } = validateFeatures(form);
    setErrors(errs);
    if (Object.keys(errs).length) {
      const sectionsWithErrors = new Set(FEATURES.filter((f) => errs[f.name]).map((f) => f.section));
      setOpenSections((s) => new Set([...s, ...sectionsWithErrors]));
      setTimeout(() => {
        const first = FEATURES.find((f) => errs[f.name]);
        document.getElementById(`f-${first?.name}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return;
    }

    setSubmitting(true);
    const res = await apiService.createPrediction(buildPredictionPayload(form, patientDbId));
    setSubmitting(false);
    if (res.ok && res.data?.success) {
      onPredicted?.(res.data, form);
    } else {
      setServerError(res.data?.error || 'The prediction could not be completed. Please try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      {header}

      {disabledReason && <Alert type="warn" className="mt-8">{disabledReason}</Alert>}
      {serverError && <Alert type="error" title="Prediction failed" className="mt-8">{serverError}</Alert>}
      {errorCount > 0 && (
        <Alert type="error" className="mt-8">
          {errorCount} field{errorCount > 1 ? 's need' : ' needs'} attention. All values are required by the model.
        </Alert>
      )}

      <div className="card card-pad" style={{ margin: '16px 0' }}>
        <div className="row-between">
          <div>
            <div className="strong">Health information</div>
            <div className="small muted">{filled} of {FEATURES.length} values entered · every value is used by the model</div>
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setOpenSections(allOpen ? new Set() : new Set(FEATURE_SECTIONS.map((s) => s.id)))}>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
        <div className="progress mt-16"><div style={{ width: `${pct}%` }} /></div>
      </div>

      {FEATURE_SECTIONS.map((sec) => {
        const fields = FEATURES.filter((f) => f.section === sec.id);
        const done = fields.filter((f) => form[f.name] !== '').length;
        const secErrors = fields.filter((f) => errors[f.name]).length;
        const open = openSections.has(sec.id);
        const Icon = SECTION_ICONS[sec.id] || Activity;
        return (
          <div className={`form-section ${open ? 'open' : ''}`} key={sec.id}>
            <button type="button" className="form-section-head" onClick={() => toggle(sec.id)} aria-expanded={open}>
              <span className="ic"><Icon /></span>
              <div>
                <h3>{sec.title}</h3>
                <div className="meta">{sec.description} · {done}/{fields.length} completed</div>
              </div>
              {secErrors > 0 && <span className="badge badge-red" style={{ marginLeft: 'auto' }}>{secErrors} missing</span>}
              {secErrors === 0 && done === fields.length && <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Complete</span>}
              <ChevronDown className="chev" style={{ marginLeft: secErrors > 0 || done === fields.length ? 8 : 'auto' }} />
            </button>
            {open && (
              <div className="form-section-body">
                <div className="form-grid">
                  {fields.map((f) => (
                    <div className="field" key={f.name}>
                      <label className="label" htmlFor={`f-${f.name}`}>
                        <span>{f.label} <span className="req">*</span></span>
                        {f.unit && <span className="unit">{f.unit}</span>}
                      </label>
                      {f.type === 'select' ? (
                        <select
                          id={`f-${f.name}`}
                          className={`select ${errors[f.name] ? 'invalid' : ''}`}
                          value={form[f.name]}
                          onChange={(e) => setValue(f.name, e.target.value)}
                        >
                          <option value="">Select…</option>
                          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      ) : (
                        <input
                          id={`f-${f.name}`}
                          className={`input ${errors[f.name] ? 'invalid' : ''}`}
                          type="number"
                          inputMode="decimal"
                          step={f.step || 'any'}
                          min={f.limit[0]}
                          max={f.limit[1]}
                          value={form[f.name]}
                          onChange={(e) => setValue(f.name, e.target.value)}
                          placeholder={`${f.range[0]} – ${f.range[1]}`}
                        />
                      )}
                      {errors[f.name] ? (
                        <span className="error-text">{errors[f.name]}</span>
                      ) : warnings[f.name] ? (
                        <span className="hint" style={{ color: '#b45309' }}>{warnings[f.name]}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="sticky-actions">
        <div className="small muted" style={{ flex: 1, minWidth: 200 }}>
          {filled === FEATURES.length ? 'All values entered — ready to run the prediction.' : `${FEATURES.length - filled} value(s) remaining.`}
        </div>
        <div className="row wrap">
          <button type="button" className="btn btn-ghost" onClick={handleClear} disabled={submitting}>
            <RotateCcw /> <span>Clear<span className="hide-sm"> form</span></span>
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting || Boolean(disabledReason)}>
            {submitting ? <Loader2 className="spin" /> : <Zap />}
            {submitting ? 'Running…' : <span>Run<span className="hide-sm"> CKD Risk</span> Prediction</span>}
          </button>
        </div>
      </div>

      <Disclaimer className="mt-24" />
    </form>
  );
}
