import React, { useState } from 'react';
import {
  ArrowRight, BookOpen, Brain, ShieldCheck, Stethoscope, Activity, ClipboardList, Gauge, ChartBar,
  FileText, History, Lock, Users, UserRound, Cpu, Sparkles, ChevronDown, Phone, TriangleAlert,
  Info, LogIn,
} from 'lucide-react';
import KidneyIllustration from './brand/KidneyIllustration';
import { MEDICAL_DISCLAIMER } from './ui/UI';
import { scrollToSection } from './Navbar';
import { ABOUT_CARDS, STAGES, HABITS } from '../data/kidneyEducation';

const FEATURES = [
  { icon: Brain, tone: 'tone-green', title: 'AI-Assisted Prediction', text: 'A trained machine-learning model estimates CKD risk from the health information you supply and returns a risk label with a probability.' },
  { icon: Sparkles, tone: 'tone-blue', title: 'Explainable Results', text: 'SHAP explanations show which factors pushed an individual prediction towards higher or lower risk.' },
  { icon: History, tone: 'tone-navy', title: 'Prediction History', text: 'Every prediction is stored securely so patients and doctors can review previous results over time.' },
  { icon: FileText, tone: 'tone-green', title: 'Medical Reports', text: 'Generate downloadable PDF reports for saved predictions, including the disclaimer and key inputs.' },
  { icon: ChartBar, tone: 'tone-blue', title: 'Analytics', text: 'Dashboards summarise prediction activity and compare the performance of the evaluated models.' },
  { icon: Stethoscope, tone: 'tone-navy', title: 'Doctor Review', text: 'Doctors can review patient predictions, explanations and reports to support their clinical assessment.' },
  { icon: Lock, tone: 'tone-green', title: 'Secure Authentication', text: 'Token-based sign-in with hashed passwords. Prediction tools are available only after signing in.' },
  { icon: ShieldCheck, tone: 'tone-blue', title: 'Role-Based Access', text: 'Separate Patient, Doctor and Admin dashboards, each limited to the features that role is permitted to use.' },
];

const STEPS = [
  { icon: LogIn, title: 'Create / Login to account', text: 'Sign in with your Patient or Doctor account.' },
  { icon: ClipboardList, title: 'Enter health information', text: 'Provide the required clinical and lifestyle values.' },
  { icon: Cpu, title: 'AI/ML model analyses data', text: 'The trained model processes the supplied information.' },
  { icon: Gauge, title: 'Risk prediction generated', text: 'You receive a CKD risk label, probability and explanation.' },
  { icon: Stethoscope, title: 'Review by user / doctor', text: 'Results can be reviewed by the appropriate user or doctor.' },
];

const FAQS = [
  { q: 'Is CKD PREDICT a medical diagnosis?', a: 'No. CKD PREDICT provides an AI-assisted CKD risk prediction based on the data supplied. It is not a diagnosis and does not replace a doctor. Any result should be reviewed by a qualified healthcare professional.' },
  { q: 'Who can use the platform?', a: 'There are three account types: Patients, who can view their own reports, their treating doctor’s reviews and notifications; Doctors, who run CKD risk predictions for their patients and review the results, explanations and reports; and a single Administrator, who manages accounts and system analytics.' },
  { q: 'How do I get an account?', a: 'Patients can create an account from the Patient Sign Up page after verifying their Gmail address. Doctor accounts are created by the hospital administrator, who provides the sign-in credentials; doctors then use the Doctor Sign In page.' },
  { q: 'What information will I need?', a: 'Recent laboratory results are needed, such as serum creatinine, BUN, GFR, urine protein and albumin-to-creatinine ratio, electrolytes, cholesterol, blood pressure, fasting blood sugar and HbA1c, along with some lifestyle, medication and medical history details.' },
  { q: 'What does the explanation (SHAP) show?', a: 'SHAP values show how much each input pushed the model towards a higher or lower predicted risk for that specific prediction. They explain the model’s behaviour — not the medical cause of a condition.' },
  { q: 'How reliable are the predictions?', a: 'The model was evaluated on held-out test data and its metrics are available to administrators. Like every model it can be wrong, especially for values outside the data it was trained on, which is why results must be reviewed by a healthcare professional.' },
  { q: 'Is my information protected?', a: 'Prediction tools are only available after signing in, and each role can only access the dashboards and actions it is permitted to use.' },
];

