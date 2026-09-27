// Prediction input schema — matches the trained model's feature list exactly
// (backend/ml/artifacts/feature_names.json, 51 features). The backend maps keys
// case-insensitively and defaults any missing feature to 0.0, so the form sends
// every feature explicitly using these exact names.
//
// `range` is the value range seen in the training dataset. Values outside it are
// allowed (with a warning) because the model may be less reliable there.

const YES_NO = [
  { value: 0, label: 'No' },
  { value: 1, label: 'Yes' },
];

export const FEATURE_SECTIONS = [
  { id: 'demographics', title: 'Demographics', description: 'Basic personal information' },
  { id: 'lifestyle', title: 'Lifestyle', description: 'Habits and general wellbeing' },
  { id: 'history', title: 'Medical & Family History', description: 'Past conditions and family history' },
  { id: 'clinical', title: 'Blood Pressure & Glucose', description: 'Clinical measurements' },
  { id: 'kidney', title: 'Kidney Function Tests', description: 'Laboratory kidney markers' },
  { id: 'blood', title: 'Electrolytes & Blood', description: 'Serum electrolytes and hemoglobin' },
  { id: 'lipids', title: 'Cholesterol Profile', description: 'Lipid panel' },
  { id: 'medications', title: 'Medications', description: 'Current medication use' },
  { id: 'symptoms', title: 'Symptoms & Quality of Life', description: 'Self-reported symptoms' },
  { id: 'environment', title: 'Environment & Care', description: 'Exposures and healthcare engagement' },
];

