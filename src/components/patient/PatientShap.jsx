import React from 'react';
import { BarChart3, ArrowLeft } from 'lucide-react';
import MedicalDisclaimer from './MedicalDisclaimer';

export default function PatientShap({ onNavigate }) {
  const featureContributions = [
    { name: 'Serum Creatinine (sc)', type: 'Positive Contribution', value: '+32.4% Impact', color: 'rose' },
    { name: 'Albumin (al)', type: 'Positive Contribution', value: '+18.1% Impact', color: 'rose' },
    { name: 'Blood Urea (bu)', type: 'Positive Contribution', value: '+12.5% Impact', color: 'rose' },
    { name: 'Hemoglobin (hemo)', type: 'Negative Contribution', value: '-8.3% Impact', color: 'emerald' },
    { name: 'Sodium (sod)', type: 'Negative Contribution', value: '-5.2% Impact', color: 'emerald' }
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <button
            onClick={() => onNavigate('/patient')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Explainable AI — SHAP Visualization</h1>
          <p className="text-xs text-slate-400">Analysis of feature importance contributions for CKD risk estimation.</p>
        </div>

        <span className="px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-xs font-bold uppercase font-mono">
          SHAP Analysis
        </span>
      </div>

      {/* Feature Importance Cards */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Top Contributing Features</span>
          </h2>
          <span className="text-xs text-slate-500 font-mono">Impact Factor</span>
        </div>

        <div className="space-y-4">
          {featureContributions.map((item, idx) => (
            <div key={idx} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{item.name}</span>
                <div className="flex items-center space-x-3">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                    item.color === 'rose' ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {item.type}
                  </span>
                  <span className={`font-mono font-bold ${item.color === 'rose' ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {item.value}
                  </span>
                </div>
              </div>

              {/* Progress bar preview */}
              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                <div 
                  className={`h-full ${item.color === 'rose' ? 'bg-rose-500' : 'bg-emerald-500'} rounded-full`} 
                  style={{ width: `${60 - idx * 10}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MedicalDisclaimer />

    </div>
  );
}

