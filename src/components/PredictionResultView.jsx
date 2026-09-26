import React, { useState } from 'react';
import { 
  CheckCircle2, FileText, Printer, Stethoscope, Sparkles, 
  BarChart3, AlertCircle 
} from 'lucide-react';
import ShapVisualization from './ShapVisualization';

export default function PredictionResultView({ 
  predictionResult, 
  currentUser, 
  onBackToForm, 
  onOpenPdfReport,
  onSaveDoctorNotes 
}) {
  if (!predictionResult) return null;

  const { 
    probabilityPercent, riskCategory, statusColor, badgeStyle, 
    eGFR, stageInfo, shapContributions, recommendations, timestamp 
  } = predictionResult;

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'shap'
  const [doctorNotes, setDoctorNotes] = useState(predictionResult.doctorNotes || '');
  const [isVerified, setIsVerified] = useState(predictionResult.doctorVerified || false);

  const handleVerify = () => {
    setIsVerified(true);
    if (onSaveDoctorNotes) {
      onSaveDoctorNotes(doctorNotes, true);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-2xl p-6 border border-slate-800">
        <div>
          <div className="inline-flex items-center space-x-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>CKD Prediction Result</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Prediction & Patient Data Evaluation</h2>
          <p className="text-xs text-slate-400">Generated on {timestamp} • Assessment #{predictionResult.id || 'PRED-9941'}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onBackToForm}
            className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
          >
            New Prediction
          </button>

          <button
            onClick={onOpenPdfReport}
            className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Export Report</span>
          </button>
        </div>
      </div>

      {/* Main Score Overview Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Risk Probability Meter Tile */}
        <div className="md:col-span-6 glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-6 glow-cyan">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">CKD Risk Stratification</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeStyle}`}>
              {riskCategory}
            </span>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="relative inline-flex items-center justify-center">
              <svg className="w-48 h-48 transform -rotate-90">
                <circle
                  cx="96" cy="96" r="76"
                  stroke="currentColor" strokeWidth="12"
                  className="text-slate-800" fill="transparent"
                />
                <circle
                  cx="96" cy="96" r="76"
                  stroke={statusColor} strokeWidth="12"
                  strokeDasharray="477"
                  strokeDashoffset={477 - (477 * probabilityPercent) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                  fill="transparent"
                />
              </svg>
              <div className="absolute text-center space-y-0.5">
                <span className="text-4xl font-black text-white font-mono">{probabilityPercent}%</span>
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Disease Prob.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 max-w-xs mx-auto">
              Prediction based on machine learning analysis of physiological patient features.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex justify-between text-xs text-slate-400">
            <span>Model Analysis State</span>
            <span className="font-mono text-emerald-400 font-bold">Processed</span>
          </div>
        </div>

        {/* eGFR & Clinical Stage Tile */}
        <div className="md:col-span-6 glass-panel rounded-3xl p-6 border border-slate-800 flex flex-col justify-between space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Renal Metric</span>
            <span className="px-2.5 py-0.5 rounded bg-sky-500/10 text-sky-400 text-xs font-semibold border border-sky-500/30">
              eGFR Index
            </span>
          </div>

          <div className="space-y-4">
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400">Glomerular Filtration Clearance (eGFR)</p>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-4xl font-extrabold text-white font-mono">{eGFR}</span>
                <span className="text-xs text-slate-400">mL/min/1.73m²</span>
              </div>
            </div>

            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center space-x-2 text-white font-bold text-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stageInfo.color }}></span>
                <span>{stageInfo.title}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {stageInfo.description}
              </p>
            </div>
          </div>

          {/* eGFR Stage Bar Indicator */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>Stage 5 (&lt;15)</span>
              <span>Stage 3 (30-59)</span>
              <span>Stage 1 (&gt;90)</span>
            </div>
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
              <div className="h-full bg-red-600 w-1/5" title="Stage 5"></div>
              <div className="h-full bg-rose-500 w-1/5" title="Stage 4"></div>
              <div className="h-full bg-amber-500 w-1/5" title="Stage 3"></div>
              <div className="h-full bg-cyan-500 w-1/5" title="Stage 2"></div>
              <div className="h-full bg-emerald-500 w-1/5" title="Stage 1"></div>
            </div>
          </div>
        </div>

      </div>

      {/* Tabs Navigation: Summary View vs Explainable AI */}
      <div className="flex border-b border-slate-800 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('summary')}
          className={`pb-3 px-6 border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'summary' 
              ? 'border-sky-500 text-sky-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Clinical Summary & Recommendations</span>
        </button>

        <button
          onClick={() => setActiveTab('shap')}
          className={`pb-3 px-6 border-b-2 transition-all flex items-center space-x-2 ${
            activeTab === 'shap' 
              ? 'border-indigo-500 text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Explainable AI</span>
        </button>
      </div>

      {/* TAB CONTENT: Summary & Actionable Recommendations */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Actionable Clinical Recommendations Card */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Patient Clinical Action Plan</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5 font-mono text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Primary Biomarker Drivers */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>Primary Biomarker Contributors</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {shapContributions.slice(0, 6).map((item, idx) => (
                <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{item.feature}</span>
                    <span className={`font-mono text-[11px] ${item.shapValue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.shapValue > 0 ? `+${item.shapValue}` : item.shapValue}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">Value: <strong className="text-slate-200">{item.value}</strong></p>
                  <p className="text-[10px] text-slate-500 truncate">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Attending Doctor Sign-Off & Verification Box */}
          {(currentUser?.role === 'doctor' || isVerified) && (
            <div className="glass-panel rounded-2xl p-6 border border-teal-500/30 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
                  <Stethoscope className="w-5 h-5" />
                  <span>Doctor Review & Notes</span>
                </div>
                {isVerified && (
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Reviewed by Doctor</span>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Doctor Evaluation Notes</label>
                <textarea
                  rows="3"
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  disabled={isVerified && currentUser?.role !== 'doctor'}
                  placeholder="Enter medical evaluation, recommended lab re-tests, or referral notes..."
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                ></textarea>
              </div>

              {currentUser?.role === 'doctor' && !isVerified && (
                <button
                  onClick={handleVerify}
                  className="px-6 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-teal-500/20"
                >
                  Save & Sign-Off Notes
                </button>
              )}
            </div>
          )}

        </div>
      )}

      {/* TAB CONTENT: Explainable AI */}
      {activeTab === 'shap' && (
        <ShapVisualization predictionResult={predictionResult} />
      )}

    </div>
  );
}
