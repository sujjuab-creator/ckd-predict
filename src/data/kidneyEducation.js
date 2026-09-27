// Educational kidney-health content shared by the public home page and the
// patient "Kidney Health" section. General information only - not medical advice.
import {
  Microscope, CircleAlert, HeartPulse, Salad, Droplets, GlassWater, CalendarCheck, Pill,
} from 'lucide-react';

export const ABOUT_CARDS = [
  {
    icon: Microscope, tone: 'tone-green', title: 'Common causes',
    text: 'CKD usually develops from long-term conditions that strain the kidneys over time.',
    list: ['Diabetes (type 1 or type 2)', 'High blood pressure', 'Glomerulonephritis (inflammation of kidney filters)', 'Polycystic kidney disease and other inherited conditions', 'Repeated urinary tract obstruction or infections'],
  },
  {
    icon: CircleAlert, tone: 'tone-amber', title: 'Risk factors',
    text: 'Some people are more likely to develop CKD and may benefit from regular testing.',
    list: ['Diabetes or high blood pressure', 'Heart or blood vessel disease', 'Family history of kidney disease', 'Older age, obesity or smoking', 'A previous acute kidney injury'],
  },
  {
    icon: HeartPulse, tone: 'tone-red', title: 'Common symptoms',
    text: 'Symptoms often appear only in later stages and can be caused by other conditions too.',
    list: ['Tiredness and low energy', 'Swelling in ankles, feet or hands', 'Changes in how often you urinate, or foamy urine', 'Itchy skin and muscle cramps', 'Nausea, poor appetite or trouble sleeping'],
  },
];

export const STAGES = [
  { stage: 'Stage 1', name: 'Normal or high', gfr: '≥ 90', color: '#10b981', text: 'Kidney function is normal, but there are other signs of kidney damage such as protein in the urine.' },
  { stage: 'Stage 2', name: 'Mildly decreased', gfr: '60 – 89', color: '#84cc16', text: 'Slight loss of function, usually alongside other markers of kidney damage.' },
  { stage: 'Stage 3a', name: 'Mild to moderate', gfr: '45 – 59', color: '#eab308', text: 'Moderate loss of function. Some people begin to notice symptoms.' },
  { stage: 'Stage 3b', name: 'Moderate to severe', gfr: '30 – 44', color: '#f59e0b', text: 'Function is noticeably reduced; complications become more likely.' },
  { stage: 'Stage 4', name: 'Severely decreased', gfr: '15 – 29', color: '#f97316', text: 'Severe loss of function. Specialist care and planning are usually needed.' },
  { stage: 'Stage 5', name: 'Kidney failure', gfr: '< 15', color: '#dc2626', text: 'Kidneys are close to or have stopped working; dialysis or transplant may be considered.' },
];

export const HABITS = [
  { icon: Salad, tone: 'tone-green', title: 'Healthy lifestyle', text: 'A balanced diet lower in salt and processed foods, regular physical activity, a healthy weight and not smoking all support kidney health.' },
  { icon: HeartPulse, tone: 'tone-red', title: 'Blood pressure management', text: 'High blood pressure is a leading cause of CKD. Regular checks and following your treatment plan help protect the kidneys.' },
  { icon: Droplets, tone: 'tone-blue', title: 'Diabetes management', text: 'Keeping blood sugar within the range agreed with your doctor reduces the strain diabetes can place on the kidneys.' },
  { icon: GlassWater, tone: 'tone-blue', title: 'Hydration', text: 'Drinking enough fluid supports normal kidney function. People with kidney disease may need specific fluid advice from their doctor.' },
  { icon: CalendarCheck, tone: 'tone-navy', title: 'Regular health checks', text: 'Simple blood (creatinine / eGFR) and urine (albumin) tests can detect kidney problems early, especially if you are at higher risk.' },
  { icon: Pill, tone: 'tone-amber', title: 'Follow medical advice', text: 'Take medicines as prescribed and ask before using over-the-counter painkillers such as NSAIDs regularly, as they can affect the kidneys.' },
];
