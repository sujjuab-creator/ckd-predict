import React from 'react';
import { PageHeader } from '../ui/UI';
import ModelComparison from '../shared/ModelComparison';

export default function AdminModels() {
  return (
    <div className="stack-lg">
      <PageHeader title="Model Comparison" subtitle="Evaluation results for the machine-learning models trained for CKD risk prediction." />
      <ModelComparison />
    </div>
  );
}
