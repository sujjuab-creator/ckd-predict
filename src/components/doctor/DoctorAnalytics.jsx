import React from 'react';
import { PageHeader, Disclaimer } from '../ui/UI';
import PredictionAnalytics from '../shared/PredictionAnalytics';
import ModelComparison from '../shared/ModelComparison';

export default function DoctorAnalytics({ predictions }) {
  return (
    <div className="stack-lg">
      <PageHeader title="Analytics" subtitle="Prediction activity and model performance from the live database." />
      <PredictionAnalytics predictions={predictions} />
      <h2 style={{ fontSize: 20, marginTop: 12 }}>Model performance</h2>
      <ModelComparison compact />
      <Disclaimer />
    </div>
  );
}
