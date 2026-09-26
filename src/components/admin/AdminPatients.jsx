import React, { useState } from 'react';
import { 
  Activity, Search, Filter, Eye, AlertTriangle, Users, ChevronRight 
} from 'lucide-react';
import { MOCK_PATIENTS } from '../../data/mockPatients';

export default function AdminPatients({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('All'); // 'All' | 'CKD' | 'Not CKD'

  const filteredPatients = MOCK_PATIENTS.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );

    const matchesFilter = resultFilter === 'All' || p.result === resultFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      
      {/* Disclaimer */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start space-x-3 text-amber-300 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-amber-400">PATIENT MASTER INDEX (DEMO): </span>
          <span>System-wide demo patient index for platform oversight.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Master Patient Index</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitor system-wide patient profiles, diagnosis records and last prediction activity.
        </p>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search Patient ID, Name, or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Filter Result:</span>
          </span>

          {['All', 'CKD', 'Not CKD'].map(res => (
            <button
              key={res}
              onClick={() => setResultFilter(res)}
              className={`px-3.5 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                resultFilter === res 
                  ? res === 'CKD' 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold'
                    : res === 'Not CKD'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold'
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {res}
            </button>
          ))}
        </div>

      </div>

      {/* PATIENTS TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span>Patient Registry ({filteredPatients.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Patient ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Age</th>
                <th className="py-3 px-4">Gender</th>
                <th className="py-3 px-4">Last Prediction</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPatients.map(p => (
                <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{p.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{p.name}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{p.email}</td>
                  <td className="py-3.5 px-4 text-slate-300">{p.age} yrs</td>
                  <td className="py-3.5 px-4 text-slate-300">{p.gender}</td>
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
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs transition-all flex items-center space-x-1 ml-auto"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Details</span>
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
