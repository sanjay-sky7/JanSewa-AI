import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ACTIVE_STATUSES = ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING'];

function toneByStatus(status) {
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

export default function CitizenDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let timer;

    async function load() {
      if (!user?.phone && !user?.email) {
        setItems([]);
        setNotifications([]);
        setLoading(false);
        return;
      }

      if (!hasLoadedRef.current) setLoading(true);
      setError('');

      try {
        const complaintParams = { page: 1, per_page: 200 };
        if (user?.phone) complaintParams.citizen_phone = user.phone;
        if (user?.email) complaintParams.citizen_email = user.email;

        const [complaintsRes, notificationsRes] = await Promise.allSettled([
          complaintsAPI.list(complaintParams),
          complaintsAPI.myNotifications({ limit: 20 }),
        ]);

        if (complaintsRes.status === 'fulfilled') {
          setItems(complaintsRes.value.data?.items || []);
        }
        if (notificationsRes.status === 'fulfilled') {
          setNotifications(notificationsRes.value.data?.items || []);
        }
        setLastUpdated(new Date());
        hasLoadedRef.current = true;
      } catch {
        setError(t('citizen_dash_load_failed', 'Could not load your dashboard analytics right now.'));
      } finally {
        setLoading(false);
      }
    }

    load();
    timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [user?.phone, user?.email, t]);

  const statusLabel = (status) => t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));

  const analytics = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => ACTIVE_STATUSES.includes(i.status)).length;
    const resolved = items.filter((i) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length;
    const critical = items.filter((i) => i.priority_level === 'CRITICAL').length;
    const recent7 = items.filter((i) => {
      const created = new Date(i.created_at).getTime();
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return created >= sevenDaysAgo;
    }).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    return { total, active, resolved, critical, recent7, resolutionRate };
  }, [items]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0a2a63] via-[#1e3a8a] to-[#0ea5e9] p-6 shadow-xl">
        <div className="pointer-events-none absolute -left-8 top-0 h-24 w-24 rounded-full bg-[#ff9933]/40 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#138808]/35 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">{t('citizen_dash_header_tag', 'Citizen Analytics')}</p>
          <h1 className="mt-1 text-3xl font-black text-white">{t('citizen_dash_title', 'Citizen Real-Time Dashboard')}</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-100">{t('citizen_dash_subtitle', 'Live tracking of your complaints, response velocity, and latest leadership updates.')}</p>
          <p className="mt-2 text-xs text-slate-100/90">
            {t('citizen_dash_last_updated', 'Last updated')}: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <MetricCard label={t('citizen_dash_total', 'Total')} value={analytics.total} tone="from-[#0b3a86]/15 to-[#0b3a86]/5" />
        <MetricCard label={t('citizen_dash_active', 'Active')} value={analytics.active} tone="from-amber-100 to-amber-50" />
        <MetricCard label={t('citizen_dash_resolved', 'Resolved')} value={analytics.resolved} tone="from-emerald-100 to-emerald-50" />
        <MetricCard label={t('citizen_dash_critical', 'Critical')} value={analytics.critical} tone="from-rose-100 to-rose-50" />
        <MetricCard label={t('citizen_dash_recent7', 'Last 7 Days')} value={analytics.recent7} tone="from-sky-100 to-sky-50" />
        <MetricCard label={t('citizen_dash_rate', 'Resolution %')} value={`${analytics.resolutionRate}%`} tone="from-violet-100 to-violet-50" />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="card overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">{t('citizen_dash_recent_complaints', 'Recent Complaints')}</h2>
          </div>
          <div className="max-h-[360px] divide-y overflow-y-auto">
            {loading ? (
              <p className="px-5 py-8 text-sm text-gray-500">{t('citizen_dash_loading', 'Loading live analytics...')}</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">{t('citizen_dash_no_complaints', 'No complaints yet. Start by registering one.')}</p>
            ) : (
              items.slice(0, 8).map((item) => (
                <Link
                  key={item.id}
                  to={`/complaints/${item.id}`}
                  className="block px-5 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-medium text-gray-900">{item.raw_text || item.ai_summary || t('my_complaint', 'Complaint')}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${toneByStatus(item.status)}`}>
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                </Link>
              ))
            )}
          </div>
        </article>

        <article className="card overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-gray-900">{t('citizen_dash_live_updates', 'Live Updates')}</h2>
          </div>
          <div className="max-h-[360px] divide-y overflow-y-auto">
            {loading ? (
              <p className="px-5 py-8 text-sm text-gray-500">{t('citizen_dash_loading', 'Loading live analytics...')}</p>
            ) : notifications.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-500">{t('citizen_dash_no_updates', 'No updates yet. Status changes will appear here.')}</p>
            ) : (
              notifications.slice(0, 10).map((note) => (
                <div key={`${note.complaint_id}-${note.performed_at}`} className="px-5 py-3">
                  <p className="text-xs font-semibold text-gray-900">{note.complaint_summary || t('my_complaint_update', 'Complaint update')}</p>
                  <p className="mt-1 text-xs text-gray-700">{note.notification_message}</p>
                  <p className="mt-1 text-[11px] text-gray-400">{new Date(note.performed_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }) {
  return (
    <div className={`rounded-2xl border border-white/70 bg-gradient-to-br ${tone} p-4 shadow-md ring-1 ring-slate-200/80`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
