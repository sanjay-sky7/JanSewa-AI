export function parseServerDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');

  if (hasTz) {
    const direct = new Date(normalized);
    return Number.isNaN(direct.getTime()) ? null : direct;
  }

  // Fallback for naive timestamps like "YYYY-MM-DD HH:mm:ss".
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  // Backend stores naive UTC timestamps; interpret as UTC to avoid local-time drift.
  const parsed = new Date(Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  ));

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatComplaintDateTime(value) {
  const dt = parseServerDateTime(value);
  if (!dt) return 'N/A';

  try {
    return dt.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return dt.toLocaleString();
  }
}
