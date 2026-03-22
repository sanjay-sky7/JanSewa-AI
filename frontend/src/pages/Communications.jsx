import { useState, useEffect } from 'react';
import { communicationsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import LoadingSpinner from '../components/Common/LoadingSpinner';

const TYPE_OPTIONS = ['ACKNOWLEDGMENT', 'PROGRESS', 'COMPLETION', 'CRISIS_RESPONSE', 'WEEKLY_DIGEST'];
const FORMAT_OPTIONS = ['whatsapp', 'social_media', 'official_notice'];
const STATUS_FILTER_OPTIONS = ['ALL', 'DRAFT', 'APPROVED', 'PUBLISHED'];

const TYPE_LABELS = {
  ACKNOWLEDGMENT: 'Acknowledgment',
  PROGRESS: 'Progress Update',
  COMPLETION: 'Completion Note',
  CRISIS_RESPONSE: 'Crisis Response',
  WEEKLY_DIGEST: 'Weekly Digest',
};

const FORMAT_LABELS = {
  whatsapp: 'WhatsApp',
  social_media: 'Social Media',
  official_notice: 'Official Notice',
};

export default function Communications() {
  const { t } = useLanguage();
  const [comms, setComms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    complaint_id: '',
    comm_type: 'ACKNOWLEDGMENT',
    format: 'whatsapp',
  });
  const [generatedContent, setGeneratedContent] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  useEffect(() => {
    loadComms();
  }, [statusFilter, typeFilter]);

  async function loadComms() {
    setLoading(true);
    try {
      const params = {
        limit: 50,
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
        ...(typeFilter !== 'ALL' ? { comm_type: typeFilter } : {}),
      };
      const { data } = await communicationsAPI.list(params);
      setComms(data || []);
    } finally {
      setLoading(false);
    }
  }

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    try {
      const { data } = await communicationsAPI.generate(form);
      setGeneratedContent(data);
      await loadComms();
    } catch (err) {
      alert(err.response?.data?.detail || t('comms_generation_failed', 'Generation failed'));
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async (id) => {
    await communicationsAPI.approve(id);
    await loadComms();
  };

  const handlePublish = async (id) => {
    await communicationsAPI.publish(id);
    await loadComms();
  };

  if (loading) return <LoadingSpinner label={t('comms_loading', 'Loading communications...')} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-[#0f172a] via-[#0b3a86] to-[#14b8a6] p-6 text-white shadow-xl">
        <div className="absolute -top-10 -left-10 h-28 w-28 rounded-full bg-[#ff9933]/35 blur-2xl" />
        <div className="relative flex items-center justify-between">
        <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-100">Public Messaging</p>
          <h1 className="text-2xl font-bold text-white">{t('comms_title', 'AI Communications')}</h1>
          <p className="text-sm text-slate-100 mt-1">{t('comms_subtitle', 'Generate, approve, and publish governance communications')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
        >
          {showForm ? t('comms_close', 'Close') : t('comms_generate_new', '+ Generate New')}
        </button>
        </div>
      </div>

      {/* Generate form */}
      {showForm && (
        <form onSubmit={handleGenerate} className="card p-6 space-y-4 border border-cyan-100">
          <h2 className="text-lg font-semibold">{t('comms_generate_title', 'Generate Communication')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('comms_complaint_id_optional', 'Complaint ID (optional)')}</label>
              <input
                type="text"
                value={form.complaint_id}
                onChange={(e) => setForm({ ...form, complaint_id: e.target.value })}
                className="premium-input w-full rounded-xl px-3 py-2 text-sm"
                placeholder="CMP-2025-00001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('comms_type', 'Type')}</label>
              <select
                value={form.comm_type}
                onChange={(e) => setForm({ ...form, comm_type: e.target.value })}
                className="premium-select w-full rounded-xl px-3 py-2 text-sm"
              >
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>{TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('comms_format', 'Format')}</label>
              <select
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
                className="premium-select w-full rounded-xl px-3 py-2 text-sm"
              >
                {FORMAT_OPTIONS.map((f) => (
                  <option key={f} value={f}>{FORMAT_LABELS[f]}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={generating}
            className="rounded-xl bg-gradient-to-r from-[#ff9933] via-[#0b3a86] to-[#138808] text-white px-6 py-2.5 text-sm font-semibold
              hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {generating ? t('comms_generating', 'Generating with AI...') : t('comms_generate', 'Generate')}
          </button>
        </form>
      )}

      {/* Generated preview */}
      {generatedContent && (
        <div className="card p-6 border-l-4 border-[#0ea5e9]">
          <h3 className="font-semibold mb-2">{t('comms_generated_content', 'Generated Content')}</h3>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
            {generatedContent.content_english || ''}
          </div>
          {generatedContent.content_hindi && (
            <div className="mt-4 pt-4 border-t prose prose-sm max-w-none whitespace-pre-wrap text-gray-700">
              <p className="text-xs font-semibold text-gray-500 mb-1">{t('comms_hindi_version', 'Hindi Version')}</p>
              {generatedContent.content_hindi}
            </div>
          )}
        </div>
      )}

      {/* Communications list */}
      <div className="card overflow-hidden rounded-2xl">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="font-semibold text-gray-900">{t('comms_all', 'All Communications')}</h2>
          <div className="flex flex-col gap-2 md:flex-row">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="premium-select rounded-lg px-3 py-2 text-sm"
            >
              {STATUS_FILTER_OPTIONS.map((status) => (
                <option key={status} value={status}>{status === 'ALL' ? 'All Statuses' : status}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="premium-select rounded-lg px-3 py-2 text-sm"
            >
              <option value="ALL">All Types</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="divide-y">
          {comms.length === 0 ? (
            <p className="px-5 py-8 text-center text-gray-400">{t('comms_none', 'No communications yet')}</p>
          ) : (
            comms.map((c) => (
              <div key={c.id} className="px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                      {TYPE_LABELS[c.comm_type] || c.comm_type?.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                      c.status === 'PUBLISHED' ? 'bg-green-100 text-green-700'
                        : c.status === 'APPROVED' ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{c.content?.slice(0, 200)}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(c.created_at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  {c.status === 'DRAFT' && (
                    <button
                      onClick={() => handleApprove(c.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t('comms_approve', 'Approve')}
                    </button>
                  )}
                  {c.status === 'APPROVED' && (
                    <button
                      onClick={() => handlePublish(c.id)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      {t('comms_publish', 'Publish')}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
