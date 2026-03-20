import { useEffect, useMemo, useState } from 'react';
import { FiClock } from 'react-icons/fi';

export default function LiveDateTime({ className = '', tone = 'light' }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = useMemo(
    () =>
      now.toLocaleDateString(undefined, {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [now]
  );

  const timeLabel = useMemo(
    () =>
      now.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    [now]
  );

  const shellClass =
    tone === 'dark'
      ? 'border-white/25 bg-white/10 text-white backdrop-blur-sm'
      : 'border-slate-200 bg-white text-slate-900 shadow-sm';

  const subtleText = tone === 'dark' ? 'text-slate-200' : 'text-slate-500';

  return (
    <div className={`inline-flex items-center gap-3 rounded-xl border px-3 py-2 ${shellClass} ${className}`.trim()}>
      <div className={`rounded-lg p-1.5 ${tone === 'dark' ? 'bg-white/15' : 'bg-slate-100'}`}>
        <FiClock className={`h-4 w-4 ${tone === 'dark' ? 'text-cyan-100' : 'text-primary-700'}`} />
      </div>
      <div className="leading-tight">
        <p className="text-sm font-bold tabular-nums">{timeLabel}</p>
        <p className={`text-[11px] ${subtleText}`}>{dateLabel}</p>
      </div>
    </div>
  );
}
