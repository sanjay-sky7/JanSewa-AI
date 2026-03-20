import { useLanguage } from '../../context/LanguageContext';

const severityStyles = {
  critical: 'border-red-400 bg-red-50',
  high: 'border-orange-400 bg-orange-50',
  medium: 'border-yellow-400 bg-yellow-50',
  info: 'border-blue-400 bg-blue-50',
};

export default function AlertsPanel({ alerts = [] }) {
  const { t } = useLanguage();
  if (!alerts.length) {
    return (
      <div className="card p-6 text-center text-gray-400">
        <p>{t('alerts_none', 'No active alerts')}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-[#0b3a86]/10 via-white to-[#ff9933]/10">
        <h3 className="font-semibold text-gray-900">{t('alerts_title', 'Active Alerts')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('alerts_subtitle', 'Real-time alerts from social media and AI')}</p>
      </div>
      <div className="divide-y divide-gray-50 max-h-[360px] overflow-y-auto">
        {alerts.map((alert, i) => {
          const sev = alert.severity?.toLowerCase() || 'info';
          return (
            <div
              key={i}
              className={`px-5 py-3 border-l-4 ${severityStyles[sev] || severityStyles.info}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{alert.post_text || t('alerts_social_detected', 'Social alert detected')}</p>
                  {alert.misinfo_explanation && (
                    <p className="text-xs text-gray-600 mt-0.5">{alert.misinfo_explanation}</p>
                  )}
                  <span className="text-xs text-gray-400">{alert.platform} • {t('alerts_sentiment', 'Sentiment')}: {alert.sentiment}</span>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">{t('alerts_virality', 'Virality')}: {alert.virality_score ?? 0}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
