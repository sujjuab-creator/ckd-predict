import React from 'react';

export function LogoMark({ className = 'logo-mark' }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="lm-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="#ecfdf5" />
      <path d="M17.5 9.5c-5.2 0-8.5 5-8.3 11.2.2 6.6 3.3 12.6 8.3 12.6 3.3 0 4.4-2.6 3-5.1-1-1.8-1.4-3-.4-4.8 1.1-2 2.4-3.1 2.1-6.2-.3-4.3-2-7.7-4.7-7.7z" fill="url(#lm-g)" />
      <path d="M30.5 9.5c5.2 0 8.5 5 8.3 11.2-.2 6.6-3.3 12.6-8.3 12.6-3.3 0-4.4-2.6-3-5.1 1-1.8 1.4-3 .4-4.8-1.1-2-2.4-3.1-2.1-6.2.3-4.3 2-7.7 4.7-7.7z" fill="url(#lm-g)" />
      <path d="M21.6 22.5c1.6 1.6 2.4 3.6 2.4 6.2V40M26.4 22.5c-1.6 1.6-2.4 3.6-2.4 6.2" fill="none" stroke="#0b1f3a" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export default function Logo({ light = false, tagline = true, onClick }) {
  const content = (
    <>
      <LogoMark />
      <div>
        <div className="logo-text">CKD <span>PREDICT</span></div>
        {tagline && <div className="logo-tag">AI-Assisted Kidney Health Insights</div>}
      </div>
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={`logo ${light ? 'light' : ''}`} onClick={onClick} aria-label="CKD PREDICT home">
        {content}
      </button>
    );
  }
  return <div className={`logo ${light ? 'light' : ''}`}>{content}</div>;
}
