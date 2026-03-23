import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  'OPEN',
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'VERIFICATION_PENDING',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
];

const WORKER_STATUS_OPTIONS = [
  { value: 'UNDER_REVIEW', label: 'Under Review' },
  { value: 'IN_PROGRESS', label: 'Working on it' },
  { value: 'VERIFICATION_PENDING', label: 'Completed' },
];

export default function ManageComplaints() {
  const { t } = useLanguage();
  const { hasRole } = useAuth();
  const [searchParams] = useSearchParams();
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [bucketFilter, setBucketFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);
  const isWorkerView = hasRole('WORKER', 'OFFICER', 'ENGINEER');

  const BUCKETS = {
    total: [],
    pending: ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'VERIFICATION_PENDING'],
    in_progress: ['IN_PROGRESS'],
    overdue: ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'VERIFICATION_PENDING'],
    resolved: ['RESOLVED', 'VERIFIED', 'CLOSED'],
  };

  useEffect(() => {
    const statusFromUrl = (searchParams.get('status') || '').toUpperCase();
    const priorityFromUrl = (searchParams.get('priority') || '').toUpperCase();
    const bucketFromUrl = (searchParams.get('bucket') || '').toLowerCase();
    const unassignedFromUrl = searchParams.get('unassigned') === '1';

    setUnassignedOnly(unassignedFromUrl);

    if (STATUS_OPTIONS.includes(statusFromUrl)) {
      setStatusFilter(statusFromUrl);
      setPriorityFilter('');
      setBucketFilter('');
      return;
    }

    if (priorityFromUrl) {
      setPriorityFilter(priorityFromUrl);
      setStatusFilter('');
      setBucketFilter('');
      return;
    }

    if (Object.keys(BUCKETS).includes(bucketFromUrl)) {
      setBucketFilter(bucketFromUrl);
      setStatusFilter('');
      setPriorityFilter('');
      return;
    }

    setStatusFilter('');
    setPriorityFilter('');
    setBucketFilter('');
  }, [searchParams]);

  async function loadComplaints() {
    setLoading(true);
    setError('');
    try {
      const perPage = 100;
      let page = 1;
      let total = 0;
      const allItems = [];

      do {
        const loader = isWorkerView ? complaintsAPI.myAssigned : complaintsAPI.list;
        const { data } = await loader({
          page,
          per_page: perPage,
          ...(statusFilter ? { status: statusFilter } : {}),
          ...(!isWorkerView && priorityFilter ? { priority_level: priorityFilter } : {}),
        });

        const items = data?.items || [];
        total = Number(data?.total || 0);
        allItems.push(...items);
        page += 1;
      } while (allItems.length < total);

      setComplaints(allItems);
    } catch (err) {
      setError(err.response?.data?.detail || t('manage_failed_load', 'Failed to load complaints.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, [statusFilter, priorityFilter, isWorkerView]);

  const visibleComplaints = useMemo(() => {
    let result = complaints;

    if (bucketFilter && bucketFilter !== 'total') {
      const allowedStatuses = BUCKETS[bucketFilter] || [];
      result = result.filter((c) => allowedStatuses.includes(c.status));
    }

    if (bucketFilter === 'overdue') {
      result = result.filter((c) => {
        const createdAt = new Date(c.created_at).getTime();
        return Number.isFinite(createdAt) && (Date.now() - createdAt) > (48 * 60 * 60 * 1000);
      });
    }

    if (unassignedOnly) {
      result = result.filter((c) => !c.assignee?.id);
    }

    return result;
  }, [complaints, bucketFilter, unassignedOnly]);

  async function updateStatus(complaintId, nextStatus) {
    setSavingId(complaintId);
    setError('');
    try {
      await complaintsAPI.updateStatus(complaintId, { status: nextStatus });
      setComplaints((prev) =>
        prev.map((c) => (c.id === complaintId ? { ...c, status: nextStatus } : c))
      );
    } catch (err) {
      setError(err.response?.data?.detail || t('manage_status_update_failed', 'Status update failed.'));
    } finally {
      setSavingId(null);
    }
  }

  const statusLabel = (status) => {
    if (isWorkerView && status === 'IN_PROGRESS') return 'Working on it';
    if (isWorkerView && status === 'VERIFICATION_PENDING') return 'Completed';
    return t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));
  };

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#138808]/30 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Operations</p>
          <h1 className="text-2xl font-bold text-white">{t('manage_title', 'Manage Complaints')}</h1>
          <p className="mt-1 text-sm text-slate-100">
            {isWorkerView
              ? 'Worker Manage Complaints: view complaints assigned to you and update progress.'
              : t('manage_subtitle', 'Review all complaints and update lifecycle status from one place.')}
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100">
            {t('manage_filter_status', 'Filter by status')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => {
              setBucketFilter('');
              setPriorityFilter('');
              setStatusFilter(e.target.value);
            }}
            className="w-full rounded-xl border border-white/30 bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 backdrop-blur-sm"
          >
            <option value="">{t('manage_all_statuses', 'All statuses')}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>
          {bucketFilter && (
            <p className="mt-1 text-xs text-cyan-100">
              {t('manage_bucket_active', 'Quick filter active')}: {bucketFilter.replace('_', ' ').toUpperCase()}
            </p>
          )}
          {priorityFilter && (
            <p className="mt-1 text-xs text-cyan-100">
              Priority filter: {priorityFilter}
            </p>
          )}
          {unassignedOnly && (
            <p className="mt-1 text-xs text-cyan-100">Unassigned only</p>
          )}
        </div>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gradient-to-r from-slate-50 to-cyan-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_complaint', 'Complaint')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_ward', 'Ward')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_input', 'Input')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_priority', 'Priority')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_current_status', 'Current Status')}</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">{t('manage_col_change_status', 'Change Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-400" colSpan={6}>{t('manage_loading', 'Loading complaints...')}</td>
                </tr>
              ) : visibleComplaints.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-400" colSpan={6}>{t('manage_no_complaints', 'No complaints found.')}</td>
                </tr>
              ) : (
                visibleComplaints.map((c, idx) => (
                  <tr key={c.id} className="complaint-slide-item hover:bg-slate-50/70 transition-colors" style={{ animationDelay: `${idx * 45}ms` }}>
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        {c.is_new_for_user && (
                          <span className="new-complaint-chip">
                            ★ NEW
                          </span>
                        )}
                        {c.complaint_code && (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{c.complaint_code}</p>
                        )}
                        <p className="line-clamp-2 text-gray-900">{c.raw_text || (c.input_type === 'voice' ? 'Voice file uploaded. Transcription pending.' : t('manage_no_text', 'No text summary available'))}</p>
                        <Link to={`/complaints/${c.id}`} className="mt-1 inline-block text-xs font-semibold text-primary-700 hover:underline">
                          {t('manage_open_details', 'Open details')}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.ward?.ward_name || t('common_na', 'N/A')}</td>
                    <td className="px-4 py-3 uppercase text-gray-700">{c.input_type}</td>
                    <td className="px-4 py-3 text-gray-700">{c.priority_level || t('common_na', 'N/A')}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{statusLabel(c.status)}</td>
                    <td className="px-4 py-3">
                      <select
                        value={isWorkerView ? (WORKER_STATUS_OPTIONS.some((s) => s.value === c.status) ? c.status : 'UNDER_REVIEW') : c.status}
                        disabled={savingId === c.id}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {(isWorkerView ? WORKER_STATUS_OPTIONS : STATUS_OPTIONS.map((status) => ({ value: status, label: statusLabel(status) }))).map((statusOption) => (
                          <option key={statusOption.value} value={statusOption.value}>{statusOption.label}</option>
                        ))}
                      </select>
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
