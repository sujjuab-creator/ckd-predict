import React, { useState } from 'react';
import { 
  Activity, ArrowRight, CheckCircle2, BarChart3, 
  Sparkles, Stethoscope, Users, Sliders, ChevronRight
} from 'lucide-react';
import { calculateEGFR, getCKDStage } from '../utils/ckdPredictor';

export default function Home({ onNavigate, onDemoLogin }) {
  // Interactive Risk Calculator preview state
  const [quickAge, setQuickAge] = useState(54);
  const [quickCreatinine, setQuickCreatinine] = useState(1.8);
  const [quickHemo, setQuickHemo] = useState(11.5);
  const [quickBp, setQuickBp] = useState(135);

  const quickEgfr = calculateEGFR(quickCreatinine, quickAge, 'Male');
  const quickStage = getCKDStage(quickEgfr);
  const quickProb = Math.min(Math.max(Math.round(((quickCreatinine - 0.9) * 45) + ((14 - quickHemo) * 5)), 5), 98);

  return (
    <div className="space-y-20 pb-16">
      
      {/* Hero Section */}
      <section className="relative pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-r from-sky-500/20 via-indigo-500/20 to-teal-500/20 blur-[120px] -z-10 pointer-events-none rounded-full"></div>

        <div className="text-center space-y-6 max-w-4xl mx-auto">
          
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-semibold uppercase tracking-wider animate-pulse-subtle">
            <Sparkles className="w-4 h-4 text-sky-400" />
            <span>Chronic Kidney Disease Prediction System</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
            Chronic Kidney Disease Prediction <span className="gradient-text">Using Machine Learning</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
            An AI-assisted platform for analyzing clinical patient data and supporting CKD prediction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <button
              onClick={() => onNavigate('/assessment')}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-base shadow-xl shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 flex items-center space-x-2"
            >
              <Activity className="w-5 h-5 text-white" />
              <span>Start CKD Prediction</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => onDemoLogin('doctor')}
              className="px-8 py-4 rounded-2xl glass-card hover:bg-slate-800/80 text-slate-200 border border-slate-700 font-semibold text-base transition-all flex items-center space-x-2"
            >
              <Stethoscope className="w-5 h-5 text-teal-400" />
              <span>Doctor Portal</span>
            </button>
          </div>

          {/* Quick Demo Access Buttons */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400">
            <span className="text-slate-500 font-medium">Demo Login Access:</span>
            <button 
              onClick={() => onDemoLogin('patient')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-sky-500/50 hover:text-sky-400 transition-all flex items-center space-x-1.5"
            >
              <Users className="w-3.5 h-3.5 text-sky-400" />
              <span>Login as Patient</span>
            </button>
            <button 
              onClick={() => onDemoLogin('doctor')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-teal-500/50 hover:text-teal-400 transition-all flex items-center space-x-1.5"
            >
              <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
              <span>Login as Doctor</span>
            </button>
            <button 
              onClick={() => onDemoLogin('admin')}
              className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center space-x-1.5"
            >
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>Login as Admin</span>
            </button>
          </div>

        </div>
      </section>

      {/* Quick Interactive Risk Simulator Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 border border-sky-500/20 glow-cyan relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center space-x-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
                <Sliders className="w-4 h-4" />
                <span>Interactive Clinical Preview</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-bold text-white">
                Patient Data Analysis & Risk Estimation
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Adjust clinical parameters below to see how key biomarkers influence risk prediction modeling.
              </p>

              <div className="space-y-4 pt-2">
                
                {/* Age Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Patient Age</span>
                    <span className="font-mono text-sky-400">{quickAge} years</span>
                  </div>
                  <input 
                    type="range" min="18" max="90" value={quickAge} 
                    onChange={(e) => setQuickAge(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Serum Creatinine Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Serum Creatinine (mg/dL)</span>
                    <span className="font-mono text-sky-400">{quickCreatinine} mg/dL</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="8.0" step="0.1" value={quickCreatinine} 
                    onChange={(e) => setQuickCreatinine(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
                  />
                </div>

                {/* Hemoglobin Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Hemoglobin (g/dL)</span>
                    <span className="font-mono text-teal-400">{quickHemo} g/dL</span>
                  </div>
                  <input 
                    type="range" min="6.0" max="18.0" step="0.1" value={quickHemo} 
                    onChange={(e) => setQuickHemo(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
                  />
                </div>

                {/* BP Slider */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                    <span>Systolic Blood Pressure (mmHg)</span>
                    <span className="font-mono text-indigo-400">{quickBp} mmHg</span>
                  </div>
                  <input 
                    type="range" min="90" max="190" step="1" value={quickBp} 
                    onChange={(e) => setQuickBp(parseInt(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

              </div>
            </div>

            {/* Calculated Output Card */}
            <div className="lg:col-span-6 bg-slate-900/90 rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Prediction Output</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${quickStage.badgeClass}`}>
                  {quickStage.stage}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">eGFR Index</p>
                  <p className="text-3xl font-black text-white font-mono mt-1">
                    {quickEgfr} <span className="text-xs text-slate-500 font-normal">mL/min</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">Calculated Clearance</p>
                </div>

                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs text-slate-400">CKD Probability</p>
                  <p className={`text-3xl font-black font-mono mt-1 ${quickProb > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {quickProb}%
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">{quickProb > 50 ? 'High Risk Indication' : 'Low Risk Indication'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>Risk Stratification</span>
                  <span className="font-semibold text-slate-200">{quickStage.title}</span>
                </div>
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500 transition-all duration-300"
                    style={{ width: `${quickProb}%` }}
                  ></div>
                </div>
              </div>

              <button
                onClick={() => onNavigate('/assessment')}
                className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all flex items-center justify-center space-x-2"
              >
                <span>Start Full CKD Prediction</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Modules Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <h2 className="text-3xl font-bold text-white">System Features & Modules</h2>
          <p className="text-sm text-slate-400">
            A comprehensive suite for patient data management, prediction history, explainable AI, and medical analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Patient Module */}
          <div className="glass-card rounded-2xl p-8 space-y-6 flex flex-col justify-between hover:border-sky-500/40 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Patient Portal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Access self-service CKD prediction, view prediction history, examine feature contributions, and export medical reports.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>CKD Prediction input form</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Prediction History & longitudinal trend</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Explainable AI feature breakdown</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onDemoLogin('patient')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Patient</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Doctor Module */}
          <div className="glass-card rounded-2xl p-8 space-y-6 flex flex-col justify-between hover:border-teal-500/40 transition-all border-teal-500/20 bg-slate-900/60">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-teal-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Doctor Portal</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Search patient rosters, inspect clinical details, perform CKD prediction assessments, and review medical reports.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Patient Data Management & Search</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Clinical Patient Details</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Medical Reports & Notes</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onDemoLogin('doctor')}
              className="w-full py-3 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Doctor</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Admin Module */}
          <div className="glass-card rounded-2xl p-8 space-y-6 flex flex-col justify-between hover:border-indigo-500/40 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Admin Dashboard</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Manage user accounts, patient registries, doctor rosters, and analyze system-wide analytics.
              </p>
              <ul className="space-y-2 text-xs text-slate-400">
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>User & Roster Management</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>Patient & Doctor Directories</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-400" />
                  <span>System Analytics & Visualizations</span>
                </li>
              </ul>
            </div>
            <button
              onClick={() => onDemoLogin('admin')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold text-xs transition-all flex items-center justify-center space-x-2"
            >
              <span>Login as Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </section>

      {/* Feature Section: Explainable AI & Data Analysis */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 sm:p-12 border border-slate-800 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <BarChart3 className="w-4 h-4" />
                <span>Explainable AI</span>
              </div>
              <h2 className="text-3xl font-bold text-white">
                Transparent Feature Analysis
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                The platform highlights key biomarker factors influencing the prediction, providing structured insights for both healthcare professionals and patients.
              </p>

              <div className="pt-4">
                <button
                  onClick={() => onNavigate('/assessment')}
                  className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all flex items-center space-x-2"
                >
                  <span>Start Prediction</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Visual Sample Feature Chart */}
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-200">Biomarker Feature Contributions</span>
                <span>Base Value = 23.4%</span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Serum Creatinine (2.1 mg/dL)</span>
                    <span className="text-rose-400 font-mono font-semibold">+32.4% Impact</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex">
                    <div className="bg-slate-800 h-full w-1/3"></div>
                    <div className="bg-rose-500 h-full w-2/3 rounded-r-full"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Albumin Grade 2</span>
                    <span className="text-rose-400 font-mono font-semibold">+18.1% Impact</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex">
                    <div className="bg-slate-800 h-full w-[45%]"></div>
                    <div className="bg-rose-500/80 h-full w-[35%] rounded-r-full"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">Normal Sodium (138 mEq/L)</span>
                    <span className="text-emerald-400 font-mono font-semibold">-5.2% Impact</span>
                  </div>
                  <div className="w-full bg-slate-900 h-3 rounded-full overflow-hidden flex justify-end">
                    <div className="bg-emerald-500 h-full w-[20%] rounded-l-full"></div>
                    <div className="bg-slate-800 h-full w-[80%]"></div>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center text-xs border-t border-slate-800 text-slate-400">
                <span>Prediction Probability:</span>
                <span className="text-base font-bold text-rose-400 font-mono">78.0%</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-sky-900/60 via-slate-900 to-indigo-900/60 rounded-3xl p-8 sm:p-12 border border-sky-500/30 text-center space-y-6 glow-cyan">
          <h2 className="text-3xl font-extrabold text-white">Chronic Kidney Disease Prediction System</h2>
          <p className="text-sm text-slate-300 max-w-2xl mx-auto">
            An AI-assisted platform for analyzing clinical patient data and supporting CKD prediction.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => onNavigate('/assessment')}
              className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm transition-all"
            >
              Start CKD Prediction
            </button>
            <button
              onClick={() => onNavigate('/login')}
              className="px-8 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Sign In to Account
            </button>
          </div>
        </div>
      </section>

    </div>
  );
}