function SectionHead({ eyebrow, title, text, center = false }) {
  return (
    <div className={`section-head ${center ? 'center' : ''}`}>
      <span className="eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

function FaqItem({ item, open, onToggle, idx }) {
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={onToggle} aria-expanded={open} aria-controls={`faq-${idx}`}>
        <span>{item.q}</span>
        <ChevronDown />
      </button>
      {open && <div className="faq-a" id={`faq-${idx}`}>{item.a}</div>}
    </div>
  );
}

export default function Home({ onNavigate }) {
  const [openFaq, setOpenFaq] = useState(0);
  const toLogin = () => onNavigate('/login');

  return (
    <>
      {/* ---------------- HERO ---------------- */}
      <section className="hero" id="home">
        <div className="container hero-inner">
          <div>
            <span className="eyebrow">AI-assisted kidney health insights</span>
            <h1 style={{ marginTop: 18 }}>
              Better Insights for
              <span className="accent">Healthier Kidneys</span>
            </h1>
            <p className="hero-lead">
              CKD PREDICT uses machine learning to provide AI-assisted CKD risk prediction based on supplied health information.
            </p>
            <div className="hero-cta">
              <button className="btn btn-primary btn-lg" onClick={toLogin}>
                Get Started <ArrowRight />
              </button>
              <button className="btn btn-outline btn-lg" onClick={() => scrollToSection('about', '/', onNavigate)}>
                <BookOpen /> Learn About CKD
              </button>
            </div>
            <div className="hero-note">
              <Lock />
              Risk prediction is available to signed-in patients and doctors only.
            </div>
          </div>

          <div className="hero-visual">
            <KidneyIllustration />
            <div className="hero-chip chip-a">
              <span className="ic tone-green"><Activity /></span>
              <div><b>Kidney function</b><span>eGFR is a key marker of how well kidneys filter blood.</span></div>
            </div>
            <div className="hero-chip chip-b">
              <span className="ic tone-blue"><Sparkles /></span>
              <div><b>Explainable AI</b><span>See which factors influenced each prediction.</span></div>
            </div>
            <div className="hero-chip chip-c">
              <span className="ic tone-amber"><Info /></span>
              <div><b>Often silent</b><span>Early CKD may cause no noticeable symptoms.</span></div>
            </div>
          </div>
        </div>
      </section>

      <div className="trust-strip">
        <div className="container trust-grid">
          {[
            { icon: Brain, tone: 'tone-green', t: 'AI-Assisted', d: 'Machine-learning risk prediction' },
            { icon: Sparkles, tone: 'tone-blue', t: 'Explainable', d: 'SHAP factor explanations' },
            { icon: ShieldCheck, tone: 'tone-navy', t: 'Secure Access', d: 'Role-based dashboards' },
            { icon: Stethoscope, tone: 'tone-green', t: 'Clinician Review', d: 'Supports, never replaces, doctors' },
          ].map((x) => (
            <div className="trust-item" key={x.t}>
              <span className={`ic ${x.tone}`}><x.icon /></span>
              <div><h4>{x.t}</h4><p>{x.d}</p></div>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- ABOUT CKD ---------------- */}
      <section className="section" id="about">
        <div className="container">
          <div className="about-intro">
            <div>
              <span className="eyebrow">About CKD</span>
              <h2 style={{ fontSize: 'clamp(28px, 3.4vw, 38px)', fontWeight: 800, margin: '12px 0 16px' }}>
                What is Chronic Kidney Disease?
              </h2>
              <p className="lead">
                Chronic Kidney Disease (CKD) is a long-term condition in which the kidneys gradually lose their ability to
                filter waste products and excess fluid from the blood. It is generally identified when signs of kidney
                damage or reduced kidney function last for more than three months.
              </p>
              <p className="lead">
                Healthy kidneys also help control blood pressure, balance minerals and support red blood cell production,
                so reduced kidney function can affect the whole body.
              </p>
            </div>
            <div className="fact-panel">
              <h3>Why CKD can be hard to detect early</h3>
              <ul className="fact-list">
                <li><span className="n">1</span><div><b>Few early symptoms</b><span>The kidneys can compensate for lost function, so early stages often feel normal.</span></div></li>
                <li><span className="n">2</span><div><b>Symptoms are non-specific</b><span>Tiredness or swelling can have many causes and are easy to overlook.</span></div></li>
                <li><span className="n">3</span><div><b>Detection needs tests</b><span>Blood tests (creatinine, eGFR) and urine tests (albumin, ACR) are usually required.</span></div></li>
                <li><span className="n">4</span><div><b>Regular evaluation matters</b><span>People at higher risk should have kidney checks as advised by their doctor.</span></div></li>
              </ul>
            </div>
          </div>

          <div className="grid-3">
            {ABOUT_CARDS.map((c) => (
              <div className="card card-hover info-card" key={c.title}>
                <span className={`ic ${c.tone}`}><c.icon /></span>
                <h3>{c.title}</h3>
                <p>{c.text}</p>
                <ul>{c.list.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            ))}
          </div>

          <div className="alert alert-info mt-24">
            <Stethoscope />
            <div>
              <div className="alert-title">The importance of regular medical evaluation</div>
              Because CKD is often silent, regular check-ups with simple blood and urine tests are the most reliable way
              to find kidney problems early — especially if you have diabetes, high blood pressure or a family history of
              kidney disease. Only a qualified healthcare professional can diagnose CKD.
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- STAGES ---------------- */}
      <section className="section section-alt" id="stages">
        <div className="container">
          <SectionHead
            center
            eyebrow="CKD Stages"
            title="Understanding the stages of CKD"
            text="CKD is commonly described in five stages based on the estimated glomerular filtration rate (eGFR), measured in mL/min/1.73m²."
          />
          <div className="stages">
            {STAGES.map((s) => (
              <div className="stage" key={s.stage}>
                <div className="stage-bar" style={{ background: s.color }} />
                <div className="stage-num">{s.stage}</div>
                <h3>{s.name}</h3>
                <div className="gfr">{s.gfr}<small>eGFR</small></div>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
          <div className="stage-scale">
            <span>Higher kidney function</span>
            <div className="grad" />
            <span>Lower kidney function</span>
          </div>
          <div className="alert alert-warn mt-24">
            <TriangleAlert />
            <div>
              <div className="alert-title">Educational information only</div>
              This overview is general education and is not an individual patient's diagnosis or stage. Staging also
              considers urine albumin levels and other findings, and must be determined by a qualified healthcare professional.
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- PREVENTION ---------------- */}
      <section className="section" id="prevention">
        <div className="container">
          <SectionHead
            eyebrow="Prevention"
            title="Healthy kidney habits"
            text="General habits that support kidney health. This is educational information, not personalised medical advice — always follow the guidance of your own healthcare provider."
          />
          <div className="grid-3">
            {HABITS.map((h) => (
              <div className="card card-hover info-card" key={h.title}>
                <span className={`ic ${h.tone}`}><h.icon /></span>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section className="section section-alt" id="features">
        <div className="container">
          <SectionHead
            center
            eyebrow="Platform Features"
            title="Everything in one secure platform"
            text="Tools for patients, doctors and administrators — available after signing in."
          />
          <div className="grid-4">
            {FEATURES.map((f) => (
              <div className="card card-hover feature" key={f.title}>
                <span className={`ic ${f.tone}`}><f.icon /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- HOW IT WORKS ---------------- */}
      <section className="section" id="how-it-works">
        <div className="container">
          <SectionHead
            center
            eyebrow="How It Works"
            title="From sign-in to reviewed result"
            text="A simple, guided process. The prediction tool becomes available after you log in."
          />
          <div className="steps">
            {STEPS.map((s, i) => (
              <div className="step" key={s.title}>
                <div className="step-circle"><s.icon /></div>
                <div>
                  <div className="step-no">Step {i + 1}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="lock-note">
            <span className="badge badge-green" style={{ height: 34, padding: '0 16px', fontSize: 13 }}>
              <Lock /> Prediction is available only after login
            </span>
          </div>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="cta-band">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2>Want to check your CKD risk?</h2>
              <p>Sign in to access the CKD risk prediction system.</p>
            </div>
            <button className="btn btn-primary btn-lg" onClick={toLogin}>
              Login / Get Started <ArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section className="section section-alt" id="faq">
        <div className="container">
          <SectionHead center eyebrow="FAQ" title="Frequently asked questions" />
          <div className="faq">
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} item={f} idx={i} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- CONTACT ---------------- */}
      <section className="section" id="contact">
        <div className="container">
          <SectionHead center eyebrow="Contact" title="Need help?" text="Who to contact depends on what you need." />
          <div className="contact-grid">
            <div className="card info-card">
              <span className="ic tone-green"><Users /></span>
              <h3>Account access</h3>
              <p>For new accounts, sign-in problems or password resets, please contact your hospital's system administrator.</p>
            </div>
            <div className="card info-card">
              <span className="ic tone-blue"><UserRound /></span>
              <h3>Questions about results</h3>
              <p>Discuss any prediction, explanation or report with your treating doctor, who can interpret it alongside your full medical history.</p>
            </div>
            <div className="card info-card">
              <span className="ic tone-red"><Phone /></span>
              <h3>Medical emergencies</h3>
              <p>CKD PREDICT is not an emergency service. If you feel seriously unwell, contact your local emergency number or nearest hospital immediately.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- DISCLAIMER ---------------- */}
      <div className="disclaimer-band">
        <div className="container">
          <TriangleAlert />
          <p><b>Medical Disclaimer</b>{MEDICAL_DISCLAIMER}</p>
        </div>
      </div>
    </>
  );
}