export const FEATURES = [
  // Demographics
  { name: 'Age', label: 'Age', section: 'demographics', type: 'number', unit: 'years', range: [20, 90], limit: [1, 120], step: 1 },
  { name: 'Gender', label: 'Gender', section: 'demographics', type: 'select', options: [{ value: 0, label: 'Male' }, { value: 1, label: 'Female' }] },
  { name: 'Ethnicity', label: 'Ethnicity', section: 'demographics', type: 'select', options: [{ value: 0, label: 'Caucasian' }, { value: 1, label: 'African American' }, { value: 2, label: 'Asian' }, { value: 3, label: 'Other' }] },
  { name: 'SocioeconomicStatus', label: 'Socioeconomic Status', section: 'demographics', type: 'select', options: [{ value: 0, label: 'Low' }, { value: 1, label: 'Middle' }, { value: 2, label: 'High' }] },
  { name: 'EducationLevel', label: 'Education Level', section: 'demographics', type: 'select', options: [{ value: 0, label: 'None' }, { value: 1, label: 'High School' }, { value: 2, label: "Bachelor's" }, { value: 3, label: 'Higher' }] },

  // Lifestyle
  { name: 'BMI', label: 'Body Mass Index', section: 'lifestyle', type: 'number', unit: 'kg/m²', range: [15, 40], limit: [8, 80], step: 0.1 },
  { name: 'Smoking', label: 'Smoking', section: 'lifestyle', type: 'select', options: YES_NO },
  { name: 'AlcoholConsumption', label: 'Alcohol Consumption', section: 'lifestyle', type: 'number', unit: 'units/week', range: [0, 20], limit: [0, 100], step: 0.1 },
  { name: 'PhysicalActivity', label: 'Physical Activity', section: 'lifestyle', type: 'number', unit: 'hours/week', range: [0, 10], limit: [0, 80], step: 0.1 },
  { name: 'DietQuality', label: 'Diet Quality', section: 'lifestyle', type: 'number', unit: 'score 0–10', range: [0, 10], limit: [0, 10], step: 0.1 },
  { name: 'SleepQuality', label: 'Sleep Quality', section: 'lifestyle', type: 'number', unit: 'score 4–10', range: [4, 10], limit: [0, 10], step: 0.1 },

  // History
  { name: 'FamilyHistoryKidneyDisease', label: 'Family History of Kidney Disease', section: 'history', type: 'select', options: YES_NO },
  { name: 'FamilyHistoryHypertension', label: 'Family History of Hypertension', section: 'history', type: 'select', options: YES_NO },
  { name: 'FamilyHistoryDiabetes', label: 'Family History of Diabetes', section: 'history', type: 'select', options: YES_NO },
  { name: 'PreviousAcuteKidneyInjury', label: 'Previous Acute Kidney Injury', section: 'history', type: 'select', options: YES_NO },
  { name: 'UrinaryTractInfections', label: 'Urinary Tract Infections', section: 'history', type: 'select', options: YES_NO },

  // Clinical
  { name: 'SystolicBP', label: 'Systolic Blood Pressure', section: 'clinical', type: 'number', unit: 'mmHg', range: [90, 179], limit: [50, 260], step: 1 },
  { name: 'DiastolicBP', label: 'Diastolic Blood Pressure', section: 'clinical', type: 'number', unit: 'mmHg', range: [60, 119], limit: [30, 160], step: 1 },
  { name: 'FastingBloodSugar', label: 'Fasting Blood Sugar', section: 'clinical', type: 'number', unit: 'mg/dL', range: [70, 200], limit: [20, 700], step: 0.1 },
  { name: 'HbA1c', label: 'HbA1c', section: 'clinical', type: 'number', unit: '%', range: [4, 10], limit: [2, 20], step: 0.1 },

  // Kidney
  { name: 'SerumCreatinine', label: 'Serum Creatinine', section: 'kidney', type: 'number', unit: 'mg/dL', range: [0.5, 5], limit: [0.1, 25], step: 0.01 },
  { name: 'BUNLevels', label: 'Blood Urea Nitrogen (BUN)', section: 'kidney', type: 'number', unit: 'mg/dL', range: [5, 50], limit: [1, 250], step: 0.1 },
  { name: 'GFR', label: 'Glomerular Filtration Rate (GFR)', section: 'kidney', type: 'number', unit: 'mL/min/1.73m²', range: [15, 120], limit: [1, 200], step: 0.1 },
  { name: 'ProteinInUrine', label: 'Protein in Urine', section: 'kidney', type: 'number', unit: 'g/day', range: [0, 5], limit: [0, 30], step: 0.01 },
  { name: 'ACR', label: 'Albumin-to-Creatinine Ratio (ACR)', section: 'kidney', type: 'number', unit: 'mg/g', range: [0, 300], limit: [0, 5000], step: 0.1 },

  // Blood / electrolytes
  { name: 'SerumElectrolytesSodium', label: 'Serum Sodium', section: 'blood', type: 'number', unit: 'mEq/L', range: [135, 145], limit: [100, 180], step: 0.1 },
  { name: 'SerumElectrolytesPotassium', label: 'Serum Potassium', section: 'blood', type: 'number', unit: 'mEq/L', range: [3.5, 5.5], limit: [1, 10], step: 0.01 },
  { name: 'SerumElectrolytesCalcium', label: 'Serum Calcium', section: 'blood', type: 'number', unit: 'mg/dL', range: [8.5, 10.5], limit: [4, 16], step: 0.01 },
  { name: 'SerumElectrolytesPhosphorus', label: 'Serum Phosphorus', section: 'blood', type: 'number', unit: 'mg/dL', range: [2.5, 4.5], limit: [0.5, 15], step: 0.01 },
  { name: 'HemoglobinLevels', label: 'Hemoglobin', section: 'blood', type: 'number', unit: 'g/dL', range: [10, 18], limit: [3, 25], step: 0.1 },

  // Lipids
  { name: 'CholesterolTotal', label: 'Total Cholesterol', section: 'lipids', type: 'number', unit: 'mg/dL', range: [150, 300], limit: [50, 700], step: 0.1 },
  { name: 'CholesterolLDL', label: 'LDL Cholesterol', section: 'lipids', type: 'number', unit: 'mg/dL', range: [50, 200], limit: [10, 500], step: 0.1 },
  { name: 'CholesterolHDL', label: 'HDL Cholesterol', section: 'lipids', type: 'number', unit: 'mg/dL', range: [20, 100], limit: [5, 200], step: 0.1 },
  { name: 'CholesterolTriglycerides', label: 'Triglycerides', section: 'lipids', type: 'number', unit: 'mg/dL', range: [50, 400], limit: [10, 3000], step: 0.1 },

  // Medications
  { name: 'ACEInhibitors', label: 'ACE Inhibitors', section: 'medications', type: 'select', options: YES_NO },
  { name: 'Diuretics', label: 'Diuretics', section: 'medications', type: 'select', options: YES_NO },
  { name: 'NSAIDsUse', label: 'NSAIDs Use', section: 'medications', type: 'number', unit: 'times/week', range: [0, 10], limit: [0, 50], step: 0.1 },
  { name: 'Statins', label: 'Statins', section: 'medications', type: 'select', options: YES_NO },
  { name: 'AntidiabeticMedications', label: 'Antidiabetic Medications', section: 'medications', type: 'select', options: YES_NO },

  // Symptoms
  { name: 'Edema', label: 'Edema (swelling)', section: 'symptoms', type: 'select', options: YES_NO },
  { name: 'FatigueLevels', label: 'Fatigue Level', section: 'symptoms', type: 'number', unit: 'score 0–10', range: [0, 10], limit: [0, 10], step: 0.1 },
  { name: 'NauseaVomiting', label: 'Nausea / Vomiting', section: 'symptoms', type: 'number', unit: 'episodes/week', range: [0, 7], limit: [0, 50], step: 0.1 },
  { name: 'MuscleCramps', label: 'Muscle Cramps', section: 'symptoms', type: 'number', unit: 'episodes/week', range: [0, 7], limit: [0, 50], step: 0.1 },
  { name: 'Itching', label: 'Itching', section: 'symptoms', type: 'number', unit: 'score 0–10', range: [0, 10], limit: [0, 10], step: 0.1 },
  { name: 'QualityOfLifeScore', label: 'Quality of Life Score', section: 'symptoms', type: 'number', unit: 'score 0–100', range: [0, 100], limit: [0, 100], step: 0.1 },

  // Environment & care
  { name: 'HeavyMetalsExposure', label: 'Heavy Metals Exposure', section: 'environment', type: 'select', options: YES_NO },
  { name: 'OccupationalExposureChemicals', label: 'Occupational Chemical Exposure', section: 'environment', type: 'select', options: YES_NO },
  { name: 'WaterQuality', label: 'Drinking Water Quality', section: 'environment', type: 'select', options: [{ value: 0, label: 'Good' }, { value: 1, label: 'Poor' }] },
  { name: 'MedicalCheckupsFrequency', label: 'Medical Check-ups', section: 'environment', type: 'number', unit: 'per year', range: [0, 4], limit: [0, 52], step: 0.1 },
  { name: 'MedicationAdherence', label: 'Medication Adherence', section: 'environment', type: 'number', unit: 'score 0–10', range: [0, 10], limit: [0, 10], step: 0.1 },
  { name: 'HealthLiteracy', label: 'Health Literacy', section: 'environment', type: 'number', unit: 'score 0–10', range: [0, 10], limit: [0, 10], step: 0.1 },
];

