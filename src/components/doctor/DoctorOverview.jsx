import React from 'react';
import { 
  Users, Activity, FileText, Search, Clock, ChevronRight, 
  AlertTriangle, CheckCircle2, AlertCircle, Eye, Sparkles
} from 'lucide-react';
import { MOCK_PATIENTS } from '../../data/mockPatients';
import { MOCK_PREDICTIONS } from '../../data/mockPredictions';

export default function DoctorOverview({ onNavigate }) {
  // Statistics calculations
  const totalPatients = MOCK_PATIENTS.length;
  const totalPredictions = MOCK_PREDICTIONS.length;
  const pendingReviewsCount = MOCK_PREDICTIONS.filter(p => p.status === 'Pending Review').length;
  const recentPatients = MOCK_PATIENTS.slice(0, 4);

  return (
    <div className="space-y-8">
      
      {/* Medical Disclaimer Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400">DEMO DATA NOTICE: </span>
          <span>Demo data is used for development purposes. This interface is not a medical diagnosis system.</span>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Doctor Clinical Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[11px] font-bold">
              DEMO MODE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Review patient information and prediction activity.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/doctor/patients')}
          className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2 w-fit"
        >
          <Search className="w-4 h-4" />
          <span>Patient Roster Search</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Patients */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between glow-teal">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Patients</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalPatients}</span>
              <span className="text-[10px] text-teal-400 font-semibold">(Demo Roster)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Predictions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between glow-sky">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Predictions</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalPredictions}</span>
              <span className="text-[10px] text-sky-400 font-semibold">(ML Models)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* Recent Active Patients */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Recent Patients</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{recentPatients.length}</span>
              <span className="text-[10px] text-indigo-400 font-semibold">(Active)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Pending Reviews */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Pending Reviews</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-amber-400 font-mono">{pendingReviewsCount}</span>
              <span className="text-[10px] text-amber-400/80 font-semibold">(Action Needed)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-teal-400" />
          <span>Quick Clinical Actions</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button
            onClick={() => onNavigate('/doctor/patients')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Search className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors">Search Patients</h3>
            <p className="text-xs text-slate-400 mt-1">Find demo patients by ID, Name, or Email</p>
          </button>

          <button
            onClick={() => onNavigate('/doctor/patients')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">View Patients</h3>
            <p className="text-xs text-slate-400 mt-1">Browse full clinical roster and EHR details</p>
          </button>

          <button
            onClick={() => onNavigate('/doctor/predictions')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">View Predictions</h3>
            <p className="text-xs text-slate-400 mt-1">Review ML prediction logs and risk categories</p>
          </button>

          <button
            onClick={() => onNavigate('/doctor/reports')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">View Reports</h3>
            <p className="text-xs text-slate-400 mt-1">Access medical summary and referral reports</p>
          </button>

        </div>
      </div>

      {/* RECENT PATIENTS TABLE SECTION */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white">Recent Patients</h2>
            <p className="text-xs text-slate-400">Latest active demo patient records in your clinical list</p>
          </div>
          <button
            onClick={() => onNavigate('/doctor/patients')}
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold flex items-center space-x-1"
          >
            <span>See All Patients ({MOCK_PATIENTS.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Patient Name</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Last Prediction</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {recentPatients.map(p => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{p.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {p.name}
                    <span className="block text-[10px] font-normal text-slate-400">{p.email}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{p.age} yrs ({p.gender})</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{p.lastPrediction}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      p.result === 'CKD'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {p.result}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate(`/doctor/patients/${p.id}`)}
                      className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-semibold text-xs transition-all flex items-center space-x-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Patient</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
