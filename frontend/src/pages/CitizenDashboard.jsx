import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { complaintsAPI, publicAPI } from '../services/api';
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
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [wardStats, setWardStats] = useState(null);
  const [globalStats, setGlobalStats] = useState(null);
  const [leaderProfile, setLeaderProfile] = useState(null);
  const [leaderLoading, setLeaderLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  async function fetchAllCitizenComplaints() {
    const perPage = 100;
    let page = 1;
    let total = 0;
    const allItems = [];

    do {
      // Server max is 100 per page; iterate to avoid undercounting analytics.
      const { data } = await complaintsAPI.mine({ page, per_page: perPage });
      const items = data?.items || [];
      total = Number(data?.total || 0);
      allItems.push(...items);
      page += 1;
    } while (allItems.length < total);

    return allItems;
  }

  useEffect(() => {
    let timer;

    async function load() {
      if (!user || user.role !== 'CITIZEN') {
        setItems([]);
        setNotifications([]);
        try {
          const { data } = await complaintsAPI.stats();
          setGlobalStats(data || null);
        } catch {
          setGlobalStats(null);
        }
        setLoading(false);
        return;
      }

      if (!hasLoadedRef.current) setLoading(true);
      setError('');

      try {
        const [complaintsRes, notificationsRes, globalStatsRes] = await Promise.allSettled([
          fetchAllCitizenComplaints(),
          complaintsAPI.myNotifications({ limit: 20 }),
          complaintsAPI.stats(),
        ]);

        if (complaintsRes.status === 'fulfilled') {
          setItems(complaintsRes.value || []);
        } else {
          setItems([]);
        }
        if (notificationsRes.status === 'fulfilled') {
          setNotifications(notificationsRes.value.data?.items || []);
        } else {
          setNotifications([]);
        }
        if (globalStatsRes.status === 'fulfilled') {
          setGlobalStats(globalStatsRes.value.data || null);
        }
        if (complaintsRes.status === 'rejected' && notificationsRes.status === 'rejected') {
          setError(t('citizen_dash_load_failed', 'Could not load your dashboard analytics right now.'));
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
  }, [user?.id, user?.role, t]);

  const selectedWardId = useMemo(() => {
    if (user?.ward_id) return Number(user.ward_id);
    const fromComplaints = items.find((item) => item?.ward?.id)?.ward?.id;
    if (fromComplaints) return Number(fromComplaints);
    return null;
  }, [user?.ward_id, items]);

  useEffect(() => {
    async function loadWardIntel() {
      if (!selectedWardId) {
        setWardStats(null);
        setLeaderProfile(null);
        return;
      }

      setLeaderLoading(true);
      try {
        const [scoreRes, leaderRes] = await Promise.allSettled([
          publicAPI.wardScorecard(selectedWardId),
          publicAPI.wardLeader(selectedWardId),
        ]);

        if (scoreRes.status === 'fulfilled') {
          setWardStats(scoreRes.value.data || null);
        } else {
          setWardStats(null);
        }

        if (leaderRes.status === 'fulfilled') {
          setLeaderProfile(leaderRes.value.data || null);
        } else {
          setLeaderProfile(null);
        }
      } finally {
        setLeaderLoading(false);
      }
    }

    loadWardIntel();
  }, [selectedWardId]);

  const statusLabel = (status) => t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));

  const analytics = useMemo(() => {
    const now = Date.now();
    const total = items.length;
    const active = items.filter((i) => ACTIVE_STATUSES.includes(i.status)).length;
    const resolved = items.filter((i) => ['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)).length;
    const critical = items.filter((i) => i.priority_level === 'CRITICAL').length;
    const overdueActive = items.filter((i) => {
      if (!ACTIVE_STATUSES.includes(i.status)) return false;
      const created = new Date(i.created_at).getTime();
      return Number.isFinite(created) && (now - created) > (7 * 24 * 60 * 60 * 1000);
    }).length;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 0;

    const resolvedWithTimestamps = items.filter((i) => {
      if (!['RESOLVED', 'VERIFIED', 'CLOSED'].includes(i.status)) return false;
      return i.created_at && i.resolved_at;
    });
    const avgResolutionHours = resolvedWithTimestamps.length
      ? Math.round(
        resolvedWithTimestamps.reduce((acc, i) => {
          const start = new Date(i.created_at).getTime();
          const end = new Date(i.resolved_at).getTime();
          const diffHours = (end - start) / (1000 * 60 * 60);
          return acc + (Number.isFinite(diffHours) && diffHours > 0 ? diffHours : 0);
        }, 0) / resolvedWithTimestamps.length
      )
      : 0;

    if (total > 0) {
      return {
        total,
        active,
        resolved,
        critical,
        overdueActive,
        resolutionRate,
        avgResolutionHours,
        scope: 'personal',
      };
    }

    if (wardStats) {
      return {
        total: wardStats.total_complaints || 0,
        active: wardStats.pending || 0,
        resolved: wardStats.resolved || 0,
        critical: 0,
        overdueActive: 0,
        resolutionRate: Math.round(wardStats.resolution_rate || 0),
        avgResolutionHours: Math.round(wardStats.avg_resolution_hours || 0),
        scope: 'ward',
      };
    }

    if (globalStats) {
      return {
        total: globalStats.total_complaints || 0,
        active: globalStats.total_pending || globalStats.total_open || 0,
        resolved: globalStats.total_resolved || 0,
        critical: globalStats.total_critical || 0,
        overdueActive: 0,
        resolutionRate: globalStats.total_complaints
          ? Math.round(((globalStats.total_resolved || 0) / globalStats.total_complaints) * 100)
          : 0,
        avgResolutionHours: Math.round(globalStats.avg_resolution_hours || 0),
        scope: 'city',
      };
    }

    return { total, active, resolved, critical, overdueActive, resolutionRate, avgResolutionHours, scope: 'personal' };
  }, [items, wardStats, globalStats]);

  function handleMetricClick(metricKey) {
    const routeByMetric = {
      total: '/my-complaints?bucket=total',
      active: '/my-complaints?bucket=active',
      resolved: '/my-complaints?bucket=resolved',
      critical: '/my-complaints?bucket=critical',
      overdue: '/my-complaints?bucket=overdue',
    };
    navigate(routeByMetric[metricKey] || '/my-complaints');
  }

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
          {analytics.scope === 'ward' && (
            <p className="mt-2 inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              {t('citizen_dash_scope_ward', 'Showing ward-level civic analytics')}
            </p>
          )}
          {analytics.scope === 'city' && (
            <p className="mt-2 inline-flex rounded-full border border-white/35 bg-white/10 px-3 py-1 text-[11px] font-semibold text-cyan-100">
              {t('citizen_dash_scope_city', 'Showing city-level civic analytics')}
            </p>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-7">
        <MetricCard index={0} label={t('citizen_dash_total', 'Total')} value={analytics.total} tone="from-[#0b3a86]/15 to-[#0b3a86]/5" onClick={() => handleMetricClick('total')} />
        <MetricCard index={1} label={t('citizen_dash_active', 'Active')} value={analytics.active} tone="from-amber-100 to-amber-50" onClick={() => handleMetricClick('active')} />
        <MetricCard index={2} label={t('citizen_dash_resolved', 'Resolved')} value={analytics.resolved} tone="from-emerald-100 to-emerald-50" onClick={() => handleMetricClick('resolved')} />
        <MetricCard index={3} label={t('citizen_dash_critical', 'Critical')} value={analytics.critical} tone="from-rose-100 to-rose-50" onClick={() => handleMetricClick('critical')} />
        <MetricCard index={4} label={t('citizen_dash_overdue', 'Overdue (7d+)')} value={analytics.overdueActive} tone="from-orange-100 to-orange-50" onClick={() => handleMetricClick('overdue')} />
        <MetricCard index={5} label={t('citizen_dash_rate', 'Resolution %')} value={`${analytics.resolutionRate}%`} tone="from-violet-100 to-violet-50" />
        <MetricCard index={6} label={t('citizen_dash_avg_resolve_hrs', 'Avg Resolve (hrs)')} value={analytics.avgResolutionHours} tone="from-sky-100 to-sky-50" />
      </section>

      <section className="card overflow-hidden border border-cyan-100 p-0">
        <div className="bg-gradient-to-r from-[#0b3a86] via-[#1d4ed8] to-[#0ea5e9] px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100">Citizen Services</p>
          <h2 className="mt-1 text-xl font-extrabold">{t('citizen_know_leader_title', 'Know Your Leader')}</h2>
          <p className="mt-1 text-sm text-cyan-50">{t('citizen_know_leader_sub', 'Reach your ward leadership office directly for civic escalations.')}</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2">
          {leaderLoading ? (
            <p className="text-sm text-slate-500">{t('citizen_know_leader_loading', 'Loading leader profile...')}</p>
          ) : leaderProfile ? (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('citizen_leader_name', 'Ward Leader')}</p>
                <p className="mt-1 text-2xl font-black text-slate-900">{leaderProfile.leader_name}</p>
                <p className="mt-1 text-sm font-semibold text-blue-700">{leaderProfile.leader_role}</p>
                <p className="mt-1 text-sm text-slate-600">{leaderProfile.leader_department || t('common_na', 'N/A')}</p>
                <p className="mt-3 text-xs text-slate-500">{t('citizen_leader_ward', 'Ward')}: {leaderProfile.ward_number} • {leaderProfile.ward_name}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[11px] text-slate-500">{t('citizen_leader_resolution_rate', '30d Resolution')}</p>
                    <p className="text-lg font-black text-slate-900">{Number(leaderProfile.resolution_rate_30d || 0).toFixed(1)}%</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                    <p className="text-[11px] text-slate-500">{t('citizen_leader_trust_score', 'Ward Trust')}</p>
                    <p className="text-lg font-black text-slate-900">{leaderProfile.ward_trust_score != null ? Number(leaderProfile.ward_trust_score).toFixed(1) : 'N/A'}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('citizen_leader_contact', 'Contact & Focus')}</p>
                <p className="mt-2 text-sm text-slate-700">{t('citizen_leader_phone', 'Phone')}: {leaderProfile.leader_phone || t('common_na', 'N/A')}</p>
                <p className="mt-1 text-sm text-slate-700">{t('citizen_leader_email', 'Email')}: {leaderProfile.leader_email || t('common_na', 'N/A')}</p>
                <p className="mt-1 text-sm text-slate-700">{t('citizen_leader_office_hours', 'Office Hours')}: {leaderProfile.office_hours || t('common_na', 'N/A')}</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-blue-600">30d Total</p>
                    <p className="text-sm font-black text-blue-900">{leaderProfile.total_complaints_30d || 0}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-emerald-600">30d Resolved</p>
                    <p className="text-sm font-black text-emerald-900">{leaderProfile.resolved_complaints_30d || 0}</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50 px-2 py-1.5 text-center">
                    <p className="text-[10px] uppercase tracking-wide text-amber-600">30d Pending</p>
                    <p className="text-sm font-black text-amber-900">{leaderProfile.pending_complaints_30d || 0}</p>
                  </div>
                </div>
                {Array.isArray(leaderProfile.key_focus) && leaderProfile.key_focus.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {leaderProfile.key_focus.slice(0, 4).map((focus) => (
                      <span key={focus} className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700">
                        {focus}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {leaderProfile.leader_phone && (
                    <a href={`tel:${leaderProfile.leader_phone}`} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700">
                      {t('citizen_call_leader', 'Call Leader')}
                    </a>
                  )}
                  {leaderProfile.leader_email && (
                    <a href={`mailto:${leaderProfile.leader_email}`} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-900">
                      {t('citizen_email_leader', 'Email Leader')}
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => navigate(`/public/ward/${leaderProfile.ward_id}`)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    {t('citizen_view_ward_portal', 'View Ward Portal')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">{t('citizen_know_leader_missing', 'Ward leader details are not available yet. Add your ward in profile to get local contacts.')}</p>
          )}
        </div>
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
              items.slice(0, 8).map((item, idx) => (
                <Link
                  key={item.id}
                  to={`/complaints/${item.id}`}
                  className="complaint-slide-item block px-5 py-3 transition hover:bg-gray-50"
                  style={{ animationDelay: `${idx * 70}ms` }}
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
              notifications.slice(0, 10).map((note, idx) => (
                <div key={`${note.complaint_id}-${note.performed_at}`} className="complaint-slide-item px-5 py-3" style={{ animationDelay: `${idx * 70}ms` }}>
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

function MetricCard({ label, value, tone, index = 0, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`complaint-slide-item rounded-2xl border border-white/70 bg-gradient-to-br ${tone} p-4 shadow-md ring-1 ring-slate-200/80`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </button>
  );
}
