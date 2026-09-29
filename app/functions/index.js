import { createHmac, timingSafeEqual } from 'node:crypto'
import { initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { onRequest } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore()

// Per-currency limits; keep in sync with src/billing.js. Razorpay wallets are INR, Dodo wallets are USD.
const LIMITS = { INR: { min: 1000, max: 1000000 }, USD: { min: 50, max: 10000 } }
// The app has no login yet, so there is a single shared wallet. Swap for a per-user id once auth lands.
const WALLET = db.collection('wallets').doc('main')

const env = (k) => process.env[k] || ''
const gstRate = () => Number(env('GST_RATE') || 0.18)
const balanceField = (currency) => (currency === 'USD' ? 'balanceUsd' : 'balance')
const safeEqual = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}
const hmac = (secret, data, enc = 'hex') => createHmac('sha256', secret).update(data).digest(enc)

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

function parseAmount(body, currency) {
  const { min, max } = LIMITS[currency]
  const amount = Number(body?.amount)
  if (!Number.isFinite(amount) || amount < min || amount > max) {
    throw new HttpError(400, `Amount must be between ${min} and ${max} ${currency}`)
  }
  return Math.round(amount)
}

// Credit the wallet exactly once per payment; both the client verify call and the webhook can arrive for the same payment.
async function creditWallet({ paymentId, gateway, amount, currency, description }) {
  const txnRef = WALLET.collection('transactions').doc(`${gateway}_${paymentId}`)
  await db.runTransaction(async (t) => {
    if ((await t.get(txnRef)).exists) return
    t.set(WALLET, { [balanceField(currency)]: FieldValue.increment(amount), updatedAt: Date.now() }, { merge: true })
    t.set(txnRef, { amount, currency, gateway, description, status: 'paid', createdAt: Date.now() })
  })
}

// ---------- Razorpay ----------
const rzpAuth = () => 'Basic ' + Buffer.from(`${env('RAZORPAY_KEY_ID')}:${env('RAZORPAY_KEY_SECRET')}`).toString('base64')

async function razorpayOrder(body) {
  if (!env('RAZORPAY_KEY_ID')) throw new HttpError(503, 'Razorpay is not configured')
  const amount = parseAmount(body, 'INR')
  const total = Math.round(amount * (1 + gstRate()) * 100) // paise, GST included
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: rzpAuth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: total, currency: 'INR', notes: { baseAmount: String(amount) } }),
  })
  const order = await res.json()
  if (!res.ok) throw new HttpError(502, order.error?.description || 'Razorpay order failed')
  await db.collection('orders').doc(order.id).set({ gateway: 'razorpay', amount, createdAt: Date.now() })
  return { keyId: env('RAZORPAY_KEY_ID'), orderId: order.id, amount: order.amount, currency: order.currency }
}

async function razorpayVerify(body) {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = body || {}
  if (!orderId || !paymentId || !signature) throw new HttpError(400, 'Missing payment fields')
  if (!safeEqual(hmac(env('RAZORPAY_KEY_SECRET'), `${orderId}|${paymentId}`), signature)) throw new HttpError(400, 'Invalid signature')
  const order = await db.collection('orders').doc(orderId).get()
  if (!order.exists) throw new HttpError(404, 'Unknown order')
  await creditWallet({ paymentId, gateway: 'razorpay', amount: order.data().amount, currency: 'INR', description: 'Wallet top-up' })
  return { ok: true }
}

async function razorpayWebhook(req) {
  const signature = req.get('x-razorpay-signature') || ''
  if (!env('RAZORPAY_WEBHOOK_SECRET') || !safeEqual(hmac(env('RAZORPAY_WEBHOOK_SECRET'), req.rawBody), signature)) {
    throw new HttpError(400, 'Invalid signature')
  }
  const payment = req.body?.payload?.payment?.entity
  if (req.body?.event === 'payment.captured' && payment) {
    const order = await db.collection('orders').doc(payment.order_id).get()
    if (order.exists) await creditWallet({ paymentId: payment.id, gateway: 'razorpay', amount: order.data().amount, currency: 'INR', description: 'Wallet top-up' })
  }
  return { ok: true }
}

