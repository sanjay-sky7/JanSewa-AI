import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI, complaintsAPI, socialAPI } from '../services/api';
import StatsCards from '../components/Dashboard/StatsCards';
import PriorityQueue from '../components/Dashboard/PriorityQueue';
import WardHeatMap from '../components/Dashboard/WardHeatMap';
import SentimentChart from '../components/Dashboard/SentimentChart';
import AlertsPanel from '../components/Dashboard/AlertsPanel';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { useLanguage } from '../context/LanguageContext';

export default function LeaderDashboard() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [sentiment, setSentiment] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusView, setStatusView] = useState(null);
  const [statusItems, setStatusItems] = useState([]);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusMeta, setStatusMeta] = useState({ title: '', subtitle: '' });

  async function load({ showInitialLoader = false } = {}) {
    if (showInitialLoader) setLoading(true);
    setError('');

    try {
      const [statsRes, queueRes, heatRes, sentRes, alertRes] = await Promise.allSettled([
        complaintsAPI.stats(),
        complaintsAPI.priorityQueue({ per_page: 100 }),
        dashboardAPI.wardHeatmap(),
        dashboardAPI.sentimentTrend(30),
        socialAPI.alerts(),
      ]);

      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value.data || {};
        setStats({
          total: raw.total_complaints ?? 0,
          pending: raw.total_pending ?? raw.total_open ?? 0,
          in_progress: raw.total_in_progress ?? 0,
          resolved: raw.total_resolved ?? 0,
          critical: raw.total_critical ?? 0,
          avg_resolution: raw.avg_resolution_hours ?? 0,
        });
      }

      if (queueRes.status === 'fulfilled') {
        setQueue(queueRes.value.data?.items || []);
      }
      if (heatRes.status === 'fulfilled') setHeatmap(heatRes.value.data || []);
      if (sentRes.status === 'fulfilled') setSentiment(sentRes.value.data || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data || []);

      setLastUpdated(new Date());
    } catch (e) {
      setError(t('dashboard_failed_load', 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load({ showInitialLoader: true });

    const interval = setInterval(() => {
      load({ showInitialLoader: false });
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <LoadingSpinner label={t('dashboard_loading', 'Loading dashboard...')} />;

  const handleStatSelect = async (key) => {
    const config = {
      total: {
        title: t('dashboard_total_title', 'All Complaints'),
        subtitle: t('dashboard_total_subtitle', 'Latest complaints across every status'),
      },
      pending: {
        title: t('dashboard_pending_title', 'Pending Complaints'),
        subtitle: t('dashboard_pending_subtitle', 'Open, under review, assigned, and verification pending'),
        statuses: ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'VERIFICATION_PENDING'],
      },
      in_progress: {
        title: t('dashboard_inprogress_title', 'In Progress'),
        subtitle: t('dashboard_inprogress_subtitle', 'Work currently in progress'),
        statuses: ['IN_PROGRESS'],
      },
      resolved: {
        title: t('dashboard_resolved_title', 'Resolved Complaints'),
        subtitle: t('dashboard_resolved_subtitle', 'Resolved, verified, and closed complaints'),
        statuses: ['RESOLVED', 'VERIFIED', 'CLOSED'],
      },
      critical: {
        title: t('dashboard_critical_title', 'Critical Complaints'),
        subtitle: t('dashboard_critical_subtitle', 'Critical priority items still active'),
        statuses: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'],
        priority_level: 'CRITICAL',
      },
      avg_resolution: {
        title: t('dashboard_avg_title', 'Avg Resolution (hrs)'),
        subtitle: t('dashboard_avg_subtitle', 'Recently resolved items contributing to averages'),
        statuses: ['RESOLVED', 'VERIFIED', 'CLOSED'],
      },
    }[key];

    if (!config) return;

    if (statusView === key) {
      setStatusView(null);
      setStatusItems([]);
      setStatusMeta({ title: '', subtitle: '' });
      return;
    }

    setStatusView(key);
    setStatusMeta({ title: config.title, subtitle: config.subtitle });
    setStatusLoading(true);
    setError('');

    try {
      let items = [];
      if (config.statuses?.length) {
        const results = await Promise.all(
          config.statuses.map((status) => complaintsAPI.list({
            status,
            per_page: 50,
            priority_level: config.priority_level,
          }))
        );
        items = results.flatMap((res) => res.data?.items || []);
      } else {
        const result = await complaintsAPI.list({ per_page: 50, priority_level: config.priority_level });
        items = result.data?.items || [];
      }

      items.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      setStatusItems(items);
    } catch (err) {
      setError(t('dashboard_failed_load', 'Failed to load dashboard data'));
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0b3a86] p-7 shadow-xl">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-[#ff9933]/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-[#138808]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">{t('dashboard_console', 'Jansewa Leader Console')}</p>
            <h1 className="mt-1 text-3xl font-black text-white">{t('dashboard_title', 'Leader Dashboard')}</h1>
            <p className="text-sm text-slate-100/90 mt-1">{t('dashboard_subtitle', 'Real-time civic intelligence for city operations')}</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs text-slate-100 backdrop-blur-sm">
            <p className="font-semibold text-cyan-100">{t('dashboard_live_refresh', 'Live Refresh: 20s')}</p>
            <p>{t('dashboard_last_update', 'Last update')}: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
          {error}
        </div>
      )}

      {/* Stats */}
      <StatsCards
        data={stats}
        onSelect={handleStatSelect}
        activeKey={statusView}
        clickableKeys={['total', 'pending', 'in_progress', 'resolved', 'critical', 'avg_resolution']}
      />

      {statusView && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-100/70 via-white to-emerald-50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{statusMeta.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{statusMeta.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => handleStatSelect(statusView)}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
              >
                {t('dashboard_resolved_hide', 'Hide list')}
              </button>
            </div>
          </div>

          {statusLoading ? (
            <div className="p-6 text-sm text-gray-500">{t('dashboard_resolved_loading', 'Loading complaints...')}</div>
          ) : statusItems.length ? (
            <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
              {statusItems.map((item) => (
                <Link
                  key={item.id}
                  to={`/complaints/${item.id}`}
                  className="flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.ai_summary || item.raw_text || t('dashboard_complaint_fallback', 'Complaint')}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {(item.ward?.ward_name || t('queue_ward_na', 'Ward N/A'))} • {(item.category?.name || t('queue_category_na', 'Category N/A'))}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700">
                    {item.status}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-6 text-sm text-gray-500">{t('dashboard_resolved_empty', 'No complaints found.')}</div>
          )}
        </div>
      )}

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PriorityQueue complaints={queue} />
        <AlertsPanel alerts={alerts} />
      </div>

      {/* Map + Sentiment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WardHeatMap data={heatmap} />
        <SentimentChart data={sentiment} />
      </div>
    </div>
  );
}
