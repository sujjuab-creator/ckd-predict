import React from 'react';

export default function DashboardCard({ title, value, subtitle, icon: Icon, badge, color = 'sky' }) {
  return (
    <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium">{title}</span>
        {Icon && (
          <div className={`p-2 rounded-xl bg-${color}-500/10 border border-${color}-500/20 text-${color}-400`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <p className="text-2xl sm:text-3xl font-extrabold text-white font-mono">{value}</p>
        {badge && <div>{badge}</div>}
      </div>

      {subtitle && (
        <p className="text-[11px] text-slate-400 leading-normal">{subtitle}</p>
      )}
    </div>
  );
}
