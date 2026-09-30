// Compliance & data settings. The server is the source of truth; a copy is cached locally so the call
// screen can enforce calling hours and the DND list synchronously before dialing.
import { request } from './api'

const KEY = 'arhamavaz.compliance.v1'

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const TIMEZONES = [
  ['Asia/Kolkata', 'India (IST)'], ['Asia/Dubai', 'Dubai (GST)'], ['Asia/Singapore', 'Singapore (SGT)'],
  ['Europe/London', 'London'], ['America/New_York', 'New York'], ['America/Los_Angeles', 'Los Angeles'], ['UTC', 'UTC'],
]

export const DEFAULT_COMPLIANCE = {
  callingHours: { enabled: true, start: '09:00', end: '20:00', days: [1, 2, 3, 4, 5, 6], timezone: 'Asia/Kolkata' },
  dnd: { enabled: true, numbers: [] },
  numbers: [],
  retentionDays: 90,
  piiRedaction: true,
  rotationDays: 90,
}

export const getCompliance = () => request('/compliance').then((r) => { cache(r.compliance); return r.compliance })
export const saveCompliance = (c) => request('/compliance', { method: 'PUT', body: JSON.stringify(c) }).then((r) => { cache(r.compliance); return r.compliance })
export const listKeys = () => request('/keys')
export const createKey = (name) => request('/keys', { method: 'POST', body: JSON.stringify({ name }) })
export const revokeKey = (id) => request(`/keys/${id}`, { method: 'DELETE' })

function cache(c) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* private mode */ }
}

export function cachedCompliance() {
  try { return { ...DEFAULT_COMPLIANCE, ...JSON.parse(localStorage.getItem(KEY)) } } catch { return DEFAULT_COMPLIANCE }
}

// Returns a human-readable reason a call must not be placed, or null when it is allowed.
export function complianceBlock(phone, when = new Date(), c = cachedCompliance()) {
  if (c.dnd?.enabled && c.dnd.numbers.includes(phone)) return `${phone} is on your Do Not Disturb list.`
  const h = c.callingHours
  if (h?.enabled) {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: h.timezone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(when)
    const get = (t) => parts.find((p) => p.type === t)?.value
    const day = DAYS.indexOf(get('weekday'))
    const now = `${get('hour')}:${get('minute')}`
    if (!h.days.includes(day) || now < h.start || now >= h.end) {
      return `Outside your calling hours (${h.start}–${h.end}, ${h.days.map((d) => DAYS[d]).join(', ')}). Change this in Settings.`
    }
  }
  return null
}
