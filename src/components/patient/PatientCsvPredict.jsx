import React, { useState } from 'react';
import {
  Upload, FileCheck, FileX, Sparkles, Download, CheckCircle, AlertTriangle,
  FileText, ArrowRight, RefreshCw, Activity, ShieldAlert, Info, HelpCircle
} from 'lucide-react';
import apiService from '../../services/api';
import { Card, Alert, RiskBadge, Disclaimer } from '../ui/UI';
import { FEATURES, featureLabel, featureValueText } from '../../data/featureSchema';
import { formatPercent, isRiskResult } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';
import { useReportDownload } from './patientUi';

// Important clinical markers required for explicit display in Data Preview
const KEY_CLINICAL_FIELDS = [
  { name: 'SystolicBP', altName: 'DiastolicBP', label: 'Blood Pressure', getVal: (vals) => vals.SystolicBP != null ? `${vals.SystolicBP}/${vals.DiastolicBP || '—'} mmHg` : '—' },
  { name: 'HemoglobinLevels', label: 'Hemoglobin', getVal: (vals) => vals.HemoglobinLevels != null ? `${vals.HemoglobinLevels} g/dL` : '—' },
  { name: 'SerumCreatinine', label: 'Serum Creatinine', getVal: (vals) => vals.SerumCreatinine != null ? `${vals.SerumCreatinine} mg/dL` : '—' },
  { name: 'FastingBloodSugar', label: 'Blood Glucose', getVal: (vals) => vals.FastingBloodSugar != null ? `${vals.FastingBloodSugar} mg/dL` : '—' },
  { name: 'ACR', altName: 'ProteinInUrine', label: 'Albumin', getVal: (vals) => vals.ACR != null ? `${vals.ACR} mg/g (ACR)` : (vals.ProteinInUrine != null ? `${vals.ProteinInUrine} g/day` : '—') },
  { name: 'SerumElectrolytesSodium', label: 'Sodium', getVal: (vals) => vals.SerumElectrolytesSodium != null ? `${vals.SerumElectrolytesSodium} mEq/L` : '—' },
  { name: 'SerumElectrolytesPotassium', label: 'Potassium', getVal: (vals) => vals.SerumElectrolytesPotassium != null ? `${vals.SerumElectrolytesPotassium} mEq/L` : '—' },
  { name: 'BUNLevels', label: 'Blood Urea', getVal: (vals) => vals.BUNLevels != null ? `${vals.BUNLevels} mg/dL` : '—' },
  { name: 'GFR', label: 'Packed Cell Volume / eGFR', getVal: (vals) => vals.GFR != null ? `${vals.GFR} mL/min/1.73m²` : '—' },
  { name: 'RBC', label: 'Red Blood Cell Count', getVal: (vals) => vals.RBC != null ? String(vals.RBC) : 'Included in Blood Profile' },
  { name: 'WBC', label: 'White Blood Cell Count', getVal: (vals) => vals.WBC != null ? String(vals.WBC) : 'Included in Blood Profile' },
];

