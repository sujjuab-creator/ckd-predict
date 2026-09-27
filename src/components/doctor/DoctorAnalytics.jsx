import React from 'react';
import { PageHeader, Disclaimer } from '../ui/UI';
import PredictionAnalytics from '../shared/PredictionAnalytics';
import ModelComparison from '../shared/ModelComparison';

export default function DoctorAnalytics({ predictions }) {
  return (
    <div className="stack-lg">
      <PageHeader title="Analytics" subtitle="Prediction activity for your assigned patients only, plus overall model performance." />
      <PredictionAnalytics predictions={predictions} />
      <div style={{ marginTop: 36 }}>
        <h2 style={{ fontSize: 20 }}>Model performance</h2>
        <p className="small muted" style={{ marginTop: 4 }}>Overall evaluation metrics of the trained models on the held-out test dataset — not specific to your patients.</p>
      </div>
      <ModelComparison compact />
      <Disclaimer />
    </div>
  );
}
