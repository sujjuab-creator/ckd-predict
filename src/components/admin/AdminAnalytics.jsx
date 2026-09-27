import React, { useState } from 'react';
import { History, Search } from 'lucide-react';
import { PageHeader, Card, Loading, ErrorState, Disclaimer } from '../ui/UI';
import PredictionAnalytics from '../shared/PredictionAnalytics';
import { PredictionsTable } from '../prediction/Tables';
import { isRiskResult } from '../../utils/format';

export default function AdminAnalytics({ predictions, reloadAll, patientName }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('All');

  const rows = predictions.list.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || String(p.prediction_id).toLowerCase().includes(q) || patientName(p.patient_id).toLowerCase().includes(q);
    const risk = isRiskResult(p.prediction_result);
    return matchQ && (result === 'All' || (result === 'risk' ? risk : !risk));
  });

  return (
    <div className="stack-lg">
      <PageHeader title="Prediction Analytics" subtitle="Prediction statistics calculated from the live database." />
      <PredictionAnalytics predictions={predictions} />

      <Card title="All predictions" icon={History} noBody>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input className="input" placeholder="Search prediction ID or patient…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search predictions" />
          </div>
          <select className="select" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Filter by result">
            <option value="All">All results</option>
            <option value="risk">CKD Risk</option>
            <option value="norisk">No CKD Risk</option>
          </select>
          <span className="small muted" style={{ marginLeft: 'auto' }}>{rows.length} predictions</span>
        </div>
        {predictions.loading ? <Loading /> : predictions.error ? <ErrorState message={predictions.error} onRetry={reloadAll} /> : (
          <PredictionsTable predictions={rows} patientName={(p) => patientName(p.patient_id)} />
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
