import React from 'react';
import { Check } from 'lucide-react';

/** Step progress for the analysis wizards (reuses the sign-up stepper styles). */
export default function StepIndicator({ steps, current }) {
  return (
    <div className="stepper stepper-wide" aria-label={`Step ${current} of ${steps.length}: ${steps[current - 1]}`}>
      {steps.map((label, i) => {
        const n = i + 1;
        const state = n < current ? 'done' : n === current ? 'active' : '';
        return (
          <React.Fragment key={label}>
            <div className={`s ${state}`} aria-current={n === current ? 'step' : undefined}>
              <span className="dot">{n < current ? <Check /> : n}</span>
              <span className="t">{label}</span>
            </div>
            {n < steps.length && <div className={`line ${n < current ? 'done' : ''}`} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}
