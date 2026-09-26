import React from 'react';
import { X, Printer, Activity, ShieldCheck } from 'lucide-react';

export default function PdfReportModal({ predictionResult, patientData, onClose }) {
  if (!predictionResult) return null;

  const handlePrint = () => {
    window.print();
  };

  const { probabilityPercent, riskCategory, eGFR, stageInfo, recommendations, shapContributions, timestamp } = predictionResult;
  const pName = patientData?.name || 'Johnathan Doe';
  const pMrn = patientData?.mrn || 'MRN-884920';
  const pAge = patientData?.age || 56;
  const pGender = patientData?.gender || 'Male';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-8">
        
        {/* Modal Action Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-950 no-print">
          <div className="flex items-center space-x-2 text-white font-bold text-sm">
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Official Clinical PDF Lab Report</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Sheet */}
        <div id="printable-report" className="p-8 sm:p-12 bg-slate-950 text-slate-200 space-y-8 font-sans">
          
          {/* Document Letterhead */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Activity className="w-6 h-6 text-sky-400" />
                <span className="text-xl font-bold font-mono text-white">CKD<span className="gradient-text">PREDICT</span></span>
              </div>
              <p className="text-xs text-slate-400 mt-1">Chronic Kidney Disease Prediction System</p>
              <p className="text-[10px] text-slate-500">AI-assisted platform for clinical data analysis</p>
            </div>

            <div className="text-right text-xs space-y-1">
              <span className="px-3 py-1 rounded bg-sky-500/10 text-sky-400 font-mono font-bold border border-sky-500/30 inline-block">
                CLINICAL REPORT SUMMARY
              </span>
              <p className="text-slate-400 mt-1">Date: {timestamp}</p>
              <p className="text-slate-500 font-mono text-[11px]">Report ID: REP-{Math.floor(100000 + Math.random() * 900000)}</p>
            </div>
          </div>

          {/* Patient Profile Header Grid */}
          <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Patient Name</span>
              <p className="font-bold text-white text-sm mt-0.5">{pName}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Medical Record No.</span>
              <p className="font-mono text-slate-300 font-semibold mt-0.5">{pMrn}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Demographics</span>
              <p className="text-slate-300 mt-0.5">{pAge} yrs / {pGender}</p>
            </div>
            <div>
              <span className="text-slate-500 uppercase tracking-wider text-[10px]">Attending Physician</span>
              <p className="text-teal-400 font-semibold mt-0.5">Dr. Aris Thorne (MD)</p>
            </div>
          </div>

          {/* Risk & eGFR Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">CKD Risk Probability</span>
              <p className="text-2xl font-black text-rose-400 font-mono mt-1">{probabilityPercent}% Risk</p>
              <span className="text-[11px] text-rose-300 font-medium">{riskCategory}</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">eGFR Index</span>
              <p className="text-2xl font-black text-sky-400 font-mono mt-1">{eGFR}</p>
              <span className="text-[11px] text-slate-400">mL/min/1.73m²</span>
            </div>

            <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 text-center">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Clinical Stage</span>
              <p className="text-lg font-bold text-white mt-1.5">{stageInfo.stage}</p>
              <span className="text-[10px] text-slate-400">{stageInfo.severity} Impairment</span>
            </div>

          </div>

          {/* Key Biomarker Laboratory Panel */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase text-slate-300 tracking-wider">Physiological & Laboratory Panel</h4>
            
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                  <th className="py-2">Biomarker Feature</th>
                  <th className="py-2">Measured Value</th>
                  <th className="py-2">Reference Range</th>
                  <th className="py-2">Feature Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {shapContributions.slice(0, 7).map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40">
                    <td className="py-2 font-medium text-slate-200">{item.feature}</td>
                    <td className="py-2 font-mono text-white font-semibold">{item.value}</td>
                    <td className="py-2 text-slate-400">{item.normalRange}</td>
                    <td className={`py-2 font-mono font-bold ${item.shapValue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {item.shapValue > 0 ? `+${item.shapValue}` : item.shapValue}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendations Block */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-2">
            <h4 className="text-xs font-bold uppercase text-white tracking-wider">Clinical Action Plan</h4>
            <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
              {recommendations.map((rec, i) => (
                <li key={i}>{rec}</li>
              ))}
            </ul>
          </div>

          {/* Physician Signature & Disclaimer Footer */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <p className="text-[10px] text-slate-500 italic">
              This system provides AI-assisted prediction for demonstration and research purposes. It is not a substitute for professional medical diagnosis.
            </p>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>CKD PREDICT System</span>
              </div>

              <div className="text-right space-y-1">
                <div className="border-b border-slate-700 w-48 ml-auto pb-1 text-center font-serif italic text-slate-300">
                  Dr. Aris Thorne, MD
                </div>
                <p className="text-[10px] text-slate-500">Board Certified Senior Nephrologist</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
