import { useLanguage } from '../../context/LanguageContext';

const cards = [
  { key: 'total', labelKey: 'stats_total_complaints', labelFallback: 'Total Complaints', tone: 'from-[#0b3a86]/15 to-[#0b3a86]/5', ring: 'ring-[#0b3a86]/20', icon: '📋' },
  { key: 'pending', labelKey: 'stats_pending', labelFallback: 'Pending', tone: 'from-[#ff9933]/20 to-[#ff9933]/5', ring: 'ring-[#ff9933]/30', icon: '⏳' },
  { key: 'in_progress', labelKey: 'stats_in_progress', labelFallback: 'In Progress', tone: 'from-sky-200/50 to-sky-50', ring: 'ring-sky-200', icon: '🔄' },
  { key: 'resolved', labelKey: 'stats_resolved', labelFallback: 'Resolved', tone: 'from-[#138808]/20 to-[#138808]/5', ring: 'ring-[#138808]/30', icon: '✅' },
  { key: 'critical', labelKey: 'stats_critical', labelFallback: 'Critical', tone: 'from-rose-200/50 to-rose-50', ring: 'ring-rose-200', icon: '🚨' },
  { key: 'avg_resolution', labelKey: 'stats_avg_resolution', labelFallback: 'Avg Resolution (hrs)', tone: 'from-indigo-200/50 to-indigo-50', ring: 'ring-indigo-200', icon: '⏱️' },
];

export default function StatsCards({ data, onSelect, activeKey, clickableKeys = [] }) {
  const { t } = useLanguage();
  if (!data) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => {
        const isClickable = clickableKeys.includes(card.key);
        const isActive = activeKey === card.key;

        const content = (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/80 flex items-center justify-center text-lg shadow-sm">
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">
                {typeof data[card.key] === 'number'
                  ? card.key === 'avg_resolution'
                    ? data[card.key].toFixed(1)
                    : data[card.key].toLocaleString()
                  : data[card.key] ?? t('common_na', 'N/A')}
              </p>
              <p className="text-xs font-medium text-gray-600">{t(card.labelKey, card.labelFallback)}</p>
            </div>
          </div>
        );

        const baseClass = `rounded-2xl border border-white bg-gradient-to-br ${card.tone} p-4 shadow-sm ring-1 ${card.ring}`;
        const activeClass = isActive ? 'ring-2 ring-emerald-400/70 border-emerald-200' : '';
        const interactiveClass = isClickable ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-md' : '';

        if (!isClickable) {
          return (
            <div key={card.key} className={`${baseClass} ${activeClass}`}>
              {content}
            </div>
          );
        }

        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onSelect?.(card.key)}
            className={`${baseClass} ${interactiveClass} ${activeClass} text-left`}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
