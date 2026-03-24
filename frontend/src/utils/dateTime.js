export function parseServerDateTime(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const hasTz = /Z$|[+-]\d{2}:?\d{2}$/.test(raw);
  const normalized = hasTz ? raw : `${raw}Z`;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
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
