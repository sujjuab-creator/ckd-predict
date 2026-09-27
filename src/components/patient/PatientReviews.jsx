import React from 'react';
import { MessageSquareText, RefreshCw } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, Loading, ErrorState, EmptyState, Alert } from '../ui/UI';
import ReviewItem from './ReviewItem';

/** GET /api/patient/reviews – read-only reviews written by the patient's doctor. */
export default function PatientReviews({ onNavigate }) {
  const res = useApiData(async () => unwrap(await apiService.getPatientReviews(), 'Unable to load doctor reviews.').reviews || [], []);
  const reviews = res.data || [];

  return (
    <div className="stack-lg">
      <PageHeader
        title="Doctor Reviews"
        subtitle="Notes and recommendations from your treating doctor about your results."
        actions={<button className="btn btn-ghost" onClick={res.reload} disabled={res.loading}><RefreshCw /> Refresh</button>}
      />
      <Card title={`Reviews${reviews.length ? ` (${reviews.length})` : ''}`} icon={MessageSquareText} noBody>
        {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : reviews.length ? (
          reviews.map((r) => <ReviewItem key={r.id} review={r} onOpenReport={(id) => onNavigate(`/patient/reports/${id}`)} />)
        ) : (
          <EmptyState
            icon={MessageSquareText}
            title="No reviews yet"
            message="Your doctor hasn't added any reviews to your record yet. You'll get a notification as soon as they do."
            action={<button className="btn btn-outline" onClick={() => onNavigate('/patient/reports')}>View my reports</button>}
          />
        )}
      </Card>
      <Alert type="info">
        Reviews are written by your treating doctor and can only be changed by them. If you have questions about a review,
        please contact your doctor directly.
      </Alert>
    </div>
  );
}
