// Initial Clinical Users Data for Admin Management System

export const MOCK_USERS = [
  {
    id: 'USR-001',
    name: 'Johnathan Doe',
    email: 'j.doe@ckdpredict.com',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-01-15',
    patientId: 'PAT-101'
  },
  {
    id: 'USR-002',
    name: 'Dr. Aris Thorne',
    email: 'aris.thorne@ckdpredict.com',
    role: 'doctor',
    status: 'Active',
    createdDate: '2026-01-10',
    doctorId: 'DOC-001',
    department: 'Nephrology & Renal Medicine'
  },
  {
    id: 'USR-003',
    name: 'Dr. Elena Rostova',
    email: 'elena.rostova@ckdpredict.com',
    role: 'admin',
    status: 'Active',
    createdDate: '2026-01-01',
    department: 'Chief Medical Data Officer'
  },
  {
    id: 'USR-004',
    name: 'Sarah Connor',
    email: 'sarah.c@cyberdyne.org',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-02-04',
    patientId: 'PAT-102'
  },
  {
    id: 'USR-005',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@kidneycenter.org',
    role: 'doctor',
    status: 'Active',
    createdDate: '2026-02-12',
    doctorId: 'DOC-002',
    department: 'Pediatric Nephrology'
  },
  {
    id: 'USR-006',
    name: 'Robert Vance',
    email: 'rvance@vancerefrigeration.com',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-03-01',
    patientId: 'PAT-103'
  },
  {
    id: 'USR-007',
    name: 'Elena Gilbert',
    email: 'elena.g@mysticfalls.org',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-03-18',
    patientId: 'PAT-104'
  },
  {
    id: 'USR-008',
    name: 'Dr. Sophia Chen',
    email: 's.chen@metabolicai.med',
    role: 'doctor',
    status: 'Active',
    createdDate: '2026-04-05',
    doctorId: 'DOC-003',
    department: 'Internal Medicine & AI Diagnostics'
  },
  {
    id: 'USR-009',
    name: 'Arthur Pendelton',
    email: 'apendelton@legacy.org',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-04-20',
    patientId: 'PAT-105'
  },
  {
    id: 'USR-010',
    name: 'Clara Oswald',
    email: 'clara.oswald@coalhill.edu',
    role: 'patient',
    status: 'Active',
    createdDate: '2026-05-02',
    patientId: 'PAT-106'
  }
];

export const MOCK_DOCTORS_LIST = [
  {
    id: 'DOC-001',
    name: 'Dr. Aris Thorne',
    email: 'doctor@ckdpredict.com',
    department: 'Nephrology & Renal Medicine',
    hospital: 'St. Jude Kidney & Metabolic Institute',
    status: 'Active',
    patientsCount: 42,
    license: 'MD-994821-NY'
  },
  {
    id: 'DOC-002',
    name: 'Dr. Marcus Vance',
    email: 'marcus.vance@kidneycenter.org',
    department: 'Pediatric Nephrology',
    hospital: 'Pacific Dialysis & Research Center',
    status: 'Active',
    patientsCount: 28,
    license: 'MD-881203-CA'
  },
  {
    id: 'DOC-003',
    name: 'Dr. Sophia Chen',
    email: 's.chen@metabolicai.med',
    department: 'Internal Medicine & AI Diagnostics',
    hospital: 'Massachusetts General Nephrology',
    status: 'Active',
    patientsCount: 35,
    license: 'MD-330192-MA'
  }
];
