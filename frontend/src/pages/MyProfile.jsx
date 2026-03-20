import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function roleLabel(role) {
  if (!role) return 'N/A';
  return role.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MyProfile() {
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [wardId, setWardId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const baseline = useMemo(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    wardId: user?.ward_number ? String(user.ward_number) : user?.ward_id ? String(user.ward_id) : '',
  }), [user]);

  useEffect(() => {
    setName(baseline.name);
    setPhone(baseline.phone);
    setDepartment(baseline.department);
    setWardId(baseline.wardId);
    setIsEditing(false);
  }, [baseline]);

  const isDirty = useMemo(() => {
    return (
      name !== baseline.name
      || phone !== baseline.phone
      || department !== baseline.department
      || wardId !== baseline.wardId
    );
  }, [name, phone, department, wardId, baseline]);

  const initials = useMemo(() => {
    if (!user?.name) return 'NA';
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }, [user?.name]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await updateProfile({
        name: name.trim(),
        phone: phone.trim() || null,
        department: department.trim() || null,
        ward_id: wardId ? Number(wardId) : null,
      });
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#ff9933] via-[#102a5f] to-[#138808] p-8 text-white shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-100">{t('profile_title', 'My Profile')}</p>
        <div className="mt-4 flex items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/30 bg-white/10 text-xl font-bold">
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.name || 'User'}</h1>
            <p className="mt-1 text-sm text-slate-200">{roleLabel(user?.role)}</p>
            {user?.ward_number && <p className="mt-1 text-xs text-white/80">Ward {user.ward_number}{user?.ward_name ? ` • ${user.ward_name}` : ''}</p>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">{t('profile_edit_account', 'Edit Account Details')}</h2>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          {success && <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{success}</p>}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <Row label="Email" value={user?.email || 'N/A'} />
            <Row label="Role" value={roleLabel(user?.role)} />
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Mobile Number</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91..."
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Department</label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Ward</label>
              <input
                type="number"
                min={1}
                max={15}
                value={wardId}
                onChange={(e) => setWardId(e.target.value)}
                disabled={!isEditing}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
              <p className="mt-1 text-[11px] text-gray-500">Enter ward number (1-15), not database ID.</p>
            </div>

            {!isEditing ? (
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setSuccess('');
                  setIsEditing(true);
                }}
                className="w-full rounded-lg bg-slate-700 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800"
              >
                {t('profile_change_details', 'Change Details')}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading || !isDirty}
                  className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 font-semibold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? t('profile_saving', 'Saving...') : t('profile_save_changes', 'Save Changes')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName(baseline.name);
                    setPhone(baseline.phone);
                    setDepartment(baseline.department);
                    setWardId(baseline.wardId);
                    setError('');
                    setSuccess('');
                    setIsEditing(false);
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  {t('profile_cancel', 'Cancel')}
                </button>
              </div>
            )}
          </form>
        </article>

        <article className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile Actions</h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Security</p>
              <p className="mt-1 text-xs text-slate-600">
                Use the Forgot Password option on sign-in page to reset your account password.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Role Based Access</p>
              <p className="mt-1 text-xs text-slate-600">
                Your available pages and actions are based on your selected account type.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900">Support</p>
              <p className="mt-1 text-xs text-slate-600">
                Contact your system administrator if your department or role details need updates.
              </p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="font-semibold text-blue-900">Contributors</p>
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
        </article>
      </section>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}

function ContributorRow({ name, role, linkedinUrl }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-white p-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-blue-900">{name}</p>
          <p className="text-[11px] text-blue-700">{role}</p>
        </div>
        <a
          href={linkedinUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${name} LinkedIn profile`}
          title={`${name} LinkedIn`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 text-[#0A66C2] hover:bg-blue-100"
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
