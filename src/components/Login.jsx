import React, { useState } from 'react';
import {
  UserRound, Stethoscope, ShieldCheck, Lock, Mail, ArrowLeft, Eye, EyeOff, Loader2, Sparkles, Brain, FileText,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ForgotPasswordModal from './ForgotPasswordModal';
import KidneyIllustration from './brand/KidneyIllustration';
import { Alert } from './ui/UI';

const ROLES = [
  { id: 'patient', label: 'Patient', icon: UserRound },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
  { id: 'admin', label: 'Admin', icon: ShieldCheck },
];

const COPY = {
  patient: { title: 'Patient Sign In', sub: 'Access your CKD risk predictions, history and reports.', email: 'Gmail', password: 'Password', button: 'Sign In' },
  doctor: { title: 'Doctor Sign In', sub: 'Review patient predictions, explanations and reports.', email: 'Gmail', password: 'Password', button: 'Sign In' },
  admin: { title: 'Administrator Sign In', sub: 'Restricted access for the system administrator.', email: 'Admin Gmail', password: 'Admin Password', button: 'Admin Sign In' },
};

export function AuthAside({ title, text }) {
  return (
    <aside className="auth-aside">
      <div style={{ position: 'relative', zIndex: 1 }}>
        <span className="badge" style={{ background: 'rgba(16,185,129,.15)', color: '#6ee7b7', borderColor: 'rgba(16,185,129,.3)' }}>
          <Sparkles /> AI-assisted CKD risk prediction
        </span>
        <h2>{title}</h2>
        <p>{text}</p>
        <ul className="auth-points">
          <li><span className="ic"><Brain /></span>Machine-learning risk prediction</li>
          <li><span className="ic"><Sparkles /></span>Explainable SHAP factor analysis</li>
          <li><span className="ic"><FileText /></span>Downloadable PDF medical reports</li>
          <li><span className="ic"><ShieldCheck /></span>Role-based secure access</li>
        </ul>
      </div>
      <div className="kidney-wrap"><KidneyIllustration showOrbit={false} showLeaves={false} /></div>
    </aside>
  );
}

export default function Login({ onNavigate, initialRole = 'patient' }) {
  const { login } = useAuth();

  const [role, setRole] = useState(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const copy = COPY[role];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await login(email, password, role);
      if (res.success) {
        onNavigate(res.redirectPath);
      } else {
        setError(res.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthAside
        title="Welcome back"
        text="Sign in to access the CKD risk prediction system and your role-based dashboard."
      />

      <div className="auth-main">
        <div className="auth-card">
          <button className="back-link" onClick={() => onNavigate('/')}>
            <ArrowLeft /> Back to Home
          </button>

          <h1>{copy.title}</h1>
          <p className="sub">{copy.sub}</p>

          <div className="segmented" role="tablist" aria-label="Account type" style={{ marginBottom: 22 }}>
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="tab"
                aria-selected={role === r.id}
                className={role === r.id ? 'active' : ''}
                onClick={() => handleRoleChange(r.id)}
              >
                <r.icon /> {r.label}
              </button>
            ))}
          </div>

          {error && <Alert type="error" className="mt-8">{error}</Alert>}

          <form onSubmit={handleSubmit} className="stack" style={{ marginTop: error ? 16 : 0 }} noValidate>
            <div className="field">
              <label className="label" htmlFor="login-email">{copy.email}</label>
              <div className="input-icon">
                <Mail />
                <input
                  id="login-email"
                  className="input"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com"
                />
              </div>
            </div>

            <div className="field">
              <label className="label" htmlFor="login-password">{copy.password}</label>
              <div className="input-icon">
                <Lock />
                <input
                  id="login-password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" className="toggle" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff /> : <Eye />}
                </button>
              </div>
            </div>

            {role === 'patient' && (
              <div className="auth-links">
                <span />
                <button type="button" className="link" onClick={() => setIsForgotModalOpen(true)}>Forgot Password?</button>
              </div>
            )}

            <button type="submit" className={`btn btn-lg btn-block ${role === 'admin' ? 'btn-navy' : 'btn-primary'}`} disabled={submitting}>
              {submitting ? <Loader2 className="spin" /> : <Lock />}
              {submitting ? 'Signing in…' : copy.button}
            </button>
          </form>

          <div className="auth-foot">
            {role === 'patient' && (
              <>New Patient? <button className="link" onClick={() => onNavigate('/signup/patient')}>Sign Up</button></>
            )}
            {role === 'doctor' && (
              <span>Doctor accounts are created by the hospital administrator. Contact the administrator if you need access.</span>
            )}
            {role === 'admin' && (
              <span>Administrator credentials are configured securely on the server. There is no public admin registration.</span>
            )}
          </div>
        </div>
      </div>

      <ForgotPasswordModal isOpen={isForgotModalOpen} onClose={() => setIsForgotModalOpen(false)} />
    </div>
  );
}
