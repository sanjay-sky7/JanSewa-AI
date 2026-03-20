export default function AboutDeveloper() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#14b8a6] p-7 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-28 w-28 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-24 w-24 rounded-full bg-[#138808]/30 blur-2xl" />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Contributors Overview</p>
          <h1 className="mt-1 text-3xl font-black">Project Contributors</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-100">
            Built with a clear division of responsibilities across frontend experience and backend system reliability.
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Frontend Lead" value="UI, API Experience" />
        <StatCard title="Tech Stack" value="FastAPI • React • PostgreSQL" />
        <StatCard title="Backend Lead" value="Data & Deployment" />
      </section>

      <section className="card space-y-4">
        <h2 className="text-xl font-bold text-slate-900">Team Credits</h2>
        <p className="text-sm leading-6 text-slate-700">
          This Jansewa platform is engineered for operational clarity, role-based usability,
          and modern civic-tech reliability.
        </p>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <DeveloperCard
            name="Sanjay Yadav"
            role="Frontend, UI, API Design"
            linkedinUrl="https://www.linkedin.com/in/sanjay-yadav-sky?utm_source=share_via&utm_content=profile&utm_medium=member_android"
          />
          <DeveloperCard
            name="Shivam Kr. Pandey"
            role="Backend, Database Management, Deployment"
            linkedinUrl="https://www.linkedin.com/in/shivam-kumar-pandey-479959286?utm_source=share_via&utm_content=profile&utm_medium=member_android"
          />
        </div>
      </section>
    </div>
  );
}

function DeveloperCard({ name, role, linkedinUrl }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contributor</p>
      <p className="mt-1 text-lg font-bold text-slate-900">{name}</p>
      <p className="mt-1 text-sm text-slate-700">{role}</p>
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open ${name} LinkedIn profile`}
        title={`${name} LinkedIn`}
        className="mt-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-[#0A66C2] transition hover:bg-slate-100"
      >
        <LinkedInIcon className="h-5 w-5" />
      </a>
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

function StatCard({ title, value }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-2 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
