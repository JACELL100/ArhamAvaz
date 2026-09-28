import { useEffect, useState } from 'react'
import { getExecution, startCall } from '../bolna'
import { buildGreeting, LANGUAGES, SCRIPT_TYPES } from '../settings'
import PageHeader from '../components/PageHeader'

const FINAL_STATUSES = ['completed', 'call-disconnected', 'failed', 'no-answer', 'busy', 'canceled', 'stopped', 'error', 'scheduled']

const CALL_TYPES = [
  { id: 'sales', label: 'Sales', hint: 'Pitch a new policy' },
  { id: 'renewal', label: 'Renewal', hint: 'Renew an expiring policy' },
]
const VEHICLES = [
  { id: 'car', label: 'Car', icon: '🚗' },
  { id: 'bike', label: 'Bike', icon: '🏍️' },
]
const WHEN = [
  { id: 'now', label: 'Call now' },
  { id: 'later', label: 'Call later' },
]

// Accepts "98765 43210", "+91 98765-43210", etc. and returns E.164; a bare 10-digit number is treated as Indian.
function toE164(input) {
  const digits = input.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) return digits
  if (digits.length === 10) return `+91${digits}`
  return `+${digits}`
}

// datetime-local value for "now + minutes", in local time
function localInputValue(minutesAhead) {
  const d = new Date(Date.now() + minutesAhead * 60000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function Segmented({ options, value, onChange, disabled }) {
  const index = options.findIndex((o) => o.id === value)
  return (
    <div className="segmented" style={{ '--count': options.length, '--index': index }}>
      <span className="segmented-thumb" />
      {options.map((o) => (
        <button type="button" key={o.id} className={o.id === value ? 'active' : ''} onClick={() => onChange(o.id)} disabled={disabled}>
          {o.icon && <span className="seg-icon">{o.icon}</span>}
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Chips({ options, value, onChange, disabled }) {
  return (
    <div className="chips">
      {options.map((o) => (
        <button type="button" key={o.id} className={`chip ${value === o.id ? 'active' : ''}`} onClick={() => onChange(o.id)} disabled={disabled}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export default function CallPage({ settings, onCallPlaced, onViewResponses }) {
  const [callType, setCallType] = useState('sales')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [language, setLanguage] = useState('hi')
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

  function chooseCallType(type) {
    setCallType(type)
    setInsuranceStatus(type === 'renewal' ? 'renewal' : 'new')
  }

  function chooseInsuranceStatus(status) {
    setInsuranceStatus(status)
    setCallType(status === 'renewal' ? 'renewal' : 'sales')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const number = toE164(phone)
    if (!/^\+\d{10,15}$/.test(number)) {
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

    const trimmedName = name.trim()
    const userData = {
      customer_name: trimmedName || 'not specified',
      agent_name: settings.agentName,
      company_name: settings.companyName,
      call_type: callType,
      language: LANGUAGES.find((l) => l.id === language).name,
      insurance_status: insuranceStatus,
      insurance_status_label: SCRIPT_TYPES.find((s) => s.id === insuranceStatus).label,
      vehicle_type: vehicleType,
      vehicle_model: vehicleModel.trim() || 'not specified',
      greeting: buildGreeting(settings, { language, name: trimmedName, vehicleType }),
      script: settings.scripts[insuranceStatus],
      guidelines: settings.guidelines,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }

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

  return (
    <div className="narrow">
      <PageHeader title="New call" subtitle="Fill in the details and the AI advisor will call the customer." />
      <form className="card form" onSubmit={handleSubmit}>
        <Segmented options={CALL_TYPES} value={callType} onChange={chooseCallType} disabled={busy} />
        <p className="seg-hint">{CALL_TYPES.find((c) => c.id === callType).hint}</p>

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
          <Chips options={LANGUAGES} value={language} onChange={setLanguage} disabled={busy} />
        </div>

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

        <div className="field">
          <span>Current insurance</span>
          <Chips options={SCRIPT_TYPES} value={insuranceStatus} onChange={chooseInsuranceStatus} disabled={busy} />
          <p className="script-hint">
            {settings.agentName} will follow the <b>{SCRIPT_TYPES.find((s) => s.id === insuranceStatus).label}</b> script: {settings.scripts[insuranceStatus].split('\n')[0].replace(/^Goal:\s*/i, '')}
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
