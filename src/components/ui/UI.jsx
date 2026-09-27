import React, { useEffect, useRef } from 'react';
import {
  Loader2, Inbox, AlertCircle, CheckCircle2, Info, TriangleAlert, X, ShieldAlert,
} from 'lucide-react';
import { isRiskResult } from '../../utils/format';

export const MEDICAL_DISCLAIMER =
  'This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.';

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Card({ title, subtitle, icon: Icon, actions, children, className = '', bodyClass = 'card-body', noBody = false }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-header">
          <div>
            <div className="card-title">
              {Icon && <span className="ic"><Icon /></span>}
              <span>{title}</span>
            </div>
            {subtitle && <div className="card-sub">{subtitle}</div>}
          </div>
          {actions && <div className="row wrap">{actions}</div>}
        </div>
      )}
      {noBody ? children : <div className={bodyClass}>{children}</div>}
    </section>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'green', featured = false, loading = false }) {
  return (
    <div className={`card stat ${featured ? 'stat-featured' : ''}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && <span className={`stat-icon tone-${tone}`}><Icon /></span>}
      </div>
      {loading ? (
        <div className="skeleton" style={{ height: 30, width: '50%' }} />
      ) : (
        <div className="stat-value">{value ?? '—'}</div>
      )}
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function Loading({ label = 'Loading data…' }) {
  return (
    <div className="loading" role="status">
      <Loader2 className="spin" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, message, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon /></div>
      <h4>{title}</h4>
      {message && <p>{message}</p>}
      {action}
    </div>
  );
}

const ALERT_ICONS = { info: Info, success: CheckCircle2, warn: TriangleAlert, error: AlertCircle };

export function Alert({ type = 'info', title, children, className = '' }) {
  const Icon = ALERT_ICONS[type] || Info;
  return (
    <div className={`alert alert-${type} ${className}`} role={type === 'error' ? 'alert' : undefined}>
      <Icon />
      <div>
        {title && <div className="alert-title">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding: 20 }}>
      <Alert type="error" title="Could not load data from the server">
        {message}
        {onRetry && (
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-sm btn-ghost" onClick={onRetry}>Try again</button>
          </div>
        )}
      </Alert>
    </div>
  );
}

export function Disclaimer({ text = MEDICAL_DISCLAIMER, className = '' }) {
  return (
    <div className={`disclaimer ${className}`}>
      <ShieldAlert />
      <p><strong>Medical disclaimer: </strong>{text}</p>
    </div>
  );
}

export function RiskBadge({ result }) {
  if (!result) return <span className="badge badge-gray">—</span>;
  const risk = isRiskResult(result);
  return (
    <span className={`badge badge-dot ${risk ? 'badge-red' : 'badge-green'}`}>
      {result}
    </span>
  );
}

export function StatusBadge({ status }) {
  const active = String(status || '').toLowerCase() === 'active';
  return <span className={`badge badge-dot ${active ? 'badge-green' : 'badge-gray'}`}>{status || 'Unknown'}</span>;
}

export function RoleBadge({ role }) {
  const map = { admin: 'badge-navy', doctor: 'badge-blue', patient: 'badge-green' };
  return <span className={`badge ${map[role] || 'badge-gray'}`}>{role ? role.charAt(0).toUpperCase() + role.slice(1) : '—'}</span>;
}

export function Modal({ title, onClose, children, footer, width = 520 }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ message, onDone }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    if (!message) return undefined;
    const t = setTimeout(() => doneRef.current?.(), 4000);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  return (
    <div className="toast" role="status">
      <CheckCircle2 />
      <span>{message}</span>
    </div>
  );
}

export function Field({ label, required, unit, hint, error, children, htmlFor }) {
  return (
    <div className="field">
      {label && (
        <label className="label" htmlFor={htmlFor}>
          <span>{label} {required && <span className="req">*</span>}</span>
          {unit && <span className="unit">{unit}</span>}
        </label>
      )}
      {children}
      {error ? <span className="error-text">{error}</span> : hint ? <span className="hint">{hint}</span> : null}
    </div>
  );
}
