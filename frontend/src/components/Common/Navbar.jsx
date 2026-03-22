import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { complaintsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import LiveDateTime from './LiveDateTime';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const homeRoute = '/dashboard';
  const [notifications, setNotifications] = useState([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let timer;

    async function loadNotifications() {
      if (user?.role !== 'CITIZEN') {
        setNotifications([]);
        return;
      }
      try {
        const { data } = await complaintsAPI.myNotifications({ limit: 8 });
        setNotifications(Array.isArray(data?.items) ? data.items : []);
        setUnreadCount(Number(data?.unread_count || 0));
      } catch {
        setNotifications([]);
        setUnreadCount(0);
      }
    }

    loadNotifications();
    timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [user?.role]);

  useEffect(() => {
    async function markSeen() {
      if (!openNotifications || user?.role !== 'CITIZEN') return;
      if (unreadCount <= 0) return;
      try {
        await complaintsAPI.markNotificationsSeen();
        setUnreadCount(0);
        setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      } catch {
        // keep current unread state if API fails
      }
    }
    markSeen();
  }, [openNotifications, unreadCount, user?.role]);

  return (
    <nav className="app-navbar sticky top-0 z-40 border-b border-white/60 bg-white/80 backdrop-blur-xl">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[72px] justify-between py-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to={homeRoute} className="flex items-center gap-2.5 group">
              <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-br from-[#0a2a63] via-[#0ea5e9] to-[#138808] flex items-center justify-center shadow-md ring-1 ring-white/70">
                <svg className="w-7 h-7" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M24 4L39 12V24C39 33.5 32.5 41 24 44C15.5 41 9 33.5 9 24V12L24 4Z" fill="white" fillOpacity="0.95"/>
                  <path d="M24 10L34 15V24C34 30.4 29.8 36 24 38.2C18.2 36 14 30.4 14 24V15L24 10Z" fill="url(#brandCore)"/>
                  <path d="M18 23.5L22 27.5L30 19.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                  <defs>
                    <linearGradient id="brandCore" x1="14" y1="10" x2="34" y2="38.2" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#0EA5E9"/>
                      <stop offset="1" stopColor="#2563EB"/>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="brand-title text-[1.68rem] font-black tracking-tight transition-colors">
                    Jansewa <span className="brand-title-accent">AI</span>
                  </span>
                  <span className="premium-badge inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 2L14.4 7.2L20 8.1L15.9 12.1L16.9 18L12 15.1L7.1 18L8.1 12.1L4 8.1L9.6 7.2L12 2Z" />
                    </svg>
                  </span>
                </div>
                <p className="brand-subtitle -mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]">Citizen Governance Network</p>
              </div>
            </Link>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-4">
            <LiveDateTime className="hidden xl:inline-flex" />

            <Link
              to="/help"
              className="hidden md:inline-flex items-center rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2 text-xs font-semibold text-slate-700 hover:from-slate-100 hover:to-slate-50"
            >
              {t('nav_help_center', 'Help Center')}
            </Link>

            <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5 shadow-sm">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${language === 'en' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                {t('lang_en', 'EN')}
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`rounded-md px-2 py-1 text-xs font-semibold ${language === 'hi' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
              >
                {t('lang_hi', 'HI')}
              </button>
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
              title={theme === 'dark' ? t('nav_theme_light', 'Switch to light mode') : t('nav_theme_dark', 'Switch to dark mode')}
              aria-label={theme === 'dark' ? t('nav_theme_light', 'Switch to light mode') : t('nav_theme_dark', 'Switch to dark mode')}
            >
              {theme === 'dark' ? (
                <>
                  <svg className="h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 2.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3.5a.75.75 0 0 1 .75-.75Zm0 16.5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V20a.75.75 0 0 1 .75-.75ZM4.04 5.1a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06L4.04 6.16a.75.75 0 0 1 0-1.06Zm12.72 12.72a.75.75 0 0 1 1.06 0l1.06 1.06a.75.75 0 1 1-1.06 1.06l-1.06-1.06a.75.75 0 0 1 0-1.06ZM2.75 12a.75.75 0 0 1 .75-.75H5a.75.75 0 0 1 0 1.5H3.5a.75.75 0 0 1-.75-.75Zm16.25 0a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 19 12ZM5.1 19.96a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 0 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0ZM17.82 6.22a.75.75 0 0 1 0-1.06l1.06-1.06a.75.75 0 1 1 1.06 1.06l-1.06 1.06a.75.75 0 0 1-1.06 0Z" />
                  </svg>
                  <span>{t('nav_light', 'Light')}</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M14.53 3.49a.75.75 0 0 1 .9.9A8.25 8.25 0 1 0 19.6 14.5a.75.75 0 0 1 .9.9 9.75 9.75 0 1 1-5.97-11.9Z" />
                  </svg>
                  <span>{t('nav_dark', 'Dark')}</span>
                </>
              )}
            </button>

            {user?.role === 'CITIZEN' && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpenNotifications((prev) => !prev)}
                  className="relative rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title={t('nav_notifications_title', 'Complaint notifications')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {openNotifications && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl z-50">
                    <div className="border-b border-gray-100 px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{t('nav_complaint_updates', 'Complaint Updates')}</p>
                      <p className="text-xs text-gray-500">{t('nav_latest_status_feedback', 'Latest status feedback from leader team')}</p>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-gray-500">{t('nav_no_notifications', 'No new notifications')}</p>
                      ) : (
                        notifications.map((item) => (
                          <Link
                            key={`${item.complaint_id}-${item.performed_at}`}
                            to={`/complaints/${item.complaint_id}`}
                            onClick={() => setOpenNotifications(false)}
                            className="block border-b border-gray-50 px-4 py-3 hover:bg-gray-50"
                          >
                            <p className="text-xs font-semibold text-gray-900 line-clamp-1">
                              {item.complaint_summary || 'Complaint update'}
                            </p>
                            <p className="mt-1 text-xs text-gray-600 line-clamp-2">{item.notification_message}</p>
                            {!item.is_read && <p className="mt-1 text-[10px] font-semibold text-red-600">{t('nav_unread', 'Unread')}</p>}
                            <p className="mt-1 text-[11px] text-gray-400">
                              {new Date(item.performed_at).toLocaleString()}
                            </p>
                          </Link>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user.role?.replace('_', ' ')?.toLowerCase()}</p>
                </div>
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-100 to-cyan-100 flex items-center justify-center border border-primary-200/70">
                  <span className="text-primary-700 font-semibold text-sm">
                    {user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="text-sm text-gray-500 hover:text-red-600 transition-colors"
                  title={t('nav_logout', 'Logout')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
