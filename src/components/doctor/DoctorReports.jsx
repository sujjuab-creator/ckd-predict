import React, { useState } from 'react';
import { 
  FileText, Eye, Download, AlertTriangle, CheckCircle2, X, Info 
} from 'lucide-react';
import { MOCK_REPORTS } from '../../data/mockPredictions';

export default function DoctorReports({ onNavigate }) {
  const [selectedReport, setSelectedReport] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const handleDownloadClick = (report) => {
    setToastMessage(`PDF report generation will be connected on Day 2. (Report ID: ${report.reportId})`);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  return (
    <div className="space-y-8">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-24 right-4 z-50 bg-slate-900 border-2 border-teal-500 text-teal-300 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center space-x-3 animate-bounce">
          <Info className="w-5 h-5 text-teal-400 shrink-0" />
          <p className="text-xs font-bold">{toastMessage}</p>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Doctor Clinical Reports</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View patient summary records and clinical evaluation export logs.
        </p>
      </div>

      {/* REPORTS TABLE */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <span>Generated Clinical Reports ({MOCK_REPORTS.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <th className="py-3 px-4">Report ID</th>
                <th className="py-3 px-4">Patient</th>
                <th className="py-3 px-4">Prediction ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Result</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {MOCK_REPORTS.map(rep => (
                <tr key={rep.reportId} className="hover:bg-slate-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-teal-400">{rep.reportId}</td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {rep.patientName}
                    <button
                      onClick={() => onNavigate(`/doctor/patients/${rep.patientId}`)}
                      className="block text-[10px] text-teal-400 hover:underline font-mono font-normal"
                    >
                      {rep.patientId}
                    </button>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{rep.predictionId}</td>
                  <td className="py-3.5 px-4 text-slate-300 font-mono">{rep.date}</td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      rep.result === 'CKD'
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}>
                      {rep.result}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => setSelectedReport(rep)}
                        className="px-3 py-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 font-bold text-xs transition-all flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Report</span>
                      </button>

                      <button
                        onClick={() => handleDownloadClick(rep)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all flex items-center space-x-1"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-400" />
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

      {/* VIEW REPORT MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-white">Clinical Summary Report</h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Report ID:</span>
                <span className="font-mono font-bold text-teal-400">{selectedReport.reportId}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Patient Name:</span>
                <span className="font-bold text-white">{selectedReport.patientName}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Prediction ID:</span>
                <span className="font-mono text-slate-200">{selectedReport.predictionId}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Report Date:</span>
                <span className="font-mono text-slate-200">{selectedReport.date}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between">
                <span className="text-slate-400">Prediction Result:</span>
                <span className={`font-bold ${selectedReport.result === 'CKD' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedReport.result}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-3">
              <button
                onClick={() => handleDownloadClick(selectedReport)}
                className="px-4 py-2 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
