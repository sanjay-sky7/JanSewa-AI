import { FiX } from 'react-icons/fi';

export default function AboutDeveloperModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#14b8a6] px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">About Developer</p>
              <h2 className="mt-1 text-2xl font-black">Project Contributors</h2>
              <p className="mt-1 text-sm text-slate-100">Frontend and backend ownership split for reliable delivery.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/30 bg-white/10 p-2 hover:bg-white/20"
              aria-label="Close"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="space-y-5 px-6 py-5 text-slate-700">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Metric title="Focus" value="GovTech Product" />
            <Metric title="Stack" value="FastAPI + React" />
            <Metric title="Specialty" value="Deployment Ops" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributors</p>
            <div className="mt-2 space-y-2">
              <ContributorRow
                name="Sanjay Yadav"
                role="Frontend, UI, API Design"
                linkedinUrl="https://www.linkedin.com/in/sanjay-yadav-sky?utm_source=share_via&utm_content=profile&utm_medium=member_android"
              />
              <ContributorRow
                name="Shivam Kr. Pandey"
                role="Backend, Database Management, Deployment"
                linkedinUrl="https://www.linkedin.com/in/shivam-kumar-pandey-479959286?utm_source=share_via&utm_content=profile&utm_medium=member_android"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContributorRow({ name, role, linkedinUrl }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-slate-900">{name}</p>
          <p className="text-[11px] text-slate-600">{role}</p>
        </div>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${name} LinkedIn profile`}
          title={`${name} LinkedIn`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 text-[#0A66C2] hover:bg-slate-100"
        >
          <LinkedInIcon className="h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function LinkedInIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.03-3.03-1.85-3.03-1.85 0-2.13 1.44-2.13 2.93v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.28 2.38 4.28 5.48v6.26zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z" />
    </svg>
  );
}

function Metric({ title, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
