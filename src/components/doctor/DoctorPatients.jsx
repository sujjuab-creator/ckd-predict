import React, { useState } from 'react';
import { 
  Search, X, Filter, Eye, Users, AlertTriangle, ChevronRight, UserCheck 
} from 'lucide-react';
import { MOCK_PATIENTS } from '../../data/mockPatients';

export default function DoctorPatients({ onNavigate }) {
  const [searchInput, setSearchInput] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('All'); // 'All' | 'CKD' | 'Not CKD'

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setActiveQuery(searchInput.trim());
  };

  const handleClear = () => {
    setSearchInput('');
    setActiveQuery('');
    setResultFilter('All');
  };

  // Filter patients by activeQuery (matches ID, Name, Email) and resultFilter
  const filteredPatients = MOCK_PATIENTS.filter(p => {
    const q = activeQuery.toLowerCase();
    const matchesSearch = !q || (
      p.id.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q)
    );

    const matchesResult = resultFilter === 'All' || p.result === resultFilter;

    return matchesSearch && matchesResult;
  });

  return (
    <div className="space-y-8">
      
      {/* Disclaimer Banner */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-slate-300 text-xs">
        <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-400">Clinical System Notice: </span>
          <span>This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Patient Roster & Search</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Search and filter clinical patient records by ID, Name, Email, or Risk Result.
        </p>
      </div>

      {/* SEARCH INTERFACE & FILTERS */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search by Patient ID (e.g. PAT-101), Name (e.g. Johnathan), or Email..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>

            {(searchInput || activeQuery || resultFilter !== 'All') && (
              <button
                type="button"
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs transition-all flex items-center space-x-1.5"
              >
                <X className="w-4 h-4 text-slate-400" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </form>

        {/* Prediction Result Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-medium flex items-center space-x-1">
              <Filter className="w-3.5 h-3.5 text-teal-400" />
              <span>Prediction Result Filter:</span>
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
                      : 'bg-teal-500/20 text-teal-400 border border-teal-500/40 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {res}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Showing <strong className="text-white font-mono">{filteredPatients.length}</strong> of <strong className="text-slate-300 font-mono">{MOCK_PATIENTS.length}</strong> patients
          </div>
        </div>

      </div>

      {/* PATIENT LIST TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Users className="w-5 h-5 text-teal-400" />
          <span>Patient Roster</span>
        </h2>

        {filteredPatients.length === 0 ? (
          <div className="text-center py-12 space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800">
            <Users className="w-10 h-10 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-300">No matching patients found</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search terms or clearing filters to see all patient records.
            </p>
            <button
              onClick={handleClear}
              className="px-4 py-2 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-bold transition-all"
            >
              Reset Search & Filters
            </button>
          </div>
        ) : (
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
                  <th className="py-3 px-4">Result</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{p.id}</td>
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
                        className="px-3.5 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold text-xs transition-all flex items-center space-x-1 ml-auto"
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
        )}
      </div>

    </div>
  );
}
