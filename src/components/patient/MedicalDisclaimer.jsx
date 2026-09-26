import React from 'react';
import { FileText } from 'lucide-react';

export default function MedicalDisclaimer() {
  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-xs space-y-1.5">
      <div className="flex items-center space-x-1.5 text-amber-400 font-semibold">
        <FileText className="w-4 h-4 shrink-0" />
        <span>Medical Disclaimer</span>
      </div>
      <p className="text-[11px] text-slate-400 leading-normal">
        This system provides AI-assisted prediction for demonstration and research purposes. It is not a substitute for professional medical diagnosis.
      </p>
    </div>
  );
}
