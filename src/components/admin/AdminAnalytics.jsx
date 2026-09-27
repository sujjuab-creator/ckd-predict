import React from 'react';
import { 
  BarChart3, Activity, Users, AlertTriangle, ShieldCheck, 
  TrendingUp, Stethoscope, Cpu, CheckCircle2 
} from 'lucide-react';
import { 
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, 
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar 
} from 'recharts';
import { MOCK_ANALYTICS } from '../../data/mockAnalytics';

export default function AdminAnalytics({ onNavigate }) {
  const {
    totalPredictions,
    ckdPredictions,
    notCkdPredictions,
    totalPatients,
    ckdDistribution,
    activityOverTime,
    patientActivity,
    modelPerformancePlaceholder,
    activitySummary
  } = MOCK_ANALYTICS;

  return (
    <div className="space-y-8">
      
      {/* Clinical Notice Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-slate-300 text-xs">
        <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-400">Clinical System Notice: </span>
          <span>This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System Analytics & Model Insights</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Explore population statistics, temporal prediction volumes, and model readiness status.
        </p>
      </div>

      {/* TOP METRIC CARDS (Section 7) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Predictions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Predictions</p>
            <p className="text-2xl font-extrabold text-white font-mono mt-1">{totalPredictions.toLocaleString()}</p>
            <span className="text-[10px] text-indigo-400 font-semibold">(System Log)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        {/* CKD Predictions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">CKD Predictions</p>
            <p className="text-2xl font-extrabold text-rose-400 font-mono mt-1">{ckdPredictions.toLocaleString()}</p>
            <span className="text-[10px] text-rose-400/80 font-semibold">(37.5% Identified)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>

        {/* Not CKD Predictions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Not CKD Predictions</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{notCkdPredictions.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-400/80 font-semibold">(62.5% Normal/Low Risk)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Patients */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Patients</p>
            <p className="text-2xl font-extrabold text-sky-400 font-mono mt-1">{totalPatients.toLocaleString()}</p>
            <span className="text-[10px] text-sky-400/80 font-semibold">(Active Cohort)</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* VISUALIZATION CHARTS GRID (Section 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart 1: CKD vs Not CKD Distribution */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1. CKD vs Not CKD Distribution
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">POPULATION METRICS</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ckdDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                >
                  {ckdDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
              <span className="text-slate-300">Not CKD: <strong>887 (62.5%)</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <span className="text-slate-300">CKD: <strong>533 (37.5%)</strong></span>
            </div>
          </div>
        </div>

        {/* Chart 2: Prediction Activity Over Time */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              2. Prediction Activity Over Time
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">MONTHLY VOLUME</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityOverTime}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="predictions" stroke="#818cf8" strokeWidth={3} name="Total Predictions" />
                <Line type="monotone" dataKey="ckdCases" stroke="#f43f5e" strokeWidth={2} name="CKD Cases Identified" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Patient Registration / Activity */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              3. Patient Registration & Activity
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">NEW VS ACTIVE</span>
          </div>

          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={patientActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                <Bar dataKey="newPatients" fill="#38bdf8" radius={[4, 4, 0, 0]} name="New Registrations" />
                <Bar dataKey="activePatients" fill="#0d9488" radius={[4, 4, 0, 0]} name="Active Cohort" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Model Performance Placeholder (Section 7 Requirement) */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span>4. Model Performance Status</span>
              </h3>
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px] font-mono font-bold">
                MODEL METRICS
              </span>
            </div>

            {/* Polished Visual Benchmark Chart UI */}
            <div className="bg-slate-900/90 p-4 rounded-2xl border border-slate-800 space-y-3 text-xs">
              <p className="text-[11px] text-slate-400 font-medium font-semibold">Validation Metric Target Benchmarks:</p>
              {modelPerformancePlaceholder.map(item => (
                <div key={item.metric} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-300">{item.metric}</span>
                    <span className="font-mono text-purple-400 font-bold">{item.score}%</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${item.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS SUMMARY CARDS (Section 8) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          <span>System Activity Summary</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{activitySummary.predictionActivity.title}</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                {activitySummary.predictionActivity.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activitySummary.predictionActivity.description}</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{activitySummary.patientActivity.title}</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 text-[10px] font-bold">
                {activitySummary.patientActivity.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activitySummary.patientActivity.description}</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{activitySummary.doctorActivity.title}</span>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-bold">
                {activitySummary.doctorActivity.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activitySummary.doctorActivity.description}</p>
          </div>

          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-white">{activitySummary.systemActivity.title}</span>
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-400 text-[10px] font-bold">
                {activitySummary.systemActivity.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{activitySummary.systemActivity.description}</p>
          </div>

        </div>
      </div>

    </div>
  );
}
