import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';

const priorityColors = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

const statusPillColors = {
  OPEN: 'bg-slate-100 text-slate-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  ASSIGNED: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-800',
  VERIFICATION_PENDING: 'bg-teal-100 text-teal-800',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  VERIFIED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

function statusLabel(status, t) {
  if (status === 'IN_PROGRESS') return 'Working on it';
  if (status === 'VERIFICATION_PENDING') return 'Completed';
  if (!status) return t('common_na', 'N/A');
  return t(`status_${status.toLowerCase()}`, status.replaceAll('_', ' '));
}

export default function PriorityQueue({ complaints = [] }) {
  const { t } = useLanguage();
  if (!complaints.length) {
    return (
      <div className="card p-6 text-center text-gray-400">
        <p>{t('queue_empty', 'No complaints in queue')}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#ff9933]/15 via-white to-[#138808]/15">
        <h3 className="font-semibold text-gray-900">{t('queue_title', 'Priority Queue')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('queue_subtitle', 'Top complaints ranked by AI priority score')}</p>
      </div>
      <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
        {complaints.map((c, idx) => (
          <Link
            key={c.id}
            to={`/complaints/${c.id}`}
            className="complaint-slide-item flex items-start gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <span className="text-xs font-bold text-gray-400 mt-1 w-5 text-right">
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{c.ai_summary || c.raw_text || t('queue_complaint_fallback', 'Complaint')}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {(c.ward?.ward_name || t('queue_ward_na', 'Ward N/A'))} • {(c.category?.name || t('queue_category_na', 'Category N/A'))}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusPillColors[c.status] || 'bg-slate-100 text-slate-700'}`}>
                  {statusLabel(c.status, t)}
                </span>
                {c.assignee?.name && (
                  <span className="text-[11px] text-gray-500">
                    {t('queue_updated_by', 'Updated by')}: {c.assignee.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`badge ${priorityColors[c.priority_level] || 'badge-low'}`}>
                {c.priority_level || 'LOW'}
              </span>
              <span className="text-xs text-gray-400">
                {t('queue_score', 'Score')}: {c.final_priority_score?.toFixed?.(1) ?? '0.0'}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
