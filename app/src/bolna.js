import { Capacitor } from '@capacitor/core'

const API_KEY = import.meta.env.VITE_BOLNA_API_KEY
const FROM_NUMBER = import.meta.env.VITE_BOLNA_FROM_NUMBER
const BASE = Capacitor.isNativePlatform() ? 'https://api.bolna.ai' : '/bolna'

// Hindi/English/Hinglish share one agent (ElevenLabs voice + Deepgram); Gujarati needs its own Sarvam-based agent.
const AGENTS = {
  hi: import.meta.env.VITE_BOLNA_AGENT_ID,
  en: import.meta.env.VITE_BOLNA_AGENT_ID,
  hinglish: import.meta.env.VITE_BOLNA_AGENT_ID,
  gu: import.meta.env.VITE_BOLNA_AGENT_ID_GU || import.meta.env.VITE_BOLNA_AGENT_ID,
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.message || data.detail || data.error
    throw new Error(typeof detail === 'string' ? detail : `Request failed (${res.status})`)
  }
  return data
}

export function startCall({ phone, language, userData, scheduledAt }) {
  return request('/call', {
    method: 'POST',
    body: JSON.stringify({
      agent_id: AGENTS[language],
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

// All calls across every agent the app uses, newest first
export async function listCalls() {
  const ids = [...new Set(Object.values(AGENTS))]
  const pages = await Promise.all(ids.map((id) => request(`/v2/agent/${id}/executions?page_number=1&page_size=100`)))
  return pages.flatMap((p) => p.data || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}
