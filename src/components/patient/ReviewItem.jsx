import React from 'react';
import { Stethoscope, FileText, Lightbulb } from 'lucide-react';
import { formatDate, initials } from '../../utils/format';

/** One doctor review (read-only). Optional `actions` slot is used by the doctor view. */
export default function ReviewItem({ review, onOpenReport, actions = null }) {
  const edited = review.updated_at && review.created_at && review.updated_at.slice(0, 16) !== review.created_at.slice(0, 16);
  return (
    <article className="review-card">
      <div className="row-between wrap" style={{ gap: 12 }}>
        <div className="row" style={{ gap: 12 }}>
          <div className="avatar" style={{ width: 40, height: 40, borderRadius: 12 }}>{initials(review.doctor_name || 'Dr')}</div>
          <div>
            <div className="strong">{review.doctor_name || 'Doctor'}</div>
            <div className="small muted">
              <Stethoscope size={12} style={{ display: 'inline', verticalAlign: '-1px' }} /> {formatDate(review.created_at, true)}
              {edited && ' · edited'}
            </div>
          </div>
        </div>
        <div className="row wrap" style={{ gap: 8 }}>
          {review.report_code && (
            onOpenReport && review.report_id
              ? <button className="badge badge-blue" onClick={() => onOpenReport(review.report_id)}><FileText /> {review.report_code}</button>
              : <span className="badge badge-blue"><FileText /> {review.report_code}</span>
          )}
          {!review.report_code && review.formatted_prediction_id && <span className="badge badge-gray">{review.formatted_prediction_id}</span>}
          {actions}
        </div>
      </div>
      <p className="review-text">{review.review_text}</p>
      {review.recommendations && (
        <div className="review-rec">
          <div className="strong small" style={{ marginBottom: 4 }}><Lightbulb size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> Recommendations</div>
          {review.recommendations}
        </div>
      )}
    </article>
  );
}
