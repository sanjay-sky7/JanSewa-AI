import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function KnowYourLeader() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leader, setLeader] = useState(null);
  const [scorecard, setScorecard] = useState(null);

  useEffect(() => {
    async function load() {
      if (!user?.ward_id) {
        setError('Please set your ward in My Profile to view leader details.');
        setLoading(false);
        return;
      }

      setError('');
      setLoading(true);
      try {
        const [leaderRes, scoreRes] = await Promise.allSettled([
          publicAPI.wardLeader(user.ward_id),
          publicAPI.wardScorecard(user.ward_id),
        ]);

        if (leaderRes.status === 'fulfilled') setLeader(leaderRes.value.data || null);
        if (scoreRes.status === 'fulfilled') setScorecard(scoreRes.value.data || null);

        if (leaderRes.status === 'rejected') {
          setError('Could not load leader profile for your ward right now.');
        }
      } catch {
        setError('Could not load leader profile for your ward right now.');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user?.ward_id]);

  if (loading) return <LoadingSpinner label="Loading leader profile..." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0b3a86] to-[#06b6d4] p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-24 w-24 rounded-full bg-[#138808]/25 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Citizen Services</p>
          <h1 className="mt-1 text-3xl font-black text-white">Know Your Leader</h1>
          <p className="mt-2 text-sm text-slate-100">Official ward leader information and accountability metrics for your area.</p>
        </div>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {leader ? (
        <section className="grid gap-5 lg:grid-cols-3">
          <article className="card lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ward Leader</p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{leader.leader_name}</h2>
            <p className="mt-1 text-sm font-semibold text-blue-700">{leader.leader_role}</p>
            <p className="mt-1 text-sm text-slate-600">{leader.leader_department || 'N/A'}</p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <InfoCard label="Ward" value={`${leader.ward_number} - ${leader.ward_name}`} />
              <InfoCard label="Office Hours" value={leader.office_hours || 'N/A'} />
              <InfoCard label="Phone" value={leader.leader_phone || 'N/A'} />
              <InfoCard label="Email" value={leader.leader_email || 'N/A'} />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {(leader.key_focus || []).slice(0, 6).map((item) => (
                <span key={item} className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
                  {item}
                </span>
              ))}
            </div>
          </article>

          <article className="card">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">30-Day Ward Snapshot</p>
            <div className="mt-3 space-y-3">
              <InfoCard label="Total Complaints" value={String(leader.total_complaints_30d || 0)} />
              <InfoCard label="Resolved" value={String(leader.resolved_complaints_30d || 0)} />
              <InfoCard label="Pending" value={String(leader.pending_complaints_30d || 0)} />
              <InfoCard label="Resolution Rate" value={`${leader.resolution_rate_30d || 0}%`} />
              <InfoCard label="Ward Trust Score" value={leader.ward_trust_score != null ? String(leader.ward_trust_score) : 'N/A'} />
            </div>
          </article>
        </section>
      ) : (
        <div className="card">
          <p className="text-sm text-slate-600">No leader profile found for your ward yet.</p>
        </div>
      )}

      {scorecard && (
        <section className="card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ward Performance</p>
              <h3 className="text-lg font-bold text-slate-900">Public Scorecard</h3>
            </div>
            <button
              type="button"
              onClick={() => navigate(`/public/ward/${user.ward_id}`)}
              className="rounded-lg bg-[#0b3a86] px-3 py-2 text-xs font-semibold text-white hover:bg-[#0a2f6f]"
            >
              Open Public Ward View
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <InfoCard label="Resolution Rate" value={`${scorecard.resolution_rate || 0}%`} />
            <InfoCard label="Avg Resolve (hrs)" value={String(scorecard.avg_resolution_hours || 0)} />
            <InfoCard label="Trust Score" value={String(scorecard.trust_score || 0)} />
          </div>
        </section>
      )}
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900 break-all">{value}</p>
    </div>
  );
}
