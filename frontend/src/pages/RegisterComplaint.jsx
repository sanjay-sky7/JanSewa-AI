import { useEffect, useMemo, useRef, useState } from 'react';
import exifr from 'exifr';
import { complaintsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { getComplaintDisplayText } from '../utils/complaintText';
import { formatComplaintDateTime } from '../utils/dateTime';

const INPUT_TYPES = [
  { key: 'text', label: 'Text', tone: 'from-[#0a2a63] to-[#2563eb]' },
  { key: 'voice', label: 'Voice', tone: 'from-[#1d4ed8] to-[#0ea5e9]' },
  { key: 'image', label: 'Image', tone: 'from-[#0369a1] to-[#0891b2]' },
];

const LANGUAGES = [
  'auto',
  'english',
  'hindi',
  'marathi',
  'bengali',
  'tamil',
  'telugu',
  'gujarati',
  'kannada',
  'malayalam',
  'punjabi',
  'urdu',
  'odia',
  'assamese',
];

const COUNTRY_OPTIONS = [
  { flag: 'IN', emoji: '🇮🇳', code: '+91', label: 'India' },
  { flag: 'US', emoji: '🇺🇸', code: '+1', label: 'United States' },
  { flag: 'GB', emoji: '🇬🇧', code: '+44', label: 'United Kingdom' },
  { flag: 'AE', emoji: '🇦🇪', code: '+971', label: 'UAE' },
  { flag: 'SA', emoji: '🇸🇦', code: '+966', label: 'Saudi Arabia' },
  { flag: 'SG', emoji: '🇸🇬', code: '+65', label: 'Singapore' },
];

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function normalizeSpeechChunk(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

export default function RegisterComplaint() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [inputType, setInputType] = useState('text');
  const [wardId, setWardId] = useState(1);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState([]);
  const [language, setLanguage] = useState('auto');
  const [rawText, setRawText] = useState('');
  const [voiceFile, setVoiceFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [countryCode, setCountryCode] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [geoTag, setGeoTag] = useState(null);
  const [geoNote, setGeoNote] = useState('');
  const [latestComplaints, setLatestComplaints] = useState([]);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const [micActive, setMicActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transcribedPreview, setTranscribedPreview] = useState('');

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const micBaseTextRef = useRef('');
  const micFinalTextRef = useRef('');

  const fullPhone = useMemo(() => {
    if (!phoneNumber.trim()) return '';
    return `${countryCode}${phoneNumber.trim()}`;
  }, [countryCode, phoneNumber]);

  const canSubmit = useMemo(() => {
    if (inputType === 'text') return rawText.trim().length > 5;
    if (inputType === 'voice') return !!voiceFile || rawText.trim().length > 5;
    if (inputType === 'image') return !!imageFile;
    return false;
  }, [inputType, rawText, voiceFile, imageFile]);

  useEffect(() => {
    if (user?.phone) {
      const matched = COUNTRY_OPTIONS.find((c) => user.phone.startsWith(c.code));
      if (matched) {
        setCountryCode(matched.code);
        setPhoneNumber(user.phone.slice(matched.code.length));
      } else {
        setPhoneNumber(user.phone);
      }
    }
  }, [user?.phone]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data } = await complaintsAPI.categories();
        setCategories(Array.isArray(data) ? data : []);
      } catch {
        setCategories([]);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!fullPhone) {
      setLatestComplaints([]);
      return;
    }
    loadLatestStatus(fullPhone);
  }, [fullPhone]);

  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (inputType !== 'voice' && micActive) {
      stopListening();
    }
  }, [inputType, micActive]);

  function startSilenceTimer() {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      stopListening();
    }, 8000);
  }

  function startListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }

    setError('');

    const recognition = new SpeechRecognition();
    recognition.lang = language === 'auto' ? 'en-IN' : language === 'hindi' ? 'hi-IN' : 'en-IN';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setMicActive(true);
      micBaseTextRef.current = normalizeSpeechChunk(rawText);
      micFinalTextRef.current = '';
      startSilenceTimer();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i += 1) {
        const chunk = normalizeSpeechChunk(event.results[i][0]?.transcript || '');
        if (!chunk) continue;

        if (event.results[i].isFinal) {
          finalTranscript = `${finalTranscript} ${chunk}`.trim();
        } else {
          interimTranscript = `${interimTranscript} ${chunk}`.trim();
        }
      }

      micFinalTextRef.current = normalizeSpeechChunk(finalTranscript);
      const composed = normalizeSpeechChunk(
        `${micBaseTextRef.current} ${micFinalTextRef.current} ${interimTranscript}`
      );
      setRawText(composed);

      if (micFinalTextRef.current || interimTranscript) {
        startSilenceTimer();
      }
    };

    recognition.onerror = () => {
      setMicActive(false);
    };

    recognition.onend = () => {
      const stableText = normalizeSpeechChunk(`${micBaseTextRef.current} ${micFinalTextRef.current}`);
      if (stableText) {
        setRawText(stableText);
      }
      setMicActive(false);
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setMicActive(false);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }

  async function detectImageGeo(file) {
    setGeoTag(null);
    setGeoNote('');

    try {
      const gps = await exifr.gps(file);
      const lat = gps?.latitude;
      const lng = gps?.longitude;

      if (
        Number.isFinite(lat)
        && Number.isFinite(lng)
        && lat >= -90
        && lat <= 90
        && lng >= -180
        && lng <= 180
      ) {
        setGeoTag({ latitude: lat, longitude: lng });
        setGeoNote('Geo-tag detected from image metadata.');
      } else {
        setGeoNote('No GPS metadata found in image. Internet-downloaded images usually lose location tags. Use current location or capture image with phone location ON.');
      }
    } catch {
      setGeoNote('Could not read geo-tag from image metadata.');
    }
  }

  function requestCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported in this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        () => reject(new Error('Location permission denied or unavailable.')),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }

  async function detectCurrentLocation() {
    try {
      const coords = await requestCurrentLocation();
      setGeoTag(coords);
      setGeoNote('Using current device location for Geo-Tagged Work Verification.');
    } catch (err) {
      setGeoNote(err.message || 'Location permission denied or unavailable.');
    }
  }

  async function loadLatestStatus(phoneValue) {
    setLoadingLatest(true);
    try {
      const { data } = await complaintsAPI.list({
        per_page: 5,
        page: 1,
        citizen_phone: phoneValue,
      });
      setLatestComplaints(data.items || []);
    } catch {
      setLatestComplaints([]);
    } finally {
      setLoadingLatest(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setTranscribedPreview('');
    setLoading(true);

    try {
      const payload = {
        input_type: inputType,
        ward_id: Number(wardId),
        category_id: categoryId ? Number(categoryId) : null,
        source_language: inputType === 'image' ? null : language,
        raw_text: rawText.trim() || null,
        citizen_name: user?.name || 'Citizen',
        citizen_phone: fullPhone || null,
        is_anonymous: false,
      };

      if (inputType === 'voice' && voiceFile) {
        payload.raw_audio_url = await toDataUrl(voiceFile);
      }

      if (inputType === 'image' && imageFile) {
        if (!payload.raw_text && imageFile?.name) {
          const nameHint = imageFile.name
            .replace(/\.[a-zA-Z0-9]+$/, '')
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          if (nameHint) {
            payload.raw_text = `Image file hint: ${nameHint}`;
          }
        }

        payload.raw_image_url = await toDataUrl(imageFile);

        if (!geoTag) {
          try {
            const currentCoords = await requestCurrentLocation();
            setGeoTag(currentCoords);
            setGeoNote('No image GPS found. Using current device location as fallback.');
            payload.geo_latitude = currentCoords.latitude;
            payload.geo_longitude = currentCoords.longitude;
          } catch {
            // Keep submission flowing; backend will apply ward-level fallback routing.
          }
        }
      }

      if (geoTag?.latitude && geoTag?.longitude) {
        payload.geo_latitude = geoTag.latitude;
        payload.geo_longitude = geoTag.longitude;
      }

      const { data } = await complaintsAPI.create(payload);

      if (inputType === 'voice' && !rawText.trim() && data?.raw_text) {
        setTranscribedPreview(data.raw_text);
      }

      setSuccess('Complaint submitted successfully. Your complaint is now in the processing queue for leader review.');
      setRawText('');
      setVoiceFile(null);
      setImageFile(null);
      await loadLatestStatus(fullPhone);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="register-page mx-auto max-w-6xl space-y-6">
      <header className="register-hero relative overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-r from-[#0f172a] via-[#0a2a63] to-[#0ea5e9] p-6 shadow-lg">
        <div className="pointer-events-none absolute -top-10 -left-10 h-28 w-28 rounded-full bg-blue-300/30 blur-2xl" />
        <div className="pointer-events-none absolute -right-8 bottom-0 h-28 w-28 rounded-full bg-cyan-200/40 blur-2xl" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">{t('register_citizen_desk', 'Citizen Desk')}</p>
        <h1 className="mt-3 text-3xl font-black text-white">{t('register_title', 'Register Complaint')}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-100/90">
          {t('register_subtitle', 'Submit issues through text, voice, or image evidence. Complaints are triaged and prioritized automatically for governance teams.')}
        </p>
        <div className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200/60 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-50">
          <span className="font-semibold">WhatsApp Complaint Line:</span>
          <span className="rounded-md bg-white/15 px-2 py-0.5 font-bold tracking-wide">8112561625</span>
          <a
            href="https://wa.me/918112561625"
            target="_blank"
            rel="noreferrer"
            className="rounded-md bg-emerald-500 px-2 py-0.5 font-semibold text-white transition hover:bg-emerald-600"
          >
            Open Chat
          </a>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="register-feature interactive-feature-card animate-slide-in-up group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-sky-50 p-4 transition hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: '0ms' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('register_smart_intake', 'Smart Intake')}</p>
          <p className="mt-1 text-sm font-bold text-blue-900">{t('register_smart_intake_desc', 'Multimodal complaint capture')}</p>
        </div>
        <div className="register-feature interactive-feature-card animate-slide-in-up group rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-cyan-50 p-4 transition hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: '70ms' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">{t('register_voice_ai', 'Voice AI')}</p>
          <p className="mt-1 text-sm font-bold text-sky-900">{t('register_voice_ai_desc', 'Whisper transcription support')}</p>
        </div>
        <div className="register-feature interactive-feature-card animate-slide-in-up group rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 transition hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: '140ms' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{t('register_geo_evidence', 'Geo Evidence')}</p>
          <p className="mt-1 text-sm font-bold text-blue-900">{t('register_geo_evidence_desc', 'Location-aware verification flow')}</p>
        </div>
        <div className="register-feature interactive-feature-card animate-slide-in-up group rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-blue-50 p-4 transition hover:-translate-y-1 hover:shadow-md" style={{ animationDelay: '210ms' }}>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">{t('register_live_tracking', 'Live Tracking')}</p>
          <p className="mt-1 text-sm font-bold text-indigo-900">{t('register_live_tracking_desc', 'Status alerts on every update')}</p>
        </div>
      </section>

      <div className="register-form-panel rounded-3xl border border-blue-100 bg-white/95 p-6 shadow-lg ring-1 ring-blue-100 backdrop-blur-sm">
        <div className="register-tab-wrap mb-6 grid grid-cols-3 gap-2 rounded-2xl bg-blue-50 p-1.5">
          {INPUT_TYPES.map((type) => (
            <button
              key={type.key}
              type="button"
              onClick={() => setInputType(type.key)}
              className={`intake-tab relative overflow-hidden rounded-lg px-3 py-2 text-sm font-semibold transition ${
                inputType === type.key
                  ? `bg-gradient-to-r ${type.tone} text-white shadow-sm scale-[1.01] ring-1 ring-white/50`
                  : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              {inputType === type.key && <span className="intake-tab-glow" />}
              {type.key === 'text' ? t('register_text', 'Text') : type.key === 'voice' ? t('register_voice', 'Voice') : t('register_image', 'Image')}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </div>
        )}
        {transcribedPreview && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            <p className="font-semibold">{t('register_transcription_preview', 'Whisper transcription preview')}</p>
            <p className="mt-1">{transcribedPreview}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={`grid grid-cols-1 gap-4 ${inputType === 'image' ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_ward', 'Ward')}</label>
              <input
                type="number"
                min={1}
                max={15}
                value={wardId}
                onChange={(e) => setWardId(e.target.value)}
                className="register-field w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_problem_category', 'Problem category')}</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="register-field w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">{t('register_auto_detect', 'Auto-detect')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </div>
            {inputType !== 'image' && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_language', 'Language')}</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="register-field w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang[0].toUpperCase() + lang.slice(1)}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_phone_optional', 'Phone (optional)')}</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="register-field w-32 rounded-lg border border-blue-200 bg-white px-2 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  {COUNTRY_OPTIONS.map((item) => (
                    <option key={item.flag} value={item.code}>{item.emoji} {item.code}</option>
                  ))}
                </select>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Mobile number"
                  className="register-field flex-1 rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>

          {(inputType === 'text' || inputType === 'voice' || inputType === 'image') && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t('register_complaint_details', 'Complaint details')}
              </label>
              <textarea
                rows={4}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder={t('register_complaint_placeholder', 'Describe the issue, location, and urgency...')}
                className="register-field w-full rounded-lg border border-blue-200 bg-white px-3 py-2.5 text-sm transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
                <span>{inputType === 'voice' ? 'Live transcript enabled' : 'Tip: include location for faster routing'}</span>
                <span>{rawText.trim().length} chars</span>
              </div>
              {inputType === 'voice' && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {!micActive ? (
                    <button
                      type="button"
                      onClick={startListening}
                      className="rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                    >
                      {t('register_start_mic', 'Start Mic')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopListening}
                      className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                    >
                      {t('register_stop_mic', 'Stop Mic')}
                    </button>
                  )}
                  {micActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-700">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                      Listening
                    </span>
                  )}
                  <p className="text-xs text-gray-500">{t('register_mic_hint', 'Mic stops automatically after silence.')}</p>
                </div>
              )}
            </div>
          )}

          {inputType === 'voice' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_voice_file', 'Voice file')}</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setVoiceFile(e.target.files?.[0] || null)}
                className="register-file-field block w-full rounded-lg border border-blue-200 bg-white p-2 text-sm transition file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">{t('register_voice_upload_hint', 'Upload a voice note (mp3, wav, m4a).')}</p>
            </div>
          )}

          {inputType === 'image' && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('register_image_evidence', 'Image evidence')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  if (file) detectImageGeo(file);
                }}
                className="register-file-field block w-full rounded-lg border border-blue-200 bg-white p-2 text-sm transition file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="mt-1 text-xs text-gray-500">{t('register_image_upload_hint', 'Upload a clear photo of the issue location.')}</p>

              <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-semibold">{t('register_geo_title', 'Geo-Tagged Work Verification')}</p>
                <p className="mt-1">{geoNote || t('register_geo_default', 'Upload an image with GPS metadata or use current location.')}</p>
                {geoTag && (
                  <p className="mt-1">Detected: {geoTag.latitude.toFixed(5)}, {geoTag.longitude.toFixed(5)}</p>
                )}
                <button
                  type="button"
                  onClick={detectCurrentLocation}
                  className="mt-2 rounded-md border border-blue-300 bg-white px-2 py-1 font-semibold text-blue-800"
                >
                  {t('register_geo_use_current', 'Use current location')}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
                className="register-submit-btn w-full rounded-xl bg-gradient-to-r from-[#0a2a63] via-[#1d4ed8] to-[#0ea5e9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? t('register_submitting', 'Submitting complaint...') : t('register_submit', 'Submit Complaint')}
          </button>
        </form>
      </div>

      <div className="register-latest-panel rounded-3xl border border-blue-100 bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-900">{t('register_latest_status', 'Latest Complaint Status')}</h2>
        <p className="mt-1 text-xs text-gray-500">{t('register_recent_statuses', 'Recent complaint statuses for your mobile number.')}</p>

        <div className="mt-4 space-y-3">
          {loadingLatest ? (
            <p className="text-sm text-gray-500">{t('register_loading_latest', 'Loading latest statuses...')}</p>
          ) : latestComplaints.length === 0 ? (
            <p className="text-sm text-gray-500">{t('register_no_recent', 'No recent complaints found. Submit one to track status here.')}</p>
          ) : (
            latestComplaints.map((item) => (
              <div key={item.id} className="register-status-item rounded-xl border border-blue-100 bg-white p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="line-clamp-1 text-sm font-medium text-gray-900">{getComplaintDisplayText(item, 'Complaint record')}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{item.status}</span>
                </div>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span>Priority: {item.priority_level || 'N/A'}</span>
                  <span>{formatComplaintDateTime(item.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
