import { useState, useEffect } from 'react';
import { socialAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const sentimentBadge = {
  POSITIVE: 'bg-green-100 text-green-700',
  NEGATIVE: 'bg-red-100 text-red-700',
  NEUTRAL: 'bg-gray-100 text-gray-600',
};

export default function SocialMediaInsights() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [sentimentData, setSentimentData] = useState(null);
  const [liveSummary, setLiveSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [platformFilter, setPlatformFilter] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState('');
  const [onlyComplaints, setOnlyComplaints] = useState(false);
  const [onlyMisinformation, setOnlyMisinformation] = useState(false);

  useEffect(() => {
    loadData();
    const timer = setInterval(() => loadData(false), 20000);
    return () => clearInterval(timer);
  }, [platformFilter, sentimentFilter, onlyComplaints, onlyMisinformation]);

  async function loadData(withSpinner = true) {
    if (withSpinner) setLoading(true);
    try {
      const [feedRes, alertRes, sentRes, liveRes] = await Promise.allSettled([
        socialAPI.feed({
          limit: 40,
          since_minutes: 240,
          ...(platformFilter ? { platform: platformFilter } : {}),
          ...(sentimentFilter ? { sentiment: sentimentFilter } : {}),
          ...(onlyComplaints ? { only_complaints: true } : {}),
          ...(onlyMisinformation ? { only_misinformation: true } : {}),
        }),
        socialAPI.alerts(),
        socialAPI.sentiment(),
        socialAPI.liveSummary(),
      ]);
      if (feedRes.status === 'fulfilled') setPosts(feedRes.value.data || []);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.data || []);
      if (sentRes.status === 'fulfilled') setSentimentData(sentRes.value.data);
      if (liveRes.status === 'fulfilled') setLiveSummary(liveRes.value.data);
      setLastRefresh(new Date());
    } finally {
      if (withSpinner) setLoading(false);
    }
  }

  const handleScan = async () => {
    setScanning(true);
    try {
      await socialAPI.scan();
      await loadData();
    } finally {
      setScanning(false);
    }
  };

  if (loading) return <LoadingSpinner label={t('social_loading', 'Loading social media insights...')} />;

  const totalPosts = sentimentData?.total_posts ?? posts.length;
  const positivePct = sentimentData?.positive_pct ?? 0;
  const negativePct = sentimentData?.negative_pct ?? 0;
  const angryPct = sentimentData?.angry_pct ?? 0;
  const avgVirality = posts.length
    ? posts.reduce((sum, p) => sum + Number(p.virality_score || 0), 0) / posts.length
    : 0;
  const activePlatforms = new Set(posts.map((p) => String(p.platform || '').toLowerCase()).filter(Boolean)).size;
  const complaintSignals = posts.filter((p) => p.is_complaint).length;
  const misinformationSignals = posts.filter((p) => p.is_misinformation).length;
  const topWards = liveSummary?.top_wards_last_60m || [];
  const topCategories = liveSummary?.top_categories_last_60m || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0b3a86] to-[#0f766e] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t('social_title', 'Social Media Intelligence')}</h1>
            <p className="mt-1 text-sm text-cyan-100">{t('social_subtitle', 'Real-time monitoring of public discourse')}</p>
            <p className="mt-2 text-xs text-cyan-200">
              {t('social_auto_refresh_20s', 'Auto refresh every 20s')} • {lastRefresh ? lastRefresh.toLocaleTimeString() : t('public_syncing', 'Syncing...')}
            </p>
            {liveSummary && (
              <p className="mt-1 text-xs text-cyan-100/90">
                Live 15m: {liveSummary.signals_last_15m || 0} signals • {liveSummary.complaints_last_15m || 0} civic complaints • {liveSummary.misinfo_last_15m || 0} misinformation
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="premium-select rounded-lg px-3 py-2 text-xs"
            >
              <option value="">All Platforms</option>
              <option value="twitter">Twitter</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
            </select>
            <select
              value={sentimentFilter}
              onChange={(e) => setSentimentFilter(e.target.value)}
              className="premium-select rounded-lg px-3 py-2 text-xs"
            >
              <option value="">All Sentiments</option>
              <option value="POSITIVE">Positive</option>
              <option value="NEGATIVE">Negative</option>
              <option value="ANGRY">Angry</option>
              <option value="NEUTRAL">Neutral</option>
            </select>
            <label className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-xs">
              <input type="checkbox" checked={onlyComplaints} onChange={(e) => setOnlyComplaints(e.target.checked)} />
              Civic only
            </label>
            <label className="inline-flex items-center gap-1 rounded-lg border border-white/25 bg-white/10 px-2 py-1 text-xs">
              <input type="checkbox" checked={onlyMisinformation} onChange={(e) => setOnlyMisinformation(e.target.checked)} />
              Misinfo only
            </label>
            <button
              onClick={handleScan}
              disabled={scanning}
              className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {scanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('social_scanning', 'Scanning...')}
                </>
              ) : (
                t('social_scan_now', 'Scan Now')
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Live analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <MetricCard label={t('social_total_signals', 'Total Signals')} value={totalPosts} note={`${activePlatforms} ${t('social_platforms_active', 'platforms active')}`} tone="blue" />
        <MetricCard label={t('social_complaint_signals', 'Complaint Signals')} value={complaintSignals} note={`${(totalPosts ? (complaintSignals / totalPosts) * 100 : 0).toFixed(1)}% ${t('social_of_feed', 'of feed')}`} tone="emerald" />
        <MetricCard label={t('social_alert_pressure', 'Alert Pressure')} value={alerts.length} note={`${misinformationSignals} ${t('social_misinfo_flags', 'misinfo flags')}`} tone="rose" />
        <MetricCard label={t('social_avg_virality', 'Avg Virality')} value={avgVirality.toFixed(1)} note={`${negativePct.toFixed(1)}% ${t('sentiment_negative', 'Negative')}`} tone="amber" />
      </div>

      {sentimentData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <SentCard label={t('sentiment_positive', 'Positive')} count={sentimentData.positive} pct={positivePct} color="text-green-700" bg="bg-green-50" />
          <SentCard label={t('sentiment_negative', 'Negative')} count={sentimentData.negative} pct={negativePct} color="text-red-700" bg="bg-red-50" />
          <SentCard label={t('social_angry', 'Angry')} count={sentimentData.angry} pct={angryPct} color="text-orange-700" bg="bg-orange-50" />
          <SentCard label={t('sentiment_neutral', 'Neutral')} count={sentimentData.neutral} pct={sentimentData.neutral_pct ?? 0} color="text-slate-700" bg="bg-slate-50" />
        </div>
      )}

      {liveSummary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Live Hotspot Wards (60m)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {topWards.length === 0 ? (
                <span className="text-sm text-slate-500">No ward hotspots in last 60 minutes.</span>
              ) : topWards.map((entry) => (
                <span key={`ward-${entry.ward}`} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Ward {entry.ward} • {entry.count}
                </span>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Top Issue Themes (60m)</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {topCategories.length === 0 ? (
                <span className="text-sm text-slate-500">No category hotspots in last 60 minutes.</span>
              ) : topCategories.map((entry) => (
                <span key={`cat-${entry.category}`} className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                  {entry.category} • {entry.count}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-rose-50 to-red-50">
            <h2 className="font-semibold text-red-800">🚨 {t('social_active_alerts', 'Active Alerts')} ({alerts.length})</h2>
          </div>
          <div className="divide-y max-h-60 overflow-y-auto">
            {alerts.map((a, i) => (
              <div key={i} className="complaint-slide-item px-5 py-3 flex items-start gap-3" style={{ animationDelay: `${i * 55}ms` }}>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 line-clamp-2">{a.post_text || t('alerts_social_detected', 'Social alert detected')}</p>
                  <p className="text-xs text-gray-500 mt-1">{String(a.platform || 'social').toUpperCase()} • {a.sentiment}</p>
                  {a.is_misinformation && a.misinfo_explanation && (
                    <p className="mt-1 text-xs text-rose-700">{a.misinfo_explanation}</p>
                  )}
                </div>
                <span className="text-xs rounded-full border border-red-200 bg-white px-2 py-0.5 text-red-700">
                  {t('alerts_virality', 'Virality')}: {Number(a.virality_score || 0).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feed */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{t('social_social_feed', 'Social Feed')}</h2>
        </div>
        <div className="divide-y">
          {posts.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400">{t('social_no_posts', 'No posts found. Click "Scan Now" to fetch.')}</p>
          ) : (
            posts.map((post, i) => (
              <div key={i} className="complaint-slide-item px-5 py-4" style={{ animationDelay: `${i * 45}ms` }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        @{post.author_handle || t('social_anonymous', 'anonymous')}
                      </span>
                      <span className="text-xs text-gray-400 uppercase">{post.platform}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${sentimentBadge[String(post.sentiment || '').toUpperCase()] || sentimentBadge.NEUTRAL}`}>
                        {post.sentiment || 'NEUTRAL'}
                      </span>
                      {post.is_complaint && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-700">{t('social_civic_issue', 'Civic Issue')}</span>}
                      {post.is_misinformation && <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-700">{t('social_misinformation', 'Misinformation')}</span>}
                    </div>
                    <p className="text-sm text-gray-700">{post.post_text || t('social_no_text', 'No text content captured.')}</p>
                    {(post.extracted_ward || post.extracted_category) && (
                      <p className="text-xs text-gray-400 mt-1">
                        {post.extracted_ward ? `${t('social_ward', 'Ward')}: ${post.extracted_ward}` : ''}
                        {post.extracted_ward && post.extracted_category ? ' • ' : ''}
                        {post.extracted_category || ''}
                      </p>
                    )}
                    <p className="mt-1 text-[11px] text-slate-400">{post.created_at ? new Date(post.created_at).toLocaleString() : ''}</p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>❤️ {post.likes || 0}</p>
                    <p>🔄 {post.shares || 0}</p>
                    <p>💬 {post.replies || 0}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SentCard({ label, count, pct, color, bg }) {
  return (
    <div className={`card p-4 ${bg}`}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{count ?? 0}</p>
      <p className="text-xs text-gray-500 mt-1">{Number(pct || 0).toFixed(1)}%</p>
    </div>
  );
}

function MetricCard({ label, value, note, tone }) {
  const tones = {
    blue: 'from-sky-500/12 to-blue-600/8 text-blue-800 border-blue-100',
    emerald: 'from-emerald-500/12 to-teal-600/8 text-emerald-800 border-emerald-100',
    rose: 'from-rose-500/12 to-red-600/8 text-rose-800 border-rose-100',
    amber: 'from-amber-500/12 to-orange-600/8 text-amber-800 border-amber-100',
  };

  return (
    <div className={`rounded-xl border bg-gradient-to-r p-4 ${tones[tone] || tones.blue}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold">{value}</p>
      <p className="mt-1 text-xs text-slate-600">{note}</p>
    </div>
  );
}
