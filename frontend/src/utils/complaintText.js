const LEGACY_VOICE_PLACEHOLDERS = [
  'Voice complaint received. Transcription pending.',
  'Voice file uploaded. Transcription pending.',
];

function isLegacyVoicePlaceholder(text) {
  const normalized = (text || '').trim().toLowerCase();
  return LEGACY_VOICE_PLACEHOLDERS.some((item) => item.toLowerCase() === normalized);
}

export function getComplaintDisplayText(complaint, fallback = 'Complaint') {
  const rawText = (complaint?.raw_text || '').trim();
  const aiSummary = (complaint?.ai_summary || '').trim();

  if (rawText && !isLegacyVoicePlaceholder(rawText)) return rawText;
  if (aiSummary) return aiSummary;

  if (complaint?.input_type === 'voice') {
    const category = (complaint?.category?.name || 'civic service').toLowerCase();
    const wardName = complaint?.ward?.ward_name ? ` in ${complaint.ward.ward_name}` : '';
    return `Voice complaint about ${category} issue${wardName}.`;
  }

  return fallback;
}
