import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { useLanguage } from '../../context/LanguageContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export default function SentimentChart({ data = [] }) {
  const { t } = useLanguage();
  const latestPoint = data.length ? data[data.length - 1] : null;
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: t('sentiment_positive', 'Positive'),
        data: data.map((d) => d.positive),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('sentiment_negative', 'Negative'),
        data: data.map((d) => d.negative),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: t('sentiment_neutral', 'Neutral'),
        data: data.map((d) => d.neutral),
        borderColor: '#6b7280',
        backgroundColor: 'rgba(107,114,128,0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: '#f3f4f6' } },
      x: { grid: { display: false } },
    },
  };

  return (
    <div className="card telemetry-card overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-gray-900">{t('sentiment_title', 'Sentiment Trend')}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t('sentiment_subtitle', 'Public sentiment over time from social media')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="realtime-badge">Live</span>
            {latestPoint && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                P:{latestPoint.positive || 0} N:{latestPoint.negative || 0}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 h-[320px]">
        <Line data={chartData} options={options} />
      </div>
    </div>
  );
}
