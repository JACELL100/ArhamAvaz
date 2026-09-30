import '../settings.css'
import '../compliance.css'
import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { DAYS, DEFAULT_COMPLIANCE, TIMEZONES, cachedCompliance, createKey, getCompliance, listKeys, revokeKey, saveCompliance } from '../compliance'
import { isValidPhone, toE164 } from '../format'
import { LogoutIcon } from '../components/icons'

const fmtDate = (ts) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const ageDays = (ts) => Math.floor((Date.now() - ts) / 86400000)

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={`toggle ${on ? 'on' : ''}`} onClick={() => onChange(!on)}>
      <span />
    </button>
  )
}

function Section({ title, hint, on, onToggle, toggleLabel, children }) {
  return (
    <section className="card">
      <div className="sec-head">
        <div>
          <h3 className="settings-title">{title}</h3>
          {hint && <p className="settings-hint" style={{ margin: '4px 0 0' }}>{hint}</p>}
        </div>
        {onToggle && <Toggle on={on} onChange={onToggle} label={toggleLabel || title} />}
      </div>
      {children}
    </section>
  )
}

// Numbers pasted or typed, split on commas/whitespace, normalised to E.164; invalid ones are reported back.
function parseNumbers(text) {
  const good = []
  const bad = []
  for (const raw of text.split(/[\s,;]+/).filter(Boolean)) {
    const n = toE164(raw)
    if (isValidPhone(n)) good.push(n)
    else bad.push(raw)
  }
  return { good, bad }
}

