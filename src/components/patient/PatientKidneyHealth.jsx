import React, { useState } from 'react';
import {
  BookOpen, Search, Stethoscope, HeartPulse, ChevronDown, CircleHelp, Activity,
} from 'lucide-react';
import { PageHeader, Card, Disclaimer, Alert } from '../ui/UI';
import { ABOUT_CARDS, STAGES, HABITS } from '../../data/kidneyEducation';
import { PATIENT_DISCLAIMER } from './patientUi';

const SECTIONS = [
  { id: 'kh-what', label: 'What is CKD?' },
  { id: 'kh-causes', label: 'Causes & symptoms' },
  { id: 'kh-stages', label: 'Stages' },
  { id: 'kh-prevention', label: 'Healthy habits' },
  { id: 'kh-early', label: 'Early detection' },
  { id: 'kh-consult', label: 'When to see a doctor' },
  { id: 'kh-faq', label: 'FAQ' },
];

const EARLY_DETECTION = [
  'Early CKD often causes no symptoms, so testing is the only reliable way to find it.',
  'A blood test (creatinine, used to estimate eGFR) shows how well the kidneys filter.',
  'A urine test (albumin-to-creatinine ratio) checks for protein leaking into the urine – an early sign of damage.',
  'Finding CKD early gives more time to slow it down by treating blood pressure, diabetes and other causes.',
  'People with diabetes, high blood pressure, heart disease or a family history of kidney disease may be advised to test regularly.',
];

const CONSULT = [
  'Swelling of the legs, ankles, feet, hands or face that does not go away',
  'Passing much more or much less urine than usual, or blood in the urine',
  'Persistent tiredness, shortness of breath, nausea or loss of appetite',
  'A report or test result you do not understand or that worries you',
  'You have diabetes or high blood pressure and have not had your kidneys checked recently',
  'Before starting or stopping any medicine, supplement or regular painkiller',
];

const FAQS = [
  { q: 'Does my report mean I have CKD?', a: 'No. Your report contains an AI-assisted estimate of CKD risk based on the information supplied. It is not a diagnosis. Only a qualified healthcare professional can diagnose CKD, usually using repeated blood and urine tests over time.' },
  { q: 'What does the probability on my report mean?', a: 'It is the model’s estimate of how closely your supplied data matches patterns associated with CKD risk. A higher number means a stronger match, not certainty. Your doctor will interpret it together with your full medical history.' },
  { q: 'Why can’t I run a prediction myself?', a: 'Assessments use laboratory results and clinical information that should be entered and checked by your doctor, who can then explain the result to you in context. Your doctor runs the assessment and you can view the report here.' },
  { q: 'Can CKD be reversed?', a: 'Damage that has already happened usually cannot be reversed, but progression can often be slowed – especially when CKD is found early and causes such as high blood pressure and diabetes are well managed.' },
  { q: 'How often should my kidneys be checked?', a: 'This depends on your health and risk factors. Your doctor will advise how often you need blood and urine tests.' },
  { q: 'Who can see my reports?', a: 'You can see only your own reports. Your treating doctor and authorised hospital staff can also access them to support your care.' },
];

function FaqItem({ item, open, onToggle, idx }) {
  return (
    <div className={`faq-item ${open ? 'open' : ''}`}>
      <button className="faq-q" onClick={onToggle} aria-expanded={open} aria-controls={`kh-faq-${idx}`}>
        <span>{item.q}</span>
        <ChevronDown />
      </button>
      {open && <div className="faq-a" id={`kh-faq-${idx}`}>{item.a}</div>}
    </div>
  );
}

/** Educational kidney-health information. General information only, not personal medical advice. */
export default function PatientKidneyHealth() {
  const [openFaq, setOpenFaq] = useState(0);
  const jump = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="stack-lg">
      <PageHeader title="Kidney Health" subtitle="Trusted, general information about chronic kidney disease (CKD) and how to look after your kidneys." />

      <Card>
        <div className="kh-toc">
          {SECTIONS.map((s) => <button key={s.id} className="btn btn-sm btn-ghost" onClick={() => jump(s.id)}>{s.label}</button>)}
        </div>
      </Card>

      <section id="kh-what" className="kh-section">
        <Card title="What is CKD?" icon={BookOpen}>
          <div className="stack">
            <p>
              Chronic kidney disease (CKD) means the kidneys have been damaged or are working less well than they should
              for three months or longer. Healthy kidneys filter waste and extra fluid from the blood, help control blood
              pressure, keep bones healthy and help make red blood cells.
            </p>
            <p>
              CKD usually develops slowly over many years. Many people have no symptoms in the early stages, which is why
              regular check-ups are important if you are at higher risk.
            </p>
          </div>
        </Card>
      </section>

      <section id="kh-causes" className="kh-section">
        <div className="grid-3">
          {ABOUT_CARDS.map((c) => (
            <div className="card info-card" key={c.title}>
              <span className={`ic ${c.tone}`}><c.icon /></span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
              <ul>{c.list.map((li) => <li key={li}>{li}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      <section id="kh-stages" className="kh-section">
        <Card title="CKD stages" subtitle="Based on the estimated glomerular filtration rate (eGFR), in mL/min/1.73m²" icon={Activity}>
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
          <Alert type="warn" className="mt-16">
            Only a healthcare professional can determine a CKD stage, using repeated laboratory tests. The AI result in
            your report does not assign a stage.
          </Alert>
        </Card>
      </section>

      <section id="kh-prevention" className="kh-section">
        <div className="stack">
          <h2 style={{ fontSize: 20 }}>Prevention and healthy kidney habits</h2>
          <div className="grid-3">
            {HABITS.map((h) => (
              <div className="card info-card" key={h.title}>
                <span className={`ic ${h.tone}`}><h.icon /></span>
                <h3>{h.title}</h3>
                <p>{h.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid-2">
        <section id="kh-early" className="kh-section">
          <Card title="Why early detection matters" icon={Search}>
            <ul className="kh-list">{EARLY_DETECTION.map((t) => <li key={t}>{t}</li>)}</ul>
          </Card>
        </section>
        <section id="kh-consult" className="kh-section">
          <Card title="When to consult a healthcare professional" icon={Stethoscope}>
            <ul className="kh-list">{CONSULT.map((t) => <li key={t}>{t}</li>)}</ul>
            <Alert type="error" className="mt-16" title="Seek urgent care">
              <span>If you have chest pain, severe breathlessness, confusion, or pass very little or no urine, contact emergency services immediately.</span>
            </Alert>
          </Card>
        </section>
      </div>

      <section id="kh-faq" className="kh-section">
        <Card title="Frequently asked questions" icon={CircleHelp}>
          <div className="faq" style={{ maxWidth: 'none' }}>
            {FAQS.map((f, i) => (
              <FaqItem key={f.q} item={f} idx={i} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? -1 : i)} />
            ))}
          </div>
        </Card>
      </section>

      <div className="small muted row"><HeartPulse size={14} /> This information is general and educational. Always follow the advice of your own doctor.</div>
      <Disclaimer text={PATIENT_DISCLAIMER} />
    </div>
  );
}
