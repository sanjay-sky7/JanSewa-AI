import { useState, useEffect } from 'react';
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
      <StatsCards data={stats} />

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
