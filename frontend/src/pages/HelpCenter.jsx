import { useEffect, useMemo, useState } from 'react';
import { publicAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function HelpCenter() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [helpData, setHelpData] = useState({ categories: [], articles: [], total_articles: 0 });
  const [activeCategory, setActiveCategory] = useState('ALL');

  async function loadHelp(searchText = query) {
    setLoading(true);
    setError('');
    try {
      const { data } = await publicAPI.helpCenter({
        query: searchText || undefined,
        role: user?.role || undefined,
      });
      setHelpData(data || { categories: [], articles: [], total_articles: 0 });
      if (activeCategory !== 'ALL' && !(data?.categories || []).includes(activeCategory)) {
        setActiveCategory('ALL');
      }
    } catch {
      setError(t('help_load_failed', 'Unable to load help center right now.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHelp('');
  }, [user?.role]);

  const filteredArticles = useMemo(() => {
    if (activeCategory === 'ALL') return helpData.articles || [];
    return (helpData.articles || []).filter((item) => item.category === activeCategory);
  }, [helpData.articles, activeCategory]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#040b20] via-[#08214d] to-[#0b2e68] p-6 md:p-8 text-white">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
        <div className="absolute -left-16 -bottom-16 h-52 w-52 rounded-full bg-blue-300/16 blur-3xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">{t('help_center_tag', 'Support Hub')}</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold">{t('help_center_title', 'Jansewa Help Center')}</h1>
          <p className="mt-2 max-w-3xl text-sm md:text-base text-cyan-100">
            {t('help_center_subtitle', 'Find role-based guidance for citizens, leaders, officers, and engineers. Powered by Jansewa internal knowledge base.')}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('help_center_search_placeholder', 'Search: assignment, verification, notifications, tracking...')}
            className="w-full md:flex-1 rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-300"
          />
          <button
            type="button"
            onClick={() => loadHelp(query)}
            className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            {t('help_center_search', 'Search Help')}
          </button>
          <button
            type="button"
            onClick={() => { setQuery(''); loadHelp(''); }}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('help_center_reset', 'Reset')}
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <CategoryPill
            active={activeCategory === 'ALL'}
            onClick={() => setActiveCategory('ALL')}
            label={`${t('help_center_all_topics', 'All Topics')} (${helpData.total_articles || 0})`}
          />
          {(helpData.categories || []).map((category) => (
            <CategoryPill
              key={category}
              active={activeCategory === category}
              onClick={() => setActiveCategory(category)}
              label={category}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{t('help_center_channel_phone', 'Helpline')}</p>
          <p className="mt-1 text-xl font-bold text-emerald-900">1800-123-456</p>
          <p className="mt-1 text-xs text-emerald-700">{t('help_center_channel_phone_desc', 'Immediate support for critical civic issues')}</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('help_center_channel_email', 'Support Email')}</p>
          <p className="mt-1 text-xl font-bold text-blue-900">support@jansewa.gov</p>
          <p className="mt-1 text-xs text-blue-700">{t('help_center_channel_email_desc', 'Operational, onboarding, and feature guidance')}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{t('help_center_channel_sla', 'Typical SLA')}</p>
          <p className="mt-1 text-xl font-bold text-amber-900">2-24 hrs</p>
          <p className="mt-1 text-xs text-amber-700">{t('help_center_channel_sla_desc', 'Depends on severity and department workload')}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">Contributors</p>
          <div className="mt-2 space-y-3">
            <MiniContributor
              name="Sanjay Yadav"
              role="Frontend, UI, API Design"
              linkedinUrl="https://www.linkedin.com/in/sanjay-yadav-sky?utm_source=share_via&utm_content=profile&utm_medium=member_android"
            />
            <MiniContributor
              name="Shivam Kr. Pandey"
              role="Backend, Database Management, Deployment"
              linkedinUrl="https://www.linkedin.com/in/shivam-kumar-pandey-479959286?utm_source=share_via&utm_content=profile&utm_medium=member_android"
            />
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{t('help_center_guides', 'Guides & SOPs')}</h2>
          <span className="text-xs text-slate-500">{filteredArticles.length} {t('help_center_results', 'results')}</span>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">{t('help_center_loading', 'Loading help guides...')}</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        ) : filteredArticles.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">{t('help_center_no_results', 'No matching guide found. Try a broader keyword.')}</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredArticles.map((article) => (
              <details key={article.id} className="group rounded-lg border border-slate-200 bg-slate-50 p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary-100 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
                      {article.category}
                    </span>
                    <h3 className="text-sm md:text-base font-semibold text-slate-900">{article.title}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">{article.summary}</p>
                </summary>

                <ol className="mt-3 space-y-2 pl-5 list-decimal text-sm text-slate-700">
                  {(article.steps || []).map((step, idx) => (
                    <li key={`${article.id}-step-${idx}`}>{step}</li>
                  ))}
                </ol>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(article.keywords || []).map((kw) => (
                    <span key={`${article.id}-${kw}`} className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-700">
                      #{kw}
                    </span>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MiniContributor({ name, role, linkedinUrl }) {
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

function CategoryPill({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? 'bg-primary-600 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
