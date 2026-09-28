import { useEffect, useState } from 'react'
import { getExecution, startCall } from '../bolna'
import { buildUserData, INSURANCE_TYPES, LANGUAGES, MEMBERS, SCRIPT_TYPES, VEHICLES } from '../settings'
import { isValidPhone, toE164 } from '../format'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import Chips from '../components/Chips'
import VoiceTextarea from '../components/VoiceTextarea'

const FINAL_STATUSES = ['completed', 'call-disconnected', 'failed', 'no-answer', 'busy', 'canceled', 'stopped', 'error', 'scheduled']

const WHEN = [
  { id: 'now', label: 'Call now' },
  { id: 'later', label: 'Call later' },
]

// datetime-local value for "now + minutes", in local time
function localInputValue(minutesAhead) {
  const d = new Date(Date.now() + minutesAhead * 60000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function CallPage({ settings, onCallPlaced, onViewResponses }) {
  const [insuranceType, setInsuranceType] = useState('health')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('hi')
  const [context, setContext] = useState('')
  const [members, setMembers] = useState('family')
  const [age, setAge] = useState('')
  const [cover, setCover] = useState('')
  const [vehicleType, setVehicleType] = useState('car')
  const [vehicleModel, setVehicleModel] = useState('')
  const [insuranceStatus, setInsuranceStatus] = useState('new')
  const [when, setWhen] = useState('now')
  const [scheduledFor, setScheduledFor] = useState(() => localInputValue(60))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [executionId, setExecutionId] = useState(null)
  const [execution, setExecution] = useState(null)

  useEffect(() => {
    if (!executionId) return
    let stopped = false
    const poll = async () => {
      try {
        const data = await getExecution(executionId)
        if (stopped) return
        setExecution(data)
        if (FINAL_STATUSES.includes(data.status) && data.status !== 'call-disconnected') {
          onCallPlaced?.()
          return
        }
      } catch {
        // execution may not exist yet right after queueing; keep polling
      }
      if (!stopped) setTimeout(poll, 3000)
    }
    poll()
    return () => { stopped = true }
  }, [executionId])

  async function handleSubmit(e) {
    e.preventDefault()
    const number = toE164(phone)
    if (!isValidPhone(number)) {
      setError('Enter a valid phone number, e.g. 98765 43210')
      return
    }
    let scheduledAt
    if (when === 'later') {
      const t = new Date(scheduledFor)
      if (isNaN(t) || t.getTime() < Date.now() + 60000) {
        setError('Pick a time at least a minute from now')
        return
      }
      scheduledAt = t.toISOString()
    }

    const userData = buildUserData(settings, { insuranceType, insuranceStatus, language, name, members, age, cover, vehicleType, vehicleModel, context })

    setLoading(true)
    setError('')
    setExecution(null)
    setExecutionId(null)
    try {
      const res = await startCall({ phone: number, language, userData, scheduledAt })
      if (scheduledAt) {
        setExecution({ status: 'scheduled', scheduledAt })
      } else {
        setExecutionId(res.execution_id)
        setExecution({ status: res.status || 'queued' })
      }
      onCallPlaced?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const status = execution?.status
  const inProgress = status && !FINAL_STATUSES.includes(status)
  const busy = loading || inProgress
  const scriptLabel = SCRIPT_TYPES.find((s) => s.id === insuranceStatus).label
  const typeLabel = INSURANCE_TYPES.find((t) => t.id === insuranceType).label

  return (
    <div className="narrow">
      <PageHeader title="New call" subtitle="Fill in the details and the AI advisor will call the customer." />
      <form className="card form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Insurance type</span>
          <Segmented options={INSURANCE_TYPES} value={insuranceType} onChange={setInsuranceType} disabled={busy} />
        </div>

        <div className="grid-2">
          <label className="field">
            <span>Customer name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" disabled={busy} />
          </label>
          <label className="field">
            <span>Phone number</span>
            <div className="phone">
              <em>+91</em>
              <input type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98765 43210" disabled={busy} />
            </div>
          </label>
        </div>

        <div className="field">
          <span>Language</span>
          <div className="lang-scroll">
            <Chips options={LANGUAGES} value={language} onChange={setLanguage} disabled={busy} />
          </div>
        </div>

        <div className="field">
          <span>What is the query about?</span>
          <VoiceTextarea
            value={context}
            onChange={setContext}
            lang={LANGUAGES.find((l) => l.id === language).speech}
            placeholder="Optional: add context or tap the mic to speak, e.g. wants to add his mother to the family floater, worried about claim for knee surgery"
            disabled={busy}
          />
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
            {settings.agentName} will follow the <b>{typeLabel} · {scriptLabel}</b> script: {settings.scripts[insuranceType][insuranceStatus].split('\n')[0].replace(/^Goal:\s*/i, '')}
          </p>
        </div>

        <div className="field">
          <span>When to call</span>
          <Segmented options={WHEN} value={when} onChange={setWhen} disabled={busy} />
          <div className={`collapse ${when === 'later' ? 'open' : ''}`}>
            <div>
              <input type="datetime-local" value={scheduledFor} min={localInputValue(2)} onChange={(e) => setScheduledFor(e.target.value)} disabled={busy || when !== 'later'} />
            </div>
          </div>
        </div>

        <button type="submit" className="cta" disabled={busy || !phone.trim()}>
          {loading && <span className="spinner" />}
          {loading ? 'Connecting…' : inProgress ? 'Call in progress' : when === 'later' ? 'Schedule call' : 'Call now'}
        </button>

        {error && <p className="error">{error}</p>}

        {status && (
          <section className="status">
            <div className="status-row">
              <span className={`dot ${inProgress ? 'live' : status === 'completed' || status === 'scheduled' ? 'done' : ''}`} />
              <strong>
                {status === 'scheduled'
                  ? `Scheduled for ${new Date(execution.scheduledAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}`
                  : status.replace(/-/g, ' ')}
              </strong>
              {execution.conversation_duration ? <span className="muted">{Math.round(execution.conversation_duration)}s</span> : null}
            </div>
            {execution.transcript && <pre className="transcript">{execution.transcript}</pre>}
            {execution.recording_url && <audio controls src={execution.recording_url} />}
            {!inProgress && status !== 'scheduled' && (
              <button type="button" className="link-btn" onClick={onViewResponses}>View in Responses →</button>
            )}
          </section>
        )}
      </form>
    </div>
  )
}
