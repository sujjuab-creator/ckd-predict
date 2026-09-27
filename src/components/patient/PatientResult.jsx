import React from 'react';
import StatusBadge from './StatusBadge';
import MedicalDisclaimer from './MedicalDisclaimer';
import { PlusCircle, History, LayoutDashboard } from 'lucide-react';

export default function PatientResult({ onNavigate, latestPrediction }) {
  let record = latestPrediction;
  if (!record) {
    try {
      const saved = sessionStorage.getItem('ckd_latest_prediction');
      if (saved) record = JSON.parse(saved);
    } catch {}
  }

  if (!record) {
    record = {
      id: 'PRED-101',
      date: new Date().toISOString().split('T')[0],
      result: 'High Risk',
      model: 'RandomForest Classifier'
    };
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 text-center space-y-4 glow-cyan">
        <div className="inline-flex items-center space-x-2">
          <StatusBadge type="clinical-prediction" text="CLINICAL PREDICTION" />
        </div>

        <h1 className="text-3xl font-extrabold text-white">CKD Prediction Result</h1>
        <p className="text-xs text-slate-400">Generated on {record.date || new Date().toISOString().split('T')[0]}</p>

        {/* Big Result Card */}
        <div className="bg-slate-950/80 p-8 rounded-2xl border border-slate-800 space-y-3 my-4">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Prediction Outcome</span>
          <p className="text-4xl sm:text-5xl font-black text-rose-400 font-mono">
            {record.result || 'High Risk'}
          </p>
          <div className="flex justify-center items-center space-x-3 text-xs pt-2">
            <span className="text-slate-400">Model: <strong className="text-slate-200">{record.model || 'RandomForest Classifier'}</strong></span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">ID: <strong className="text-slate-200 font-mono">{record.id}</strong></span>
          </div>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <MedicalDisclaimer />

      {/* Navigation Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button
          onClick={() => onNavigate('/patient/history')}
          className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
        >
          <History className="w-4 h-4 text-sky-400" />
          <span>View History</span>
        </button>

        <button
          onClick={() => onNavigate('/patient/prediction')}
          className="py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-sky-500/20 flex items-center justify-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Prediction</span>
        </button>

        <button
          onClick={() => onNavigate('/patient')}
          className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
        >
          <LayoutDashboard className="w-4 h-4 text-teal-400" />
          <span>Dashboard</span>
        </button>
      </div>

    </div>
  );
}

