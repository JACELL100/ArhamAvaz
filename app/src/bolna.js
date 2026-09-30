import { complianceBlock } from './compliance'
import { Capacitor } from '@capacitor/core'

const API_KEY = import.meta.env.VITE_BOLNA_API_KEY
const FROM_NUMBER = import.meta.env.VITE_BOLNA_FROM_NUMBER
const BASE = 'https://api.bolna.ai'

const MAIN_AGENT = import.meta.env.VITE_BOLNA_AGENT_ID
const AGENTS = {
  hi: MAIN_AGENT,
  en: '59d31f62-453d-4dfb-bdfc-efe7b4fd50fa', 
  hinglish: MAIN_AGENT,
  gu: import.meta.env.VITE_BOLNA_AGENT_ID_GU || '7697ce86-aba1-4ce9-85de-b082599dde49',
  mr: 'e2e08606-ef27-45f1-b8a9-93d58020fd0d',
  ta: '1259a5fc-7706-40ba-933c-0f63beb99531',
  te: 'cd9cfd4e-bf82-449c-85da-8b64127d43d9',
  kn: '25bbefac-6539-4fc7-a949-6651ae91f5cb',
  ml: 'b8d95b1b-b4e8-4f52-906c-2ec733a589ec',
  bn: '407ab6f4-2399-48ec-b56e-46f4c8e2800f',
  pa: '8735b059-49be-4c27-b0be-031a082d3c22',
  od: '8abf1d2e-ed3b-4931-b209-9644bb8babb6',
}

let hasAuthError = false

async function request(path, options = {}) {
  if (!API_KEY || hasAuthError) {
    return {}
  }
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    })
    if (res.status === 401 || res.status === 403) {
      hasAuthError = true
      return {}
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const detail = data.message || data.detail || data.error
      throw new Error(typeof detail === 'string' ? detail : `Request failed (${res.status})`)
    }
    return data
  } catch (err) {
    if (hasAuthError) return {}
    throw err
  }
}

export function startCall({ language, phone, userData, scheduledAt }) {
  const blocked = complianceBlock(phone, scheduledAt ? new Date(scheduledAt) : new Date())
  if (blocked) return Promise.reject(new Error(blocked))
  return request('/call', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: AGENTS[language] || AGENTS.en,
      recipient_phone_number: phone,
      user_data: userData,
      ...(FROM_NUMBER && { from_phone_number: FROM_NUMBER }),
      ...(scheduledAt && { scheduled_at: scheduledAt }),
    }),
  })
}

export function getExecution(executionId) {
  return request(`/executions/${executionId}`)
}

export async function listCalls() {
  if (!API_KEY || hasAuthError) return []
  const ids = [...new Set(Object.values(AGENTS).filter(Boolean))]
  const pages = await Promise.all(ids.map((id) => request(`/v2/agent/${id}/executions?page_number=1&page_size=100`).catch(() => ({}))))
  return pages.flatMap((p) => p.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
