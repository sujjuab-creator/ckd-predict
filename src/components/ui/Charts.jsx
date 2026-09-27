import React, { useEffect, useRef, useState } from 'react';

// Lightweight, dependency-free SVG charts used across dashboards.
// All charts render only the data they are given (real backend data).

const COLORS = {
  green: '#10b981',
  greenDark: '#059669',
  navy: '#1b3d68',
  blue: '#3b82f6',
  red: '#dc2626',
  amber: '#f59e0b',
  grid: '#e2e8f0',
  text: '#64748b',
};
export const CHART_COLORS = COLORS;

function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const el = ref.current;
    const update = () => setWidth(Math.max(240, el.clientWidth));
    update();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function scaleFor(values) {
  const max = Math.max(...values, 0);
  const allInt = values.every((v) => Number.isInteger(v));
  if (allInt) {
    const step = Math.max(1, Math.ceil(max / 4));
    return { max: step * 4, ticks: [0, 1, 2, 3, 4].map((i) => i * step) };
  }
  const m = niceMax(max);
  return { max: m, ticks: [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(m * t * 100) / 100) };
}

function niceMax(v) {
  if (!v || v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function shortLabel(label, maxChars = 12) {
  const s = String(label ?? '');
  // YYYY-MM-DD -> "Sep 26"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.slice(0, 10) + 'T00:00:00');
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return s.length > maxChars ? s.slice(0, Math.max(3, maxChars - 1)) + '…' : s;
}

/** Area/line trend chart. data: [{ label, value }] */
export function TrendChart({ data = [], height = 240, color = COLORS.green, valueLabel = 'Count' }) {
  const [ref, width] = useWidth();
  const pad = { l: 44, r: 26, t: 14, b: 30 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const { max, ticks } = scaleFor(data.map((d) => d.value));
  const n = data.length;
  const x = (i) => pad.l + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v) => pad.t + h - (v / max) * h;
  const pts = data.map((d, i) => [x(i), y(d.value)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const area = pts.length ? `${line} L${pts[pts.length - 1][0]},${pad.t + h} L${pts[0][0]},${pad.t + h} Z` : '';
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 70))));
  const gid = `g${color.replace('#', '')}`;

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height} role="img" aria-label={`${valueLabel} trend chart`}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeDasharray={t === 0 ? '' : '3 4'} />
            <text x={pad.l - 8} y={y(t) + 4} fontSize="11" textAnchor="end" fill={COLORS.text}>{t}</text>
          </g>
        ))}
        {area && <path d={area} fill={`url(#${gid})`} />}
        {line && <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p[0]} cy={p[1]} r="4" fill="#fff" stroke={color} strokeWidth="2">
              <title>{`${data[i].label}: ${data[i].value} ${valueLabel.toLowerCase()}`}</title>
            </circle>
            {i % labelEvery === 0 && (
              <text x={p[0]} y={height - 8} fontSize="11" textAnchor="middle" fill={COLORS.text}>{shortLabel(data[i].label)}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

/** Vertical bar chart. data: [{ label, value, color? }] */
export function BarChart({ data = [], height = 240, color = COLORS.green, valueFormat = (v) => v, highlightMax = false }) {
  const [ref, width] = useWidth();
  const pad = { l: 44, r: 10, t: 18, b: 34 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const rawMax = Math.max(...data.map((d) => d.value), 0);
  const { max, ticks } = scaleFor(data.map((d) => d.value));
  const n = Math.max(1, data.length);
  const slot = w / n;
  const bw = Math.min(46, slot * 0.62);
  const y = (v) => pad.t + h - (v / max) * h;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(w / 56))));

  return (
    <div ref={ref} className="chart">
      <svg width={width} height={height} role="img" aria-label="Bar chart">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={COLORS.grid} strokeDasharray={t === 0 ? '' : '3 4'} />
            <text x={pad.l - 8} y={y(t) + 4} fontSize="11" textAnchor="end" fill={COLORS.text}>{valueFormat(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(d.value);
          const isMax = highlightMax && d.value === rawMax && rawMax > 0;
          const fill = d.color || (highlightMax ? (isMax ? COLORS.greenDark : '#a7f3d0') : color);
          return (
            <g key={i}>
              <rect x={cx - bw / 2} y={top} width={bw} height={Math.max(0, pad.t + h - top)} rx="5" fill={fill}>
                <title>{`${d.label}: ${valueFormat(d.value)}`}</title>
              </rect>
              {d.value > 0 && n <= 14 && (
                <text x={cx} y={top - 6} fontSize="11" fontWeight="600" textAnchor="middle" fill="#3d4f66">{valueFormat(d.value)}</text>
              )}
              {i % labelEvery === 0 && (
                <text x={cx} y={height - 10} fontSize="11" textAnchor="middle" fill={COLORS.text}>{shortLabel(d.label, Math.floor((slot * labelEvery) / 6.5))}</text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Donut chart. data: [{ label, value, color }] */
export function DonutChart({ data = [], size = 180, thickness = 26, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Donut chart" style={{ flexShrink: 0 }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f6" strokeWidth={thickness} />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * c;
          const seg = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
        <text x="50%" y="47%" textAnchor="middle" fontSize="26" fontWeight="800" fill="#0b1f3a" fontFamily="Plus Jakarta Sans, Inter, sans-serif">{centerValue ?? total}</text>
        <text x="50%" y="61%" textAnchor="middle" fontSize="11.5" fill="#64748b">{centerLabel || 'Total'}</text>
      </svg>
      <div className="donut-legend">
        {data.map((d) => (
          <div className="li" key={d.label}>
            <span><i style={{ background: d.color }} />{d.label}</span>
            <b>{d.value}{total > 0 && <small style={{ color: '#64748b', fontWeight: 500, marginLeft: 6 }}>({Math.round((d.value / total) * 100)}%)</small>}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal progress-style bars. data: [{ label, value, max?, color?, display? }] */
export function HBarList({ data = [], max, color = COLORS.green }) {
  const m = max ?? Math.max(...data.map((d) => d.value), 0) ?? 1;
  return (
    <div className="hbar">
      {data.map((d) => (
        <div className="hbar-row" key={d.label}>
          <div className="top"><span>{d.label}</span><b>{d.display ?? d.value}</b></div>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: `${m > 0 ? Math.min(100, (d.value / m) * 100) : 0}%`, background: d.color || color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Semi-circular probability gauge (0..1). */
export function ProbabilityGauge({ value = 0, color = COLORS.red, size = 190, label = 'Model probability' }) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2 + 4;
  const arc = (from, to) => {
    const a0 = Math.PI * (1 - from);
    const a1 = Math.PI * (1 - to);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`;
  };
  return (
    <svg width={size} height={size / 2 + 34} viewBox={`0 0 ${size} ${size / 2 + 34}`} role="img" aria-label={`${label}: ${(v * 100).toFixed(1)}%`}>
      <path d={arc(0, 1)} fill="none" stroke="#e8edf3" strokeWidth="16" strokeLinecap="round" />
      {v > 0 && <path d={arc(0, Math.max(0.001, v))} fill="none" stroke={color} strokeWidth="16" strokeLinecap="round" />}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="30" fontWeight="800" fill="#0b1f3a" fontFamily="Plus Jakarta Sans, Inter, sans-serif">{(v * 100).toFixed(1)}%</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontSize="11.5" fill="#64748b">{label}</text>
    </svg>
  );
}
