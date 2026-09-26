import React from 'react';
import StatusBadge from './StatusBadge';
import MedicalDisclaimer from './MedicalDisclaimer';
import { PlusCircle, ArrowLeft } from 'lucide-react';

export default function PatientHistory({ onNavigate, history = [] }) {
  return (
    <div className="space-y-8">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <button
            onClick={() => onNavigate('/patient')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Prediction History</h1>
          <p className="text-xs text-slate-400">View all past demo prediction records.</p>
        </div>

        <button
          onClick={() => onNavigate('/patient/prediction')}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs shadow-md shadow-sky-500/20 transition-all flex items-center space-x-2"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Prediction</span>
        </button>
      </div>

      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {history.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{row.id}</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-rose-400">{row.result || 'High Risk'}</td>
                  <td className="py-3.5 px-4">
                    <StatusBadge type="demo-model" text={row.model || 'Demo Model'} />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[10px]">
                      {row.status || 'Demo Generated'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onNavigate('/patient/result')}
                      className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold transition-all"
                    >
                      View Result
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <MedicalDisclaimer />

    </div>
  );
}
