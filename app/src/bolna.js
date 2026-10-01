import { complianceBlock } from './compliance'
import { request } from './api'

export function startCall({ language, phone, userData, scheduledAt, myAgentId }) {
  const blocked = complianceBlock(phone, scheduledAt ? new Date(scheduledAt) : new Date())
  if (blocked) return Promise.reject(new Error(blocked))
  return request('/calls/start', {
    method: 'POST',
    body: JSON.stringify({
      language,
      phone,
      userData,
      scheduledAt,
      myAgentId
    }),
  })
}

export function getExecution(executionId) {
  return request(`/calls/${executionId}`)
}

export async function listCalls() {
  const calls = await request('/calls')
  return calls || []
}
