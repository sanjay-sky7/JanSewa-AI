import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { complaintsAPI, verificationAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';
import { getComplaintDisplayText } from '../utils/complaintText';

const API_BASE = import.meta.env.VITE_API_URL || '';

const priorityBadge = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
};

const statusColors = {
  OPEN: 'bg-gray-100 text-gray-700',
  UNDER_REVIEW: 'bg-blue-100 text-blue-700',
  ASSIGNED: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-primary-100 text-primary-700',
  VERIFICATION_PENDING: 'bg-purple-100 text-purple-700',
  RESOLVED: 'bg-green-100 text-green-700',
  VERIFIED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-200 text-gray-600',
};

const UPDATE_STATUSES = [
  'UNDER_REVIEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'VERIFICATION_PENDING',
  'RESOLVED',
  'VERIFIED',
  'CLOSED',
];

export default function ComplaintDetail() {
  const { id } = useParams();
  const { hasRole, user } = useAuth();
  const { t } = useLanguage();
  const [complaint, setComplaint] = useState(null);
  const [verification, setVerification] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusSuccess, setStatusSuccess] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState('');
  const [beforeFile, setBeforeFile] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceError, setEvidenceError] = useState('');
  const [evidenceSuccess, setEvidenceSuccess] = useState('');

  const isWorkerRole = hasRole('WORKER', 'OFFICER', 'ENGINEER');
  const canSubmitWorkerEvidence = Boolean(
    isWorkerRole && complaint?.assignee?.id && user?.id && complaint.assignee.id === user.id
  );

  useEffect(() => {
    async function load() {
      try {
        const [cRes, vRes] = await Promise.allSettled([
          complaintsAPI.get(id),
          verificationAPI.get(id),
        ]);
        if (cRes.status === 'fulfilled') setComplaint(cRes.value.data);
        if (vRes.status === 'fulfilled') setVerification(vRes.value.data);
      } catch {
        // handled below
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    async function loadRecommendations() {
      if (!hasRole('LEADER', 'DEPARTMENT_HEAD', 'ADMIN')) {
        setRecommendations([]);
        return;
      }
      try {
        const { data } = await complaintsAPI.assignmentRecommendations(id);
        setRecommendations(data?.candidates || []);
      } catch {
        setRecommendations([]);
      }
    }
    loadRecommendations();
  }, [id, hasRole]);

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    setAssignError('');
    setAssignSuccess('');
    setAssignLoading(true);
    try {
      const selectedWorker = recommendations.find((item) => item.user_id === selectedAssignee);
      await complaintsAPI.assign(id, { assigned_to: selectedAssignee });
      const [{ data: updatedComplaint }, recommendationsRes] = await Promise.all([
        complaintsAPI.get(id),
        complaintsAPI.assignmentRecommendations(id).catch(() => ({ data: { candidates: [] } })),
      ]);
      setComplaint(updatedComplaint);
      setRecommendations(recommendationsRes?.data?.candidates || []);
      setSelectedAssignee('');
      setAssignSuccess(`Work assigned to ${selectedWorker?.name || 'selected worker'} successfully.`);
    } catch (err) {
      setAssignError(err.response?.data?.detail || 'Assignment failed.');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setStatusError('');
    setStatusSuccess('');
    setActionLoading(true);
    try {
      await complaintsAPI.updateStatus(id, { status: newStatus, notes: statusNote });
      const { data } = await complaintsAPI.get(id);
      setComplaint(data);
      setNewStatus('');
      setStatusNote('');
      setStatusSuccess(t('complaint_status_updated', 'Complaint status updated successfully.'));
    } catch (err) {
      setStatusError(err.response?.data?.detail || t('complaint_status_update_failed', 'Status update failed.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleEvidenceSubmit = async (e) => {
    e.preventDefault();
    if (!afterFile) {
      setEvidenceError('After image is required.');
      return;
    }

    setEvidenceError('');
    setEvidenceSuccess('');
    setEvidenceLoading(true);

    try {
      const formData = new FormData();
      formData.append('after_image', afterFile);
      if (beforeFile) {
        formData.append('before_image', beforeFile);
      }
      formData.append('after_timestamp', new Date().toISOString());

      await verificationAPI.submit(id, formData);

      const [complaintRes, verificationRes] = await Promise.allSettled([
        complaintsAPI.get(id),
        verificationAPI.get(id),
      ]);

      if (complaintRes.status === 'fulfilled') {
        setComplaint(complaintRes.value.data);
      }
      if (verificationRes.status === 'fulfilled') {
        setVerification(verificationRes.value.data);
      }

      setBeforeFile(null);
      setAfterFile(null);
      setEvidenceSuccess('Before/after evidence uploaded. Status moved to Verification Pending.');
    } catch (err) {
      setEvidenceError(err.response?.data?.detail || 'Evidence upload failed.');
    } finally {
      setEvidenceLoading(false);
    }
  };

  const statusLabel = (status) => {
    if (status === 'IN_PROGRESS') return 'Working on it';
    if (status === 'VERIFICATION_PENDING') return 'Completed';
    return t(`status_${status?.toLowerCase?.()}`, status?.replaceAll('_', ' '));
  };

  const resolveMediaUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('/')) return `${API_BASE}${url}`;
    return url;
  };

  const imageUrl = resolveMediaUrl(complaint?.raw_image_url || complaint?.image_url);
  const audioUrl = resolveMediaUrl(complaint?.raw_audio_url);
  const verificationBeforeImage = resolveMediaUrl(verification?.before_image_url);
  const verificationAfterImage = resolveMediaUrl(verification?.after_image_url);

  if (loading) return <LoadingSpinner label={t('complaint_loading', 'Loading complaint...')} />;
  if (!complaint) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">{t('complaint_not_found', 'Complaint not found')}</p>
        <Link to="/dashboard" className="text-primary-600 hover:underline mt-2 inline-block">
          {t('complaint_back_dashboard', 'Back to Dashboard')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 flex items-center gap-2">
        <Link to="/dashboard" className="hover:text-primary-600">{t('complaint_dashboard', 'Dashboard')}</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{complaint.complaint_id}</span>
      </nav>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 text-white shadow-xl">
        <div className="pointer-events-none absolute -left-10 top-0 h-24 w-24 rounded-full bg-[#ff9933]/30 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Complaint Intelligence</p>
            <h1 className="text-xl font-bold text-white">{getComplaintDisplayText(complaint, t('complaint_details_title', 'Complaint Details'))}</h1>
            <p className="text-sm text-slate-100 mt-1">ID: {complaint.complaint_code || String(complaint.id || '').slice(0, 8)}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`badge ${priorityBadge[complaint.priority_level] || 'badge-low'}`}>
              {complaint.priority_level || 'LOW'}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[complaint.status] || ''}`}>
              {statusLabel(complaint.status)}
            </span>
          </div>
        </div>
      </div>

      <div className="card p-6 relative overflow-hidden">
        <div className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-cyan-100/70 blur-xl" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="text-sm font-semibold text-slate-700">{t('complaint_details_title', 'Complaint Details')}</div>
        </div>

        <p className="mt-4 text-sm text-gray-700 leading-relaxed">{getComplaintDisplayText(complaint, t('complaint_no_text_details', 'No text details provided.'))}</p>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-gray-100">
          <MetaItem label={t('complaint_meta_ward', 'Ward')} value={complaint.ward?.ward_name || t('common_na', 'N/A')} />
          <MetaItem label={t('complaint_meta_category', 'Category')} value={complaint.category?.name || t('common_na', 'N/A')} />
          <MetaItem label={t('complaint_meta_priority_score', 'Priority Score')} value={complaint.final_priority_score?.toFixed?.(2)} />
          <MetaItem label={t('complaint_meta_sentiment', 'Sentiment')} value={complaint.sentiment_score} />
          <MetaItem label={t('complaint_meta_source', 'Source')} value={complaint.input_type} />
          <MetaItem label={t('complaint_meta_created', 'Created')} value={new Date(complaint.created_at).toLocaleString()} />
          <MetaItem label={t('complaint_meta_assigned_to', 'Assigned To')} value={complaint.assignee?.name || '—'} />
          <MetaItem label={t('complaint_meta_ai_duplicate', 'AI Duplicate')} value={complaint.is_duplicate ? t('complaint_yes', 'Yes') : t('complaint_no', 'No')} />
          <MetaItem label={t('complaint_meta_detected_location', 'Detected Location')} value={complaint.ai_location || t('common_na', 'N/A')} />
        </div>

        {/* AI Analysis */}
        {complaint.ai_summary && (
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-700 mb-1">{t('complaint_ai_summary', 'AI Summary')}</p>
            <p className="text-sm text-blue-900">{complaint.ai_summary}</p>
          </div>
        )}

        {/* Image */}
        {imageUrl && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">{t('complaint_attached_image', 'Attached Image')}</p>
            <img
              src={imageUrl}
              alt="Complaint evidence"
              className="rounded-lg max-h-64 object-cover border"
            />
            <a
              href={imageUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-primary-700 hover:underline"
            >
              {t('complaint_open_full_image', 'Open full image')}
            </a>
          </div>
        )}

        {complaint?.input_type === 'voice' && audioUrl && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">Uploaded Voice File</p>
            <audio controls preload="none" className="w-full max-w-xl">
              <source src={audioUrl} />
            </audio>
          </div>
        )}
      </div>

      {/* Verification */}
      {verification && (
        <div className="card p-6 border border-emerald-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('complaint_verification_title', '4-Layer Verification')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VerifyItem label={t('complaint_verify_gps', 'GPS Match')} passed={verification.location_match} score={verification.location_match ? 1 : 0} t={t} />
            <VerifyItem label={t('complaint_verify_timestamp', 'Timestamp')} passed={verification.time_valid} score={verification.time_valid ? 1 : 0} t={t} />
            <VerifyItem label={t('complaint_verify_visual', 'Visual Check')} passed={verification.visual_change_detected} score={verification.visual_change_confidence} t={t} />
            <VerifyItem label={t('complaint_verify_tamper', 'Tamper Detect')} passed={!verification.tamper_detected} score={verification.tamper_score} t={t} />
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {verificationBeforeImage && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Before</p>
                <img src={verificationBeforeImage} alt="Before evidence" className="w-full rounded-xl border border-slate-200 object-cover" />
              </div>
            )}
            {verificationAfterImage && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">After</p>
                <img src={verificationAfterImage} alt="After evidence" className="w-full rounded-xl border border-slate-200 object-cover" />
              </div>
            )}
          </div>
          <div className="mt-4 flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {t('complaint_overall_score', 'Overall Score')}: <span className="font-bold text-lg">{((verification.overall_confidence || 0) * 100).toFixed(1)}%</span>
            </span>
            <span className={`badge ${verification.verification_status === 'VERIFIED' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {verification.verification_status === 'VERIFIED' ? t('complaint_verified', 'Verified') : (verification.verification_status || 'PENDING')}
            </span>
          </div>
        </div>
      )}

      {/* Assign Work (leaders/dept heads only) */}
      {hasRole('LEADER', 'DEPARTMENT_HEAD', 'ADMIN') && (
        <div className="card p-6 border border-amber-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Assign Work</h2>
          <p className="mb-3 text-xs text-slate-600">
            Current assignee: <span className="font-semibold text-slate-900">{complaint.assignee?.name ? `${complaint.assignee.name}${complaint.assignee?.email ? ` (${complaint.assignee.email})` : ''}` : 'Not assigned yet'}</span>
          </p>
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Worker progress</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColors[complaint.status] || 'bg-slate-100 text-slate-700'}`}>
              {statusLabel(complaint.status)}
            </span>
            <span className="text-xs text-slate-500">Updated: {new Date(complaint.updated_at).toLocaleString()}</span>
          </div>
          {assignError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {assignError}
            </div>
          )}
          {assignSuccess && (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {assignSuccess}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="min-w-[260px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select worker...</option>
              {recommendations.map((item) => (
                <option key={item.user_id} value={item.user_id}>
                  {item.name}{item.email ? ` (${item.email})` : ''} ({item.role}){item.department ? ` - ${item.department}` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssign}
              disabled={!selectedAssignee || assignLoading}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {assignLoading ? 'Assigning...' : 'Assign'}
            </button>
          </div>
          {!!recommendations.length && (
            <p className="mt-3 text-xs text-slate-500">
              Recommendation order prioritizes same-ward and department-specialized workers.
            </p>
          )}
          {!recommendations.length && (
            <p className="mt-3 text-xs text-slate-500">No worker suggestions available for this complaint right now.</p>
          )}
        </div>
      )}

      {/* Worker Evidence Upload */}
      {isWorkerRole && (
        <div className="card p-6 border border-cyan-100">
          <h2 className="text-lg font-semibold text-slate-900">Work Completion Evidence</h2>
          <p className="mt-1 text-xs text-slate-500">
            Upload before and after images from worker side. This helps leaders verify that work was done.
          </p>

          {!canSubmitWorkerEvidence ? (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              You can upload evidence only for complaints assigned to you.
            </div>
          ) : (
            <form className="mt-4 space-y-4" onSubmit={handleEvidenceSubmit}>
              {evidenceError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{evidenceError}</div>
              )}
              {evidenceSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{evidenceSuccess}</div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Before image (optional)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setBeforeFile(e.target.files?.[0] || null)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">After image (required)</label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAfterFile(e.target.files?.[0] || null)}
                    className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-slate-500">
                Geo-location and capture time are detected automatically from EXIF geotag and timestamp.
              </p>

              <button
                type="submit"
                disabled={evidenceLoading}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:opacity-60"
              >
                {evidenceLoading ? 'Uploading...' : 'Upload Before/After Evidence'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Status Update (leaders/dept heads only) */}
      {hasRole('LEADER', 'DEPARTMENT_HEAD', 'ADMIN') && (
        <div className="card p-6 border border-blue-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('complaint_update_status', 'Update Status')}</h2>
          {statusError && (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {statusError}
            </div>
          )}
          {statusSuccess && (
            <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              {statusSuccess}
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">{t('complaint_select_status', 'Select status...')}</option>
              {UPDATE_STATUSES.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
            <input
              type="text"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder={t('complaint_notes_optional', 'Notes (optional)')}
              className="flex-1 min-w-[200px] border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleStatusUpdate}
              disabled={!newStatus || actionLoading}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium
                hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? t('complaint_updating', 'Updating...') : t('complaint_update', 'Update')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function VerifyItem({ label, passed, score, t }) {
  return (
    <div className={`p-3 rounded-lg border ${passed ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-lg font-bold ${passed ? 'text-green-700' : 'text-red-700'}`}>
        {passed ? `✓ ${t('complaint_pass', 'Pass')}` : `✗ ${t('complaint_fail', 'Fail')}`}
      </p>
      {score != null && <p className="text-xs text-gray-500">{t('complaint_score', 'Score')}: {score.toFixed(1)}</p>}
    </div>
  );
}
