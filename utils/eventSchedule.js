/**
 * Event date+time in India (Asia/Kolkata): calendar day in IST + wall-clock time in IST.
 * Avoids Date#setHours in server local TZ, which incorrectly closed events early for IST users.
 */

const TZ = 'Asia/Kolkata';

function getKolkataDateParts(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = Number(parts.find((p) => p.type === 'year')?.value);
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parseTimeTo24h(timeStr) {
  const raw = String(timeStr).trim();
  if (!raw) return null;
  // 24-hour: 14:30, 9:00 (no AM/PM)
  const m24 = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (m24 && !/\s*(AM|PM)\s*$/i.test(raw)) {
    let hours = parseInt(m24[1], 10);
    const minutes = Math.min(59, Math.max(0, parseInt(m24[2], 10)));
    if (hours < 0 || hours > 23) return null;
    return { hours, minutes };
  }
  const match = raw.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  const ampm = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  hours = Math.min(23, Math.max(0, hours));
  return { hours, minutes };
}

/**
 * @param {Date|string|number} date - Plan date (Mongo or ISO)
 * @param {string} timeStr - e.g. "9:00 AM"
 * @returns {Date|null}
 */
function getEventStartDate(date, timeStr) {
  if (!date || !timeStr || typeof timeStr !== 'string') return null;
  const parts = getKolkataDateParts(date);
  const t = parseTimeTo24h(timeStr);
  if (!parts || !t) return null;
  const { year, month, day } = parts;
  const hh = String(t.hours).padStart(2, '0');
  const mm = String(t.minutes).padStart(2, '0');
  const mo = String(month).padStart(2, '0');
  const da = String(day).padStart(2, '0');
  const iso = `${year}-${mo}-${da}T${hh}:${mm}:00+05:30`;
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * When the event is considered "finished" for auto-complete + event-ended notifications.
 * - If end_time is set: that instant (IST, same calendar day as plan.date).
 * - Else: end of the event calendar day in IST (23:59:59.999) so same-day morning runs
 *   are not marked completed at creation/start time.
 */
function getEventEndDateForDeactivation(date, timeStr, endTimeStr) {
  const endRaw = endTimeStr != null ? String(endTimeStr).trim() : '';
  if (endRaw) {
    return getEventStartDate(date, endRaw);
  }
  const parts = getKolkataDateParts(date);
  if (!parts) return null;
  const { year, month, day } = parts;
  const mo = String(month).padStart(2, '0');
  const da = String(day).padStart(2, '0');
  const iso = `${year}-${mo}-${da}T23:59:59.999+05:30`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

module.exports = { getEventStartDate, getEventEndDateForDeactivation, getKolkataDateParts, parseTimeTo24h };
