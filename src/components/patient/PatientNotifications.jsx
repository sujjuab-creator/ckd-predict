import React, { useState } from 'react';
import { Bell, FileText, MessageSquareText, ShieldCheck, Info, CheckCheck, ArrowRight } from 'lucide-react';
import apiService from '../../services/api';
import useApiData, { unwrap } from '../../hooks/useApiData';
import { PageHeader, Card, Loading, ErrorState, EmptyState, Alert } from '../ui/UI';
import { formatDate } from '../../utils/format';

const TYPE_STYLE = {
  report: { icon: FileText, tone: 'tone-green', label: 'Report' },
  review: { icon: MessageSquareText, tone: 'tone-blue', label: 'Doctor review' },
  security: { icon: ShieldCheck, tone: 'tone-amber', label: 'Account security' },
  info: { icon: Info, tone: 'tone-navy', label: 'Information' },
};

/** GET /api/notifications – the signed-in user's real notifications only. */
export default function PatientNotifications({ onNavigate, setUnread }) {
  const res = useApiData(async () => unwrap(await apiService.getNotifications(), 'Unable to load notifications.'), []);
  const [error, setError] = useState('');
  const items = res.data?.notifications || [];
  const unreadCount = items.filter((n) => !n.is_read).length;

  const applyRead = (ids) => {
    const next = items.map((n) => (ids === 'all' || ids.includes(n.id) ? { ...n, is_read: true } : n));
    res.setData({ ...res.data, notifications: next, unread_count: next.filter((n) => !n.is_read).length });
    setUnread?.(next.filter((n) => !n.is_read).length);
  };

  const open = async (n) => {
    setError('');
    if (!n.is_read) {
      const r = await apiService.markNotificationRead(n.id);
      if (r.ok) applyRead([n.id]);
      else setError(r.data?.error || 'Could not update the notification.');
    }
    if (n.link && n.link.startsWith('/patient')) onNavigate(n.link);
  };

  const readAll = async () => {
    setError('');
    const r = await apiService.markAllNotificationsRead();
    if (r.ok) applyRead('all');
    else setError(r.data?.error || 'Could not update notifications.');
  };

  return (
    <div className="stack-lg">
      <PageHeader
        title="Notifications"
        subtitle="Updates about your reports, doctor reviews and account security."
        actions={unreadCount > 0 && <button className="btn btn-ghost" onClick={readAll}><CheckCheck /> Mark all as read</button>}
      />
      {error && <Alert type="error">{error}</Alert>}
      <Card title={unreadCount ? `${unreadCount} unread` : 'All caught up'} icon={Bell} noBody>
        {res.loading ? <Loading /> : res.error ? <ErrorState message={res.error} onRetry={res.reload} /> : items.length ? (
          <div>
            {items.map((n) => {
              const style = TYPE_STYLE[n.type] || TYPE_STYLE.info;
              const Icon = style.icon;
              return (
                <div key={n.id} className={`note-item ${n.is_read ? '' : 'unread'}`}>
                  <span className={`ic ${style.tone}`}><Icon /></span>
                  <div className="grow">
                    <div className="t">{n.title} {!n.is_read && <span className="badge badge-green" style={{ marginLeft: 6 }}>New</span>}</div>
                    {n.message && <div className="m">{n.message}</div>}
                    <div className="d">{style.label} · {formatDate(n.created_at, true)}</div>
                  </div>
                  {(n.link?.startsWith('/patient') || !n.is_read) && (
                    <button className="btn btn-sm btn-ghost" onClick={() => open(n)}>
                      {n.link?.startsWith('/patient') ? <>Open <ArrowRight /></> : 'Mark as read'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Bell}
            title="No notifications"
            message="You'll be notified here when a new report is added, when your doctor reviews your results, or when your account security changes."
          />
        )}
      </Card>
    </div>
  );
}
