import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiCheckCircle, FiEye, FiEyeOff, FiKey, FiLock, FiMail, FiUser } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Login() {
  const { login, register, forgotPassword } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerRole, setRegisterRole] = useState('CITIZEN');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);
  const [welcomeName, setWelcomeName] = useState('');

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    resetMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();

    if (mode === 'forgot') {
      if (!password || password.length < 8) {
        setError(t('login_err_new_password_length', 'New password must be at least 8 characters long.'));
        return;
      }
      if (password !== confirmPassword) {
        setError(t('login_err_password_mismatch', 'Passwords do not match.'));
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'forgot') {
        await forgotPassword({
          email: email.trim(),
          new_password: password,
        });
        setSuccess(t('login_success_password_updated', 'Password updated. You can now sign in with your new password.'));
        setPassword('');
        setConfirmPassword('');
        setMode('login');
      } else if (mode === 'register') {
        const trimmedPhone = phone.trim();
        if (registerRole === 'CITIZEN' && !trimmedPhone) {
          setError(t('login_err_phone_required', 'Phone number is required for citizen accounts.'));
          setLoading(false);
          return;
        }

        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          role: registerRole,
          phone: trimmedPhone || null,
        });
        setSuccess(t('login_success_account_created', 'Account created successfully. Signing you in...'));
        const profile = await login(email.trim(), password);
        navigate('/dashboard');
      } else {
        const profile = await login(email.trim(), password);
        const resolvedName = profile?.name || t('login_user_fallback', 'User');
        setWelcomeName(resolvedName);
        setShowWelcomeOverlay(true);
        setSuccess(`${t('login_success_welcome_prefix', 'Welcome back')}, ${resolvedName}!`);
        await new Promise((resolve) => setTimeout(resolve, 1700));
        setShowWelcomeOverlay(false);
        navigate('/dashboard');
      }
    } catch (err) {
      const fallback =
        mode === 'register'
          ? t('login_err_registration_failed', 'Registration failed. Please try again.')
          : mode === 'forgot'
            ? t('login_err_reset_failed', 'Password reset failed. Please try again.')
            : t('login_err_login_failed', 'Login failed. Please try again.');
      setError(err.response?.data?.detail || fallback);
    } finally {
      setLoading(false);
    }
  };

  const titleByMode = {
    login: t('login_welcome_back', 'Welcome back'),
    register: t('login_create_account_title', 'Create your account'),
    forgot: t('login_reset_password_title', 'Reset your password'),
  };

  const subtitleByMode = {
    login: t('login_subtitle_signin', 'Sign in to monitor complaints, trust signals, and response workflows.'),
    register: t('login_subtitle_register', 'Set up your account to start managing governance operations.'),
    forgot: t('login_subtitle_forgot', 'Enter your email and set a fresh password to regain access.'),
  };

  const actionLabel =
    mode === 'register'
      ? t('login_create_account', 'Create Account')
      : mode === 'forgot'
        ? t('login_reset_password', 'Reset Password')
        : t('login_sign_in', 'Sign In');

  return (
    <div className="auth-bg relative min-h-screen overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -left-20 top-14 h-80 w-80 rounded-full bg-[#ff9933]/12 blur-3xl" />
      <div className="pointer-events-none absolute right-0 top-24 h-96 w-96 rounded-full bg-[#138808]/12 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#0a2a63]/12 blur-3xl" />

      {showWelcomeOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm px-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-[#0a2a63] via-[#1d4ed8] to-[#138808] p-6 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 animate-ping rounded-full bg-white/30" />
                <div className="relative rounded-full bg-white/20 p-2">
                  <FiCheckCircle className="h-6 w-6 text-emerald-100" />
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-cyan-100">{t('login_welcome_badge', 'Signed In')}</p>
                <p className="text-xl font-bold">{t('login_success_welcome_prefix', 'Welcome back')}, {welcomeName}!</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-cyan-100">{t('login_success_redirecting', 'Redirecting to your dashboard...')}</p>
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/20">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#ff9933] to-[#bbf7d0]" />
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto grid max-w-7xl grid-cols-1 overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 shadow-2xl backdrop-blur lg:grid-cols-2">
        <section
          className="relative hidden overflow-hidden p-10 text-slate-100 lg:block"
          style={{
            backgroundImage: 'radial-gradient(circle at 12% 20%, rgba(255, 153, 51, 0.30), transparent 36%), radial-gradient(circle at 82% 24%, rgba(103, 232, 249, 0.26), transparent 38%), radial-gradient(circle at 76% 74%, rgba(34, 211, 238, 0.28), transparent 42%), linear-gradient(156deg, #140f33 0%, #162964 42%, #123b7c 68%, #0e2d68 100%)',
            backgroundPosition: 'center, center, center, center',
            backgroundSize: 'cover, cover, cover, cover',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.08)_0%,rgba(3,7,18,0.40)_56%,rgba(3,7,18,0.78)_100%)]" />
          <div className="absolute -left-16 top-6 h-56 w-56 rounded-full bg-[#ff9933]/24 blur-3xl" />
          <div className="absolute right-[-72px] top-[-40px] h-64 w-64 rounded-full border border-white/20" />
          <div className="absolute right-[-100px] bottom-[-120px] h-80 w-80 rounded-full bg-[#22d3ee]/26 blur-3xl" />
          <div className="absolute bottom-12 right-6 h-1.5 w-72 -rotate-6 rounded-full bg-gradient-to-r from-[#f59e0b]/78 via-cyan-300/78 to-transparent" />
          <div className="absolute bottom-10 right-8 h-1 w-64 -rotate-6 rounded-full bg-gradient-to-r from-[#f59e0b]/55 via-cyan-200/55 to-transparent" />

          <div className="relative z-10">
            <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/25 bg-black/20 px-4 py-2 text-sm">
              <FiCheckCircle className="h-4 w-4 text-[#7dd3fc]" />
              {t('login_trusted_hub', 'Trusted civic operations hub')}
            </div>

            <h1 className="max-w-sm text-5xl font-black leading-tight tracking-tight">
              <span className="text-[#ffd08f]">Jansewa</span> <span className="text-[#9ef0c6]">AI</span>
            </h1>
            <p className="mt-3 text-lg font-semibold text-white">{t('login_empowering_citizens', 'Empowering citizens')}</p>
            <p className="mt-4 max-w-md text-slate-200/95 leading-relaxed">
              {t('login_command_center', 'Operational command center for grievance intake, triage, and transparent follow-up.')}
            </p>

            <div className="mt-7 grid grid-cols-3 gap-3">
              <InfoMini title="Active Wards" value="15" />
              <InfoMini title="Live Ops" value="24x7" />
              <InfoMini title="AI Routing" value="Enabled" />
            </div>

            <div className="mt-20 flex w-full justify-center">
              <p
                className="text-center text-[2.25rem] font-semibold leading-[1.3] text-white/95"
                style={{ fontFamily: '"Noto Serif Devanagari", "Tiro Devanagari Hindi", "Playfair Display", Georgia, serif' }}
              >
                !! वसुधैव कुटुम्बकम् !!
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)]">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-slate-900">{titleByMode[mode]}</h2>
              <p className="mt-2 text-sm text-slate-600">{subtitleByMode[mode]}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-sm">
              <div className="flex items-center gap-2.5">
                <div className="relative h-10 w-10 rounded-xl bg-gradient-to-br from-primary-700 via-cyan-600 to-blue-800 flex items-center justify-center shadow-md ring-1 ring-primary-200/70">
                  <svg className="w-6 h-6" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M24 4L39 12V24C39 33.5 32.5 41 24 44C15.5 41 9 33.5 9 24V12L24 4Z" fill="white" fillOpacity="0.95"/>
                    <path d="M24 10L34 15V24C34 30.4 29.8 36 24 38.2C18.2 36 14 30.4 14 24V15L24 10Z" fill="url(#loginBrandCore)"/>
                    <path d="M18 23.5L22 27.5L30 19.5" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="loginBrandCore" x1="14" y1="10" x2="34" y2="38.2" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#0EA5E9"/>
                        <stop offset="1" stopColor="#2563EB"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="leading-tight">
                  <p className="text-xl font-black tracking-tight text-[#0a2a63]">Jansewa <span className="text-primary-600">AI</span></p>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Civic Response Platform</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {[t('login_chip_secure', 'Secure Login'), t('login_chip_fast', 'Fast Access'), t('login_chip_role', 'Role Aware')].map((chip) => (
              <span key={chip} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700">
                {chip}
              </span>
            ))}
          </div>

          {mode !== 'forgot' && (
            <div className="mb-7 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('login_sign_in', 'Sign In')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-lg py-2 text-sm font-semibold transition ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('login_create_account', 'Create Account')}
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
            >
              <FiArrowLeft className="h-4 w-4" />
              {t('login_back_to_signin', 'Back to sign in')}
            </button>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="on">
            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login_full_name', 'Full name')}</label>
                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                    placeholder={t('login_your_full_name', 'Your full name')}
                    autoComplete="name"
                  />
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login_account_type', 'Account type')}</label>
                <select
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 px-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                >
                  <option value="CITIZEN">{t('login_role_citizen', 'Citizen')}</option>
                  <option value="LEADER">{t('login_role_leader', 'Leader')}</option>
                  <option value="WORKER">{t('login_role_worker', 'Worker')}</option>
                </select>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login_phone', 'Phone number')}</label>
                <div className="relative">
                  <FiUser className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required={registerRole === 'CITIZEN'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                    placeholder={t('login_phone_placeholder', '+91 98765 43210')}
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login_email', 'Email address')}</label>
              <div className="relative">
                <FiMail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-primary-500 focus:ring-4 focus:ring-primary-100"
                  placeholder={t('login_email_placeholder', 'name@domain.gov')}
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-sm font-medium text-slate-700">
                  {mode === 'forgot' ? t('login_new_password', 'New password') : t('login_password', 'Password')}
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs font-semibold text-[#0b4d95] transition hover:text-[#0a2a63]"
                  >
                    {t('login_forgot_password', 'Forgot password?')}
                  </button>
                )}
              </div>

              <div className="relative">
                <FiLock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#ff9933] focus:ring-4 focus:ring-[#ffe4c7]"
                  placeholder={t('login_password_placeholder', 'At least 8 characters')}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                  aria-label={showPassword ? t('login_hide_password', 'Hide password') : t('login_show_password', 'Show password')}
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {mode === 'forgot' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">{t('login_confirm_new_password', 'Confirm new password')}</label>
                <div className="relative">
                  <FiKey className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-12 text-sm text-slate-900 outline-none transition focus:border-[#138808] focus:ring-4 focus:ring-[#d8f5d3]"
                    placeholder={t('login_confirm_password_placeholder', 'Re-enter your new password')}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-700"
                    aria-label={showConfirmPassword ? t('login_hide_password', 'Hide password') : t('login_show_password', 'Show password')}
                  >
                    {showConfirmPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-[#05143d] via-[#052257] to-[#032a6d] py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? t('login_please_wait', 'Please wait...') : actionLabel}
            </button>
          </form>

          <div className="mt-7 border-t border-slate-200 pt-5 text-xs text-slate-500">
            {t('login_secure_access', 'Secure access for authorized civic operations teams.')}
          </div>
        </section>
      </div>
    </div>
  );
}

function InfoMini({ title, value }) {
  return (
    <div className="rounded-2xl border border-white/20 bg-white/12 p-3.5 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-200/90">{title}</p>
      <p className="mt-1 text-[1.65rem] leading-none font-black text-white">{value}</p>
    </div>
  );
}
