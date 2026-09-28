import React, { useMemo, useState } from 'react';
import { Users, Search, Eye, PlusCircle, UserCheck } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { Card, PageHeader, Loading, ErrorState, EmptyState, RiskBadge, Alert, StatusBadge } from '../ui/UI';
import { formatDate, normalizePrediction } from '../../utils/format';

/**
 * Patient list (GET /api/patients) enriched with prediction counts from
 * GET /api/predictions. Used for both "My Patients" and "Patient Search".
 */
export default function DoctorPatients({ onNavigate, patients, predictions, reloadAll, searchMode = false }) {
  const [query, setQuery] = useState('');
  // Patients whose treating doctor is the signed-in doctor (GET /api/auth/me/patients)
  const mine = useApiData(async () => (searchMode ? { patients: [] } : unwrap(await apiService.getMyPatients())), [searchMode]);
  const [gender, setGender] = useState('All');

  const byPatient = useMemo(() => {
    const m = {};
    predictions.list.forEach((p) => {
      const k = Number(p.patient_id);
      if (!m[k]) m[k] = [];
      m[k].push(p);
    });
    return m;
  }, [predictions.list]);

  const genders = useMemo(() => ['All', ...new Set(patients.list.map((p) => p.gender).filter(Boolean))], [patients.list]);

  const rows = patients.list.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || String(p.patient_id).toLowerCase().includes(q) || String(p.id) === q || String(p.gender || '').toLowerCase().includes(q);
    const matchG = gender === 'All' || p.gender === gender;
    return matchQ && matchG;
  });

  const showRows = searchMode ? (query.trim() || gender !== 'All' ? rows : []) : rows;

  return (
    <div className="stack-lg">
      <PageHeader
        title={searchMode ? 'Patient Search' : 'My Patients'}
        subtitle={searchMode ? 'Find a patient record by patient ID, record number or gender.' : 'Patient records registered in the system.'}
        actions={<button className="btn btn-primary" onClick={() => onNavigate('/doctor/analysis')}><PlusCircle /> Patient Analysis</button>}
      />

      {!searchMode && (
        <Card title="Assigned to me" subtitle="Patients who selected you as their treating doctor" icon={UserCheck} noBody>
          {mine.loading ? <Loading /> : mine.error ? <ErrorState message={mine.error} onRetry={mine.reload} /> : (mine.data?.patients || []).length === 0 ? (
            <EmptyState icon={UserCheck} title="No assigned patients yet" message="Patients appear here when they choose you as their treating doctor or the administrator assigns them to you." />
          ) : (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Patient</th><th>Patient ID</th><th>Account</th><th>Predictions</th><th>Latest result</th><th className="right">Actions</th></tr>
                </thead>
                <tbody>
                  {mine.data.patients.map((p) => {
                    const list = byPatient[Number(p.id)] || [];
                    const latest = list.length ? normalizePrediction(list[0]) : null;
                    return (
                      <tr key={p.id}>
                        <td><div className="strong">{p.name || '—'}</div><div className="xs muted">{p.email}</div></td>
                        <td className="mono">{p.patient_id}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td>{list.length}</td>
                        <td>{latest ? <RiskBadge result={latest.label} /> : <span className="muted">—</span>}</td>
                        <td>
                          <div className="actions">
                            <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/doctor/patients/${p.id}`)}><Eye /> Details</button>
                            <button className="btn btn-sm btn-primary" onClick={() => onNavigate(`/doctor/analysis/${p.id}`)}><PlusCircle /> Analyse</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      <Card noBody title={searchMode ? undefined : 'All patient records'} icon={searchMode ? undefined : Users}>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input
              className="input"
              placeholder="Search by patient ID (e.g. PAT-0005)…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={searchMode}
              aria-label="Search patients"
            />
          </div>
          <select className="select" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Filter by gender">
            {genders.map((g) => <option key={g} value={g}>{g === 'All' ? 'All genders' : g}</option>)}
          </select>
          <span className="small muted" style={{ marginLeft: 'auto' }}>{patients.loading ? '' : `${showRows.length} of ${patients.list.length} patients`}</span>
        </div>

        {patients.loading ? <Loading /> : patients.error ? <ErrorState message={patients.error} onRetry={reloadAll} /> : showRows.length === 0 ? (
          <EmptyState
            icon={searchMode && !query.trim() && gender === 'All' ? Search : Users}
            title={searchMode && !query.trim() && gender === 'All' ? 'Search for a patient' : patients.list.length ? 'No matching patients' : 'No patients registered yet'}
            message={searchMode && !query.trim() && gender === 'All' ? 'Type a patient ID or choose a filter to see matching records.' : patients.list.length ? 'Try a different search term.' : 'Patient accounts are created by the administrator.'}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Gender</th>
                  <th>Date of birth</th>
                  <th>Predictions</th>
                  <th>Latest result</th>
                  <th>Registered</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {showRows.map((p) => {
                  const list = byPatient[Number(p.id)] || [];
                  const latest = list.length ? normalizePrediction(list[0]) : null;
                  return (
                    <tr key={p.id}>
                      <td className="mono strong">{p.patient_id}</td>
                      <td>{p.gender || '—'}</td>
                      <td>{formatDate(p.date_of_birth)}</td>
                      <td>{list.length}</td>
                      <td>{latest ? <RiskBadge result={latest.label} /> : <span className="muted">—</span>}</td>
                      <td>{formatDate(p.created_at)}</td>
                      <td>
                        <div className="actions">
                          <button className="btn btn-sm btn-ghost" onClick={() => onNavigate(`/doctor/patients/${p.id}`)}><Eye /> Details</button>
                          <button className="btn btn-sm btn-primary" onClick={() => onNavigate(`/doctor/analysis/${p.id}`)}><PlusCircle /> Analyse</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Alert type="info">
        Patient names are visible to the administrator only; the patient endpoints available to doctors return patient IDs.
          Doctor–patient assignment is not yet stored by the server, so all registered patients are listed.
      </Alert>
    </div>
  );
}