// ---------- Dodo Payments ----------
// Dodo is merchant of record: it adds tax itself at checkout, so we charge the plain USD top-up (no GST) and credit exactly that.
async function dodoCheckout(body) {
  if (!env('DODO_API_KEY') || !env('DODO_PRODUCT_ID')) throw new HttpError(503, 'Dodo Payments is not configured')
  const amount = parseAmount(body, 'USD')
  const res = await fetch(`${env('DODO_API_URL') || 'https://test.dodopayments.com'}/checkouts`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env('DODO_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_cart: [{ product_id: env('DODO_PRODUCT_ID'), quantity: 1, amount: amount * 100 }], // cents
      return_url: body?.returnUrl,
      metadata: { baseAmount: String(amount), currency: 'USD' },
    }),
  })
  const session = await res.json()
  if (!res.ok || !session.checkout_url) throw new HttpError(502, session.message || 'Dodo checkout failed')
  return { checkoutUrl: session.checkout_url }
}

// Dodo signs webhooks with the Standard Webhooks scheme: HMAC-SHA256 over "id.timestamp.body", key = base64 part of "whsec_…".
async function dodoWebhook(req) {
  const id = req.get('webhook-id'), ts = req.get('webhook-timestamp'), sigHeader = req.get('webhook-signature') || ''
  const secret = env('DODO_WEBHOOK_SECRET')
  if (!secret || !id || !ts) throw new HttpError(400, 'Invalid webhook')
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) throw new HttpError(400, 'Stale webhook')
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${req.rawBody}`).digest('base64')
  const valid = sigHeader.split(' ').some((s) => safeEqual(s.replace(/^v1,/, ''), expected))
  if (!valid) throw new HttpError(400, 'Invalid signature')

  const { type, data } = req.body || {}
  const base = Number(data?.metadata?.baseAmount)
  if (type === 'payment.succeeded' && data?.payment_id && base >= LIMITS.USD.min && base <= LIMITS.USD.max) {
    await creditWallet({ paymentId: data.payment_id, gateway: 'dodo', amount: base, currency: 'USD', description: 'Wallet top-up' })
  }
  return { ok: true }
}

// ---------- Wallet ----------
async function getWallet() {
  const [wallet, txns] = await Promise.all([
    WALLET.get(),
    WALLET.collection('transactions').orderBy('createdAt', 'desc').limit(25).get(),
  ])
  return {
    balance: wallet.data()?.balance || 0,
    balanceUsd: wallet.data()?.balanceUsd || 0,
    transactions: txns.docs.map((d) => ({ id: d.id, ...d.data() })),
  }
}

const ROUTES = {
  'GET /wallet': getWallet,
  'POST /razorpay/order': (req) => razorpayOrder(req.body),
  'POST /razorpay/verify': (req) => razorpayVerify(req.body),
  'POST /razorpay/webhook': razorpayWebhook,
  'POST /dodo/checkout': (req) => dodoCheckout(req.body),
  'POST /dodo/webhook': dodoWebhook,
}

// One function behind Hosting rewrite /api/** → billing. Webhook URLs to register:
//   https://<your-site>/api/razorpay/webhook   and   https://<your-site>/api/dodo/webhook
export const billing = onRequest({ cors: true, region: 'asia-south1' }, async (req, res) => {
  const handler = ROUTES[`${req.method} ${req.path.replace(/^\/api/, '')}`]
  if (!handler) return void res.status(404).json({ error: 'Not found' })
  try {
    res.json(await handler(req))
  } catch (e) {
    if (!(e instanceof HttpError)) console.error(e)
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Internal error' })
  }
})
