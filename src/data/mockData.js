// Initial Mock Data for CKD Predict System
import { MOCK_PATIENTS } from './mockPatients';
import { MOCK_PREDICTIONS } from './mockPredictions';

export { MOCK_PATIENTS, MOCK_PREDICTIONS };
export const INITIAL_PATIENTS = MOCK_PATIENTS;
export const INITIAL_PREDICTIONS = MOCK_PREDICTIONS;
export const INITIAL_DOCTORS = [
  {
    id: 'doc-001',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@ckdpredict.com',
    specialty: 'Nephrology & Renal Medicine',
    license: 'MD-994821-NY',
    hospital: 'St. Jude Kidney & Metabolic Institute',
    patientCount: 42,
    activeReviews: 6,
    rating: 4.9,
    phone: '+1 (555) 987-6543'
  },
  {
    id: 'doc-002',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@kidneycenter.org',
    specialty: 'Pediatric Nephrology',
    license: 'MD-881203-CA',
    hospital: 'Pacific Dialysis & Research Center',
    patientCount: 28,
    activeReviews: 3,
    rating: 4.8,
    phone: '+1 (555) 765-4321'
  },
  {
    id: 'doc-003',
    name: 'Dr. Sophia Chen',
    email: 's.chen@metabolicai.med',
    specialty: 'Internal Medicine & AI Diagnostics',
    license: 'MD-330192-MA',
    hospital: 'Massachusetts General Nephrology',
    patientCount: 35,
    activeReviews: 8,
    rating: 5.0,
    phone: '+1 (555) 234-9988'
  }
];

export const GLOBAL_ANALYTICS = {
  totalAssessments: 1420,
  highRiskCases: 348,
  modelAccuracy: 98.4,
  modelSensitivity: 97.8,
  modelSpecificity: 99.1,
  aucRoc: 0.992,
  topPredictors: [
    { name: 'Serum Creatinine (sc)', importance: 0.28 },
    { name: 'Hemoglobin (hemo)', importance: 0.22 },
    { name: 'Specific Gravity (sg)', importance: 0.16 },
    { name: 'Albumin (al)', importance: 0.12 },
    { name: 'Blood Urea (bu)', importance: 0.09 },
    { name: 'Packed Cell Volume (pcv)', importance: 0.07 },
    { name: 'Diabetes Mellitus (dm)', importance: 0.06 }
  ],
  stageDistribution: [
    { stage: 'Stage 1 (Normal / High eGFR)', count: 412, percentage: '29%' },
    { stage: 'Stage 2 (Mild Reduction)', count: 380, percentage: '27%' },
    { stage: 'Stage 3a (Mild-Mod)', count: 290, percentage: '20%' },
    { stage: 'Stage 3b (Mod-Severe)', count: 185, percentage: '13%' },
    { stage: 'Stage 4 (Severe Reduction)', count: 110, percentage: '8%' },
    { stage: 'Stage 5 (Kidney Failure)', count: 43, percentage: '3%' }
  ],
  monthlyVolume: [
    { month: 'Apr', assessments: 180, highRisk: 42 },
    { month: 'May', assessments: 210, highRisk: 49 },
    { month: 'Jun', assessments: 235, highRisk: 55 },
    { month: 'Jul', assessments: 240, highRisk: 61 },
    { month: 'Aug', assessments: 275, highRisk: 68 },
    { month: 'Sep', assessments: 280, highRisk: 73 }
  ]
};
