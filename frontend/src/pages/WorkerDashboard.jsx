import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const ACTIVE_STATUSES = ['ASSIGNED', 'UNDER_REVIEW', 'IN_PROGRESS'];

function statusTone(status) {
  const map = {
    ASSIGNED: 'bg-amber-100 text-amber-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
    VERIFICATION_PENDING: 'bg-violet-100 text-violet-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
    VERIFIED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-200 text-gray-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export default function WorkerDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAssignedWork() {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    try {
      const { data } = await complaintsAPI.list({
        page: 1,
        per_page: 100,
        assigned_to: user.id,
      });
      setItems(data?.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assigned work.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssignedWork();
    const timer = setInterval(loadAssignedWork, 15000);
    return () => clearInterval(timer);
  }, [user?.id]);

  const summary = useMemo(() => {
    const total = items.length;
    const active = items.filter((i) => ACTIVE_STATUSES.includes(i.status)).length;
    const completedByWorker = items.filter((i) => i.status === 'VERIFICATION_PENDING').length;
    const finalVerified = items.filter((i) => ['VERIFIED', 'CLOSED', 'RESOLVED'].includes(i.status)).length;
    return { total, active, completedByWorker, finalVerified };
  }, [items]);

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#138808]/30 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Worker Console</p>
            <h1 className="text-3xl font-black text-white">{t('worker_dash_title', 'Worker Dashboard')}</h1>
            <p className="mt-1 text-sm text-slate-100/90">{t('worker_dash_subtitle', 'Only complaints assigned to you by leader are shown here.')}</p>
          </div>
          <Link
            to="/worker-manage-complaints"
            className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20"
          >
            {t('worker_dash_manage_btn', 'Open Worker Manage')}
          </Link>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t('worker_dash_total', 'Total Assigned')} value={summary.total} />
        <StatCard label={t('worker_dash_active', 'Active')} value={summary.active} />
        <StatCard label={t('worker_dash_completed', 'Completed By You')} value={summary.completedByWorker} />
        <StatCard label={t('worker_dash_verified', 'Leader Finalized')} value={summary.finalVerified} />
      </section>

      <section className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#0b3a86]/10 via-white to-[#ff9933]/10">
          <h2 className="font-semibold text-gray-900">{t('worker_dash_list_title', 'Assigned Work List')}</h2>
        </div>
        <div className="max-h-[460px] overflow-y-auto divide-y divide-slate-100">
          {loading ? (
            <p className="px-5 py-8 text-sm text-gray-500">{t('worker_dash_loading', 'Loading assigned work...')}</p>
          ) : items.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-500">{t('worker_dash_empty', 'No complaints assigned yet.')}</p>
          ) : (
            items.map((item) => (
              <Link key={item.id} to={`/complaints/${item.id}`} className="block px-5 py-3 hover:bg-slate-50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.ai_summary || item.raw_text || 'Complaint'}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.ward?.ward_name || 'Ward N/A'} • {item.category?.name || 'Category N/A'}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusTone(item.status)}`}>
                    {item.status}
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm ring-1 ring-slate-200/80">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
