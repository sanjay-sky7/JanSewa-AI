import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

const FEATURE_GROUPS = [
  {
    key: 'features_category_citizen',
    defaultLabel: 'Citizen Experience',
    items: [
      {
        label: 'Text, voice, and image complaint registration',
        routeByRole: {
          CITIZEN: '/register-complaint',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/register-complaint',
        },
      },
      {
        label: 'Real-time status tracking with notification feed',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Know Your Leader and ward visibility tools',
        routeByRole: {
          CITIZEN: '/know-your-leader',
          LEADER: '/dashboard',
          WORKER: '/dashboard',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Citizen profile-linked complaint history',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/profile',
        },
      },
    ],
  },
  {
    key: 'features_category_ops',
    defaultLabel: 'Operations & Workforce',
    items: [
      {
        label: 'Role-based dashboards for leader, worker, and officers',
        routeByRole: {
          CITIZEN: '/dashboard',
          LEADER: '/dashboard',
          WORKER: '/dashboard',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Complaint assignment and in-progress updates',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/manage-complaints',
        },
      },
      {
        label: 'Before/after work verification workflow',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/manage-complaints',
        },
      },
      {
        label: 'Department and ward-level complaint management',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/manage-complaints',
        },
      },
    ],
  },
  {
    key: 'features_category_ai',
    defaultLabel: 'AI Intelligence Engine',
    items: [
      {
        label: 'Offline-first categorization and priority scoring',
        routeByRole: {
          CITIZEN: '/register-complaint',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Ward-aware location matching and routing',
        routeByRole: {
          CITIZEN: '/register-complaint',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Social sentiment and alert analysis',
        routeByRole: {
          CITIZEN: '/dashboard',
          LEADER: '/social',
          WORKER: '/dashboard',
          DEFAULT: '/social',
        },
      },
      {
        label: 'Communication generation for notices and announcements',
        routeByRole: {
          CITIZEN: '/dashboard',
          LEADER: '/communications',
          WORKER: '/dashboard',
          DEFAULT: '/communications',
        },
      },
    ],
  },
  {
    key: 'features_category_transparency',
    defaultLabel: 'Transparency & Governance',
    items: [
      {
        label: 'Public portal for complaint visibility and trust metrics',
        routeByRole: {
          CITIZEN: '/public',
          LEADER: '/public',
          WORKER: '/public',
          DEFAULT: '/public',
        },
      },
      {
        label: 'Audit-friendly status timeline and verification score',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: '4-layer verification with tamper checks',
        routeByRole: {
          CITIZEN: '/my-complaints',
          LEADER: '/manage-complaints',
          WORKER: '/manage-complaints',
          DEFAULT: '/dashboard',
        },
      },
      {
        label: 'Ward-level performance insights and trust score trends',
        routeByRole: {
          CITIZEN: '/dashboard',
          LEADER: '/dashboard',
          WORKER: '/dashboard',
          DEFAULT: '/dashboard',
        },
      },
    ],
  },
];

export default function Features() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeFeature, setActiveFeature] = useState('');

  const openFeature = (featureId, routeByRole) => {
    const role = user?.role;
    const targetRoute = (role && routeByRole[role]) || routeByRole.DEFAULT || '/dashboard';

    setActiveFeature(featureId);
    setTimeout(() => {
      navigate(targetRoute);
    }, 170);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/20 bg-[linear-gradient(140deg,rgba(14,26,62,0.96),rgba(15,45,100,0.90))] p-6 text-white shadow-2xl backdrop-blur-sm sm:p-8">
        <p className="inline-flex items-center rounded-full border border-cyan-200/40 bg-cyan-300/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
          Jansewa AI
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t('features_title', 'System Features')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-200 sm:text-base">
          {t('features_subtitle', 'Explore all capabilities of Jansewa AI across citizen, worker, and leader workflows.')}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {FEATURE_GROUPS.map((group) => (
          <article
            key={group.key}
            className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur"
          >
            <h2 className="text-lg font-bold text-slate-900">{t(group.key, group.defaultLabel)}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => {
                const featureId = `${group.key}-${item.label}`;
                const isActive = activeFeature === featureId;

                return (
                  <li key={item.label}>
                    <button
                      type="button"
                      onClick={() => openFeature(featureId, item.routeByRole)}
                      className={`group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-all duration-200 ${
                        isActive
                          ? 'scale-[0.985] bg-cyan-50 text-cyan-900 ring-1 ring-cyan-300'
                          : 'text-slate-700 hover:-translate-y-[1px] hover:bg-slate-100/80 hover:text-slate-900'
                      }`}
                    >
                      <span className={`mt-[6px] h-1.5 w-1.5 rounded-full ${isActive ? 'bg-cyan-700' : 'bg-cyan-600'}`} />
                      <span>{item.label}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
