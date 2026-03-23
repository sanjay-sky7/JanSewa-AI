import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function WorkerDashboard() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function load() {
    setError('');
    try {
      const perPage = 100;
      let page = 1;
      let total = 0;
      const all = [];

      do {
        const { data } = await complaintsAPI.myAssigned({ page, per_page: perPage });
        const chunk = data?.items || [];
        total = Number(data?.total || 0);
        all.push(...chunk);
        page += 1;
      } while (all.length < total);

      setItems(all);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assigned complaints.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  const stats = useMemo(() => {
    const total = items.length;
    const underReview = items.filter((c) => c.status === 'UNDER_REVIEW').length;
    const inProgress = items.filter((c) => c.status === 'IN_PROGRESS').length;
    const completed = items.filter((c) => c.status === 'VERIFICATION_PENDING').length;
    const open = items.filter((c) => c.status === 'OPEN' || c.status === 'ASSIGNED').length;
    return { total, underReview, inProgress, completed, open };
  }, [items]);

  if (loading) return <LoadingSpinner label="Loading worker dashboard..." />;

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-7 shadow-xl">
        <div className="pointer-events-none absolute -left-12 top-0 h-40 w-40 rounded-full bg-[#ff9933]/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-32 w-32 rounded-full bg-[#138808]/30 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-3 text-white">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Worker Operations</p>
            <h1 className="mt-1 text-3xl font-black">Worker Dashboard</h1>
            <p className="text-sm text-slate-100/90 mt-1">Assigned Work: all complaints assigned by leader to you.</p>
          </div>
          <div className="rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs text-slate-100 backdrop-blur-sm">
            <p className="font-semibold text-cyan-100">Live Refresh: 20s</p>
            <p>Last update: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Assigned Total" value={stats.total} />
        <StatCard title="New / Assigned" value={stats.open} />
        <StatCard title="Under Review" value={stats.underReview} />
        <StatCard title="Working On It" value={stats.inProgress} />
        <StatCard title="Completed" value={stats.completed} />
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Assigned Work</h2>
            <p className="text-xs text-slate-500">Update status from Worker Manage Complaints page.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={load}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => navigate('/manage-complaints')}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Open Worker Manage Complaints
            </button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Complaint</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Ward</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Category</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Status</th>
                <th className="px-3 py-2 text-left font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {items.length === 0 ? (
                <tr>
                  <td className="px-3 py-8 text-center text-slate-400" colSpan={5}>
                    No assigned complaints.
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-slate-900">{c.ai_summary || c.raw_text || 'Complaint'}</td>
                    <td className="px-3 py-2 text-slate-700">{c.ward?.ward_name || t('common_na', 'N/A')}</td>
                    <td className="px-3 py-2 text-slate-700">{c.category?.name || t('common_na', 'N/A')}</td>
                    <td className="px-3 py-2 text-slate-700">{(c.status || '').replaceAll('_', ' ')}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                        className="text-primary-700 hover:underline"
                      >
                        Open
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
