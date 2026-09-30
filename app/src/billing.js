// Billing config + gateway client. Prices are placeholders from the pricing plan (ex-GST) — edit here to change them.
// Server side lives in /functions. Set VITE_BILLING_API to the deployed functions base URL (see .env.example).
const API = (import.meta.env.VITE_BILLING_API || '').replace(/\/$/, '')

export const GST_RATE = 0.18

// Each gateway bills in one currency. Razorpay = INR (GST added), Dodo = USD (Dodo is merchant of record, so it adds tax at checkout).
// Top-up size → all-in per-minute rate (ex-tax). Bigger top-ups get cheaper minutes.
export const CURRENCIES = {
  INR: {
    code: 'INR', symbol: '₹', gateway: 'razorpay', taxNote: `GST (${GST_RATE * 100}%)`, min: 1000, max: 1000000, defaultTopUp: 't25k',
    topUps: [
      { id: 't5k', amount: 5000, rate: 12, label: 'Starter' },
      { id: 't25k', amount: 25000, rate: 10.5, label: 'Growth', popular: true },
      { id: 't100k', amount: 100000, rate: 9.5, label: 'Business' },
      { id: 't500k', amount: 500000, rate: 8.5, label: 'Scale' },
    ],
    numbers: [
      { id: 'local', label: 'New local number', price: 299, note: 'per month · one-time setup ₹0–299' },
      { id: 'tollfree', label: 'Toll-free number', price: 499, note: 'per month' },
      { id: 'byon', label: 'Bring your own number', price: 149, note: 'per month · no telephony charge' },
    ],
    engines: [
      { id: 'managed', label: 'Managed AI engine', value: '₹8.5–12 / min', note: 'AI + telephony included' },
      { id: 'byoe', label: 'Bring your own engine', value: '₹2 / min', note: 'Platform fee only' },
    ],
  },
  USD: {
    code: 'USD', symbol: '$', gateway: 'dodo', taxNote: null, min: 50, max: 10000, defaultTopUp: 'u250',
    topUps: [
      { id: 'u50', amount: 50, rate: 0.13, label: 'Starter' },
      { id: 'u250', amount: 250, rate: 0.115, label: 'Growth', popular: true },
      { id: 'u1000', amount: 1000, rate: 0.105, label: 'Business' },
      { id: 'u5000', amount: 5000, rate: 0.095, label: 'Scale' },
    ],
    numbers: [
      { id: 'local', label: 'New local number', price: 4, note: 'per month · one-time setup $0–4' },
      { id: 'tollfree', label: 'Toll-free number', price: 6, note: 'per month' },
      { id: 'byon', label: 'Bring your own number', price: 2, note: 'per month · no telephony charge' },
    ],
    engines: [
      { id: 'managed', label: 'Managed AI engine', value: '$0.095–0.13 / min', note: 'AI + telephony included' },
      { id: 'byoe', label: 'Bring your own engine', value: '$0.025 / min', note: 'Platform fee only' },
    ],
  },
}

export const GATEWAYS = [
  { id: 'razorpay', label: 'Razorpay', hint: 'UPI, cards, netbanking · INR', currency: 'INR' },
  { id: 'dodo', label: 'Dodo Payments', hint: 'International cards · USD', currency: 'USD' },
]

// ---------- Location → gateway ----------
// Razorpay is India-only; everyone else pays through Dodo. Country comes from the device timezone at once (no flash),
// then the IP lookup takes over as the authority and is cached. `?country=US` overrides it for testing.
const COUNTRY_KEY = 'billing.country'
const INDIA_ZONES = ['Asia/Kolkata', 'Asia/Calcutta']

export function guessCountry() {
  try {
    const forced = new URLSearchParams(window.location.search).get('country')
    if (forced) return forced.toUpperCase()
    const cached = localStorage.getItem(COUNTRY_KEY)
    if (cached) return cached
  } catch { /* storage or URL unavailable */ }
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  return INDIA_ZONES.includes(zone) ? 'IN' : 'XX'
}

async function lookup(url, pick) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    return pick(await res.json())
  } finally {
    clearTimeout(timer)
  }
}

export async function detectCountry() {
  try { if (new URLSearchParams(window.location.search).get('country')) return null } catch { /* ignore */ }
  const code =
    (await lookup('https://api.country.is/', (j) => j.country).catch(() => null)) ||
    (await lookup('https://ipapi.co/json/', (j) => j.country_code).catch(() => null))
  if (!code) return null
  try { localStorage.setItem(COUNTRY_KEY, code) } catch { /* ignore */ }
  return code
}

export const gatewayForCountry = (country) => (country === 'IN' ? 'razorpay' : 'dodo')

export const money = (n, code = 'INR') =>
  code === 'USD'
    ? '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
    : '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })

// INR pays GST on top; USD is charged as-is and Dodo adds tax at checkout.
export const taxFor = (amount, code) => (code === 'INR' ? Math.round(amount * GST_RATE * 100) / 100 : 0)
export const totalFor = (amount, code) => Math.round((amount + taxFor(amount, code)) * 100) / 100

// Rate for a given amount: custom amounts use the highest tier they reach.
export function rateFor(amount, code) {
  const { topUps } = CURRENCIES[code]
  const tier = [...topUps].reverse().find((t) => amount >= t.amount)
  return (tier || topUps[0]).rate
}
export const minutesFor = (amount, code) => Math.floor(amount / rateFor(amount, code))

export const billingConfigured = () => Boolean(API)

async function api(path, options) {
  if (!API) throw new Error('Payments are not configured yet. Set VITE_BILLING_API and deploy the billing functions.')
  const res = await fetch(API + path, { headers: { 'Content-Type': 'application/json' }, ...options })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`)
  return body
}

export const fetchWallet = () => api('/wallet')

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = resolve
    s.onerror = () => reject(new Error('Could not load Razorpay checkout'))
    document.body.appendChild(s)
  })
}

// Razorpay: server creates the order, checkout collects payment, server verifies the signature and credits the wallet.
async function payWithRazorpay(amount, { companyName, onDone }) {
  const [order] = await Promise.all([api('/razorpay/order', { method: 'POST', body: JSON.stringify({ amount }) }), loadRazorpay()])
  await new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: companyName || 'ArhamAawaaz',
      description: 'Wallet top-up',
      theme: { color: '#4c9a1f' },
      handler: async (response) => {
        try {
          await api('/razorpay/verify', { method: 'POST', body: JSON.stringify(response) })
          onDone?.()
          resolve()
        } catch (e) { reject(e) }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')))
    rzp.open()
  })
}

// Dodo Payments: server creates a hosted checkout session; we redirect and Dodo's webhook credits the wallet.
async function payWithDodo(amount) {
  const { checkoutUrl } = await api('/dodo/checkout', {
    method: 'POST',
    body: JSON.stringify({ amount, returnUrl: `${window.location.origin}/?tab=billing&paid=1` }),
  })
  window.location.assign(checkoutUrl)
  await new Promise(() => {}) // navigating away
}

export function pay(gateway, amount, opts) {
  return gateway === 'dodo' ? payWithDodo(amount) : payWithRazorpay(amount, opts)
}
