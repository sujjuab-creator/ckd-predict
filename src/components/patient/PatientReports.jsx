import React, { useState } from 'react';
import { Download, Eye, Info, ArrowLeft } from 'lucide-react';
import MedicalDisclaimer from './MedicalDisclaimer';

export default function PatientReports({ onNavigate, history = [] }) {
  const [notice, setNotice] = useState('');

  const handleActionClick = () => {
    setNotice('Medical report PDF export requested.');
    setTimeout(() => {
      setNotice('');
    }, 4000);
  };

  const medicalReports = [
    { id: 'REP-101', predId: 'PRED-101', date: '2026-09-15', result: 'High Risk' },
    { id: 'REP-100', predId: 'PRED-100', date: '2026-06-10', result: 'Moderate Risk' },
    { id: 'REP-099', predId: 'PRED-099', date: '2026-02-04', result: 'Low Risk' }
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-slate-800">
        <div>
          <button
            onClick={() => onNavigate('/patient')}
            className="text-xs text-slate-400 hover:text-sky-400 transition-colors flex items-center space-x-1 font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-white">Medical Reports</h1>
          <p className="text-xs text-slate-400">Clinical prediction reports & summaries.</p>
        </div>

        <span className="px-3 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30 text-xs font-bold font-mono">
          Reports Archive
        </span>
      </div>

      {/* Action Notice Alert */}
      {notice && (
        <div className="bg-sky-500/10 border border-sky-500/30 p-4 rounded-2xl text-sky-300 text-xs flex items-center space-x-3 transition-all animate-pulse">
          <Info className="w-5 h-5 shrink-0 text-sky-400" />
          <span className="font-semibold">{notice}</span>
        </div>
      )}

      {/* Reports Table */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {medicalReports.map((row) => (
                <tr key={row.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-200">{row.id}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">{row.predId}</td>
                  <td className="py-3.5 px-4 text-slate-300">{row.date}</td>
                  <td className="py-3.5 px-4 font-semibold text-rose-400">{row.result}</td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={handleActionClick}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3 text-sky-400" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={handleActionClick}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 text-xs font-medium transition-all flex items-center space-x-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                    </div>
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

