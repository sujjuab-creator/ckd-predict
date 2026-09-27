import React from 'react';

// Original, hand-built SVG illustration of a pair of kidneys with the
// renal vessels and ureters. Used on the public home page and auth pages.

const KIDNEY =
  'M75,0 C25,0 0,50 2,115 C4,180 35,230 85,228 C120,226 135,200 125,175 C117,155 108,140 118,120 C128,100 140,85 135,55 C130,20 110,0 75,0 Z';
const PYRAMID = 'M-14,-15 Q0,-23 14,-15 L4,13 Q0,18 -4,13 Z';
const PELVIS = { x: 104, y: 146 };
const PYRAMID_ANGLES = [118, 150, 182, 214, 246];

function Kidney({ transform, id }) {
  return (
    <g transform={transform}>
      <path d={KIDNEY} fill={`url(#${id}-cortex)`} />
      <path d={KIDNEY} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2" />
      <path d={KIDNEY} transform="translate(12,16) scale(0.84)" fill={`url(#${id}-medulla)`} opacity="0.9" />
      {PYRAMID_ANGLES.map((deg) => {
        const t = (deg * Math.PI) / 180;
        const px = PELVIS.x + 52 * Math.cos(t);
        const py = PELVIS.y + 52 * Math.sin(t) - 20;
        return (
          <path
            key={deg}
            d={PYRAMID}
            transform={`translate(${px},${py}) rotate(${deg + 90})`}
            fill="#e2667f"
            opacity="0.85"
          />
        );
      })}
      <path d="M126,124 C104,116 84,128 83,146 C82,164 100,174 124,164 Z" fill="#fbe3cf" />
      <path d="M92,132 l-10,-10 M88,146 l-14,0 M92,160 l-10,10" stroke="#fbe3cf" strokeWidth="7" strokeLinecap="round" />
      <path d={KIDNEY} fill="url(#shine)" />
    </g>
  );
}

export default function KidneyIllustration({ className = '', showOrbit = true, showLeaves = true }) {
  return (
    <svg className={className} viewBox="0 0 520 480" role="img" aria-label="Illustration of a pair of human kidneys">
      <defs>
        <radialGradient id="bg-glow" cx="50%" cy="48%" r="50%">
          <stop offset="0" stopColor="#d9f5ea" />
          <stop offset="0.6" stopColor="#e8f4fb" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        {['kl', 'kr'].map((id) => (
          <React.Fragment key={id}>
            <radialGradient id={`${id}-cortex`} cx="45%" cy="45%" r="70%">
              <stop offset="0" stopColor="#f3a3b6" />
              <stop offset="0.55" stopColor="#b98ad8" />
              <stop offset="1" stopColor="#4f7fe0" />
            </radialGradient>
            <radialGradient id={`${id}-medulla`} cx="70%" cy="60%" r="70%">
              <stop offset="0" stopColor="#f7c0cc" />
              <stop offset="1" stopColor="#c98fd0" stopOpacity="0.2" />
            </radialGradient>
          </React.Fragment>
        ))}
        <linearGradient id="shine" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="0.4" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="aorta" x1="0" x2="1">
          <stop offset="0" stopColor="#d64545" />
          <stop offset="1" stopColor="#f07373" />
        </linearGradient>
        <linearGradient id="vena" x1="0" x2="1">
          <stop offset="0" stopColor="#2f5fc4" />
          <stop offset="1" stopColor="#5b8def" />
        </linearGradient>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6ee7b7" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>

      <circle cx="260" cy="232" r="228" fill="url(#bg-glow)" />
      {showOrbit && (
        <g>
          <circle cx="260" cy="232" r="210" fill="none" stroke="#10b981" strokeOpacity="0.35" strokeDasharray="2 7" strokeWidth="2" />
          <circle cx="260" cy="232" r="176" fill="none" stroke="#3b82f6" strokeOpacity="0.12" strokeWidth="1.5" />
          <circle cx="112" cy="84" r="6" fill="#10b981" opacity="0.8" />
          <circle cx="428" cy="120" r="5" fill="#3b82f6" opacity="0.6" />
          <circle cx="462" cy="300" r="4" fill="#10b981" opacity="0.6" />
          <circle cx="70" cy="330" r="4" fill="#3b82f6" opacity="0.5" />
        </g>
      )}

      {/* Great vessels */}
      <rect x="240" y="60" width="17" height="380" rx="8.5" fill="url(#aorta)" />
      <rect x="264" y="60" width="20" height="380" rx="10" fill="url(#vena)" />
      {/* Renal vessels */}
      <path d="M244,200 C225,198 214,210 196,214" stroke="#e25b5b" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M246,222 C226,224 214,236 198,238" stroke="#3f6fd6" strokeWidth="10" fill="none" strokeLinecap="round" />
      <path d="M252,196 C290,192 306,206 326,210" stroke="#e25b5b" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M280,220 C300,222 310,232 324,234" stroke="#3f6fd6" strokeWidth="10" fill="none" strokeLinecap="round" />

      {/* Ureters */}
      <path d="M190,262 C214,300 220,360 232,440" stroke="#f2c9a0" strokeWidth="9" fill="none" strokeLinecap="round" />
      <path d="M330,258 C306,300 300,360 290,440" stroke="#f2c9a0" strokeWidth="9" fill="none" strokeLinecap="round" />

      <Kidney id="kl" transform="translate(72,104)" />
      <Kidney id="kr" transform="translate(448,96) scale(-1,1)" />

      {showLeaves && (
        <g>
          <path d="M38,420 C60,360 120,352 150,372 C120,400 80,428 38,420 Z" fill="url(#leaf)" opacity="0.95" />
          <path d="M42,418 C80,396 110,382 146,374" stroke="#047857" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M92,448 C100,404 138,386 170,392 C156,420 128,446 92,448 Z" fill="url(#leaf)" opacity="0.8" />
          <path d="M488,388 C466,336 414,332 388,352 C414,378 452,398 488,388 Z" fill="url(#leaf)" opacity="0.9" />
          <path d="M484,386 C452,370 424,358 392,354" stroke="#047857" strokeWidth="1.5" fill="none" opacity="0.6" />
          <path d="M400,70 C414,50 440,46 452,56 C440,74 420,82 400,70 Z" fill="url(#leaf)" opacity="0.7" />
        </g>
      )}
    </svg>
  );
}
