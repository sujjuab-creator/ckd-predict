import React, { useEffect, useState } from 'react';
import {
  Mail, Lock, User, ArrowLeft, Loader2, Send, ShieldCheck, Check, Stethoscope, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api';
import { AuthAside } from './Login';
import { Alert } from './ui/UI';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Stepper({ step }) {
  const steps = ['Gmail', 'Verify OTP', 'Account details'];
  return (
    <div className="stepper" aria-label={`Step ${step} of 3`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < step ? 'done' : n === step ? 'active' : '';
        return (
          <React.Fragment key={label}>
            <div className={`s ${state}`}>
              <span className="dot">{n < step ? <Check /> : n}</span>
              <span className="t">{label}</span>
            </div>
            {n < 3 && <div className={`line ${n < step ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/** Explains honestly when the server does not provide the OTP endpoints. */
function BackendMissing({ status, message, code }) {
  const missing = status === 404 || status === 405 || code === 'email_not_configured';
  if (status === 0) {
    return <Alert type="error" title="Server unreachable">{message}</Alert>;
  }
  return (
    <Alert type="warn" title={missing ? 'Email verification is not available' : 'Could not continue'}>
      {missing ? (
        <>
          Email verification is not configured on the server, so self sign-up can't be completed right now.
          Please contact the hospital administrator, who can create your account.
        </>
      ) : (
        message
      )}
    </Alert>
  );
}

/**
 * Public self sign-up is for PATIENTS only. Doctor accounts are created by the
 * hospital Administrator (Admin Dashboard) and doctors use the Doctor Sign In page.
 */
export default function Signup({ onNavigate }) {
  const { signup } = useAuth();
  const role = 'patient';

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationToken, setVerificationToken] = useState('');
  const [form, setForm] = useState({ name: '', treatingDoctor: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null); // { status, message }
  const [errors, setErrors] = useState({});
  const [info, setInfo] = useState('');
  const [doctors, setDoctors] = useState({ loading: false, list: [], error: '' });

  // Treating doctor list for patient registration (requires a public doctors endpoint)
  useEffect(() => {
    if (step !== 3) return;
    let alive = true;
    setDoctors({ loading: true, list: [], error: '' });
    apiService.getRegistrationDoctors().then((res) => {
      if (!alive) return;
      const list = res.ok ? (res.data?.doctors || res.data?.users || []) : [];
      setDoctors({ loading: false, list, error: res.ok ? (list.length ? '' : 'No active doctors are registered yet. Please contact the hospital.') : (res.data?.error || 'Could not load the doctor list.') });
    });
    return () => { alive = false; };
  }, [step]);

  const sendOtp = async (e) => {
    e?.preventDefault();
    setProblem(null);
    setInfo('');
    if (!EMAIL_RE.test(email.trim())) {
      setErrors({ email: 'Enter a valid Gmail address.' });
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await apiService.sendEmailOtp(email.trim().toLowerCase());
    setBusy(false);
    if (res.ok && res.data?.success) {
      setInfo(res.data.message || `A verification code was sent to ${email.trim()}.`);
      setStep(2);
    } else {
      setProblem({ status: res.status, message: res.data?.error, code: res.data?.code });
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setProblem(null);
    if (!/^\d{6}$/.test(otp.trim())) {
      setErrors({ otp: 'Enter the 6-digit code from your email.' });
      return;
    }
    setErrors({});
    setBusy(true);
    const res = await apiService.verifyEmailOtp(email.trim().toLowerCase(), otp.trim());
    setBusy(false);
    if (res.ok && res.data?.success) {
      setVerificationToken(res.data.verification_token || '');
      setInfo('Gmail verified. Complete your account details.');
      setStep(3);
    } else {
      setProblem({ status: res.status, message: res.data?.error || 'The code could not be verified.' });
    }
  };

  const createAccount = async (e) => {
    e.preventDefault();
    setProblem(null);
    const errs = {};
    if (!form.name.trim()) errs.name = 'Patient name is required.';
    if (!form.treatingDoctor) errs.treatingDoctor = 'Select your treating doctor.';
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      errs.password = 'Use at least 8 characters with a letter and a number.';
    }
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setBusy(true);
    const payload = {
      role,
      name: form.name.trim(),
      email: email.trim().toLowerCase(),
      password: form.password,
      verification_token: verificationToken,
      treating_doctor_id: form.treatingDoctor,
    };
    const res = await signup(payload);
    setBusy(false);
    if (res.success) {
      setInfo('Account created successfully. Redirecting to sign in…');
      setTimeout(() => onNavigate(`/login/${role}`), 1500);
    } else {
      setProblem({ status: res.status, message: res.error });
      if (res.status === 403) {
        // Verification expired or already used: restart from step 1
        setStep(1);
        setOtp('');
        setVerificationToken('');
      }
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="auth-page">
      <AuthAside
        title="Create your patient account"
        text="View your CKD risk reports, your doctor's reviews and kidney-health information in one place."
      />

      <div className="auth-main">
        <div className="auth-card">
          <button className="back-link" onClick={() => onNavigate(`/login/${role}`)}>
            <ArrowLeft /> Back to Sign In
          </button>
          <h1>Patient Sign Up</h1>
          <p className="sub">Verify your Gmail address, then complete your account details.</p>

          <Stepper step={step} />

          {info && !problem && <Alert type="success" className="mt-8">{info}</Alert>}
          {problem && <BackendMissing status={problem.status} message={problem.message} code={problem.code} />}

          {step === 1 && (
            <form onSubmit={sendOtp} className="stack mt-16" noValidate>
              <div className="field">
                <label className="label" htmlFor="su-email">Gmail Address</label>
                <div className="input-icon">
                  <Mail />
                  <input id="su-email" className={`input ${errors.email ? 'invalid' : ''}`} type="email" value={email}
                    onChange={(e) => setEmail(e.target.value)} placeholder="name@gmail.com" autoComplete="email" />
                </div>
                {errors.email ? <span className="error-text">{errors.email}</span> : <span className="hint">We'll send a one-time code to verify this address.</span>}
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Loader2 className="spin" /> : <Send />} Send OTP
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={verifyOtp} className="stack mt-16" noValidate>
              <div className="field">
                <label className="label" htmlFor="su-otp">Enter Gmail OTP</label>
                <div className="input-icon">
                  <KeyRound />
                  <input id="su-otp" className={`input ${errors.otp ? 'invalid' : ''}`} inputMode="numeric" value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code"
                    style={{ letterSpacing: '.3em', fontWeight: 600 }} autoComplete="one-time-code" />
                </div>
                {errors.otp ? <span className="error-text">{errors.otp}</span> : <span className="hint">Sent to {email}. The code expires in 10 minutes.</span>}
              </div>
              <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Loader2 className="spin" /> : <ShieldCheck />} Verify OTP
              </button>
              <div className="auth-links">
                <button type="button" className="link" onClick={() => { setStep(1); setOtp(''); setInfo(''); setProblem(null); }}>Change Gmail</button>
                <button type="button" className="link" onClick={sendOtp} disabled={busy}>Resend code</button>
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={createAccount} className="stack mt-16" noValidate>
              <div className="field">
                <label className="label" htmlFor="su-name">Patient Name</label>
                <div className="input-icon">
                  <User />
                  <input id="su-name" className={`input ${errors.name ? 'invalid' : ''}`} value={form.name} onChange={set('name')} placeholder="Full name" autoComplete="name" />
                </div>
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="field">
                <label className="label" htmlFor="su-gmail">Gmail</label>
                <div className="input-icon">
                  <Mail />
                  <input id="su-gmail" className="input" value={email} disabled />
                </div>
                <span className="hint">Verified address</span>
              </div>

              <div className="field">
                <label className="label" htmlFor="su-doctor">Treating Doctor</label>
                <div className="input-icon">
                  <Stethoscope />
                  <select id="su-doctor" className={`select ${errors.treatingDoctor ? 'invalid' : ''}`} style={{ paddingLeft: 40 }}
                    value={form.treatingDoctor} onChange={set('treatingDoctor')} disabled={doctors.loading || doctors.list.length === 0}>
                    <option value="">{doctors.loading ? 'Loading doctors…' : doctors.list.length ? 'Select your doctor' : 'No doctors available'}</option>
                    {doctors.list.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}{d.doctor_id ? ` (${d.doctor_id})` : ''}{(d.specialty || d.specialty_or_department) ? ` — ${d.specialty || d.specialty_or_department}` : ''}</option>
                    ))}
                  </select>
                </div>
                {errors.treatingDoctor ? <span className="error-text">{errors.treatingDoctor}</span> : doctors.error ? <span className="hint">{doctors.error}</span> : null}
              </div>

              <div className="grid-2" style={{ gap: 14 }}>
                <div className="field">
                  <label className="label" htmlFor="su-pw">Password</label>
                  <div className="input-icon">
                    <Lock />
                    <input id="su-pw" type={showPw ? 'text' : 'password'} className={`input ${errors.password ? 'invalid' : ''}`} value={form.password} onChange={set('password')} autoComplete="new-password" style={{ paddingRight: 44 }} />
                    <button type="button" className="toggle" onClick={() => setShowPw((v) => !v)} aria-label="Toggle password visibility">{showPw ? <EyeOff /> : <Eye />}</button>
                  </div>
                  {errors.password ? <span className="error-text">{errors.password}</span> : <span className="hint">8+ characters, letters and numbers</span>}
                </div>
                <div className="field">
                  <label className="label" htmlFor="su-pw2">Confirm Password</label>
                  <div className="input-icon">
                    <Lock />
                    <input id="su-pw2" type={showPw ? 'text' : 'password'} className={`input ${errors.confirm ? 'invalid' : ''}`} value={form.confirm} onChange={set('confirm')} autoComplete="new-password" />
                  </div>
                  {errors.confirm && <span className="error-text">{errors.confirm}</span>}
                </div>
              </div>

              <button className="btn btn-primary btn-lg btn-block" disabled={busy}>
                {busy ? <Loader2 className="spin" /> : <Check />} Create Patient Account
              </button>
            </form>
          )}

          <div className="auth-foot">
            Already have an account? <button className="link" onClick={() => onNavigate(`/login/${role}`)}>Sign In</button>
          </div>
        </div>
      </div>
    </div>
  );
}
