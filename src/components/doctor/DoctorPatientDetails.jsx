import React, { useState } from 'react';
import { 
  User, ArrowLeft, Activity, FileText, AlertTriangle, 
  Calendar, CheckCircle2, Clock, ShieldCheck, Eye, Sparkles, X
} from 'lucide-react';
import { getPatientById, MOCK_PATIENTS } from '../../data/mockPatients';
import { getPredictionsByPatientId, MOCK_PREDICTIONS } from '../../data/mockPredictions';
import PredictionResultView from '../PredictionResultView';
import { predictCKD } from '../../utils/ckdPredictor';

export default function DoctorPatientDetails({ patientId, onNavigate }) {
  const patient = getPatientById(patientId) || MOCK_PATIENTS[0];
  const history = getPredictionsByPatientId(patient.id);
  const [selectedPredictionModal, setSelectedPredictionModal] = useState(null);

  // Latest prediction for summary
  const latestPred = history[0] || {
    id: `PRED-${patient.id}`,
    date: patient.lastPrediction,
    result: patient.result,
    model: 'Random Forest v2.4 (Ensemble)',
    status: 'Reviewed'
  };

  const clinical = patient.clinicalInfo || {
    bp: 135,
    sg: 1.015,
    al: 2,
    su: 1,
    sc: patient.lastCreatinine || 2.1,
    bu: 52,
    hemo: 11.2,
    bgr: 168,
    sod: 134,
    pot: 4.8,
    pcv: 35,
    wbcc: 9800,
    rbcc: 3.8,
    htn: 'yes',
    dm: 'yes',
    pe: 'yes',
    ane: 'no'
  };

  const handleViewPredictionDetails = (predRecord) => {
    // Generate full prediction view result using evaluator
    const fullResult = predictCKD({
      ...clinical,
      ...predRecord,
      age: patient.age,
      gender: patient.gender,
      sc: predRecord.sc || clinical.sc
    });
    setSelectedPredictionModal(fullResult);
  };

  return (
    <div className="space-y-8">
      
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => onNavigate('/doctor/patients')}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-all flex items-center space-x-2 w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Patients Roster</span>
        </button>

        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold w-fit">
          DEMO PATIENT RECORD
        </span>
      </div>

      {/* Demo Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400">DEMO INFORMATION: </span>
          <span>All patient profile details and lab findings are synthetic demonstration data.</span>
        </div>
      </div>

      {/* PATIENT INFORMATION CARD (Section 6) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800/80 pb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500/20 to-sky-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 font-bold text-xl">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-white">{patient.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-mono font-bold">
                  {patient.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">MRN: <strong className="text-slate-200 font-mono">{patient.mrn}</strong></p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className={`px-4 py-2 rounded-xl text-xs font-bold border ${
              patient.result === 'CKD'
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            }`}>
              Latest Result: {patient.result}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs">
          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-slate-400 block font-medium">Patient ID</span>
            <span className="text-white font-mono font-bold text-sm mt-0.5 block">{patient.id}</span>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-slate-400 block font-medium">Full Name</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{patient.name}</span>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-slate-400 block font-medium">Email</span>
            <span className="text-white font-mono text-sm mt-0.5 block truncate">{patient.email}</span>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-slate-400 block font-medium">Age</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{patient.age} years</span>
          </div>

          <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80">
            <span className="text-slate-400 block font-medium">Gender</span>
            <span className="text-white font-bold text-sm mt-0.5 block">{patient.gender}</span>
          </div>
        </div>
      </div>

      {/* PREDICTION SUMMARY CARD (Section 6) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Activity className="w-5 h-5 text-teal-400" />
          <span>Latest Prediction Summary</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-medium block">Prediction ID</span>
            <span className="text-teal-400 font-mono font-bold text-sm mt-0.5 block">{latestPred.id}</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-medium block">Prediction Date</span>
            <span className="text-white font-mono text-sm mt-0.5 block">{latestPred.date}</span>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-medium block">Result Classification</span>
            <span className={`font-bold text-sm mt-0.5 block ${
              latestPred.result === 'CKD' ? 'text-rose-400' : 'text-emerald-400'
            }`}>
              {latestPred.result}
            </span>
          </div>

          <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
            <span className="text-slate-400 font-medium block">ML Model Used</span>
            <span className="text-sky-400 font-semibold text-xs mt-0.5 block">{latestPred.model || 'Random Forest v2.4 (Ensemble)'}</span>
          </div>
        </div>
      </div>

      {/* CLINICAL INFORMATION CARD (Section 6) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>Clinical Information & Demo Biomarkers</span>
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">DEMO DATA</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Serum Creatinine</span>
            <span className="text-rose-400 font-mono font-bold text-sm">{clinical.sc} mg/dL</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Blood Urea</span>
            <span className="text-slate-200 font-mono font-bold text-sm">{clinical.bu} mg/dL</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Hemoglobin</span>
            <span className="text-sky-400 font-mono font-bold text-sm">{clinical.hemo} g/dL</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Blood Pressure</span>
            <span className="text-amber-400 font-mono font-bold text-sm">{clinical.bp} mmHg</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Specific Gravity</span>
            <span className="text-slate-200 font-mono font-bold text-sm">{clinical.sg}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Albumin Level</span>
            <span className="text-slate-200 font-mono font-bold text-sm">+{clinical.al}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Blood Glucose</span>
            <span className="text-slate-200 font-mono font-bold text-sm">{clinical.bgr} mg/dL</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Sodium (mEq/L)</span>
            <span className="text-slate-200 font-mono font-bold text-sm">{clinical.sod}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Potassium (mEq/L)</span>
            <span className="text-slate-200 font-mono font-bold text-sm">{clinical.pot}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Hypertension</span>
            <span className="text-slate-200 font-bold capitalize text-sm">{clinical.htn}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Diabetes Mellitus</span>
            <span className="text-slate-200 font-bold capitalize text-sm">{clinical.dm}</span>
          </div>

          <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
            <span className="text-slate-400 block text-[11px]">Pedal Edema</span>
            <span className="text-slate-200 font-bold capitalize text-sm">{clinical.pe}</span>
          </div>
        </div>
      </div>

      {/* PATIENT PREDICTION HISTORY (Section 7) */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Clock className="w-5 h-5 text-teal-400" />
          <span>Prediction History</span>
        </h2>

        {history.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No prediction history recorded for this patient.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-3 px-4">Prediction ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4">Model</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {history.map(pred => (
                  <tr key={pred.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{pred.id}</td>
                    <td className="py-3.5 px-4 text-slate-300 font-mono">{pred.date}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        pred.result === 'CKD'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {pred.result}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{pred.model || 'Random Forest v2.4 (Ensemble)'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-semibold">
                        {pred.status || 'Reviewed'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleViewPredictionDetails(pred)}
                        className="px-3.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold text-xs transition-all flex items-center space-x-1 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Prediction</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prediction Details Modal */}
      {selectedPredictionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">Prediction Details Breakdown</h3>
              <button
                onClick={() => setSelectedPredictionModal(null)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PredictionResultView
              predictionResult={selectedPredictionModal}
              currentUser={{ name: patient.name, role: 'doctor' }}
              onBackToForm={() => setSelectedPredictionModal(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
