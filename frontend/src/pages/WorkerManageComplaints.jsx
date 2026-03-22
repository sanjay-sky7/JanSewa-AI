import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const WORKER_STATUS_OPTIONS = [
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'IN_PROGRESS', label: 'Working On It' },
  { value: 'VERIFICATION_PENDING', label: 'Completed' },
];

function statusTone(status) {
  const map = {
    ASSIGNED: 'bg-amber-100 text-amber-700',
    UNDER_REVIEW: 'bg-blue-100 text-blue-700',
    IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
    VERIFICATION_PENDING: 'bg-violet-100 text-violet-700',
    VERIFIED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-gray-200 text-gray-700',
    RESOLVED: 'bg-emerald-100 text-emerald-700',
  };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export default function WorkerManageComplaints() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [items, setItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function loadAssigned() {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    try {
      const params = {
        page: 1,
        per_page: 100,
        assigned_to: user.id,
      };
      if (statusFilter) params.status = statusFilter;

      const { data } = await complaintsAPI.list(params);
      setItems(data?.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load assigned complaints.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssigned();
  }, [user?.id, statusFilter]);

  const optionByValue = useMemo(
    () => Object.fromEntries(WORKER_STATUS_OPTIONS.map((opt) => [opt.value, opt.label])),
    []
  );

  async function updateStatus(complaintId, status) {
    setSavingId(complaintId);
    setError('');
    try {
      await complaintsAPI.updateStatus(complaintId, { status });
      setItems((prev) => prev.map((c) => (c.id === complaintId ? { ...c, status } : c)));
    } catch (err) {
      setError(err.response?.data?.detail || 'Status update failed.');
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#138808]/30 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Worker Actions</p>
          <h1 className="text-3xl font-black text-white">{t('worker_manage_title', 'Worker Manage Complaints')}</h1>
          <p className="mt-1 text-sm text-slate-100/90">
            {t('worker_manage_subtitle', 'You can only manage complaints assigned by leader. Final closure is done by leader verification.')}
          </p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="card p-4">
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
          {t('worker_manage_filter', 'Filter status')}
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">{t('worker_manage_all', 'All statuses')}</option>
          <option value="ASSIGNED">Assigned</option>
          {WORKER_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-cyan-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Complaint</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Current Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Worker Update</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">Loading assigned complaints...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-400">No assigned complaints.</td>
                </tr>
              ) : (
                items.map((c) => {
                  const nextStatus = c.__nextStatus || 'UNDER_REVIEW';
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <p className="line-clamp-2 text-gray-900">{c.raw_text || c.ai_summary || 'Complaint'}</p>
                        <Link to={`/complaints/${c.id}`} className="mt-1 inline-block text-xs font-semibold text-primary-700 hover:underline">
                          Open details
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusTone(c.status)}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={nextStatus}
                          disabled={savingId === c.id}
                          onChange={(e) => {
                            const value = e.target.value;
                            setItems((prev) => prev.map((x) => (x.id === c.id ? { ...x, __nextStatus: value } : x)));
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        >
                          {WORKER_STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={savingId === c.id}
                          onClick={() => updateStatus(c.id, nextStatus)}
                          className="rounded-lg bg-gradient-to-r from-[#0a2a63] via-[#1d4ed8] to-[#0ea5e9] px-3 py-2 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-60"
                        >
                          {savingId === c.id ? 'Saving...' : 'Update'}
                        </button>
                        {nextStatus === 'VERIFICATION_PENDING' && (
                          <p className="mt-1 text-[11px] text-slate-500">
                            Leader will verify and set final status.
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