export default function SettingsPage({ company, onLogout }) {
  const [saved, setSaved] = useState(cachedCompliance)
  const [draft, setDraft] = useState(saved)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const [dndText, setDndText] = useState('')
  const [dndError, setDndError] = useState('')
  const [numLabel, setNumLabel] = useState('')
  const [numValue, setNumValue] = useState('')
  const [numError, setNumError] = useState('')

  const [keys, setKeys] = useState([])
  const [keyName, setKeyName] = useState('')
  const [fresh, setFresh] = useState(null) // { name, secret } shown once
  const [keyError, setKeyError] = useState('')

  useEffect(() => {
    getCompliance().then((c) => { setSaved(c); setDraft(c) }).catch((e) => setLoadError(e.message))
    listKeys().then((r) => setKeys(r.keys)).catch((e) => setKeyError(e.message))
  }, [])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(''), 2400)
    return () => clearTimeout(t)
  }, [note])

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const isDefault = JSON.stringify(draft) === JSON.stringify({ ...DEFAULT_COMPLIANCE, numbers: draft.numbers, dnd: { ...DEFAULT_COMPLIANCE.dnd, numbers: draft.dnd.numbers } })
  const patch = (key, value) => setDraft((d) => ({ ...d, [key]: value }))
  const patchHours = (value) => setDraft((d) => ({ ...d, callingHours: { ...d.callingHours, ...value } }))
  const h = draft.callingHours

  async function save() {
    setSaving(true)
    setLoadError('')
    try {
      const c = await saveCompliance(draft)
      setSaved(c)
      setDraft(c)
      setNote('Saved ✓')
    } catch (e) {
      setLoadError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function resetDefaults() {
    setDraft((d) => ({ ...DEFAULT_COMPLIANCE, numbers: d.numbers, dnd: { ...DEFAULT_COMPLIANCE.dnd, numbers: d.dnd.numbers } }))
  }

  function addDnd() {
    const { good, bad } = parseNumbers(dndText)
    setDndError(bad.length ? `Skipped ${bad.length} invalid: ${bad.slice(0, 3).join(', ')}${bad.length > 3 ? '…' : ''}` : '')
    if (!good.length) return
    setDraft((d) => ({ ...d, dnd: { ...d.dnd, numbers: [...new Set([...d.dnd.numbers, ...good])] } }))
    setDndText('')
  }

  function addNumber() {
    const n = toE164(numValue)
    if (!isValidPhone(n)) return setNumError('Enter a valid phone number, e.g. 98765 43210')
    if (draft.numbers.some((x) => x.number === n)) return setNumError('That number is already added.')
    setNumError('')
    patch('numbers', [...draft.numbers, { id: crypto.randomUUID(), label: numLabel.trim(), number: n }])
    setNumLabel('')
    setNumValue('')
  }

  async function makeKey() {
    setKeyError('')
    try {
      const r = await createKey(keyName)
      setKeys((k) => [r.key, ...k])
      setFresh({ name: r.key.name, secret: r.secret })
      setKeyName('')
    } catch (e) {
      setKeyError(e.message)
    }
  }

  async function removeKey(k) {
    if (!window.confirm(`Revoke "${k.name}"? Anything using it will stop working.`)) return
    try {
      await revokeKey(k.id)
      setKeys((list) => list.filter((x) => x.id !== k.id))
    } catch (e) {
      setKeyError(e.message)
    }
  }

  const stale = keys.filter((k) => ageDays(k.createdAt) >= draft.rotationDays)

  return (
    <div className="narrow settings">
      <PageHeader title="Settings" subtitle="Compliance and data controls for your workspace. Protections are on by default." />

      <section className="card acct">
        <span className="acct-avatar" aria-hidden="true">{(company.name || company.phone || '?').trim().charAt(0).toUpperCase()}</span>
        <div className="acct-info">
          <h3>{company.name}</h3>
          <p>{company.phone}</p>
          {company.workspaceName && <small>Workspace: {company.workspaceName}</small>}
        </div>
        <button type="button" className="logout" onClick={onLogout}><LogoutIcon /> Log out</button>
      </section>

      {loadError && <p className="error">{loadError}</p>}

      <Section title="Calling hours" hint="Calls outside this window are blocked, including scheduled ones." on={h.enabled} onToggle={(v) => patchHours({ enabled: v })}>
        <div className={h.enabled ? '' : 'muted-block'}>
          <div className="grid-2">
            <label className="field"><span>From</span><input type="time" value={h.start} onChange={(e) => patchHours({ start: e.target.value })} disabled={!h.enabled} /></label>
            <label className="field"><span>To</span><input type="time" value={h.end} onChange={(e) => patchHours({ end: e.target.value })} disabled={!h.enabled} /></label>
          </div>
          <div className="chips" role="group" aria-label="Days" style={{ marginTop: 14 }}>
            {DAYS.map((d, i) => (
              <button type="button" key={d} disabled={!h.enabled} className={`chip ${h.days.includes(i) ? 'active' : ''}`} aria-pressed={h.days.includes(i)}
                onClick={() => patchHours({ days: h.days.includes(i) ? h.days.filter((x) => x !== i) : [...h.days, i].sort() })}>{d}</button>
            ))}
          </div>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Timezone</span>
            <select value={h.timezone} onChange={(e) => patchHours({ timezone: e.target.value })} disabled={!h.enabled}>
              {TIMEZONES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
          </label>
          {h.enabled && h.end <= h.start && <p className="error" style={{ marginTop: 12 }}>End time must be after start time.</p>}
        </div>
      </Section>

      <Section title="Do Not Disturb" hint="Numbers on this list are never called." on={draft.dnd.enabled} onToggle={(v) => setDraft((d) => ({ ...d, dnd: { ...d.dnd, enabled: v } }))}>
        <div className="add-row">
          <textarea rows={2} placeholder="Paste numbers, separated by commas or new lines" value={dndText} onChange={(e) => setDndText(e.target.value)} aria-label="Numbers to add" />
          <button type="button" className="btn-secondary" onClick={addDnd} disabled={!dndText.trim()}>Add</button>
        </div>
        {dndError && <p className="settings-hint" style={{ color: 'var(--error)' }}>{dndError}</p>}
        {draft.dnd.numbers.length > 0 ? (
          <>
            <div className="tags">
              {draft.dnd.numbers.slice(0, 200).map((n) => (
                <span key={n} className="tag">{n}<button type="button" aria-label={`Remove ${n}`} onClick={() => setDraft((d) => ({ ...d, dnd: { ...d.dnd, numbers: d.dnd.numbers.filter((x) => x !== n) } }))}>×</button></span>
              ))}
            </div>
            <p className="settings-hint">{draft.dnd.numbers.length} number{draft.dnd.numbers.length === 1 ? '' : 's'} blocked{draft.dnd.numbers.length > 200 ? ' (showing first 200)' : ''}.</p>
          </>
        ) : <p className="settings-hint">No numbers blocked yet.</p>}
      </Section>

      <Section title="Phone numbers" hint="Numbers your workspace calls from.">
        <div className="add-row">
          <input placeholder="Label (e.g. Sales line)" value={numLabel} onChange={(e) => setNumLabel(e.target.value)} aria-label="Label" />
          <input type="tel" inputMode="tel" placeholder="98765 43210" value={numValue} onChange={(e) => setNumValue(e.target.value)} aria-label="Phone number" />
          <button type="button" className="btn-secondary" onClick={addNumber} disabled={!numValue.trim()}>Add</button>
        </div>
        {numError && <p className="settings-hint" style={{ color: 'var(--error)' }}>{numError}</p>}
        {draft.numbers.length > 0 ? (
          <ul className="rows">
            {draft.numbers.map((n) => (
              <li key={n.id}><div><b>{n.label || 'Unlabelled'}</b><small>{n.number}</small></div>
                <button type="button" className="link-btn" onClick={() => patch('numbers', draft.numbers.filter((x) => x.id !== n.id))}>Remove</button></li>
            ))}
          </ul>
        ) : <p className="settings-hint">No numbers added yet.</p>}
      </Section>

      <Section title="Data & privacy" hint="Control how long call data is kept and what is stored.">
        <div className="row-between">
          <div><b>Redact personal information</b><small>Mask phone numbers, emails and card numbers in transcripts.</small></div>
          <Toggle on={draft.piiRedaction} onChange={(v) => patch('piiRedaction', v)} label="PII redaction" />
        </div>
        <label className="field">
          <span>Data retention (days)</span>
          <input type="number" min={1} max={3650} value={draft.retentionDays} onChange={(e) => patch('retentionDays', Math.max(1, Math.min(3650, Number(e.target.value) || 1)))} />
        </label>
        <p className="settings-hint">Recordings and transcripts older than this are deleted.</p>
      </Section>

      <Section title="API keys" hint="Use keys to connect your own systems. A key is shown once when created.">
        {stale.length > 0 && (
          <p className="warn">🔔 {stale.length} key{stale.length === 1 ? ' is' : 's are'} older than {draft.rotationDays} days. Create a new key, switch over, then revoke the old one.</p>
        )}
        {fresh && (
          <div className="fresh">
            <b>New key “{fresh.name}”. Copy it now, you won't see it again.</b>
            <code>{fresh.secret}</code>
            <div><button type="button" className="btn-secondary" onClick={() => navigator.clipboard?.writeText(fresh.secret)}>Copy</button>
              <button type="button" className="link-btn" onClick={() => setFresh(null)} style={{ marginLeft: 12 }}>Done</button></div>
          </div>
        )}
        <div className="add-row">
          <input placeholder="Key name (e.g. CRM sync)" value={keyName} onChange={(e) => setKeyName(e.target.value)} aria-label="Key name" />
          <button type="button" className="btn-secondary" onClick={makeKey}>Create key</button>
        </div>
        {keyError && <p className="settings-hint" style={{ color: 'var(--error)' }}>{keyError}</p>}
        {keys.length > 0 ? (
          <ul className="rows">
            {keys.map((k) => {
              const old = ageDays(k.createdAt) >= draft.rotationDays
              return (
                <li key={k.id}>
                  <div><b>{k.name} {old && <em className="badge">Rotate</em>}</b><small>{k.prefix}… · created {fmtDate(k.createdAt)}</small></div>
                  <button type="button" className="link-btn" onClick={() => removeKey(k)}>Revoke</button>
                </li>
              )
            })}
          </ul>
        ) : <p className="settings-hint">No API keys yet.</p>}
        <label className="field">
          <span>Remind me to rotate keys every</span>
          <select value={draft.rotationDays} onChange={(e) => patch('rotationDays', Number(e.target.value))}>
            {[30, 60, 90, 180, 365].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      </Section>

      <div className="settings-bar">
        <span className={`saved-note ${note ? 'show' : ''}`}>{note}</span>
        {dirty && !note && <span className="unsaved-note">Unsaved changes</span>}
        <button type="button" className="btn-secondary" onClick={resetDefaults} disabled={isDefault}>Reset to defaults</button>
        <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving || (h.enabled && h.end <= h.start) || (h.enabled && h.days.length === 0)}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
