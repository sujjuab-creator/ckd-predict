import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FEATURES, FEATURE_SECTIONS } from '../../../data/featureSchema';

/**
 * Doctor review of all 51 model inputs before a prediction.
 * `meta[name]` = { status: ok|warning|invalid|missing, message, source, extracted } from the server.
 * `errors` / `warnings` come from client-side validation of the current values.
 * Nothing is pre-filled except values actually read from the uploaded report.
 */
export const STATUS_BADGES = {
  extracted: { cls: 'badge-green', text: 'Extracted' },
  edited: { cls: 'badge-blue', text: 'Entered by doctor' },
  warning: { cls: 'badge-amber', text: 'Outside training range' },
  invalid: { cls: 'badge-red', text: 'Needs Review' },
  missing: { cls: 'badge-gray', text: 'Incomplete Data' },
};

export function fieldState(name, values, meta, errors, warnings, edited) {
  const value = values[name];
  if (meta[name]?.status === 'invalid' && !edited.has(name)) return 'invalid';
  if (errors[name]) return value === '' || value === undefined ? 'missing' : 'invalid';
  if (warnings[name]) return 'warning';
  if (edited.has(name)) return 'edited';
  if (meta[name]?.extracted) return 'extracted';
  return value === '' ? 'missing' : 'edited';
}

export default function FeatureReview({ values, meta, errors, warnings, edited, onChange, showOnlyAttention }) {
  const [open, setOpen] = useState(() => new Set(FEATURE_SECTIONS.map((s) => s.id)));
  const toggle = (id) => setOpen((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  return (
    <div>
      {FEATURE_SECTIONS.map((sec) => {
        const fields = FEATURES.filter((f) => f.section === sec.id).map((f) => ({
          f, state: fieldState(f.name, values, meta, errors, warnings, edited),
        }));
        const visible = showOnlyAttention ? fields.filter((x) => ['missing', 'invalid', 'warning'].includes(x.state)) : fields;
        if (visible.length === 0) return null;
        const attention = fields.filter((x) => x.state === 'missing' || x.state === 'invalid').length;
        const isOpen = open.has(sec.id);
        return (
          <div className={`form-section ${isOpen ? 'open' : ''}`} key={sec.id}>
            <button type="button" className="form-section-head" onClick={() => toggle(sec.id)} aria-expanded={isOpen}>
              <div>
                <h3>{sec.title}</h3>
                <div className="meta">{fields.length - attention}/{fields.length} ready</div>
              </div>
              {attention > 0
                ? <span className="badge badge-amber" style={{ marginLeft: 'auto' }}>{attention} need attention</span>
                : <span className="badge badge-green" style={{ marginLeft: 'auto' }}>Ready</span>}
              <ChevronDown className="chev" style={{ marginLeft: 8 }} />
            </button>
            {isOpen && (
              <div className="form-section-body">
                <div className="form-grid">
                  {visible.map(({ f, state }) => {
                    const badge = STATUS_BADGES[state];
                    const m = meta[f.name] || {};
                    const message = state === 'missing'
                      ? 'Not provided — enter it from the patient record (it will not be estimated)'
                      : (state === 'invalid' && !edited.has(f.name) ? m.message : errors[f.name]) || warnings[f.name] || '';
                    return (
                      <div className="field" key={f.name}>
                        <label className="label" htmlFor={`rv-${f.name}`}>
                          <span>{f.label} <span className="req">*</span></span>
                          {f.unit && <span className="unit">{f.unit}</span>}
                        </label>
                        {f.type === 'select' ? (
                          <select id={`rv-${f.name}`} className={`select ${state === 'invalid' || errors[f.name] ? 'invalid' : ''}`}
                            value={values[f.name]} onChange={(e) => onChange(f.name, e.target.value)}>
                            <option value="">Select…</option>
                            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        ) : (
                          <input id={`rv-${f.name}`} className={`input ${state === 'invalid' || errors[f.name] ? 'invalid' : ''}`}
                            type="number" inputMode="decimal" step={f.step || 'any'} value={values[f.name]}
                            onChange={(e) => onChange(f.name, e.target.value)} placeholder="Not provided" />
                        )}
                        <div className="field-status">
                          <span className={`badge ${badge.cls}`}>{badge.text}</span>
                          {message && <span className={state === 'invalid' ? 'error-text' : 'hint'}>{message}</span>}
                        </div>
                        {m.source && m.extracted && <span className="field-source" title="Text found in the report">“{m.source}”</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
