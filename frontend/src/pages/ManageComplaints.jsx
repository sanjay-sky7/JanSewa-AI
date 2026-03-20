import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

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

export default function ManageComplaints() {
  const { t } = useLanguage();
  const [complaints, setComplaints] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  async function loadComplaints() {
    setLoading(true);
    setError('');
    try {
      const { data } = await complaintsAPI.list({
        per_page: 50,
        ...(statusFilter ? { status: statusFilter } : {}),
      });
      setComplaints(data.items || []);
    } catch (err) {
      setError(err.response?.data?.detail || t('manage_failed_load', 'Failed to load complaints.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

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

  const statusLabel = (status) => t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));

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
            {t('manage_subtitle', 'Review all complaints and update lifecycle status from one place.')}
          </p>
        </div>

        <div className="w-full sm:w-64">
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-cyan-100">
            {t('manage_filter_status', 'Filter by status')}
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-white/30 bg-white/90 px-3 py-2 text-sm font-medium text-slate-900 backdrop-blur-sm"
          >
            <option value="">{t('manage_all_statuses', 'All statuses')}</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>{statusLabel(status)}</option>
            ))}
          </select>
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
              ) : complaints.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-400" colSpan={6}>{t('manage_no_complaints', 'No complaints found.')}</td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-4 py-3">
                      <div className="max-w-md">
                        <p className="line-clamp-2 text-gray-900">{c.raw_text || t('manage_no_text', 'No text summary available')}</p>
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
                        value={c.status}
                        disabled={savingId === c.id}
                        onChange={(e) => updateStatus(c.id, e.target.value)}
                        className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>{statusLabel(status)}</option>
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
