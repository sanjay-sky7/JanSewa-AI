export default function WelcomeSplash({ fading = false }) {
  return (
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_16%_18%,rgba(56,189,248,0.25),transparent_35%),radial-gradient(circle_at_82%_78%,rgba(20,184,166,0.22),transparent_35%),linear-gradient(140deg,#0f172a_10%,#0a2a63_48%,#0f766e_100%)] px-6 text-white transition-all duration-500 ease-out ${
        fading ? 'opacity-0 scale-[1.02]' : 'opacity-100 scale-100'
      }`}
    >
      <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#ff9933]/25 blur-3xl" />
      <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-[#22c55e]/25 blur-3xl" />

      <div
        className={`relative z-10 flex flex-col items-center text-center transition-all duration-500 ease-out ${
          fading ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="group relative mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/25 bg-white/10 shadow-2xl backdrop-blur-xl">
          <div className="absolute inset-0 animate-ping rounded-3xl bg-white/10" />
          <svg className="relative h-12 w-12" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M24 4L39 12V24C39 33.5 32.5 41 24 44C15.5 41 9 33.5 9 24V12L24 4Z" fill="white" fillOpacity="0.95"/>
            <path d="M24 10L34 15V24C34 30.4 29.8 36 24 38.2C18.2 36 14 30.4 14 24V15L24 10Z" fill="url(#welcomeSplashGradient)"/>
            <path d="M18 23.5L22 27.5L30 19.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="welcomeSplashGradient" x1="14" y1="10" x2="34" y2="38.2" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0EA5E9"/>
                <stop offset="1" stopColor="#2563EB"/>
              </linearGradient>
            </defs>
          </svg>
        </div>

        <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-100">Welcome</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Jansewa AI</h1>
        <p className="mt-2 max-w-md text-sm text-slate-100/95 sm:text-base">
          Loading your civic operations workspace
        </p>
      </div>
    </div>
  );
}
