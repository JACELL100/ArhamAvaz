export const LANGUAGE_LABELS = {
  Hindi: 'हिन्दी', Gujarati: 'ગુજરાતી', English: 'English', Hinglish: 'Hinglish', Marathi: 'मराठी', Tamil: 'தமிழ்',
  Telugu: 'తెలుగు', Kannada: 'ಕನ್ನಡ', Malayalam: 'മലയാളം', Bengali: 'বাংলা', Punjabi: 'ਪੰਜਾਬੀ', Odia: 'ଓଡ଼ିଆ',
}

const LIVE = ['queued', 'initiated', 'ringing', 'in-progress', 'call-disconnected', 'prepared']
const MISSED = ['busy', 'no-answer', 'canceled', 'failed', 'error', 'stopped', 'balance-low']

export function statusTone(status) {
  if (status === 'completed') return 'good'
  if (status === 'scheduled') return 'info'
  if (LIVE.includes(status)) return 'live'
  if (MISSED.includes(status)) return 'bad'
  return 'neutral'
}

export const isMissed = (c) => MISSED.includes(c.status)
export const isAnswered = (c) => c.status === 'completed' && c.conversation_duration > 0

const STATUS_LABELS = { new: 'New policy', renewal: 'Renewal', port: 'Rollover / Port', switching: 'Rollover / Port' }
export const TYPE_ICONS = { Health: '🩺', Life: '🛡️', Motor: '🚗' }

// Form answers sent as user_data come back under context_details.recipient_data
export function callInfo(c) {
  const d = c.context_details?.recipient_data || {}
  const name = d.customer_name && d.customer_name !== 'not specified' ? d.customer_name : null
  return {
    name,
    phone: c.user_number || c.telephony_data?.to_number || c.context_details?.recipient_phone_number,
    callType: d.call_type,
    language: d.language,
    // Calls placed before health/life were added only had vehicle fields
    insuranceType: d.insurance_type || (d.vehicle_type ? 'Motor' : null),
    details: d.customer_details || null,
    context: d.customer_context && d.customer_context !== 'none' ? d.customer_context : null,
    vehicleType: d.vehicle_type,
    vehicleModel: d.vehicle_model && d.vehicle_model !== 'not specified' ? d.vehicle_model : null,
    insuranceStatus: d.insurance_status,
    statusLabel: STATUS_LABELS[d.insurance_status] || null,
    recordingUrl: c.telephony_data?.recording_url,
    hangupReason: c.telephony_data?.hangup_reason,
  }
}

export function formatDuration(seconds) {
  const s = Math.round(seconds || 0)
  if (!s) return '—'
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

export function formatWhen(iso) {
  if (!iso) return ''
  const d = new Date(iso.endsWith('Z') || /[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`)
  const today = new Date()
  const sameDay = d.toDateString() === today.toDateString()
  return sameDay
    ? d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleString([], { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

// Accepts "98765 43210", "+91 98765-43210", etc. and returns E.164; a bare 10-digit number is treated as Indian.
export function toE164(input) {
  const digits = String(input || '').replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

export function isValidPhone(p) {
  return /^\+\d{10,15}$/.test(p)
}

export function formatPhone(p) {
  if (!p) return 'Unknown'
  const m = p.match(/^\+91(\d{5})(\d{5})$/)
  return m ? `+91 ${m[1]} ${m[2]}` : p
}

// Bolna transcripts are "assistant: ...\nuser: ..." lines
export function parseTranscript(text) {
  if (!text) return []
  const turns = []
  for (const line of text.split('\n')) {
    const m = line.match(/^\s*(assistant|user|agent|bot)\s*:\s*(.*)$/i)
    if (m) turns.push({ who: /user/i.test(m[1]) ? 'user' : 'agent', text: m[2] })
    else if (line.trim() && turns.length) turns[turns.length - 1].text += ` ${line.trim()}`
  }
  return turns
}
