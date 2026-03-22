import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  function handleStatCardClick(cardKey) {
    if (cardKey === 'total') {
      navigate('/manage-complaints?bucket=total');
      return;
    }
    if (cardKey === 'resolved') {
      navigate('/manage-complaints?bucket=resolved');
      return;
    }
    if (cardKey === 'pending') {
      navigate('/manage-complaints?bucket=pending');
      return;
    }
    if (cardKey === 'in_progress') {
      navigate('/manage-complaints?bucket=pending');
      return;
    }
    if (cardKey === 'critical') {
      navigate('/manage-complaints?priority=CRITICAL');
    }
  }

  const attention = {
    totalActive: queue.length,
    critical: queue.filter((c) => c.priority_level === 'CRITICAL').length,
    unassigned: queue.filter((c) => !c.assignee?.id).length,
    overdue48h: queue.filter((c) => {
      const createdAt = new Date(c.created_at).getTime();
      return Number.isFinite(createdAt) && (Date.now() - createdAt) > (48 * 60 * 60 * 1000);
    }).length,
  };

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
      <StatsCards data={{ ...(stats || {}), onCardClick: handleStatCardClick }} />

      <section className="leader-attention-board card p-0 overflow-hidden">
        <div className="border-b border-red-100 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 px-5 py-3">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Priority Attention Center</p>
          <h3 className="mt-1 text-lg font-extrabold text-slate-900">Leader Focus Queue</h3>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-4">
          <AttentionTile label="Active Queue" value={attention.totalActive} onClick={() => navigate('/manage-complaints?bucket=pending')} tone="slate" />
          <AttentionTile label="Critical" value={attention.critical} onClick={() => navigate('/manage-complaints?priority=CRITICAL')} tone="red" />
          <AttentionTile label="Unassigned" value={attention.unassigned} onClick={() => navigate('/manage-complaints?bucket=pending&unassigned=1')} tone="amber" />
          <AttentionTile label="Overdue 48h+" value={attention.overdue48h} onClick={() => navigate('/manage-complaints?bucket=overdue')} tone="orange" />
        </div>
      </section>

      {/* Live stream */}
      <section className="card overflow-hidden p-0">
        <div className="border-b border-slate-100 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">{t('dashboard_live_stream', 'Live Complaint Stream')}</h3>
          <p className="text-xs text-slate-500">{t('dashboard_live_stream_sub', 'Auto-moving feed of highest-priority complaints')}</p>
        </div>
        {queue.length === 0 ? (
          <p className="px-5 py-4 text-sm text-slate-500">{t('queue_empty', 'No complaints in queue')}</p>
        ) : (
          <div className="complaint-marquee-wrap">
            <div className="complaint-marquee-track">
              {[...queue.slice(0, 12), ...queue.slice(0, 12)].map((item, idx) => (
                <button
                  type="button"
                  key={`${item.id}-${idx}`}
                  className="complaint-chip"
                  onClick={() => navigate(`/complaints/${item.id}`)}
                >
                  <span className="complaint-chip-priority">{item.priority_level || 'LOW'}</span>
                  <span className="complaint-chip-text">{item.ai_summary || item.raw_text || t('queue_complaint_fallback', 'Complaint')}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

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

function AttentionTile({ label, value, onClick, tone = 'slate' }) {
  const tones = {
    slate: 'from-slate-100 to-slate-50 text-slate-900 border-slate-200',
    red: 'from-red-100 to-rose-50 text-red-900 border-red-200',
    amber: 'from-amber-100 to-orange-50 text-amber-900 border-amber-200',
    orange: 'from-orange-100 to-amber-50 text-orange-900 border-orange-200',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`complaint-slide-item rounded-xl border bg-gradient-to-br p-3 text-left transition hover:-translate-y-0.5 hover:shadow ${tones[tone] || tones.slate}`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </button>
  );
}
