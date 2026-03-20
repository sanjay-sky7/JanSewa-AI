import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { verificationAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function VerificationPage() {
  const { t } = useLanguage();
  const { id: complaintId } = useParams();
  const [file, setFile] = useState(null);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [notes, setNotes] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  // Pre-fetch existing verification
  useEffect(() => {
    verificationAPI
      .get(complaintId)
      .then((res) => setResult(res.data))
      .catch(() => {})
      .finally(() => setFetchLoading(false));
  }, [complaintId]);

  // Capture current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude.toFixed(6));
          setLng(pos.coords.longitude.toFixed(6));
        },
        () => {}
      );
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      if (file) formData.append('image', file);
      formData.append('latitude', lat);
      formData.append('longitude', lng);
      formData.append('notes', notes);

      const { data } = await verificationAPI.submit(complaintId, formData);
      setResult(data);
    } catch (err) {
      alert(err.response?.data?.detail || t('verification_submission_failed', 'Verification submission failed'));
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) return <LoadingSpinner label={t('verification_loading', 'Loading verification...')} />;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0b3a86] to-[#06b6d4] p-6 text-white shadow-xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Field Evidence</p>
        <h1 className="text-2xl font-bold text-white">{t('verification_title', '4-Layer Verification')}</h1>
        <p className="text-sm text-slate-100 mt-1">Complaint #{complaintId}</p>
      </div>

      {/* Result view */}
      {result && (
        <div className="card p-6 space-y-4 border border-cyan-100">
          <h2 className="text-lg font-semibold">{t('verification_result', 'Verification Result')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <VLayer label={t('complaint_verify_gps', 'GPS Match')} ok={result.gps_verified} score={result.gps_score} t={t} />
            <VLayer label={t('complaint_verify_timestamp', 'Timestamp')} ok={result.timestamp_verified} score={result.timestamp_score} t={t} />
            <VLayer label={t('verification_visual_change', 'Visual Change')} ok={result.visual_verified} score={result.visual_score} t={t} />
            <VLayer label={t('verification_tamper_detection', 'Tamper Detection')} ok={!result.tamper_detected} score={result.tamper_score} t={t} />
          </div>
          <div className="flex items-center gap-4 pt-2 border-t">
            <span className="text-lg font-bold text-gray-900">
              {t('verification_overall', 'Overall')}: {result.overall_score?.toFixed(1)}%
            </span>
            <span className={`badge ${result.is_verified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {result.is_verified ? t('complaint_verified', 'Verified') : t('complaint_not_verified', 'Not Verified')}
            </span>
          </div>
        </div>
      )}

      {/* Submit form (show if no result yet) */}
      {!result && (
        <form onSubmit={handleSubmit} className="card p-6 space-y-5 border border-slate-200">
          <h2 className="text-lg font-semibold">{t('verification_submit_title', 'Submit Verification Evidence')}</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('verification_photo_evidence', 'Photo evidence')}</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFile(e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0 file:text-sm file:font-medium
                file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('verification_latitude', 'Latitude')}</label>
              <input
                type="text"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={t('verification_auto_detected', 'Auto-detected')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('verification_longitude', 'Longitude')}</label>
              <input
                type="text"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder={t('verification_auto_detected', 'Auto-detected')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('verification_notes', 'Notes')}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder={t('verification_notes_placeholder', 'Any additional observations...')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium
              hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {loading ? t('verification_submitting', 'Submitting...') : t('verification_submit', 'Submit Verification')}
          </button>
        </form>
      )}
    </div>
  );
}

function VLayer({ label, ok, score, t }) {
  return (
    <div className={`p-3 rounded-lg border ${ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
      <p className="text-xs text-gray-600">{label}</p>
      <p className={`text-lg font-bold ${ok ? 'text-green-700' : 'text-red-700'}`}>
        {ok ? `✓ ${t('complaint_pass', 'Pass')}` : `✗ ${t('complaint_fail', 'Fail')}`}
      </p>
      {score != null && <p className="text-xs text-gray-500">{t('complaint_score', 'Score')}: {(score * 100).toFixed(0)}%</p>}
    </div>
  );
}