export default function PatientCsvPredict({ onNavigate }) {
  const { currentUser } = useAuth();
  const dl = useReportDownload();

  const [file, setFile] = useState(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [validationError, setValidationError] = useState('');

  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predictionError, setPredictionError] = useState('');
  const [showAllFields, setShowAllFields] = useState(false);

  // Download Sample CSV Helper
  const handleDownloadSampleCsv = () => {
    // Generate valid sample CSV with exact 51 feature names and logged-in patient ID if available
    const patientIdVal = currentUser?.patient_id || 'PAT-0001';
    const sampleValues = {
      PatientID: patientIdVal,
      Age: 54, Gender: 0, Ethnicity: 0, SocioeconomicStatus: 1, EducationLevel: 2,
      BMI: 27.5, Smoking: 0, AlcoholConsumption: 2, PhysicalActivity: 3, DietQuality: 7, SleepQuality: 7,
      FamilyHistoryKidneyDisease: 0, FamilyHistoryHypertension: 1, FamilyHistoryDiabetes: 0,
      PreviousAcuteKidneyInjury: 0, UrinaryTractInfections: 0,
      SystolicBP: 135, DiastolicBP: 85, FastingBloodSugar: 110, HbA1c: 6.1,
      SerumCreatinine: 1.4, BUNLevels: 24, GFR: 65, ProteinInUrine: 0.5, ACR: 45,
      SerumElectrolytesSodium: 138, SerumElectrolytesPotassium: 4.4, SerumElectrolytesCalcium: 9.2, SerumElectrolytesPhosphorus: 3.6,
      HemoglobinLevels: 12.8, CholesterolTotal: 210, CholesterolLDL: 130, CholesterolHDL: 48, CholesterolTriglycerides: 160,
      ACEInhibitors: 1, Diuretics: 0, NSAIDsUse: 1, Statins: 0, AntidiabeticMedications: 0,
      Edema: 0, FatigueLevels: 3, NauseaVomiting: 0, MuscleCramps: 0, Itching: 0, QualityOfLifeScore: 75,
      HeavyMetalsExposure: 0, OccupationalExposureChemicals: 0, WaterQuality: 0, MedicalCheckupsFrequency: 2,
      MedicationAdherence: 9, HealthLiteracy: 8
    };

    const headers = Object.keys(sampleValues).join(',');
    const row = Object.values(sampleValues).join(',');
    const csvContent = `${headers}\n${row}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patient_data_${patientIdVal}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setValidationError('');
    setValidationResult(null);
    setPredictionResult(null);
    setPredictionError('');

    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setValidationError('Invalid file type. Please upload a CSV file (.csv).');
      return;
    }

    setValidating(true);
    const res = await apiService.validatePatientCsv(selectedFile);
    setValidating(false);

    if (res.ok && res.data?.success) {
      setValidationResult(res.data);
    } else {
      const errorMsg = res.data?.error || 'CSV validation failed. Please check your CSV file.';
      setValidationError(errorMsg);
      if (res.data?.fields) {
        setValidationResult(res.data);
      }
    }
  };

  const handleRunPrediction = async () => {
    if (!validationResult || !validationResult.parsed_values) return;

    setPredicting(true);
    setPredictionError('');

    const res = await apiService.predictPatientCsv(validationResult.parsed_values, file?.name || 'patient_data.csv');
    setPredicting(false);

    if (res.ok && res.data?.success) {
      setPredictionResult(res.data);
    } else {
      setPredictionError(res.data?.error || 'Prediction failed. Please try again.');
    }
  };

  const handleReset = () => {
    setFile(null);
    setValidationResult(null);
    setValidationError('');
    setPredictionResult(null);
    setPredictionError('');
  };

  const parsedValues = validationResult?.parsed_values || {};
  const isValidCsv = validationResult && validationResult.status === 'Valid CSV';

  return (
    <div className="stack-lg">
      {/* Header Banner */}
      <div className="welcome">
        <div>
          <span className="badge badge-blue"><Activity /> CKD Risk Assessment</span>
          <h1 style={{ marginTop: 12 }}>CSV Upload Prediction</h1>
          <p>
            Upload your clinical laboratory results in CSV format to run an AI-assisted CKD risk prediction
            and generate your medical PDF report.
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={handleDownloadSampleCsv}>
          <Download /> Download Sample CSV
        </button>
      </div>

      {/* Step 1: Upload CSV */}
      {!predictionResult && (
        <Card title="1. Upload Medical CSV Data" icon={Upload}>
          <div className="stack">
            <div
              className={`upload-dropzone ${file ? 'has-file' : ''}`}
              style={{
                border: '2px dashed var(--border-color, #cbd5e1)',
                borderRadius: 16,
                padding: '32px 24px',
                textAlign: 'center',
                background: 'var(--bg-subtle, #f8fafc)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onClick={() => document.getElementById('patient-csv-input')?.click()}
            >
              <input
                id="patient-csv-input"
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <div className="stack-sm align-center">
                <span className="ic tone-blue" style={{ width: 48, height: 48, borderRadius: 24, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload style={{ width: 24, height: 24 }} />
                </span>
                <div>
                  <b style={{ fontSize: 16 }}>Click to choose or drop your CSV file here</b>
                  <p className="muted small" style={{ marginTop: 4 }}>
                    Accepts standard <b>.csv</b> files containing your clinical lab measurements.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    document.getElementById('patient-csv-input')?.click();
                  }}
                >
                  [ Upload CSV ]
                </button>
              </div>
            </div>

            {validating && (
              <div className="row wrap align-center" style={{ gap: 10, color: 'var(--color-primary)' }}>
                <RefreshCw className="spin" />
                <span>Validating CSV columns and data types...</span>
              </div>
            )}

            {validationError && (
              <Alert type="error">
                <b>Validation Error:</b> {validationError}
              </Alert>
            )}

            {file && validationResult && (
              <div className="stack-sm" style={{ marginTop: 12, padding: 16, borderRadius: 12, background: isValidCsv ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)', border: `1px solid ${isValidCsv ? '#bbf7d0' : '#fca5a5'}` }}>
                <div className="row wrap justify-between align-center">
                  <div>
                    <span className="muted small">File: </span>
                    <b className="mono" style={{ fontSize: 15 }}>{validationResult.file_name || file.name}</b>
                  </div>
                  <div>
                    <span className="muted small">Status: </span>
                    <span className={`badge ${isValidCsv ? 'badge-green' : 'badge-red'}`}>
                      {isValidCsv ? <CheckCircle style={{ width: 14, height: 14 }} /> : <AlertTriangle style={{ width: 14, height: 14 }} />}
                      {validationResult.status_label || (isValidCsv ? 'Valid CSV' : 'Invalid CSV')}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Step 2: Patient Data Preview */}
      {validationResult && !predictionResult && (
        <Card
          title="Patient Data Preview"
          icon={FileText}
          actions={
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAllFields(!showAllFields)}>
              {showAllFields ? 'Show Summary View' : 'Show All Features'}
            </button>
          }
        >
          <div className="stack">
            <p className="small muted">
              The uploaded clinical and laboratory values below have been validated against the system's feature schema.
              Review your data preview before initiating AI prediction.
            </p>

            {/* Key Clinical Information Grid */}
            <div className="grid-3" style={{ marginTop: 8 }}>
              {KEY_CLINICAL_FIELDS.map((field) => {
                const valDisplay = field.getVal(parsedValues);
                return (
                  <div key={field.name} style={{ padding: '12px 16px', borderRadius: 10, background: 'var(--bg-subtle, #f8fafc)', border: '1px solid var(--border-color, #e2e8f0)' }}>
                    <span className="small muted font-semibold" style={{ display: 'block' }}>{field.label}</span>
                    <b style={{ fontSize: 16, color: 'var(--color-primary, #1e3a8a)', display: 'block', marginTop: 4 }}>
                      {valDisplay}
                    </b>
                  </div>
                );
              })}
            </div>

            {/* All 51 Model Input Fields (Expandable) */}
            {showAllFields && (
              <div style={{ marginTop: 16 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>Complete Model Feature Set (51 Features)</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8, maxHeight: 320, overflowY: 'auto', paddingRight: 8 }}>
                  {FEATURES.map((feat) => {
                    const val = parsedValues[feat.name];
                    const valText = featureValueText(feat.name, val);
                    return (
                      <div key={feat.name} className="small" style={{ padding: '6px 10px', borderRadius: 6, background: '#f1f5f9', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="muted">{feat.label}:</span>
                        <b className="mono">{valText}</b>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Bar */}
            <div className="row wrap justify-between align-center" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
              <button className="btn btn-outline" onClick={handleReset}>
                <RefreshCw /> Upload Different File
              </button>

              <button
                className="btn btn-primary btn-lg"
                onClick={handleRunPrediction}
                disabled={!isValidCsv || predicting}
              >
                {predicting ? (
                  <>
                    <RefreshCw className="spin" /> Analyzing / Predicting...
                  </>
                ) : (
                  <>
                    <Sparkles /> [ Analyze / Predict ]
                  </>
                )}
              </button>
            </div>

            {predictionError && (
              <Alert type="error" style={{ marginTop: 12 }}>
                {predictionError}
              </Alert>
            )}
          </div>
        </Card>
      )}

      {/* Step 3: Prediction Result & Download PDF */}
      {predictionResult && (
        <div className="stack-lg">
          <Card title="Prediction Result" icon={ShieldAlert}>
            <div className="stack align-center text-center" style={{ padding: '24px 16px' }}>
              <RiskBadge result={predictionResult.prediction_result} style={{ fontSize: 18, padding: '8px 24px' }} />

              <div style={{ marginTop: 16 }}>
                <div className="stat-value" style={{ fontSize: 36, fontWeight: 800 }}>
                  {formatPercent(predictionResult.probability ?? predictionResult.prediction_probability)}
                </div>
                <div className="muted" style={{ fontSize: 15, marginTop: 4 }}>
                  Risk Probability: <b>{predictionResult.risk_percentage ?? roundPct(predictionResult.probability)}%</b>
                </div>
              </div>

              <p className="small muted" style={{ maxWidth: 560, marginTop: 12 }}>
                {predictionResult.disclaimer || 'AI-Assisted Prediction — Not a Medical Diagnosis'}
              </p>

              <div className="row wrap justify-center" style={{ gap: 16, marginTop: 24 }}>
                {predictionResult.report && (
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={() => dl.download(predictionResult.report)}
                    disabled={dl.busy === String(predictionResult.report.report_id)}
                  >
                    <Download /> [ Download PDF Report ]
                  </button>
                )}

                <button className="btn btn-outline btn-lg" onClick={handleReset}>
                  <RefreshCw /> Upload Another CSV
                </button>
              </div>

              {dl.error && <Alert type="error" style={{ marginTop: 16 }}>{dl.error}</Alert>}
            </div>
          </Card>

          <Disclaimer text="AI-Assisted Prediction — Not a Medical Diagnosis. Results are generated automatically based on supplied CSV health parameters and do not constitute a clinical diagnosis. Always consult your assigned physician for medical advice." />
        </div>
      )}
    </div>
  );
}

function roundPct(prob) {
  if (prob == null) return '0.0';
  return (prob * 100).toFixed(1);
}
