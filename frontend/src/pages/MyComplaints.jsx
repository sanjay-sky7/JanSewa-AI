import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getComplaintDisplayText } from '../utils/complaintText';
import { formatComplaintDateTime } from '../utils/dateTime';

const STATUS_FLOW = [
  'OPEN',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'VERIFICATION_PENDING',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
];

function statusStep(status) {
  const idx = STATUS_FLOW.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function statusTone(status) {
  const map = {
    OPEN: 'bg-slate-100 text-slate-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    ASSIGNED: 'bg-amber-100 text-amber-700',
    IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
    VERIFICATION_PENDING: 'bg-violet-100 text-violet-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    VERIFIED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-200 text-gray-700',
  };
  return map[status] || map.OPEN;
}

export default function MyComplaints() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [error, setError] = useState('');

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesStatus = !statusFilter || item.status === statusFilter;
      const text = `${item.raw_text || ''} ${item.ai_summary || ''}`.toLowerCase();
      const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
      const createdAt = new Date(item.created_at).getTime();

      const bucketMatch = (() => {
        if (!bucketFilter || bucketFilter === 'total') return true;
        if (bucketFilter === 'active') return ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING'].includes(item.status);
        if (bucketFilter === 'resolved') return ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(item.status);
        if (bucketFilter === 'critical') return item.priority_level === 'CRITICAL';
        if (bucketFilter === 'overdue') {
          const isActive = ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING'].includes(item.status);
          return isActive && Number.isFinite(createdAt) && (Date.now() - createdAt) > (7 * 24 * 60 * 60 * 1000);
        }
        return true;
      })();

      return matchesStatus && matchesQuery && bucketMatch;
    });
  }, [items, statusFilter, query, bucketFilter]);

  const summary = useMemo(() => {
    const open = items.filter((i) => ['OPEN', 'UNDER_REVIEW', 'ASSIGNED'].includes(i.status)).length;
    const inProgress = items.filter((i) => ['IN_PROGRESS', 'VERIFICATION_PENDING'].includes(i.status)).length;
    const resolved = items.filter((i) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length;
    return {
      total: items.length,
      open,
      inProgress,
      resolved,
    };
  }, [items]);

  useEffect(() => {
    loadComplaints();
  }, [user?.id]);

  useEffect(() => {
    const bucketFromUrl = (searchParams.get('bucket') || '').toLowerCase();
    if (bucketFromUrl) {
      setBucketFilter(bucketFromUrl);
      setStatusFilter('');
    } else {
      setBucketFilter('');
    }
  }, [searchParams]);

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [user?.id, user?.role]);

  async function loadComplaints() {
    if (!user) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const perPage = 100;
      let page = 1;
      let total = 0;
      const allItems = [];

      do {
        const { data } = await complaintsAPI.mine({
          page,
          per_page: perPage,
        });
        const itemsPage = data?.items || [];
        total = Number(data?.total || 0);
        allItems.push(...itemsPage);
        page += 1;
      } while (allItems.length < total);

      setItems(allItems);
    } catch (err) {
      setError(err.response?.data?.detail || t('manage_failed_load', 'Failed to load complaints.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadNotifications() {
    if (user?.role !== 'CITIZEN') {
      setNotifications([]);
      return;
    }

    setLoadingNotifications(true);
    try {
      const { data } = await complaintsAPI.myNotifications({ limit: 30 });
      setNotifications(data.items || []);
    } catch {
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }

  const latestFeedbackByComplaint = useMemo(() => {
    const map = {};
    for (const note of notifications) {
      if (!map[note.complaint_id]) map[note.complaint_id] = note;
    }
    return map;
  }, [notifications]);

  const statusLabel = (status) => t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));

  return (
    <div className="my-page mx-auto max-w-6xl space-y-6">
      <header className="my-hero relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 shadow-xl">
        <div className="pointer-events-none absolute -left-14 top-0 h-32 w-32 rounded-full bg-blue-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-28 w-28 rounded-full bg-cyan-200/35 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Citizen Desk</p>
          <h1 className="text-3xl font-black text-white">{t('my_title', 'My Complaints')}</h1>
          <p className="mt-2 text-sm text-slate-100/95">
          {t('my_subtitle', 'Track complete complaint history and the latest progress timeline.')}
          </p>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard title={t('my_total', 'Total')} value={summary.total} tone="from-blue-100 to-blue-50" />
        <SummaryCard title={t('my_open', 'Open')} value={summary.open} tone="from-indigo-100 to-slate-50" />
        <SummaryCard title={t('my_in_progress', 'In Progress')} value={summary.inProgress} tone="from-cyan-100 to-cyan-50" />
        <SummaryCard title={t('my_resolved', 'Resolved')} value={summary.resolved} tone="from-emerald-100 to-emerald-50" />
      </section>

      {!user?.phone && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t('my_add_mobile_hint', 'Add your mobile number in My Profile for SMS and faster identity linking.')}
        </div>
      )}

      <section className="my-toolbar card p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('my_search', 'Search')}</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('my_search_placeholder', 'Search complaint text')}
              className="my-input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{t('my_status', 'Status')}</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setBucketFilter('');
                setStatusFilter(e.target.value);
              }}
              className="my-input w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm"
            >
              <option value="">{t('my_all_statuses', 'All statuses')}</option>
              {STATUS_FLOW.map((status) => (
                <option key={status} value={status}>{statusLabel(status)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                loadComplaints();
                loadNotifications();
              }}
              className="w-full rounded-lg bg-gradient-to-r from-[#0a2a63] via-[#1d4ed8] to-[#0ea5e9] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              {t('my_refresh', 'Refresh')}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="my-notifications card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{t('my_latest_notifications', 'Latest Notifications')}</p>
            <p className="text-xs text-gray-500">{t('my_notifications_subtitle', 'Leader feedback and status changes for your complaints.')}</p>
          </div>
          <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
            {notifications.filter((n) => n.is_recent).length} {t('my_recent', 'recent')}
          </span>
        </div>
        <div className="mt-3 space-y-2">
          {loadingNotifications ? (
            <p className="text-sm text-gray-500">{t('my_loading_notifications', 'Loading notifications...')}</p>
          ) : notifications.length === 0 ? (
            <p className="text-sm text-gray-500">{t('my_no_notifications', 'No notifications yet. Updates will appear when leaders change status.')}</p>
          ) : (
            notifications.slice(0, 6).map((note) => (
              <div key={`${note.complaint_id}-${note.performed_at}`} className="my-note rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900">{note.complaint_summary || t('my_complaint_update', 'Complaint update')}</p>
                  <Link to={`/complaints/${note.complaint_id}`} className="text-[11px] font-semibold text-primary-700 hover:underline">
                    {t('my_open_complaint', 'Open complaint')}
                  </Link>
                </div>
                <p className="mt-1 text-xs text-gray-700">{note.notification_message}</p>
                <p className="mt-1 text-[11px] text-gray-400">{formatComplaintDateTime(note.performed_at)}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="card p-6 text-sm text-gray-500">{t('my_loading_complaints', 'Loading complaints...')}</div>
        ) : filteredItems.length === 0 ? (
          <div className="card p-6 text-sm text-gray-500">{t('my_no_filtered', 'No complaints found for the selected filters.')}</div>
        ) : (
          filteredItems.map((item) => {
            const step = statusStep(item.status);
            return (
              <article key={item.id} className="my-complaint-item card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{getComplaintDisplayText(item, t('my_complaint', 'Complaint'))}</p>
                    <p className="mt-1 text-xs text-gray-500">{t('complaint_filed_on', 'Filed on')} {formatComplaintDateTime(item.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                    <span className="rounded-full bg-primary-50 px-2 py-1 text-xs font-semibold text-primary-700">
                      {item.priority_level || t('common_na', 'N/A')}
                    </span>
                    <Link to={`/complaints/${item.id}`} className="text-xs font-semibold text-primary-700 hover:underline">
                      {t('my_view_details', 'View details')}
                    </Link>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="my-feedback rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">{t('my_latest_feedback', 'Latest Leader Feedback')}</p>
                    {latestFeedbackByComplaint[item.id] ? (
                      <>
                        <p className="mt-1 text-xs text-blue-900">
                          {latestFeedbackByComplaint[item.id].notification_message}
                        </p>
                        <p className="mt-1 text-[11px] text-blue-700/80">
                          {formatComplaintDateTime(latestFeedbackByComplaint[item.id].performed_at)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-xs text-blue-900">{t('my_no_leader_note', 'No leader note yet. You will get notified when status changes.')}</p>
                    )}
                  </div>

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('my_progress_timeline', 'Progress Timeline')}</p>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-8">
                    {STATUS_FLOW.map((status, idx) => (
                      <div
                        key={status}
                        className={`my-step rounded-lg border px-2 py-2 text-center text-[11px] font-semibold ${
                          idx <= step
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 bg-gray-50 text-gray-500'
                        }`}
                      >
                        {statusLabel(status)}
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

function SummaryCard({ title, value, tone }) {
  return (
    <div className={`my-summary-card relative overflow-hidden rounded-2xl border border-white bg-gradient-to-br ${tone} p-4 shadow-sm ring-1 ring-slate-200`}>
      <div className="pointer-events-none absolute -right-6 -top-6 h-16 w-16 rounded-full bg-white/30 blur-xl" />
      <p className="my-summary-title text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="my-summary-value mt-2 text-3xl font-black leading-none text-slate-900">{value}</p>
    </div>
  );
}
