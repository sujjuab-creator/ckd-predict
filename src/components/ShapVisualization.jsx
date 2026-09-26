import React, { useState } from 'react';
import { 
  BarChart3, Sliders, CheckCircle2, ShieldAlert
} from 'lucide-react';
import { calculateEGFR, getCKDStage } from '../utils/ckdPredictor';

export default function ShapVisualization({ predictionResult }) {
  if (!predictionResult) return null;

  const { probabilityPercent, shapContributions } = predictionResult;

  // Interactive Simulator State based on current prediction values
  const [simCreatinine, setSimCreatinine] = useState(
    parseFloat(shapContributions.find(s => s.key === 'sc')?.value) || 2.1
  );
  const [simHemo, setSimHemo] = useState(
    parseFloat(shapContributions.find(s => s.key === 'hemo')?.value) || 11.2
  );

  // Recalculate simulated eGFR and Risk
  const simEgfr = calculateEGFR(simCreatinine, 56, 'Male');
  const simStage = getCKDStage(simEgfr);
  const simProb = Math.min(Math.max(Math.round(((simCreatinine - 0.9) * 45) + ((14 - simHemo) * 5)), 4), 99);

  return (
    <div className="space-y-8">
      
      {/* Explainable AI Intro Header */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-1">
              <BarChart3 className="w-4 h-4" />
              <span>Feature Contribution Analysis</span>
            </div>
            <h2 className="text-2xl font-bold text-white">Explainable AI Analysis</h2>
            <p className="text-xs text-slate-300">
              Understanding why the model predicted <strong className="text-sky-400">{probabilityPercent}% CKD Risk</strong> for this patient.
            </p>
          </div>

          <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs flex items-center space-x-4">
            <div>
              <p className="text-slate-500">Base Probability</p>
              <p className="font-mono font-bold text-slate-300">23.4%</p>
            </div>
            <div className="text-slate-600">→</div>
            <div>
              <p className="text-slate-500">Prediction Output</p>
              <p className={`font-mono font-bold ${probabilityPercent > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {probabilityPercent}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Contributions Breakdown */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span>
            <span>Biomarker Feature Contributions</span>
          </h3>
          <span className="text-xs text-slate-400">Sorted by feature impact magnitude</span>
        </div>

        <div className="space-y-4">
          {shapContributions.map((item, index) => {
            const isPositive = item.shapValue > 0;
            const absoluteVal = Math.abs(item.shapValue);
            const maxVal = 3.5;
            const barWidthPercent = Math.min((absoluteVal / maxVal) * 100, 100);

            return (
              <div key={index} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-2 hover:border-slate-700 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                  <div className="flex items-center space-x-2">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold font-mono text-[10px] ${
                      isPositive ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-semibold text-white">{item.feature}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">
                      Value: {item.value}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-right">
                    <span className="text-slate-400 text-[11px]">Normal: {item.normalRange}</span>
                    <span className={`font-mono font-bold text-xs ${isPositive ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {isPositive ? `+${item.shapValue} Impact` : `${item.shapValue} Impact`}
                    </span>
                  </div>
                </div>

                {/* Progress bar visual */}
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden flex">
                  {isPositive ? (
                    <div 
                      className="h-full bg-gradient-to-r from-rose-600 to-rose-400 rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPercent}%` }}
                    ></div>
                  ) : (
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${barWidthPercent}%` }}
                    ></div>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-normal">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Feature Simulator */}
      <div className="glass-panel rounded-2xl p-6 border border-sky-500/30 glow-cyan space-y-6">
        <div className="flex items-center space-x-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
          <Sliders className="w-4 h-4" />
          <span>Interactive Feature Impact Simulator</span>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Simulate Feature Modifications</h3>
          <p className="text-xs text-slate-300">
            Adjust patient serum creatinine or hemoglobin levels below to simulate how changing clinical markers impacts the prediction output.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-950/80 p-6 rounded-xl border border-slate-800">
          
          <div className="lg:col-span-7 space-y-5">
            {/* Serum Creatinine Simulator Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                <span>Simulated Serum Creatinine</span>
                <span className="font-mono text-sky-400">{simCreatinine} mg/dL</span>
              </div>
              <input 
                type="range" min="0.6" max="6.0" step="0.1" value={simCreatinine}
                onChange={(e) => setSimCreatinine(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.6 mg/dL (Normal)</span>
                <span>3.0 mg/dL (Elevated)</span>
                <span>6.0 mg/dL (High)</span>
              </div>
            </div>

            {/* Hemoglobin Simulator Slider */}
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-200 mb-1">
                <span>Simulated Hemoglobin Level</span>
                <span className="font-mono text-teal-400">{simHemo} g/dL</span>
              </div>
              <input 
                type="range" min="7.0" max="17.0" step="0.1" value={simHemo}
                onChange={(e) => setSimHemo(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>7.0 g/dL (Low)</span>
                <span>13.5 g/dL (Target)</span>
                <span>17.0 g/dL (Normal)</span>
              </div>
            </div>
          </div>

          {/* Simulator Impact Result Card */}
          <div className="lg:col-span-5 bg-slate-900 p-5 rounded-xl border border-slate-800 space-y-4">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Simulated Output Projection</span>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400">Simulated eGFR</span>
                <p className="text-2xl font-bold font-mono text-white mt-1">{simEgfr}</p>
                <span className="text-[10px] text-slate-400">{simStage.stage}</span>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                <span className="text-[10px] text-slate-400">Simulated Risk %</span>
                <p className={`text-2xl font-bold font-mono mt-1 ${simProb < probabilityPercent ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {simProb}%
                </p>
                <span className="text-[10px] text-slate-400">
                  {simProb < probabilityPercent ? `-${probabilityPercent - simProb}% Reduction` : `+${simProb - probabilityPercent}% Increase`}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-300 leading-normal">
              {simProb < probabilityPercent ? (
                <span className="text-emerald-400 flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                  Lowering creatinine to {simCreatinine} mg/dL reduces projected CKD risk by {probabilityPercent - simProb}%.
                </span>
              ) : (
                <span className="text-rose-400 flex items-center space-x-1">
                  <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
                  Higher creatinine level increases predicted disease risk.
                </span>
              )}
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
