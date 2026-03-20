import { useState, useEffect, useRef } from 'react';
import { publicAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const WARD_OPTIONS = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  name: `Ward ${i + 1}`,
}));

export default function PublicPortal() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [selectedWard, setSelectedWard] = useState(1);
  const [scorecard, setScorecard] = useState(null);
  const [actions, setActions] = useState([]);
  const [trust, setTrust] = useState(null);
  const [wardMapData, setWardMapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [actionFilter, setActionFilter] = useState('ALL');

  // Complaint form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', ward_id: 1, citizen_phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const wardLayersRef = useRef([]);
  const wardMarkerRef = useRef(null);
  const wardPulseRef = useRef(null);

  useEffect(() => {
    loadWard(selectedWard);
  }, [selectedWard]);

  useEffect(() => {
    loadWardMap();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      loadWard(selectedWard);
    }, 30000);

    return () => clearInterval(timer);
  }, [selectedWard]);

  async function loadWard(wardId) {
    setLoading(true);
    try {
      const [scRes, acRes, trRes] = await Promise.allSettled([
        publicAPI.wardScorecard(wardId),
        publicAPI.recentActions(wardId),
        publicAPI.wardTrust(wardId),
      ]);
      if (scRes.status === 'fulfilled') setScorecard(scRes.value.data);
      if (acRes.status === 'fulfilled') setActions(acRes.value.data || []);
      if (trRes.status === 'fulfilled') setTrust(trRes.value.data);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  }

  async function loadWardMap() {
    try {
      const { data } = await publicAPI.wardMap();
      setWardMapData(Array.isArray(data) ? data : []);
    } catch {
      setWardMapData([]);
    }
  }

  // Leaflet map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    mapInstance.current = L.map(mapRef.current, {
      center: [28.6139, 77.209],
      zoom: 11,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !scorecard?.latitude || !scorecard?.longitude) return;

    wardLayersRef.current.forEach((layer) => mapInstance.current.removeLayer(layer));
    wardLayersRef.current = [];

    const visibleWards = wardMapData.filter((w) => w.latitude != null && w.longitude != null);
    visibleWards.forEach((ward) => {
      const isSelected = Number(ward.ward_number) === Number(selectedWard);
      const html = `
        <div style="position: relative; width: ${isSelected ? 36 : 30}px; height: ${isSelected ? 36 : 30}px;">
          <div style="position:absolute; inset:0; border-radius:9999px; background:${isSelected ? 'linear-gradient(135deg,#0ea5e9,#2563eb)' : 'linear-gradient(135deg,#334155,#0f172a)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:${isSelected ? 11 : 10}px; font-weight:800; box-shadow:0 6px 14px rgba(15,23,42,0.28); border:2px solid rgba(255,255,255,0.92);">W${ward.ward_number}</div>
        </div>
      `;
      const icon = L.divIcon({
        html,
        className: 'ward-map-icon',
        iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
        iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15],
      });

      const marker = L.marker([ward.latitude, ward.longitude], { icon })
        .addTo(mapInstance.current)
        .bindPopup(
          `<div style="min-width:180px">
            <p style="font-weight:700;margin-bottom:4px">Ward ${ward.ward_number}: ${ward.ward_name}</p>
            <p style="margin:0">Total: ${ward.total_complaints ?? 0}</p>
            <p style="margin:0">Open: ${ward.open_complaints ?? 0}</p>
            <p style="margin:0">Resolved: ${ward.resolved_complaints ?? 0}</p>
          </div>`
        );

      marker.on('click', () => setSelectedWard(Number(ward.ward_number)));
      wardLayersRef.current.push(marker);
    });

    if (wardMarkerRef.current) {
      mapInstance.current.removeLayer(wardMarkerRef.current);
      wardMarkerRef.current = null;
    }
    if (wardPulseRef.current) {
      mapInstance.current.removeLayer(wardPulseRef.current);
      wardPulseRef.current = null;
    }

    const wardNumber = scorecard.ward_number || selectedWard;
    const markerHtml = `
      <div style="position: relative; width: 44px; height: 44px;">
        <div style="position:absolute; inset:0; border-radius:9999px; background: rgba(37,99,235,0.18); animation: mapPulse 1.6s infinite;"></div>
        <div style="position:absolute; inset:5px; border-radius:9999px; background: linear-gradient(135deg, #1d4ed8, #0ea5e9); color:white; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:800; box-shadow:0 6px 14px rgba(14,165,233,0.4);">W${wardNumber}</div>
      </div>
    `;

    const wardIcon = L.divIcon({
      html: markerHtml,
      className: 'ward-map-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    wardMarkerRef.current = L.marker([scorecard.latitude, scorecard.longitude], { icon: wardIcon })
      .bindPopup(
        `<div class="text-sm">
          <p class="font-semibold">Ward ${scorecard.ward_number}: ${scorecard.ward_name}</p>
          <p>Total Complaints: ${scorecard.total_complaints || 0}</p>
          <p>Resolved: ${scorecard.total_resolved || 0}</p>
        </div>`
      )
      .addTo(mapInstance.current);

    wardPulseRef.current = L.circle([scorecard.latitude, scorecard.longitude], {
      radius: 260,
      color: '#1d4ed8',
      fillColor: '#38bdf8',
      fillOpacity: 0.13,
      weight: 1,
    }).addTo(mapInstance.current);

    mapInstance.current.flyTo([scorecard.latitude, scorecard.longitude], 13, { duration: 0.8 });
  }, [scorecard, selectedWard, wardMapData]);

  const handleComplaint = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await publicAPI.submitComplaint({ ...form, ward_id: selectedWard, is_anonymous: true });
      setSubmitted(true);
      setForm({ title: '', description: '', ward_id: selectedWard, citizen_phone: '' });
      await loadWard(selectedWard);
    } catch (err) {
      alert(err.response?.data?.detail || t('public_submission_failed', 'Submission failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const totalComplaints = scorecard?.total_complaints ?? 0;
  const resolvedComplaints = scorecard?.resolved ?? scorecard?.total_resolved ?? 0;
  const pendingComplaints = scorecard?.pending ?? Math.max(totalComplaints - resolvedComplaints, 0);
  const avgResolutionHours = scorecard?.avg_resolution_hours ?? scorecard?.avg_response_hours;
  const resolutionRate = scorecard?.resolution_rate ?? (totalComplaints > 0 ? (resolvedComplaints / totalComplaints) * 100 : 0);
  const trustOverall = trust?.overall_score ?? trust?.final_trust_score ?? scorecard?.trust_score;
  const trustResponseMetric = trust?.responsiveness ?? trust?.avg_response_hours;
  const trustResponseLabel = trust?.responsiveness != null
    ? t('public_responsiveness', 'Responsiveness')
    : t('public_avg_response_time', 'Avg Response (hrs)');
  const trustTransparency = trust?.transparency ?? trust?.transparency_score;
  const trustCommunication = trust?.citizen_satisfaction ?? trust?.communication_score;
  const filteredActions = actionFilter === 'ALL'
    ? actions
    : actions.filter((a) => (a.status || '').toUpperCase() === actionFilter);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(14,165,233,0.12),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(16,185,129,0.08),transparent_30%),#f8fafc]">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-r from-cyan-700 via-primary-700 to-blue-800 text-white py-14 px-4">
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="max-w-5xl mx-auto text-center relative">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="absolute left-0 top-0 bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg text-sm"
          >
            {t('public_back_main_menu', 'Back to Main Menu')}
          </button>
          <h1 className="text-3xl md:text-4xl font-bold">{t('public_title', 'Jansewa AI Public Portal')}</h1>
          <p className="mt-2 text-primary-100 text-lg">{t('public_subtitle', 'Transparent governance for every citizen')}</p>
          <p className="mt-3 text-xs text-cyan-100">
            {t('public_live_updates', 'Live updates every 30 seconds')} • {lastUpdated ? lastUpdated.toLocaleTimeString() : t('public_syncing', 'Syncing...')}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard
            title={t('public_resolution_rate', 'Resolution Rate')}
            value={`${resolutionRate?.toFixed(1) || '0.0'}%`}
            subtitle={t('public_last_30_days', 'Last 30 days')}
            accent="from-emerald-500 to-teal-600"
          />
          <InsightCard
            title={t('public_trust_index', 'Trust Index')}
            value={trustOverall != null ? trustOverall.toFixed(1) : '—'}
            subtitle={t('public_citizen_trust_indicator', 'Citizen confidence indicator')}
            accent="from-sky-500 to-blue-700"
          />
          <InsightCard
            title={t('public_workload_balance', 'Workload Balance')}
            value={`${resolvedComplaints}/${totalComplaints || 0}`}
            subtitle={t('public_resolved_vs_total', 'Resolved vs total complaints')}
            accent="from-amber-500 to-orange-600"
          />
        </div>

        {/* Ward selector */}
        <div className="flex flex-wrap items-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <label className="text-sm font-medium text-gray-700">{t('public_select_ward', 'Select Ward:')}</label>
          <select
            value={selectedWard}
            onChange={(e) => setSelectedWard(Number(e.target.value))}
            className="premium-select rounded-lg px-3 py-2 text-sm"
          >
            {WARD_OPTIONS.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => loadWard(selectedWard)}
            className="bg-slate-100 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-200"
          >
            {t('public_refresh_now', 'Refresh Now')}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setSubmitted(false); }}
            className="ml-auto bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            {showForm ? t('public_close', 'Close') : t('public_report_issue', 'Report Issue')}
          </button>
        </div>

        {/* Complaint form */}
        {showForm && !submitted && (
          <form onSubmit={handleComplaint} className="card p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('public_report_grievance', 'Report a Grievance')}</h2>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={t('public_brief_title', 'Brief title')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <textarea
              required
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={t('public_describe_issue', 'Describe the issue in detail...')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="tel"
                value={form.citizen_phone}
                onChange={(e) => setForm({ ...form, citizen_phone: e.target.value })}
                placeholder={t('public_phone_optional', 'Phone (optional)')}
                className="col-span-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {submitting ? t('public_submitting', 'Submitting...') : t('public_submit', 'Submit')}
            </button>
          </form>
        )}
        {submitted && (
          <div className="card p-6 text-center text-green-700 bg-green-50 border border-green-200">
            ✅ {t('public_submitted_success', 'Your complaint has been submitted and will be processed by AI.')}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">{t('public_loading_ward', 'Loading ward data...')}</div>
        ) : (
          <>
            {/* Scorecard */}
            {scorecard && (
              <div className="card p-6 border border-slate-100 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('public_ward_scorecard', 'Ward Scorecard')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ScoreItem label={t('public_total_complaints', 'Total Complaints')} value={totalComplaints} />
                  <ScoreItem label={t('public_resolved', 'Resolved')} value={resolvedComplaints} />
                  <ScoreItem label={t('public_pending', 'Pending')} value={pendingComplaints} />
                  <ScoreItem label={t('public_avg_resolution', 'Avg Resolution')} value={`${avgResolutionHours?.toFixed(1) || '—'} ${t('public_hours', 'hrs')}`} />
                </div>
              </div>
            )}

            {/* Trust score */}
            {trust && (
              <div className="card p-6 border border-slate-100 shadow-sm">
                <h2 className="text-lg font-semibold mb-4">{t('public_trust_score', 'Trust Score')}</h2>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-full border-8 border-primary-200 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary-700">
                      {trustOverall != null ? trustOverall.toFixed(0) : '—'}
                    </span>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500">{trustResponseLabel}:</span> {trustResponseMetric != null ? trustResponseMetric.toFixed(1) : '—'}</div>
                    <div><span className="text-gray-500">{t('public_resolution', 'Resolution')}:</span> {trust?.resolution_rate != null ? trust.resolution_rate.toFixed(1) : '—'}</div>
                    <div><span className="text-gray-500">{t('public_transparency', 'Transparency')}:</span> {trustTransparency != null ? trustTransparency.toFixed(1) : '—'}</div>
                    <div><span className="text-gray-500">{t('public_citizen_satisfaction', 'Citizen Satisfaction')}:</span> {trustCommunication != null ? trustCommunication.toFixed(1) : '—'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent actions */}
            <div className="card overflow-hidden border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <h2 className="font-semibold">{t('public_recent_actions', 'Recent Actions')}</h2>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="premium-select ml-auto rounded-md px-2 py-1 text-xs"
                >
                  <option value="ALL">{t('public_all_statuses', 'All Statuses')}</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="CLOSED">CLOSED</option>
                </select>
              </div>
              <div className="divide-y">
                {filteredActions.length === 0 ? (
                  <p className="px-5 py-8 text-center text-gray-400">{t('public_no_recent_actions', 'No recent actions for this ward')}</p>
                ) : (
                  filteredActions.map((a, i) => (
                    <div key={i} className="px-5 py-3">
                      <p className="text-sm font-medium text-gray-900">{a.summary}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{a.category} • {a.status?.replaceAll('_', ' ')}</p>
                      <p className="text-xs text-gray-400 mt-1">{a.resolved_at ? new Date(a.resolved_at).toLocaleString() : t('public_recently_updated', 'Recently updated')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Map */}
            <div className="card overflow-hidden border border-slate-100 shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <h2 className="font-semibold">{t('public_ward_map', 'Ward Map')}</h2>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {t('public_selected_ward', 'Selected Ward')}: {scorecard?.ward_number || selectedWard}
                </span>
                <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700">
                  {wardMapData.length} {t('public_wards_mapped', 'wards mapped')}
                </span>
                <span className="text-xs text-slate-500">
                  {scorecard?.ward_name || t('public_loading_ward', 'Loading ward data...')}
                </span>
              </div>
              <div className="relative">
                {!scorecard?.latitude || !scorecard?.longitude ? (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/35 text-white text-sm font-medium">
                    {t('public_ward_map_wait', 'Map location for selected ward is loading...')}
                  </div>
                ) : null}
                <div ref={mapRef} className="h-[350px] w-full" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-400 text-center py-6 text-sm mt-8">
        <p>&copy; {new Date().getFullYear()} Jansewa AI - {t('public_footer', 'Empowering transparent local governance')}</p>
      </footer>
    </div>
  );
}

function InsightCard({ title, value, subtitle, accent }) {
  return (
    <div className={`rounded-xl p-4 text-white bg-gradient-to-r ${accent} shadow-sm`}>
      <p className="text-xs uppercase tracking-wide text-white/80">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-white/90">{subtitle}</p>
    </div>
  );
}

function ScoreItem({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
