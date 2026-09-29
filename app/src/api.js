const BASE = 'http://localhost:3000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('arhamavaz_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function signup(name, email, password) {
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });
}

export function login(email, password) {
  return request('/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return request('/me');
}

export function getAgents() {
  return request('/agents');
}

export function createAgent(agentData) {
  return request('/agents', {
    method: 'POST',
    body: JSON.stringify(agentData),
  });
}

export function deleteAgent(id) {
  return request(`/agents/${id}`, { method: 'DELETE' });
}

export function verifyEmail(code) {
  return request('/verify-email', { method: 'POST', body: JSON.stringify({ code }) });
}

export function resendOtp() {
  return request('/resend-otp', { method: 'POST' });
}

export function saveBusiness(data) {
  return request('/onboarding/business', { method: 'POST', body: JSON.stringify(data) });
}

export function checkSlug(slug) {
  return request(`/workspace/slug-available?slug=${encodeURIComponent(slug)}`);
}

export function saveWorkspace(data) {
  return request('/onboarding/workspace', { method: 'POST', body: JSON.stringify(data) });
}
