import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const menuItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    roles: ['CITIZEN', 'LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
  {
    to: '/register-complaint',
    label: 'Register Complaint',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 4v16m8-8H4" />
      </svg>
    ),
    roles: ['CITIZEN'],
  },
  {
    to: '/my-complaints',
    label: 'My Complaints',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6M7 5h10a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2z" />
      </svg>
    ),
    roles: ['CITIZEN'],
  },
  {
    to: '/know-your-leader',
    label: 'Know Your Leader',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 20.055a12.083 12.083 0 01-6.16-9.477L12 14z" />
      </svg>
    ),
    roles: ['CITIZEN'],
  },
  {
    to: '/manage-complaints',
    label: 'Manage Complaints',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12h6m-6 4h6M7 4h10a2 2 0 012 2v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
    roles: ['LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
  {
    to: '/social',
    label: 'Social Media',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    roles: ['LEADER', 'DEPARTMENT_HEAD', 'ADMIN'],
  },
  {
    to: '/communications',
    label: 'Communications',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    roles: ['LEADER', 'DEPARTMENT_HEAD', 'ADMIN'],
  },
  {
    to: '/public',
    label: 'Public Portal',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    roles: ['LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
  {
    to: '/profile',
    label: 'My Profile',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 7a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7zm4 3a2 2 0 114 0 2 2 0 01-4 0zm6 0h3m-3 3h3M8 15h4" />
      </svg>
    ),
    roles: ['CITIZEN', 'LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
  {
    to: '/help',
    label: 'Help Center',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8 10a4 4 0 118 0c0 1.657-1.343 3-3 3h-1v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    roles: ['CITIZEN', 'LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
  {
    to: '/about-developer',
    label: 'About Developer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5.121 17.804A9 9 0 1118.88 6.196M15 11a3 3 0 11-6 0 3 3 0 016 0zm-9 9a9 9 0 0112 0" />
      </svg>
    ),
    roles: ['CITIZEN', 'LEADER', 'DEPARTMENT_HEAD', 'WORKER', 'OFFICER', 'ENGINEER', 'ADMIN'],
  },
];

export default function Sidebar() {
  const { hasRole } = useAuth();
  const { t } = useLanguage();

  const localizedItems = menuItems.map((item) => {
    const keyByPath = {
      '/register-complaint': 'side_register_complaint',
      '/my-complaints': 'side_my_complaints',
      '/dashboard': 'side_dashboard',
      '/know-your-leader': 'side_know_your_leader',
      '/manage-complaints': 'side_manage_complaints',
      '/social': 'side_social_media',
      '/communications': 'side_communications',
      '/public': 'side_public_portal',
      '/profile': 'side_my_profile',
      '/help': 'side_help_center',
      '/about-developer': 'side_about_developer',
    };
    const labelKey = keyByPath[item.to];
    return {
      ...item,
      label: labelKey ? t(labelKey, item.label) : item.label,
    };
  });

  const navLinkClass = ({ isActive }) =>
    `premium-nav-link flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-white ring-1 ring-cyan-100/30 shadow'
        : 'text-slate-100 hover:bg-white/10 hover:text-white'
    }`;

  return (
    <aside className="hidden lg:flex lg:flex-shrink-0">
      <div className="premium-sidebar w-72 border-r border-slate-900/20 pt-6 pb-5 flex flex-col shadow-2xl">
        <div className="mx-4 mb-4 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-100">Control Center</p>
          <p className="mt-1 text-sm font-semibold text-white">Jansewa Operations</p>
        </div>

        <nav className="flex-1 px-3 space-y-1.5">
          {localizedItems
            .filter((item) => hasRole(...item.roles))
            .map((item) => (
              <NavLink key={item.to} to={item.to} className={navLinkClass}>
                {item.icon}
                {item.label}
              </NavLink>
            ))}
        </nav>

        {/* Bottom section */}
        <div className="px-3 mt-auto">
          <div className="mb-3 rounded-2xl border border-emerald-200/40 bg-emerald-300/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-emerald-100 mb-1">{t('help_title', 'Need Help?')}</p>
            <p className="text-xs text-emerald-100/90">{t('help_subtitle', 'Call Jansewa helpline for immediate support')}</p>
            <a
              href="tel:+911800123456"
              className="mt-3 inline-flex items-center rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              {t('help_call_now', 'Call 1800-123-456')}
            </a>
            <a
              href="https://wa.me/918112561625"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800"
            >
              WhatsApp 8112561625
            </a>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <p className="text-xs font-semibold text-cyan-100 mb-1">Jansewa AI v1.0</p>
            <p className="text-xs text-slate-100/90">
              {t('side_platform_tagline', 'AI-Powered Governance Intelligence Platform')}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
