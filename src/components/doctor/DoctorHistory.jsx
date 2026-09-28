import React, { useMemo, useState } from 'react';
import { History, Search, PlusCircle, Eye, ChevronDown, ChevronUp, ArrowUpDown, Layers } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { Card, PageHeader, Loading, ErrorState, EmptyState, Disclaimer, RiskBadge } from '../ui/UI';
import { formatDate, formatPercent, isRiskResult } from '../../utils/format';

const SOURCES = [
  { id: '', label: 'All sources' },
  { id: 'single_report', label: 'Single Report' },
  { id: 'batch', label: 'Batch Analysis' },
  { id: 'manual', label: 'Manual Entry' },
];

const SORTERS = {
  id: (p) => p.id,
  patient: (p) => p.patient_code || '',
  result: (p) => p.prediction_result || '',
  probability: (p) => p.prediction_probability ?? -1,
  source: (p) => p.source_label || '',
  date: (p) => p.created_at || '',
};

/**
 * Unified prediction history from GET /api/doctor/analysis/history:
 * Single Report, Batch Analysis and manual predictions for the doctor's assigned patients only.
 */
export default function DoctorHistory({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getAnalysisHistory(), 'Unable to load prediction history.').predictions || [], []);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('All');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState({ key: 'date', dir: -1 });

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (res.data || []).filter((p) => {
      const matchQ = !q || [p.prediction_id, p.patient_code, p.patient_name, p.report_reference, p.batch_id]
        .some((v) => String(v || '').toLowerCase().includes(q));
      const risk = isRiskResult(p.prediction_result);
      const matchR = result === 'All' || (result === 'risk' ? risk : !risk);
      const matchS = !source || (source === 'manual' ? (p.source === 'manual' || !p.source) : p.source === source);
      return matchQ && matchR && matchS;
    });
    const key = SORTERS[sort.key];
    return [...list].sort((a, b) => (key(a) > key(b) ? 1 : key(a) < key(b) ? -1 : 0) * sort.dir);
  }, [res.data, query, result, source, sort]);

  const sortBy = (key) => setSort((s) => ({ key, dir: s.key === key ? -s.dir : -1 }));
  const Head = ({ k, children }) => (
    <th><button type="button" className="th-sort" onClick={() => sortBy(k)}>{children} {sort.key === k ? (sort.dir > 0 ? <ChevronUp /> : <ChevronDown />) : <ArrowUpDown />}</button></th>
  );

  return (
    <div className="stack-lg">
      <PageHeader
        title="Prediction History"
        subtitle="Predictions for your assigned patients from Patient Analysis, Batch Analysis and manual entry."
        actions={(
          <>
            <button className="btn btn-ghost" onClick={() => onNavigate('/doctor/batch')}><Layers /> Batch Analysis</button>
            <button className="btn btn-primary" onClick={() => onNavigate('/doctor/analysis')}><PlusCircle /> Patient Analysis</button>
          </>
        )}
      />
      <Card noBody>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input className="input" placeholder="Search prediction, patient, report or batch…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search predictions" />
          </div>
          <select className="select" value={result} onChange={(e) => setResult(e.target.value)} aria-label="Filter by result">
            <option value="All">All results</option>
            <option value="risk">CKD Risk</option>
            <option value="norisk">No CKD Risk</option>
          </select>
          <select className="select" value={source} onChange={(e) => setSource(e.target.value)} aria-label="Filter by source">
            {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <span className="small muted" style={{ marginLeft: 'auto' }}><History size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> {rows.length} predictions</span>
        </div>
        {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : rows.length === 0 ? (
          <EmptyState icon={History} title="No predictions found" message="Predictions you run for your assigned patients will appear here." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <Head k="id">Prediction ID</Head>
                  <Head k="patient">Patient</Head>
                  <Head k="result">Result</Head>
                  <Head k="probability">Probability</Head>
                  <Head k="source">Source</Head>
                  <th>Doctor</th>
                  <th>Model</th>
                  <Head k="date">Date</Head>
                  <th className="right">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id}>
                    <td className="mono strong">{p.prediction_id}</td>
                    <td><div className="mono">{p.patient_code}</div>{p.patient_name && <div className="xs muted">{p.patient_name}</div>}</td>
                    <td><RiskBadge result={p.prediction_result} /></td>
                    <td>{formatPercent(p.prediction_probability)}</td>
                    <td>
                      <div>{p.source_label}</div>
                      {p.report_reference && <div className="xs muted" title={p.report_reference}>{p.report_reference.length > 34 ? `${p.report_reference.slice(0, 34)}…` : p.report_reference}</div>}
                    </td>
                    <td>{p.doctor_name || '—'}</td>
                    <td className="small">{p.model_name || '—'}</td>
                    <td>{formatDate(p.created_at, true)}</td>
                    <td className="right"><button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/doctor/result/${p.id}`)}><Eye /> View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Disclaimer />
    </div>
  );
}
