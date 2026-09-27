import React from 'react';
import { 
  Users, Activity, Stethoscope, BarChart3, ChevronRight, 
  AlertTriangle, Sparkles, ShieldCheck, UserCheck 
} from 'lucide-react';
import { MOCK_USERS, MOCK_DOCTORS_LIST } from '../../data/mockUsers';
import { MOCK_PATIENTS } from '../../data/mockPatients';
import { MOCK_PREDICTIONS } from '../../data/mockPredictions';
import { MOCK_ANALYTICS } from '../../data/mockAnalytics';

export default function AdminOverview({ onNavigate }) {
  const totalUsersCount = MOCK_ANALYTICS.totalUsers;
  const totalPatientsCount = MOCK_ANALYTICS.totalPatients;
  const totalDoctorsCount = MOCK_ANALYTICS.totalDoctors;
  const totalPredictionsCount = MOCK_ANALYTICS.totalPredictions;

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

      {/* Main Heading & Subtitle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Admin Dashboard</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[11px] font-bold">
              SYSTEM CONTROL
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Monitor users, prediction activity and system analytics.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/admin/analytics')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-2 w-fit"
        >
          <BarChart3 className="w-4 h-4" />
          <span>System Analytics</span>
        </button>
      </div>

      {/* STATISTIC CARDS (Section 1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Users */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between glow-cyan">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Users</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalUsersCount}</span>
              <span className="text-[10px] text-indigo-400 font-semibold">(Registered)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Total Patients */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between glow-teal">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Patients</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalPatientsCount}</span>
              <span className="text-[10px] text-teal-400 font-semibold">(Master Index)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Total Doctors */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Doctors</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalDoctorsCount}</span>
              <span className="text-[10px] text-sky-400 font-semibold">(Practitioners)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>

        {/* Total Predictions */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between glow-sky">
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Predictions</p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-2xl font-extrabold text-white font-mono">{totalPredictionsCount.toLocaleString()}</span>
              <span className="text-[10px] text-purple-400 font-semibold">(ML Assessments)</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Activity className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* ADMIN QUICK ACTIONS (Section 2) */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          <span>Admin Quick Actions</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <button
            onClick={() => onNavigate('/admin/users')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">Manage Users</h3>
            <p className="text-xs text-slate-400 mt-1">Review accounts, roles & status</p>
          </button>

          <button
            onClick={() => onNavigate('/admin/patients')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-teal-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-teal-400 transition-colors">View Patients</h3>
            <p className="text-xs text-slate-400 mt-1">Inspect patient master index</p>
          </button>

          <button
            onClick={() => onNavigate('/admin/doctors')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-sky-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-sky-400 transition-colors">View Doctors</h3>
            <p className="text-xs text-slate-400 mt-1">View practitioner roster & hospital links</p>
          </button>

          <button
            onClick={() => onNavigate('/admin/predictions')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-purple-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">View Predictions</h3>
            <p className="text-xs text-slate-400 mt-1">Inspect system-wide prediction table</p>
          </button>

          <button
            onClick={() => onNavigate('/admin/analytics')}
            className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/50 hover:bg-slate-900/80 transition-all text-left group"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BarChart3 className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors" />
            </div>
            <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">View Analytics</h3>
            <p className="text-xs text-slate-400 mt-1">Explore platform trend charts</p>
          </button>

        </div>
      </div>

      {/* RECENT USERS SUMMARY PREVIEW */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent System Accounts</h2>
          <button
            onClick={() => onNavigate('/admin/users')}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
          >
            <span>Manage All Users ({MOCK_USERS.length})</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">User ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {MOCK_USERS.slice(0, 5).map(u => (
                <tr key={u.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{u.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{u.name}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{u.email}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                      u.role === 'admin' 
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                        : u.role === 'doctor'
                        ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                      {u.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono">{u.createdDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
