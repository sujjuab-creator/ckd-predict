import React, { useState } from 'react';
import { MessageSquareText, MessageSquarePlus, Loader2, Pencil, Trash2, Save, X } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { useAuth } from '../../context/AuthContext';
import { Card, Alert, Loading, ErrorState, EmptyState, Field } from '../ui/UI';
import ReviewItem from '../patient/ReviewItem';

/**
 * Doctor reviews for one patient. Any doctor/admin can read them; only the
 * patient's assigned treating doctor can add a review (enforced by the API,
 * which also returns `can_review`). Authors can edit or delete their own reviews.
 */
export default function DoctorReviewPanel({ patientDbId, predictionId = null, reports = [], title = 'Doctor reviews' }) {
  const { currentUser } = useAuth();
  const res = useApiData(async () => unwrap(await apiService.getReviews(patientDbId), 'Unable to load reviews.'), [patientDbId]);
  const reviews = (res.data?.reviews || []).filter((r) => !predictionId || Number(r.prediction_id) === Number(predictionId));
  const canReview = Boolean(res.data?.can_review);

  const linkedReport = predictionId ? reports.find((r) => Number(r.prediction_id) === Number(predictionId)) : null;
  const [form, setForm] = useState({ text: '', rec: '', reportId: '' });
  const [state, setState] = useState({ busy: false, error: '', ok: '' });
  const [editing, setEditing] = useState(null); // { id, text, rec }

  const submit = async (e) => {
    e.preventDefault();
    if (form.text.trim().length < 3) return setState({ busy: false, error: 'Please write a review.', ok: '' });
    setState({ busy: true, error: '', ok: '' });
    const body = { patient_id: patientDbId, review_text: form.text.trim(), recommendations: form.rec.trim() };
    if (predictionId) body.prediction_id = predictionId;
    else if (form.reportId) body.report_id = Number(form.reportId);
    const r = await apiService.createReview(body);
    if (r.ok && r.data?.success) {
      setForm({ text: '', rec: '', reportId: '' });
      setState({ busy: false, error: '', ok: 'Review saved. The patient has been notified.' });
      res.reload();
    } else {
      setState({ busy: false, error: r.data?.error || 'Could not save the review.', ok: '' });
    }
    return undefined;
  };

  const saveEdit = async () => {
    if (!editing || editing.text.trim().length < 3) return;
    setState({ busy: true, error: '', ok: '' });
    const r = await apiService.updateReview(editing.id, { review_text: editing.text.trim(), recommendations: editing.rec.trim() });
    if (r.ok && r.data?.success) {
      setEditing(null);
      setState({ busy: false, error: '', ok: 'Review updated.' });
      res.reload();
    } else setState({ busy: false, error: r.data?.error || 'Could not update the review.', ok: '' });
  };

  const remove = async (id) => {
    setState({ busy: true, error: '', ok: '' });
    const r = await apiService.deleteReview(id);
    if (r.ok && r.data?.success) {
      setState({ busy: false, error: '', ok: 'Review deleted.' });
      res.reload();
    } else setState({ busy: false, error: r.data?.error || 'Could not delete the review.', ok: '' });
  };

  return (
    <Card title={title} icon={MessageSquareText} noBody>
      <div className="card-body stack">
        {state.error && <Alert type="error">{state.error}</Alert>}
        {state.ok && <Alert type="success">{state.ok}</Alert>}
        {res.loading ? null : canReview ? (
          <form className="stack" onSubmit={submit}>
            <Field label="Review" required htmlFor="rv-text" hint="Visible to the patient. Use clear, non-technical language.">
              <textarea id="rv-text" className="textarea" maxLength={5000} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Summary of your assessment of this result…" />
            </Field>
            <Field label="Recommendations" htmlFor="rv-rec" hint="Optional – e.g. follow-up tests, lifestyle advice, next appointment.">
              <textarea id="rv-rec" className="textarea" maxLength={5000} value={form.rec} onChange={(e) => setForm({ ...form, rec: e.target.value })} />
            </Field>
            {!predictionId && reports.length > 0 && (
              <Field label="Related report" htmlFor="rv-report">
                <select id="rv-report" className="select" value={form.reportId} onChange={(e) => setForm({ ...form, reportId: e.target.value })}>
                  <option value="">General review (no specific report)</option>
                  {reports.map((r) => <option key={r.id} value={r.id}>{r.report_id} · {r.formatted_prediction_id}</option>)}
                </select>
              </Field>
            )}
            {predictionId && (
              <div className="small muted">This review will be linked to this prediction{linkedReport ? ` and report ${linkedReport.report_id}` : ''}.</div>
            )}
            <div>
              <button className="btn btn-primary" disabled={state.busy}>
                {state.busy ? <Loader2 className="spin" /> : <MessageSquarePlus />} Add review
              </button>
            </div>
          </form>
        ) : (
          <Alert type="info">Only the patient&apos;s assigned treating doctor can add a review. Reviews are shown read-only.</Alert>
        )}
      </div>

      {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : reviews.length ? (
        reviews.map((r) => {
          const mine = currentUser?.role === 'doctor' && Number(r.doctor_user_id) === Number(currentUser?.id);
          if (editing?.id === r.id) {
            return (
              <div className="review-card stack" key={r.id}>
                <textarea className="textarea" aria-label="Edit review" value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} />
                <textarea className="textarea" aria-label="Edit recommendations" value={editing.rec} onChange={(e) => setEditing({ ...editing, rec: e.target.value })} placeholder="Recommendations (optional)" />
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn btn-sm btn-primary" onClick={saveEdit} disabled={state.busy}><Save /> Save</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing(null)}><X /> Cancel</button>
                </div>
              </div>
            );
          }
          return (
            <ReviewItem
              key={r.id}
              review={r}
              actions={mine && (
                <>
                  <button className="btn btn-sm btn-ghost" onClick={() => setEditing({ id: r.id, text: r.review_text || '', rec: r.recommendations || '' })}><Pencil /> Edit</button>
                  <button className="btn btn-sm btn-ghost" onClick={() => remove(r.id)} disabled={state.busy}><Trash2 /> Delete</button>
                </>
              )}
            />
          );
        })
      ) : (
        <EmptyState icon={MessageSquareText} title="No reviews yet" message={predictionId ? 'No review has been written for this prediction.' : 'No reviews have been written for this patient.'} />
      )}
    </Card>
  );
}
