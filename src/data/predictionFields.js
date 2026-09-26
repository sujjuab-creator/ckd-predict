// Prediction Field Definitions for CKD Predict
// These fields can be dynamically mapped and replaced when the final ML model is connected.

export const PREDICTION_SECTIONS = [
  { id: 'section_1', title: 'SECTION 1 — PATIENT INFORMATION' },
  { id: 'section_2', title: 'SECTION 2 — CLINICAL INFORMATION' },
  { id: 'section_3', title: 'SECTION 3 — BLOOD PARAMETERS' },
  { id: 'section_4', title: 'SECTION 4 — URINE PARAMETERS' },
  { id: 'section_5', title: 'SECTION 5 — OTHER CLINICAL PARAMETERS' }
];

export const PREDICTION_FIELDS = [
  // SECTION 1 — PATIENT INFORMATION
  {
    name: 'age',
    label: 'Age',
    type: 'number',
    required: true,
    section: 'section_1',
    min: 1,
    max: 120,
    unit: 'years',
    placeholder: 'e.g. 56'
  },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: true,
    section: 'section_1',
    options: [
      { value: 'Male', label: 'Male' },
      { value: 'Female', label: 'Female' }
    ]
  },

  // SECTION 2 — CLINICAL INFORMATION
  {
    name: 'bp',
    label: 'Blood Pressure',
    type: 'number',
    required: true,
    section: 'section_2',
    min: 50,
    max: 240,
    unit: 'mmHg',
    placeholder: 'e.g. 120'
  },
  {
    name: 'sg',
    label: 'Specific Gravity',
    type: 'select',
    required: true,
    section: 'section_2',
    options: [
      { value: '1.005', label: '1.005' },
      { value: '1.010', label: '1.010' },
      { value: '1.015', label: '1.015' },
      { value: '1.020', label: '1.020' },
      { value: '1.025', label: '1.025' }
    ]
  },
  {
    name: 'al',
    label: 'Albumin',
    type: 'select',
    required: true,
    section: 'section_2',
    options: [
      { value: '0', label: '0 (Normal / Absent)' },
      { value: '1', label: '1 (+)' },
      { value: '2', label: '2 (++)' },
      { value: '3', label: '3 (+++)' },
      { value: '4', label: '4 (++++)' },
      { value: '5', label: '5 (+++++)' }
    ]
  },
  {
    name: 'su',
    label: 'Sugar',
    type: 'select',
    required: true,
    section: 'section_2',
    options: [
      { value: '0', label: '0 (Negative)' },
      { value: '1', label: '1 (+)' },
      { value: '2', label: '2 (++)' },
      { value: '3', label: '3 (+++)' },
      { value: '4', label: '4 (++++)' }
    ]
  },

  // SECTION 3 — BLOOD PARAMETERS
  {
    name: 'bgr',
    label: 'Blood Glucose (Random)',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 40,
    max: 600,
    unit: 'mg/dL',
    placeholder: 'e.g. 120'
  },
  {
    name: 'bu',
    label: 'Blood Urea',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 5,
    max: 300,
    unit: 'mg/dL',
    placeholder: 'e.g. 36'
  },
  {
    name: 'sc',
    label: 'Serum Creatinine',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 0.1,
    max: 20.0,
    step: 0.1,
    unit: 'mg/dL',
    placeholder: 'e.g. 1.2'
  },
  {
    name: 'sod',
    label: 'Sodium',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 100,
    max: 180,
    step: 0.1,
    unit: 'mEq/L',
    placeholder: 'e.g. 138'
  },
  {
    name: 'pot',
    label: 'Potassium',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 2.0,
    max: 9.0,
    step: 0.1,
    unit: 'mEq/L',
    placeholder: 'e.g. 4.2'
  },
  {
    name: 'hemo',
    label: 'Hemoglobin',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 3.0,
    max: 22.0,
    step: 0.1,
    unit: 'g/dL',
    placeholder: 'e.g. 13.5'
  },
  {
    name: 'pcv',
    label: 'Packed Cell Volume',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 10,
    max: 70,
    unit: '%',
    placeholder: 'e.g. 42'
  },
  {
    name: 'wbcc',
    label: 'White Blood Cell Count',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 1000,
    max: 30000,
    unit: 'cells/cumm',
    placeholder: 'e.g. 8400'
  },
  {
    name: 'rbcc',
    label: 'Red Blood Cell Count',
    type: 'number',
    required: true,
    section: 'section_3',
    min: 1.0,
    max: 9.0,
    step: 0.1,
    unit: 'millions/cmm',
    placeholder: 'e.g. 4.8'
  },

  // SECTION 4 — URINE PARAMETERS
  {
    name: 'rbc',
    label: 'Red Blood Cells',
    type: 'select',
    required: true,
    section: 'section_4',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'abnormal', label: 'Abnormal' }
    ]
  },
  {
    name: 'pc',
    label: 'Pus Cell',
    type: 'select',
    required: true,
    section: 'section_4',
    options: [
      { value: 'normal', label: 'Normal' },
      { value: 'abnormal', label: 'Abnormal' }
    ]
  },
  {
    name: 'pcc',
    label: 'Pus Cell Clumps',
    type: 'select',
    required: true,
    section: 'section_4',
    options: [
      { value: 'notpresent', label: 'Not Present' },
      { value: 'present', label: 'Present' }
    ]
  },
  {
    name: 'ba',
    label: 'Bacteria',
    type: 'select',
    required: true,
    section: 'section_4',
    options: [
      { value: 'notpresent', label: 'Not Present' },
      { value: 'present', label: 'Present' }
    ]
  },

  // SECTION 5 — OTHER CLINICAL PARAMETERS
  {
    name: 'htn',
    label: 'Hypertension',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ]
  },
  {
    name: 'dm',
    label: 'Diabetes Mellitus',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ]
  },
  {
    name: 'cad',
    label: 'Coronary Artery Disease',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ]
  },
  {
    name: 'appet',
    label: 'Appetite',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'good', label: 'Good' },
      { value: 'poor', label: 'Poor' }
    ]
  },
  {
    name: 'pe',
    label: 'Pedal Edema',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ]
  },
  {
    name: 'ane',
    label: 'Anemia',
    type: 'select',
    required: true,
    section: 'section_5',
    options: [
      { value: 'no', label: 'No' },
      { value: 'yes', label: 'Yes' }
    ]
  }
];
