import React, { useState } from 'react';
import { 
  Activity, Search, Filter, Eye, AlertTriangle, X 
} from 'lucide-react';
import { MOCK_PREDICTIONS } from '../../data/mockPredictions';
import PredictionResultView from '../PredictionResultView';
import { predictCKD } from '../../utils/ckdPredictor';
import { MOCK_PATIENTS } from '../../data/mockPatients';

export default function AdminPredictions({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [resultFilter, setResultFilter] = useState('All'); // 'All' | 'CKD' | 'Not CKD'
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const filteredPredictions = MOCK_PREDICTIONS.filter(pred => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !q || (
      pred.id.toLowerCase().includes(q) ||
      pred.patientName.toLowerCase().includes(q) ||
      pred.patientId.toLowerCase().includes(q)
    );

    const matchesResult = resultFilter === 'All' || pred.result === resultFilter;

    return matchesSearch && matchesResult;
  });

  const handleOpenDetails = (pred) => {
    const patientObj = MOCK_PATIENTS.find(p => p.id === pred.patientId) || MOCK_PATIENTS[0];
    const fullResult = predictCKD({
      ...patientObj.clinicalInfo,
      ...pred,
      age: patientObj.age,
      gender: patientObj.gender,
      sc: pred.sc || patientObj.lastCreatinine
    });
    setSelectedPrediction(fullResult);
  };

  return (
    <div className="space-y-8">
      
      {/* Clinical Notice */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex items-start space-x-3 text-slate-300 text-xs">
        <AlertCircle className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-sky-400">Clinical System Notice: </span>
          <span>This system provides an AI-assisted CKD risk prediction based on supplied data and is not a medical diagnosis. Results should be reviewed by a qualified healthcare professional.</span>
        </div>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">System-Wide Predictions Log</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Monitor and inspect prediction activity, model versions, and diagnosis classifications.
        </p>
      </div>

      {/* SEARCH & FILTERS TOOLBAR */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
          <input
            type="text"
            placeholder="Search by Patient Name, Patient ID, or Prediction ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Result Filters */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span>Result Filter:</span>
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

      {/* SYSTEM-WIDE PREDICTIONS TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Activity className="w-5 h-5 text-indigo-400" />
          <span>System Prediction Log ({filteredPredictions.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredPredictions.map(pred => (
                <tr key={pred.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{pred.id}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {pred.patientName}
                    <span className="block text-[10px] text-indigo-400 font-mono font-normal">{pred.patientId}</span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{pred.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      pred.result === 'CKD'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {pred.result}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{pred.model}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      {pred.status}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => handleOpenDetails(pred)}
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

      {/* Prediction Modal */}
      {selectedPrediction && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative w-full max-w-4xl bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white">System Prediction Log Breakdown</h3>
              <button
                onClick={() => setSelectedPrediction(null)}
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <PredictionResultView
              predictionResult={selectedPrediction}
              currentUser={{ name: 'Admin Inspector', role: 'admin' }}
              onBackToForm={() => setSelectedPrediction(null)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
