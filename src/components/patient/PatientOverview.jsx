import React from 'react';
import { 
  Activity, Calendar, FileText, PlusCircle, History, 
  BarChart3, ArrowRight, Clock, ShieldAlert, Sparkles 
} from 'lucide-react';
import DashboardCard from './DashboardCard';
import StatusBadge from './StatusBadge';
import MedicalDisclaimer from './MedicalDisclaimer';

export default function PatientOverview({ onNavigate, history = [] }) {
  const totalPredictions = history.length || 5;
  const latestPrediction = history[0] || { id: 'PRED-101', date: '2026-09-15', result: 'High Risk' };
  const reportsCount = history.length || 3;

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800 glow-cyan">
        <div>
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30 text-[10px] font-bold font-mono uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Patient Portal • Day 1 Demo</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Welcome back, Patient</h1>
          <p className="text-xs text-slate-400 mt-1">Monitor your CKD prediction activity and clinical reports.</p>
        </div>

        <button
          onClick={() => onNavigate('/patient/prediction')}
          className="px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-600 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-sky-500/20 transition-all flex items-center space-x-2 shrink-0 transform hover:-translate-y-0.5"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Start Prediction</span>
        </button>
      </div>

      {/* 4 Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <DashboardCard 
          title="Total Predictions" 
          value={totalPredictions} 
          subtitle="Demo recorded entries"
          icon={Activity}
          color="sky"
        />

        <DashboardCard 
          title="Latest Prediction" 
          value={latestPrediction.result || 'High Risk'} 
          subtitle="Demo assessment"
          icon={ShieldAlert}
          color="rose"
          badge={<StatusBadge type="demo-model" />}
        />

        <DashboardCard 
          title="Last Prediction Date" 
          value={latestPrediction.date || '2026-09-15'} 
          subtitle="Timestamp"
          icon={Clock}
          color="amber"
        />

        <DashboardCard 
          title="Reports" 
          value={reportsCount} 
          subtitle="Available medical reports"
          icon={FileText}
          color="teal"
        />
      </div>

      {/* Prominent Callout Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-sky-500/30 bg-gradient-to-r from-sky-950/40 via-slate-900 to-indigo-950/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 glow-cyan">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-2 text-sky-400 text-xs font-semibold uppercase tracking-wider">
            <PlusCircle className="w-4 h-4" />
            <span>CKD Prediction Tool</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">Start a New CKD Prediction</h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            Enter clinical information to generate an AI-assisted prediction.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/patient/prediction')}
          className="px-8 py-3.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all shadow-xl shadow-sky-500/20 shrink-0 flex items-center space-x-2"
        >
          <span>Start Prediction</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider">Quick Actions</h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          
          <button
            onClick={() => onNavigate('/patient/prediction')}
            className="glass-card p-5 rounded-2xl text-left space-y-3 hover:border-sky-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">New Prediction</p>
              <p className="text-[11px] text-slate-400">Fill in clinical parameters</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('/patient/history')}
            className="glass-card p-5 rounded-2xl text-left space-y-3 hover:border-sky-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <History className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Prediction History</p>
              <p className="text-[11px] text-slate-400">View past predictions</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('/patient/reports')}
            className="glass-card p-5 rounded-2xl text-left space-y-3 hover:border-sky-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">Medical Reports</p>
              <p className="text-[11px] text-slate-400">Access clinical reports</p>
            </div>
          </button>

          <button
            onClick={() => onNavigate('/patient/shap')}
            className="glass-card p-5 rounded-2xl text-left space-y-3 hover:border-sky-500/40 transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">View Explanation</p>
              <p className="text-[11px] text-slate-400">Examine feature impact</p>
            </div>
          </button>

        </div>
      </div>

      {/* Recent Predictions Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Recent Predictions</h3>
          <button 
            onClick={() => onNavigate('/patient/history')}
            className="text-xs text-sky-400 hover:underline font-medium"
          >
            View All History
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {history.slice(0, 5).map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{row.id}</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-rose-400">{row.result || 'High Risk'}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge type="demo-model" text="Demo Model" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('/patient/history')}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <MedicalDisclaimer />

    </div>
  );
}
