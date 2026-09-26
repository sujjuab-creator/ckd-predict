// Mock System Analytics Data for Admin Dashboard (Demo Data Only)

export const MOCK_ANALYTICS = {
  totalPredictions: 1420,
  ckdPredictions: 533,
  notCkdPredictions: 887,
  totalPatients: 420,
  totalDoctors: 18,
  totalUsers: 450,
  
  // Chart 1: CKD vs Not CKD Distribution
  ckdDistribution: [
    { name: 'Not CKD (Low Risk)', count: 887, percentage: '62.5%', fill: '#10b981' },
    { name: 'CKD Identified', count: 533, percentage: '37.5%', fill: '#f43f5e' }
  ],

  // Chart 2: Prediction Activity Over Time (Monthly)
  activityOverTime: [
    { month: 'Apr', predictions: 180, ckdCases: 62, notCkdCases: 118 },
    { month: 'May', predictions: 210, ckdCases: 75, notCkdCases: 135 },
    { month: 'Jun', predictions: 235, ckdCases: 84, notCkdCases: 151 },
    { month: 'Jul', predictions: 240, ckdCases: 91, notCkdCases: 149 },
    { month: 'Aug', predictions: 275, ckdCases: 106, notCkdCases: 169 },
    { month: 'Sep', predictions: 280, ckdCases: 115, notCkdCases: 165 }
  ],

  // Chart 3: Patient Registration & Activity
  patientActivity: [
    { month: 'Apr', newPatients: 35, activePatients: 140 },
    { month: 'May', newPatients: 42, activePatients: 182 },
    { month: 'Jun', newPatients: 50, activePatients: 232 },
    { month: 'Jul', newPatients: 48, activePatients: 280 },
    { month: 'Aug', newPatients: 62, activePatients: 342 },
    { month: 'Sep', newPatients: 65, activePatients: 420 }
  ],

  // Chart 4: Model Performance Placeholder Data
  modelPerformancePlaceholder: [
    { metric: 'Sensitivity (TPR)', demoScore: 97.8 },
    { metric: 'Specificity (TNR)', demoScore: 99.1 },
    { metric: 'ROC-AUC Score', demoScore: 99.2 },
    { metric: 'F1-Score', demoScore: 98.4 }
  ],

  // Activity Summary Cards Data
  activitySummary: {
    predictionActivity: {
      title: 'Prediction Activity',
      description: '280 predictions generated in Sep 2026 (+12% MoM growth)',
      status: 'Optimal'
    },
    patientActivity: {
      title: 'Patient Activity',
      description: '65 new demo patients registered in the last 30 days',
      status: 'Active'
    },
    doctorActivity: {
      title: 'Doctor Activity',
      description: '18 verified practitioners managing active clinical rosters',
      status: 'Normal'
    },
    systemActivity: {
      title: 'System Activity',
      description: '99.98% platform availability with zero security flags',
      status: 'Healthy'
    }
  }
};
