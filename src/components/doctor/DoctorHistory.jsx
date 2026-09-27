import React, { useState } from 'react';
import { History, Search, PlusCircle } from 'lucide-react';
import { Card, PageHeader, Loading, ErrorState, Disclaimer } from '../ui/UI';
import { PredictionsTable } from '../prediction/Tables';
import { isRiskResult } from '../../utils/format';

export default function DoctorHistory({ onNavigate, predictions, reloadAll, patientLabel }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('All');

  const rows = predictions.list.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || String(p.prediction_id).toLowerCase().includes(q) || String(patientLabel(p.patient_id)).toLowerCase().includes(q);
    const risk = isRiskResult(p.prediction_result);
    const matchR = result === 'All' || (result === 'risk' ? risk : !risk);
    return matchQ && matchR;
  });

  return (
    <div className="stack-lg">
      <PageHeader
        title="Prediction History"
        subtitle="All CKD risk predictions saved in the system."
        actions={<button className="btn btn-primary" onClick={() => onNavigate('/doctor/predictions')}><PlusCircle /> New Prediction</button>}
      />
      <Card noBody>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input className="input" placeholder="Search prediction or patient ID…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search predictions" />
          </div>
          <select className="select" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Filter by result">
            <option value="All">All results</option>
            <option value="risk">CKD Risk</option>
            <option value="norisk">No CKD Risk</option>
          </select>
          <span className="small muted" style={{ marginLeft: 'auto' }}><History size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {rows.length} predictions</span>
        </div>
        {predictions.loading ? <Loading /> : predictions.error ? <ErrorState message={predictions.error} onRetry={reloadAll} /> : (
          <PredictionsTable predictions={rows} patientName={(p) => patientLabel(p.patient_id)} onView={(p) => onNavigate(`/doctor/result/${p.id}`)} />
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
