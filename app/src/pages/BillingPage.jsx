import '../billing.css'
import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { RefreshIcon } from '../components/icons'
import { CURRENCIES, GATEWAYS, billingConfigured, detectCountry, fetchWallet, gatewayForCountry, guessCountry, minutesFor, money, pay, rateFor, taxFor, totalFor } from '../billing'

const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

export default function BillingPage({ settings }) {
  const [wallet, setWallet] = useState(null)
  const [walletError, setWalletError] = useState('')
  const [loading, setLoading] = useState(false)
  const [country, setCountry] = useState(guessCountry)
  const [picked, setPicked] = useState(null)
  const [custom, setCustom] = useState('')
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => (new URLSearchParams(window.location.search).get('paid') ? 'Payment received — your balance will update in a moment.' : ''))

  const configured = billingConfigured()
  const gateway = gatewayForCountry(country)
  const gw = GATEWAYS.find((g) => g.id === gateway)
  const cur = CURRENCIES[gw.currency]
  // A pick made under the other currency's tiers no longer exists, so fall back to the default tier.
  const selected = picked === 'custom' || cur.topUps.some((t) => t.id === picked) ? picked : cur.defaultTopUp
  const isCustom = selected === 'custom'
  const amount = isCustom ? Number(custom) || 0 : cur.topUps.find((t) => t.id === selected).amount
  const validAmount = amount >= cur.min && amount <= cur.max
  const tax = taxFor(amount, cur.code)
  const total = totalFor(amount, cur.code)
  const balance = (cur.code === 'USD' ? wallet?.balanceUsd : wallet?.balance) ?? 0
  const txns = (wallet?.transactions || []).filter((t) => (t.currency || 'INR') === cur.code)

  useEffect(() => {
    let live = true
    detectCountry().then((c) => { if (live && c) setCountry(c) })
    return () => { live = false }
  }, [])

  const refresh = useCallback(async () => {
    if (!configured) return
    setLoading(true)
    setWalletError('')
    try { setWallet(await fetchWallet()) }
    catch (e) { setWalletError(e.message) }
    finally { setLoading(false) }
  }, [configured])

  useEffect(() => { refresh() }, [refresh])

  async function handlePay() {
    setError('')
    setNotice('')
    setPaying(true)
    try {
      await pay(gateway, amount, { companyName: settings.companyName, onDone: refresh })
      setNotice('Payment successful — wallet topped up.')
    } catch (e) {
      setError(e.message)
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="billing">
      <PageHeader title="Billing" subtitle="Top up your wallet and pay per minute. Bigger top-ups get cheaper minutes." />

      <section className="card wallet-hero">
        <div>
          <span className="wallet-label">Wallet balance ({cur.code})</span>
          <strong className="wallet-balance">{money(balance, cur.code)}</strong>
          <small>{wallet ? `≈ ${minutesFor(balance, cur.code).toLocaleString('en-IN')} minutes at your current rate` : 'Top up to start calling'}</small>
        </div>
        <button type="button" className="icon-btn" onClick={refresh} disabled={!configured || loading} aria-label="Refresh balance">
          <RefreshIcon />
        </button>
      </section>

      {!configured && (
        <p className="setup-banner">
          Payments are not connected yet. Once the Razorpay and Dodo keys are added and the billing functions are deployed, checkout goes live here.
        </p>
      )}
      {walletError && <p className="error">{walletError}</p>}

      <div className="billing-grid">
        <div className="billing-main">
          <section className="card">
            <div className="region-badge">
              <div>
                <b>{gw.label}</b>
                <small>{gw.hint}</small>
              </div>
              <span className="pill tone-good">{country === 'IN' ? 'India' : 'International'}</span>
            </div>

            <h3 className="settings-title">Add money</h3>
            <div className="topup-grid" role="radiogroup" aria-label="Top-up amount">
              {cur.topUps.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === t.id}
                  className={`topup ${selected === t.id ? 'active' : ''}`}
                  onClick={() => setPicked(t.id)}
                >
                  {t.popular && <em>Popular</em>}
                  <span>{t.label}</span>
                  <strong>{money(t.amount, cur.code)}</strong>
                  <small>{money(t.rate, cur.code)}/min · {minutesFor(t.amount, cur.code).toLocaleString('en-IN')} min</small>
                </button>
              ))}
            </div>

            <button type="button" className={`custom-toggle ${isCustom ? 'active' : ''}`} onClick={() => setPicked('custom')}>
              Enter a custom amount
            </button>
            {isCustom && (
              <label className="field">
                <span>Amount ({cur.symbol}{cur.taxNote ? `, ex-${cur.taxNote.split(' ')[0]}` : ''})</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={cur.min}
                  max={cur.max}
                  placeholder={`${cur.min.toLocaleString('en-IN')} – ${cur.max.toLocaleString('en-IN')}`}
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                />
              </label>
            )}

            <dl className="summary">
              <div><dt>Top-up</dt><dd>{money(amount, cur.code)}</dd></div>
              <div>
                <dt>{cur.taxNote || 'Tax'}</dt>
                <dd>{cur.taxNote ? money(tax, cur.code) : 'Calculated at checkout'}</dd>
              </div>
              <div><dt>Rate</dt><dd>{validAmount ? `${money(rateFor(amount, cur.code), cur.code)}/min` : '—'}</dd></div>
              <div className="total">
                <dt>{cur.taxNote ? 'Total payable' : 'Total (before tax)'}</dt>
                <dd>{money(total, cur.code)}</dd>
              </div>
            </dl>

            {error && <p className="error">{error}</p>}
            {notice && <p className="notice">{notice}</p>}
            <button type="button" className="cta" onClick={handlePay} disabled={!validAmount || paying}>
              {paying ? <span className="spinner" /> : `Pay ${validAmount ? money(total, cur.code) : ''}`}
            </button>
            {!validAmount && isCustom && custom !== '' && (
              <p className="settings-hint">Enter an amount between {money(cur.min, cur.code)} and {money(cur.max, cur.code)}.</p>
            )}
          </section>

          <section className="card">
            <h3 className="settings-title">Transactions ({cur.code})</h3>
            {txns.length ? (
              <ul className="txns">
                {txns.map((t) => (
                  <li key={t.id}>
                    <div>
                      <b>{t.description || 'Wallet top-up'}</b>
                      <small>{fmtDate(t.createdAt)} · {t.gateway}</small>
                    </div>
                    <div className="txn-amount">
                      <b className={t.amount >= 0 ? 'credit' : 'debit'}>{t.amount >= 0 ? '+' : ''}{money(t.amount, cur.code)}</b>
                      <span className={`pill ${t.status === 'paid' ? 'tone-good' : 'tone-info'}`}>{t.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="settings-hint">No transactions yet.</p>
            )}
          </section>
        </div>

        <aside className="billing-side">
          <section className="card panel">
            <h3>Rate card ({cur.code})</h3>
            <ul className="rate-list">
              {cur.engines.map((r) => (
                <li key={r.id}>
                  <div><b>{r.label}</b><small>{r.note}</small></div>
                  <strong>{r.value}</strong>
                </li>
              ))}
            </ul>
          </section>
          <section className="card panel">
            <h3>Phone numbers</h3>
            <ul className="rate-list">
              {cur.numbers.map((r) => (
                <li key={r.id}>
                  <div><b>{r.label}</b><small>{r.note}</small></div>
                  <strong>{money(r.price, cur.code)}</strong>
                </li>
              ))}
            </ul>
            <small className="settings-hint">{cur.taxNote ? `All prices exclude ${cur.taxNote.split(' ')[0]}.` : 'Prices exclude tax, which Dodo adds at checkout.'}</small>
          </section>
        </aside>
      </div>
    </div>
  )
}
