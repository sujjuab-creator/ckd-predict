import React from 'react';

export default function StatusBadge({ type = 'demo', text, size = 'sm' }) {
  if (type === 'demo-model') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold font-mono uppercase tracking-wider">
        Demo Model
      </span>
    );
  }

  if (type === 'demo-prediction') {
    return (
      <span className="px-3 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-xs font-extrabold font-mono uppercase tracking-wider">
        DEMO PREDICTION
      </span>
    );
  }

  if (type === 'risk-high' || type === 'high') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
        {text || 'High Risk'}
      </span>
    );
  }

  if (type === 'risk-moderate' || type === 'moderate') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold">
        {text || 'Moderate Risk'}
      </span>
    );
  }

  if (type === 'risk-low' || type === 'low') {
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
        {text || 'Low Risk'}
      </span>
    );
  }

  return (
    <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-semibold">
      {text || 'Demo Data'}
    </span>
  );
}
