// Pure helpers for the Arham Secure integration (no DB, no network) so they can be unit-tested.
const crypto = require('crypto');

const SCOPES = ['contacts:write', 'policies:write', 'scripts:read', 'scripts:write', 'calls:create', 'calls:read', 'webhooks:manage'];
const POLICY_TYPES = ['renewal', 'new', 'lapsed', 'other'];
const CONSENT_STATUSES = ['granted', 'revoked', 'unknown'];
const EVENT_TYPES = ['call.queued', 'call.initiated', 'call.completed', 'call.failed', 'call.no_answer', 'outcome.recorded', 'transcript.ready', 'recording.ready'];
const TERMINAL_STATUSES = ['completed', 'call-disconnected', 'failed', 'no-answer', 'busy', 'canceled', 'error', 'stopped', 'balance-low'];

// --- Phone ---
// Returns E.164 or null. Bare 10-digit numbers are treated as Indian, like the app.
function normalizePhone(raw, defaultCountry = '91') {
  if (raw == null) return null;
  let s = String(raw).trim().replace(/[\s\-().]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (!s.startsWith('+')) {
    if (/^\d{10}$/.test(s)) s = `+${defaultCountry}${s}`;
    else if (/^0\d{10}$/.test(s)) s = `+${defaultCountry}${s.slice(1)}`;
    else if (/^91\d{10}$/.test(s)) s = `+${s}`;
    else return null;
  }
  return /^\+[1-9]\d{7,14}$/.test(s) ? s : null;
}

// --- Script templates: {{variable}} ---
const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

function extractPlaceholders(template) {
  return [...new Set([...String(template || '').matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

// Unbalanced braces such as "{{name" or "{{ }}" are almost always a typo; reject at save time.
function templateSyntaxError(template) {
  const t = String(template || '');
  const stripped = t.replace(PLACEHOLDER, '');
  if (/\{\{|\}\}/.test(stripped)) return 'Malformed {{placeholder}} — use {{variable_name}}';
  return null;
}

function renderTemplate(template, vars) {
  const missing = [];
  const text = String(template || '').replace(PLACEHOLDER, (_, key) => {
    const v = vars[key];
    if (v === undefined || v === null || v === '') {
      if (!missing.includes(key)) missing.push(key);
      return '';
    }
    return String(v);
  });
  return { text, missing };
}

// --- Calling windows / DND ---
function zonedParts(date, timeZone) {
  const fmt = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { day, hhmm: `${parts.hour}:${parts.minute}` };
}

// Returns null when the call is allowed, otherwise { code, message }.
function checkCalling(compliance, phone, when = new Date(), { contactDnd = false } = {}) {
  if (contactDnd) return { code: 'dnd', message: 'Contact has opted out of calls' };
  if (compliance.dnd?.enabled && compliance.dnd.numbers?.includes(phone)) {
    return { code: 'dnd', message: 'Number is on the do-not-disturb list' };
  }
  const h = compliance.callingHours;
  if (h?.enabled) {
    let parts;
    try {
      parts = zonedParts(when, h.timezone);
    } catch {
      parts = zonedParts(when, 'Asia/Kolkata');
    }
    if (!h.days.includes(parts.day) || parts.hhmm < h.start || parts.hhmm >= h.end) {
      return { code: 'outside_calling_hours', message: `Outside calling hours (${h.start}–${h.end} ${h.timezone})` };
    }
  }
  return null;
}

// Whole days from today (in `timeZone`) to a YYYY-MM-DD date; negative when past.
function daysUntil(isoDate, now = new Date(), timeZone = 'Asia/Kolkata') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate || '')) return null;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return Math.round((Date.parse(`${isoDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000);
}

function isValidIsoDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// --- Webhook signing ---
// Header format: t=<unix seconds>,v1=<hex hmac of "<t>.<body>">
function signWebhook(secret, body, t = Math.floor(Date.now() / 1000)) {
  const sig = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${sig}`;
}

function verifyWebhook(secret, body, header, toleranceSec = 300, now = Math.floor(Date.now() / 1000)) {
  const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(header || '');
  if (!m) return false;
  if (Math.abs(now - Number(m[1])) > toleranceSec) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${m[1]}.${body}`).digest();
  const given = Buffer.from(m[2], 'hex');
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Retry delays after attempt N (1-based) fails: 1m, 5m, 30m, 2h, 6h, 12h, 24h, then give up.
const BACKOFF_MS = [60e3, 5 * 60e3, 30 * 60e3, 2 * 3600e3, 6 * 3600e3, 12 * 3600e3, 24 * 3600e3];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;
const backoffMs = (attempt) => BACKOFF_MS[Math.min(attempt, BACKOFF_MS.length) - 1];

// --- Recording links (short-lived, signed, stateless) ---
function signRecordingLink(secret, callId, expiresAt) {
  return crypto.createHmac('sha256', secret).update(`rec:${callId}:${expiresAt}`).digest('hex');
}

function verifyRecordingLink(secret, callId, expiresAt, sig, now = Date.now()) {
  if (!Number.isFinite(expiresAt) || expiresAt < now || !/^[0-9a-f]{64}$/.test(sig || '')) return false;
  const expected = Buffer.from(signRecordingLink(secret, callId, expiresAt), 'hex');
  const given = Buffer.from(sig, 'hex');
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}

// --- Call results ---
const OUTCOME_SYNONYMS = {
  renewed: 'renewed', already_renewed: 'renewed', renewal_done: 'renewed',
  will_renew: 'will_renew', agreed_to_renew: 'will_renew', interested: 'will_renew', renewal_intent: 'will_renew',
  callback: 'callback_requested', callback_requested: 'callback_requested', call_back: 'callback_requested',
  quote_requested: 'quote_requested', quotation_requested: 'quote_requested', quote: 'quote_requested', send_quote: 'quote_requested',
  not_interested: 'not_interested', declined: 'not_interested', refused: 'not_interested',
  wrong_number: 'wrong_number', wrong_person: 'wrong_number',
  do_not_call: 'do_not_call', dnc: 'do_not_call', opt_out: 'do_not_call',
};

const callDuration = (b) => Number(b?.conversation_duration ?? b?.conversation_time ?? b?.telephony_data?.duration ?? 0) || 0;

function normalizeOutcome(bolna) {
  const ed = bolna?.extracted_data;
  if (ed && typeof ed === 'object') {
    if (ed.do_not_call === true || String(ed.do_not_call).toLowerCase() === 'yes') return 'do_not_call';
    for (const key of ['outcome', 'disposition', 'call_outcome', 'call_disposition', 'result']) {
      if (typeof ed[key] === 'string') {
        const slug = ed[key].trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (OUTCOME_SYNONYMS[slug]) return OUTCOME_SYNONYMS[slug];
      }
    }
  }
  switch (bolna?.status) {
    case 'busy': case 'no-answer': return 'no_answer';
    case 'failed': case 'error': case 'canceled': case 'stopped': case 'balance-low': return 'failed';
    case 'completed': case 'call-disconnected': return callDuration(bolna) > 0 ? 'connected' : 'no_answer';
    default: return null;
  }
}

// Which webhook event a Bolna status corresponds to (null = nothing to announce yet).
function eventForStatus(status) {
  switch (status) {
    case 'completed': case 'call-disconnected': return 'call.completed';
    case 'busy': case 'no-answer': return 'call.no_answer';
    case 'failed': case 'error': case 'canceled': case 'stopped': case 'balance-low': return 'call.failed';
    case 'initiated': case 'ringing': case 'in-progress': return 'call.initiated';
    default: return null;
  }
}

// Reject hosts that point at private/loopback space (used when validating webhook URLs).
function isPrivateAddress(ip) {
  if (!ip) return true;
  if (ip.includes(':')) {
    const l = ip.toLowerCase();
    return l === '::1' || l === '::' || l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe80') || l.startsWith('::ffff:127.') || l.startsWith('::ffff:10.') || l.startsWith('::ffff:192.168.');
  }
  const [a, b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

module.exports = {
  SCOPES, POLICY_TYPES, CONSENT_STATUSES, EVENT_TYPES, TERMINAL_STATUSES, MAX_ATTEMPTS,
  normalizePhone, extractPlaceholders, templateSyntaxError, renderTemplate,
  checkCalling, daysUntil, isValidIsoDate,
  signWebhook, verifyWebhook, backoffMs,
  signRecordingLink, verifyRecordingLink,
  callDuration, normalizeOutcome, eventForStatus, isPrivateAddress,
};
