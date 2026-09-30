import { useEffect, useRef, useState } from 'react'
import { getExecution, startCall } from '../bolna'
import { buildUserData, INSURANCE_TYPES, MEMBERS, SCRIPT_TYPES, VEHICLES } from '../settings'
import { isValidPhone, statusTone, toE164 } from '../format'
import { downloadTemplate, parseContactsFile } from '../contactsFile'
import PageHeader from '../components/PageHeader'
import Segmented from '../components/Segmented'
import Chips from '../components/Chips'
import VoiceTextarea from '../components/VoiceTextarea'
import { DownloadIcon, UploadIcon, XIcon } from '../components/icons'

const FINAL_STATUSES = ['completed', 'call-disconnected', 'failed', 'no-answer', 'busy', 'canceled', 'stopped', 'error', 'scheduled', 'balance-low']

const MODES = [
  { id: 'single', label: 'One customer' },
  { id: 'bulk', label: 'Upload a list' },
]
const WHEN = [
  { id: 'now', label: 'Call now' },
  { id: 'later', label: 'Call later' },
]

// Delay between placing successive "call now" calls in a bulk run, to stay gentle on the API and phone lines
const BULK_GAP_MS = 1200

let nextId = 1

// datetime-local value for "now + minutes", in local time
function localInputValue(minutesAhead) {
  const d = new Date(Date.now() + minutesAhead * 60000)
  d.setSeconds(0, 0)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const joinContext = (...parts) => parts.map((p) => p?.trim()).filter(Boolean).join('. ')

function contactPill(c) {
  if (c.status === 'calling') return { tone: 'live', label: 'Placing…' }
  if (c.error) return { tone: 'bad', label: 'Not placed' }
  if (c.status === 'pending') return null
  return { tone: statusTone(c.status), label: c.status.replace(/-/g, ' ') }
}

export default function CallPage({ settings, onCallPlaced, onViewResponses }) {
  const [mode, setMode] = useState('single')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  
  const [agents, setAgents] = useState([])
  const [agentId, setAgentId] = useState('')

  useEffect(() => {
    import('../api').then(m => m.getAgents()).then(data => {
      setAgents(data)
      if (data.length > 0) setAgentId(data[0].id)
    }).catch(console.error)
  }, [])
  
  const [when, setWhen] = useState('now')
  const [scheduledFor, setScheduledFor] = useState(() => localInputValue(60))
  const [spacing, setSpacing] = useState(3)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [executionId, setExecutionId] = useState(null)
  const [execution, setExecution] = useState(null)

  const [fileName, setFileName] = useState('')
  const [contacts, setContacts] = useState([])
  const [manualName, setManualName] = useState('')
  const [manualPhone, setManualPhone] = useState('')
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const stopRef = useRef(false)
  const fileRef = useRef(null)

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

  // Bulk: keep each placed call's status live, like the single-call status card
  const liveIds = contacts.filter((c) => c.executionId && !FINAL_STATUSES.includes(c.status)).map((c) => c.executionId).join(',')
  useEffect(() => {
    if (!liveIds) return
    const ids = liveIds.split(',')
    const id = setInterval(async () => {
      const results = await Promise.all(ids.map((x) => getExecution(x).catch(() => null)))
      const byId = Object.fromEntries(ids.map((x, i) => [x, results[i]?.status]).filter(([, s]) => s))
      setContacts((cs) => cs.map((c) => (byId[c.executionId] ? { ...c, status: byId[c.executionId] } : c)))
      if (results.some((r) => r && FINAL_STATUSES.includes(r.status))) onCallPlaced?.()
    }, 5000)
    return () => clearInterval(id)
  }, [liveIds])

  function scheduleTime() {
    const t = new Date(scheduledFor)
    if (isNaN(t) || t.getTime() < Date.now() + 60000) {
      setError('Pick a time at least a minute from now')
      return null
    }
    return t
  }

  function userDataFor({ name, language }, agent) {
    const trimmedName = name?.trim() || 'not specified'
    const greeting = agent.greeting
      .replaceAll('{name}', name ? (language === 'hi' ? `${name} जी` : language === 'hinglish' ? `${name} ji` : name) : '')
      .replaceAll('{agent}', agent.agentName)
      .replaceAll('{company}', agent.companyName)
      .replace(/\s+([,.।?!])/g, '$1')
      .replace(/\s{2,}/g, ' ')
      .trim()

    return {
      customer_name: trimmedName,
      agent_name: agent.agentName,
      company_name: agent.companyName,
      language: language,
      call_goal: agent.purpose,
      greeting: greeting,
      script: agent.script,
      guidelines: agent.guidelines,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'bulk') return
    const number = toE164(phone)
    if (!isValidPhone(number)) {
      setError('Enter a valid phone number, e.g. 98765 43210')
      return
    }
    let scheduledAt
    if (when === 'later') {
      const t = scheduleTime()
      if (!t) return
      scheduledAt = t.toISOString()
    }

    setLoading(true)
    setError('')
    setExecution(null)
    setExecutionId(null)
    try {
      const selectedAgent = agents.find(a => a.id === agentId)
      if (!selectedAgent) throw new Error('Please select an agent first')
      const language = selectedAgent.language
      const res = await startCall({ language, phone: number, userData: userDataFor({ name, language }, selectedAgent), scheduledAt })
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

  async function handleFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError('')
    setFileName(file.name)
    try {
      const parsed = await parseContactsFile(file)
      if (parsed.length === 0) throw new Error('No contacts found in that file. Make sure it has a phone number column, or one number per line.')
      setContacts(parsed.map((c) => ({ id: nextId++, status: 'pending', error: null, executionId: null, ...c })))
    } catch (err) {
      setError(err.message)
      setContacts([])
    }
  }

  function updateContact(id, patch) {
    setContacts((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addManual() {
    const number = toE164(manualPhone)
    setContacts((cs) => [
      ...cs,
      { id: nextId++, name: manualName.trim(), phone: number, rawPhone: manualPhone.trim(), language: undefined, notes: '', valid: isValidPhone(number), status: 'pending', error: null, executionId: null },
    ])
    setManualName('')
    setManualPhone('')
  }

  function clearList() {
    setContacts([])
    setFileName('')
    setError('')
  }

  const placed = (c) => !!c.executionId || c.status === 'scheduled'
  const toPlace = contacts.filter((c) => c.valid && !placed(c))
  const notPlaced = contacts.filter((c) => c.error)
  const placedCount = contacts.filter(placed).length
  const invalidCount = contacts.filter((c) => !c.valid).length

  async function startBulk() {
    let start
    if (when === 'later') {
      start = scheduleTime()
      if (!start) return
    }
    setError('')
    setRunning(true)
    stopRef.current = false
    const queue = toPlace
    setProgress({ done: 0, total: queue.length })
    for (let i = 0; i < queue.length; i++) {
      if (stopRef.current) break
      const c = queue[i]
      const selectedAgent = agents.find(a => a.id === (c.agentId || agentId))
      if (!selectedAgent) {
        updateContact(c.id, { status: 'pending', error: 'Agent not found' })
        continue
      }
      const lang = selectedAgent.language
      updateContact(c.id, { status: 'calling', error: null })
      const scheduledAt = start ? new Date(start.getTime() + i * Math.max(0, spacing) * 60000).toISOString() : undefined
      try {
        const res = await startCall({ language: lang, phone: c.phone, userData: userDataFor({ name: c.name, language: lang }, selectedAgent), scheduledAt })
        updateContact(c.id, { status: scheduledAt ? 'scheduled' : res.status || 'queued', executionId: res.execution_id || null, scheduledAt })
      } catch (err) {
        updateContact(c.id, { status: 'pending', error: err.message })
      }
      setProgress({ done: i + 1, total: queue.length })
      if (!stopRef.current && !start && i < queue.length - 1) await sleep(BULK_GAP_MS)
    }
    setRunning(false)
    onCallPlaced?.()
  }

  const status = execution?.status
  const inProgress = status && !FINAL_STATUSES.includes(status)
  const busy = loading || inProgress || running
  const bulk = mode === 'bulk'

  const bulkLabel = toPlace.length === 0
    ? 'All contacts placed'
    : notPlaced.length && toPlace.length === notPlaced.length
      ? `Retry ${notPlaced.length} not placed`
      : `${when === 'later' ? 'Schedule' : 'Call'} ${toPlace.length} ${toPlace.length === 1 ? 'customer' : 'customers'}`

  return (
    <div className="narrow">
      <PageHeader title="New call" subtitle="Call one customer, or upload a list and the AI advisor will call each of them." />
      <form className="card form" onSubmit={handleSubmit}>
        <div className="field">
          <span>Who to call</span>
          <Segmented options={MODES} value={mode} onChange={(m) => { setMode(m); setError('') }} disabled={busy} />
        </div>

        {!bulk && (
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
        )}

        {bulk && (
          <div className="field">
            <button type="button" className="dropzone" onClick={() => fileRef.current?.click()} disabled={busy}>
              <UploadIcon />
              <p>{fileName || 'Upload Excel (.xlsx), CSV or a text file'}</p>
              <small>One contact per row or line. Columns: name, phone, and optionally language and a notes/goal column.</small>
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" hidden onChange={handleFile} />
            <p className="template-links">
              <DownloadIcon /> Download template:
              <button type="button" className="link-btn" onClick={() => downloadTemplate('xlsx')}>Excel</button>
              <span aria-hidden="true">·</span>
              <button type="button" className="link-btn" onClick={() => downloadTemplate('csv')}>CSV</button>
            </p>

            {contacts.length > 0 && (
              <>
                <div className="bulk-summary">
                  <span><b>{contacts.length}</b> contacts</span>
                  {placedCount > 0 && <span className="tone-good">{placedCount} placed</span>}
                  {invalidCount > 0 && <span className="tone-bad">{invalidCount} invalid number{invalidCount > 1 ? 's' : ''}</span>}
                  <button type="button" className="link-btn" onClick={clearList} disabled={busy}>Clear</button>
                </div>

                <div className="bulk-table">
                  {contacts.map((c) => {
                    const pill = contactPill(c)
                    const locked = busy || placed(c)
                    return (
                      <div className={`bulk-row ${c.valid ? '' : 'invalid'}`} key={c.id} title={c.error || undefined}>
                        <input className="bulk-name" value={c.name} placeholder="Name" onChange={(e) => updateContact(c.id, { name: e.target.value })} disabled={locked} />
                        <input
                          className="bulk-phone"
                          value={c.rawPhone ?? c.phone}
                          placeholder="Phone number"
                          inputMode="tel"
                          onChange={(e) => {
                            const p = toE164(e.target.value)
                            updateContact(c.id, { rawPhone: e.target.value, phone: p, valid: isValidPhone(p) })
                          }}
                          disabled={locked}
                        />
                        <select className="bulk-lang" value={c.agentId || ''} onChange={(e) => updateContact(c.id, { agentId: e.target.value || undefined })} disabled={locked}>
                          <option value="">Default Agent</option>
                          {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                        <button type="button" className="icon-btn bulk-remove" onClick={() => setContacts((cs) => cs.filter((x) => x.id !== c.id))} disabled={busy} aria-label="Remove contact">
                          <XIcon />
                        </button>
                        <input className="bulk-notes" value={c.notes} placeholder="Goal for this customer, added to the call goal (optional)" onChange={(e) => updateContact(c.id, { notes: e.target.value })} disabled={locked} />
                        {pill && <span className={`pill tone-${pill.tone}`}>{pill.label}</span>}
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div className="bulk-add">
              <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Name" disabled={busy} />
              <input value={manualPhone} onChange={(e) => setManualPhone(e.target.value)} placeholder="Phone number" inputMode="tel" disabled={busy} />
              <button type="button" className="icon-btn" onClick={addManual} disabled={busy || !manualPhone.trim()} aria-label="Add contact">+</button>
            </div>
          </div>
        )}

        <div className="field">
          <span>{bulk ? 'Default agent' : 'Agent'}</span>
          <div className="lang-scroll">
            <Segmented options={agents.map(a => ({ id: a.id, label: a.name }))} value={agentId} onChange={setAgentId} disabled={busy || agents.length === 0} />
          </div>
          {agents.length === 0 && <p className="error">You have no agents. Go to the Agents tab to create one.</p>}
        </div>



        <div className="field">
          <span>When to call</span>
          <Segmented options={WHEN} value={when} onChange={setWhen} disabled={busy} />
          <div className={`collapse ${when === 'later' ? 'open' : ''}`}>
            <div className={bulk ? 'grid-2' : undefined}>
              <input type="datetime-local" value={scheduledFor} min={localInputValue(2)} onChange={(e) => setScheduledFor(e.target.value)} disabled={busy || when !== 'later'} />
              {bulk && (
                <label className="field spacing-field">
                  <input type="number" min="0" max="60" value={spacing} onChange={(e) => setSpacing(Number(e.target.value))} disabled={busy || when !== 'later'} />
                  <small>minutes between calls</small>
                </label>
              )}
            </div>
          </div>
        </div>

        {!bulk && (
          <button type="submit" className="cta" disabled={busy || !phone.trim()}>
            {loading && <span className="spinner" />}
            {loading ? 'Connecting…' : inProgress ? 'Call in progress' : when === 'later' ? 'Schedule call' : 'Call now'}
          </button>
        )}

        {bulk && (running ? (
          <>
            <div className="bulk-progress">
              <div className="bar"><i style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }} /></div>
              <p>{progress.done} / {progress.total} placed{notPlaced.length ? ` · ${notPlaced.length} not placed` : ''}</p>
            </div>
            <button type="button" className="cta" onClick={() => { stopRef.current = true }}>Stop after this call</button>
          </>
        ) : (
          <button type="button" className="cta" onClick={startBulk} disabled={toPlace.length === 0}>{bulkLabel}</button>
        ))}

        {error && <p className="error">{error}</p>}

        {!bulk && status && (
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

        {bulk && !running && placedCount > 0 && (
          <button type="button" className="link-btn" onClick={onViewResponses}>View outcomes in Responses →</button>
        )}
      </form>
    </div>
  )
}