export const FEATURE_MAP = Object.fromEntries(FEATURES.map((f) => [f.name.toLowerCase(), f]));

export function featureLabel(name) {
  return FEATURE_MAP[String(name).toLowerCase()]?.label || String(name).replace(/([a-z])([A-Z])/g, '$1 $2');
}

/** Human-readable value for a feature (maps coded selects back to labels). */
export function featureValueText(name, value) {
  const f = FEATURE_MAP[String(name).toLowerCase()];
  if (value === null || value === undefined || value === '') return '—';
  if (f?.type === 'select') {
    const opt = f.options.find((o) => Number(o.value) === Number(value));
    if (opt) return opt.label;
  }
  return f?.unit && !f.unit.startsWith('score') ? `${value} ${f.unit}` : String(value);
}

export function emptyFeatureForm() {
  return Object.fromEntries(FEATURES.map((f) => [f.name, '']));
}

/** Returns { errors, warnings } for a form state. */
export function validateFeatures(form) {
  const errors = {};
  const warnings = {};
  FEATURES.forEach((f) => {
    const raw = form[f.name];
    if (raw === '' || raw === null || raw === undefined) {
      errors[f.name] = 'Required';
      return;
    }
    const num = Number(raw);
    if (Number.isNaN(num)) {
      errors[f.name] = 'Must be a number';
      return;
    }
    if (f.type === 'number') {
      const [lo, hi] = f.limit;
      if (num < lo || num > hi) {
        errors[f.name] = `Enter a value between ${lo} and ${hi}`;
        return;
      }
      const [rlo, rhi] = f.range;
      if (num < rlo || num > rhi) warnings[f.name] = `Outside training data range (${rlo}–${rhi}); the model may be less reliable.`;
    }
  });
  return { errors, warnings };
}

/** Builds the POST /api/predictions payload with numeric values for every feature. */
export function buildPredictionPayload(form, patientDbId) {
  const payload = {};
  FEATURES.forEach((f) => { payload[f.name] = Number(form[f.name]); });
  if (patientDbId !== undefined && patientDbId !== null) payload.patient_id = patientDbId;
  return payload;
}
