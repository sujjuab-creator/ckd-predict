import React, { useMemo } from 'react';
import { FileText, RefreshCw, FilePlus } from 'lucide-react';
import { Card, PageHeader, Loading, ErrorState, RiskBadge, EmptyState } from '../ui/UI';
import { ReportsTable } from '../prediction/Tables';
import ReportActions from '../prediction/ReportActions';
import { normalizePrediction, formatDate } from '../../utils/format';

export default function DoctorReports({ onNavigate, reports, predictions, reloadReports, patientLabel }) {
  const withoutReport = useMemo(() => {
    const has = new Set(reports.list.map((r) => Number(r.prediction_id)));
    return predictions.list.filter((p) => !has.has(Number(p.id))).slice(0, 8);
  }, [reports.list, predictions.list]);

  return (
    <div className="stack-lg">
      <PageHeader
        title="Medical Reports"
        subtitle="Server-generated PDF reports for saved predictions."
        actions={<button className="btn btn-ghost" onClick={reloadReports}><RefreshCw /> Refresh</button>}
      />

      <Card title="Generated reports" icon={FileText} noBody>
        {reports.loading ? <Loading /> : reports.error ? <ErrorState message={reports.error} onRetry={reloadReports} /> : (
          <ReportsTable reports={reports.list} patientName={(r) => patientLabel(r.patient_id)} onViewPrediction={(id) => onNavigate(`/doctor/result/${id}`)} />
        )}
      </Card>

      <Card title="Predictions without a report" subtitle="Most recent predictions that have no PDF yet" icon={FilePlus} noBody>
        {predictions.loading ? <Loading /> : withoutReport.length === 0 ? (
          <EmptyState icon={FileText} title="All caught up" message="Every saved prediction already has a report." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Prediction</th><th>Patient</th><th>Date</th><th>Result</th><th className="right">Report</th></tr></thead>
              <tbody>
                {withoutReport.map((p) => {
                  const n = normalizePrediction(p);
                  return (
                    <tr key={n.id}>
                      <td className="mono strong">{n.code}</td>
                      <td>{patientLabel(p.patient_id)}</td>
                      <td>{formatDate(n.createdAt, true)}</td>
                      <td><RiskBadge result={n.label} /></td>
                      <td><div className="actions"><ReportActions predictionId={n.id} onGenerated={reloadReports} /></div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
