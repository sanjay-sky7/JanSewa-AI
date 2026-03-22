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
  const chartData = {
    labels: data.map((d) => d.date),
    datasets: [
      {
        label: t('sentiment_positive', 'Positive'),
        data: data.map((d) => d.positive),
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22,163,74,0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
      {
        label: t('sentiment_negative', 'Negative'),
        data: data.map((d) => d.negative),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
      {
        label: t('sentiment_neutral', 'Neutral'),
        data: data.map((d) => d.neutral),
        borderColor: '#64748b',
        backgroundColor: 'rgba(100,116,139,0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2.5,
        pointRadius: 0,
        pointHoverRadius: 3,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: '#475569',
          font: { family: 'Manrope', size: 11, weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#f8fafc',
        bodyColor: '#e2e8f0',
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.3)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(148, 163, 184, 0.2)' },
        ticks: { color: '#64748b', font: { family: 'Manrope', size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#64748b', font: { family: 'Manrope', size: 10 } },
      },
    },
  };

  return (
    <div className="premium-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">{t('sentiment_kicker', 'Citizen Pulse')}</p>
          <h3 className="panel-title">{t('sentiment_title', 'Sentiment Trend')}</h3>
          <p className="panel-subtitle">{t('sentiment_subtitle', 'Public sentiment over time from social media')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="glass-pill">{t('sentiment_window', 'Window')}: 30 {t('sentiment_days', 'days')}</span>
          <span className="glass-pill">{t('sentiment_signals', 'Signals')}: {data.length}</span>
        </div>
      </div>
      <div className="panel-body">
        <div className="chart-shell h-[340px]">
          <Line data={chartData} options={options} />
        </div>
      </div>
    </div>
  );
}
