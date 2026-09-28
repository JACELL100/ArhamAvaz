import { useRef, useState } from 'react'
import { startCall } from '../bolna'
import { parseContactsFile } from '../contactsFile'
import { isValidPhone, toE164 } from '../format'
import { buildUserData, INSURANCE_TYPES, LANGUAGES, MEMBERS, SCRIPT_TYPES, VEHICLES } from '../settings'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import Chips from '../components/Chips'
import { UploadIcon, XIcon } from '../components/icons'

const WHEN = [
  { id: 'now', label: 'Call now' },
  { id: 'later', label: 'Schedule' },
]

const STATUS_LABEL = { pending: 'Pending', calling: 'Calling…', queued: 'Queued', scheduled: 'Scheduled', error: 'Failed' }
const STATUS_TONE = { queued: 'good', scheduled: 'info', calling: 'live', error: 'bad' }

let nextId = 1

function localInputValue(minutesAhead) {
  const d = new Date(Date.now() + minutesAhead * 60000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export default function BulkCallPage({ settings, onCallPlaced }) {
  const [insuranceType, setInsuranceType] = useState('health')
  const [language, setLanguage] = useState('hi')
  const [members, setMembers] = useState('family')
  const [age, setAge] = useState('')
  const [cover, setCover] = useState('')
  const [vehicleType, setVehicleType] = useState('car')
  const [vehicleModel, setVehicleModel] = useState('')
  const [insuranceStatus, setInsuranceStatus] = useState('new')
  const [when, setWhen] = useState('now')
  const [scheduledFor, setScheduledFor] = useState(() => localInputValue(60))
  const [spacing, setSpacing] = useState(3)

  const [fileName, setFileName] = useState('')
  const [contacts, setContacts] = useState([])
  const [parseError, setParseError] = useState('')
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')

  const [running, setRunning] = useState(false)
  const [cursor, setCursor] = useState(0)
  const [total, setTotal] = useState(0)
  const stopRef = useRef(false)
  const fileRef = useRef(null)

  const valid = contacts.filter((c) => c.valid)
  const done = contacts.filter((c) => c.status === 'queued' || c.status === 'scheduled')
  const failed = contacts.filter((c) => c.status === 'error')
  const busy = running

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setParseError('')
    setFileName(file.name)
    try {
      const parsed = await parseContactsFile(file)
      if (parsed.length === 0) {
        setParseError('No contacts found in that file. Make sure it has a phone number column, or one number per line.')
        setContacts([])
        return
      }
      setContacts(parsed.map((c) => ({ id: nextId++, status: 'pending', error: null, ...c })))
    } catch (err) {
      setParseError(err.message)
      setContacts([])
    }
  }

  function updateContact(id, patch) {
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function removeContact(id) {
    setContacts((cs) => cs.filter((c) => c.id !== id))
  }

  function addManual(e) {
    e.preventDefault()
    const phone = toE164(manualPhone)
    setContacts((cs) => [
      ...cs,
      { id: nextId++, name: manualName.trim(), phone, rawPhone: manualPhone.trim(), language: undefined, valid: isValidPhone(phone), status: 'pending', error: null },
    ])
    setManualName('')
    setManualPhone('')
  }

  function clearAll() {
    setContacts([])
    setFileName('')
    setParseError('')
  }

  async function startCampaign() {
    setRunning(true)
    stopRef.current = false
    const queue = contacts.filter((c) => c.valid && c.status !== 'queued' && c.status !== 'scheduled')
    setTotal(queue.length)
    setCursor(0)
    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) break
      const contact = queue[i]
      setCursor(i + 1)
      updateContact(contact.id, { status: 'calling', error: null })
      const lang = contact.language || language
      const userData = buildUserData(settings, {
        insuranceType, insuranceStatus, language: lang, name: contact.name, members, age, cover, vehicleType, vehicleModel,
      })
      let scheduledAt
      if (when === 'later') {
        scheduledAt = new Date(new Date(scheduledFor).getTime() + i * Math.max(0, spacing) * 60000).toISOString()
      }
      try {
        const res = await startCall({ phone: contact.phone, language: lang, userData, scheduledAt })
        updateContact(contact.id, { status: scheduledAt ? 'scheduled' : 'queued', executionId: res.execution_id })
        onCallPlaced?.()
      } catch (err) {
        updateContact(contact.id, { status: 'error', error: err.message })
      }
      if (!stopRef.current && i < queue.length - 1 && when === 'now') await sleep(1200)
    }
    setRunning(false)
    setCursor(0)
  }

  function stopCampaign() {
    stopRef.current = true
  }

  const typeLabel = INSURANCE_TYPES.find((t) => t.id === insuranceType).label
  const scriptLabel = SCRIPT_TYPES.find((s) => s.id === insuranceStatus).label
  const pendingCount = valid.length - done.length - failed.length
  const remaining = pendingCount + failed.length
  const startLabel = remaining === 0
    ? 'All contacts placed'
    : failed.length > 0 && pendingCount === 0
      ? `Retry ${failed.length} failed`
      : when === 'later' ? `Schedule ${remaining} calls` : `Start ${remaining} calls`

  return (
    <div className="narrow">
      <PageHeader title="Bulk call" subtitle="Upload a list of customers and the AI advisor will call each one." />

      <div className="card form">
        <div className="field">
          <span>Insurance type</span>
          <Segmented options={INSURANCE_TYPES} value={insuranceType} onChange={setInsuranceType} disabled={busy} />
        </div>

        <div className="field">
          <span>Default language</span>
          <div className="lang-scroll">
            <Chips options={LANGUAGES} value={language} onChange={setLanguage} disabled={busy} />
          </div>
          <p className="seg-hint">Used unless the file specifies a language for a contact.</p>
        </div>

        {insuranceType === 'health' && (
          <div className="grid-2">
            <div className="field">
              <span>Cover for</span>
              <Chips options={MEMBERS} value={members} onChange={setMembers} disabled={busy} />
            </div>
            <label className="field">
              <span>Eldest member age</span>
              <input type="number" inputMode="numeric" min="0" max="110" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Optional" disabled={busy} />
            </label>
          </div>
        )}

        {insuranceType === 'life' && (
          <div className="grid-2">
            <label className="field">
              <span>Customer age</span>
              <input type="number" inputMode="numeric" min="18" max="80" value={age} onChange={(e) => setAge(e.target.value)} placeholder="Optional" disabled={busy} />
            </label>
            <label className="field">
              <span>Cover wanted</span>
              <input value={cover} onChange={(e) => setCover(e.target.value)} placeholder="e.g. ₹1 crore (optional)" disabled={busy} />
            </label>
          </div>
        )}

        {insuranceType === 'motor' && (
          <div className="grid-2">
            <div className="field">
              <span>Vehicle</span>
              <Segmented options={VEHICLES} value={vehicleType} onChange={setVehicleType} disabled={busy} />
            </div>
            <label className="field">
              <span>Make &amp; model</span>
              <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder={vehicleType === 'car' ? 'e.g. Hyundai Creta 2022' : 'e.g. Honda Activa 2023'} disabled={busy} />
            </label>
          </div>
        )}

        <div className="field">
          <span>Current policy</span>
          <Chips options={SCRIPT_TYPES} value={insuranceStatus} onChange={setInsuranceStatus} disabled={busy} />
          <p className="script-hint">
            {settings.agentName} will follow the <b>{typeLabel} · {scriptLabel}</b> script for every call in this batch.
          </p>
        </div>

        <div className="field">
          <span>When to call</span>
          <Segmented options={WHEN} value={when} onChange={setWhen} disabled={busy} />
          <div className={`collapse ${when === 'later' ? 'open' : ''}`}>
            <div className="grid-2">
              <input type="datetime-local" value={scheduledFor} min={localInputValue(2)} onChange={(e) => setScheduledFor(e.target.value)} disabled={busy || when !== 'later'} />
              <label className="field">
                <span>Minutes between each call</span>
                <input type="number" min="0" max="60" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} disabled={busy || when !== 'later'} />
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="card form bulk-upload">
        <div className="field">
          <span>Contact list</span>
          <div className="dropzone" onClick={() => !busy && fileRef.current?.click()}>
            <UploadIcon />
            <p>{fileName || 'Click to upload Excel (.xlsx), CSV or a text file'}</p>
            <small>One row or line per contact — name and phone number, optionally a language column.</small>
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" hidden onChange={handleFile} disabled={busy} />
        </div>

        {parseError && <p className="error">{parseError}</p>}

        {contacts.length > 0 && (
          <>
            <div className="bulk-summary">
              <span><b>{contacts.length}</b> contacts</span>
              <span className="tone-good">{valid.length} valid</span>
              {contacts.length - valid.length > 0 && <span className="tone-bad">{contacts.length - valid.length} invalid</span>}
              <button type="button" className="link-btn" onClick={clearAll} disabled={busy}>Clear</button>
            </div>

            <div className="bulk-table">
              {contacts.map((c) => (
                <div className={`bulk-row ${c.valid ? '' : 'invalid'}`} key={c.id}>
                  <input
                    className="bulk-name"
                    value={c.name}
                    placeholder="Name (optional)"
                    onChange={(e) => updateContact(c.id, { name: e.target.value })}
                    disabled={busy}
                  />
                  <input
                    className="bulk-phone"
                    value={c.rawPhone ?? c.phone}
                    placeholder="Phone number"
                    onChange={(e) => updateContact(c.id, { rawPhone: e.target.value, phone: toE164(e.target.value), valid: isValidPhone(toE164(e.target.value)) })}
                    disabled={busy}
                  />
                  <select
                    className="bulk-lang"
                    value={c.language || ''}
                    onChange={(e) => updateContact(c.id, { language: e.target.value || undefined })}
                    disabled={busy}
                  >
                    <option value="">Default</option>
                    {LANGUAGES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </select>
                  {c.status !== 'pending' && (
                    <span className={`pill tone-${STATUS_TONE[c.status] || 'neutral'}`}>{STATUS_LABEL[c.status] || c.status}</span>
                  )}
                  <button type="button" className="icon-btn bulk-remove" onClick={() => removeContact(c.id)} disabled={busy} aria-label="Remove">
                    <XIcon />
                  </button>
                </div>
              ))}
            </div>

            <form className="bulk-add" onSubmit={addManual}>
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Add name" disabled={busy} />
              <input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="Add phone number" disabled={busy} />
              <button type="submit" className="icon-btn" disabled={busy || !manualPhone.trim()}>+</button>
            </form>
          </>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="card">
          {running ? (
            <>
              <div className="bulk-progress">
                <div className="bar"><i style={{ width: `${(cursor / Math.max(1, total)) * 100}%` }} /></div>
                <p>{cursor} / {total} · {done.length} done · {failed.length} failed</p>
              </div>
              <button type="button" className="cta" onClick={stopCampaign}>Stop after this call</button>
            </>
          ) : (
            <>
              {done.length > 0 && <p className="script-hint">{done.length} placed successfully{failed.length ? `, ${failed.length} failed` : ''} in the last run.</p>}
              <button type="button" className="cta" onClick={startCampaign} disabled={remaining === 0}>{startLabel}</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
