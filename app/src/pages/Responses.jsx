import { useState } from 'react'
import CallRow, { StatusPill } from '../components/CallRow'
import PageHeader from '../components/PageHeader'
import { BackIcon, RefreshIcon } from '../components/icons'
import { callInfo, formatDuration, formatPhone, formatWhen, isAnswered, isMissed, LANGUAGE_LABELS, parseTranscript } from '../format'

const FILTERS = [
  { id: 'all', label: 'All', test: () => true },
  { id: 'answered', label: 'Answered', test: isAnswered },
  { id: 'missed', label: 'Missed', test: isMissed },
  { id: 'scheduled', label: 'Scheduled', test: (c) => c.status === 'scheduled' },
]

// Flatten nested extracted data into [label, value] leaves so it reads as facts, not raw JSON.
function flattenData(value, path = []) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value).flatMap(([k, v]) => flattenData(v, [...path, k]))
  }
  const text = Array.isArray(value) ? value.join(', ') : value == null || value === '' ? '—' : String(value)
  return [[path.slice(-2).map((k) => k.replace(/_/g, ' ')).join(' · '), text]]
}

function Detail({ call, onBack }) {
  const info = callInfo(call)
  const turns = parseTranscript(call.transcript)
  const facts = [
    ['Phone', formatPhone(info.phone)],
    ['Insurance', info.insuranceType || '—'],
    ['Policy', info.statusLabel || '—'],
    ['Language', LANGUAGE_LABELS[info.language] || '—'],
    ['Details', info.details || [info.vehicleType === 'bike' ? 'Bike' : info.vehicleType === 'car' ? 'Car' : null, info.vehicleModel].filter(Boolean).join(' · ') || '—'],
    ['Duration', formatDuration(call.conversation_duration)],
    ['Called at', formatWhen(call.created_at)],
    ['Cost', call.total_cost ? `$${(call.total_cost / 100).toFixed(2)}` : '—'],
  ]
  const extracted = call.extracted_data && Object.keys(call.extracted_data).length ? flattenData(call.extracted_data) : null

  return (
    <div className="detail">
      <div className="detail-head">
        <button className="icon-btn back" onClick={onBack} aria-label="Back"><BackIcon /></button>
        <div>
          <h3>{info.name || formatPhone(info.phone)}</h3>
          <StatusPill status={call.status} />
        </div>
      </div>

      <div className="facts">
        {facts.map(([k, v]) => (
          <div key={k}><span>{k}</span><b>{v}</b></div>
        ))}
      </div>

      {info.recordingUrl && <audio controls src={info.recordingUrl} />}

      {info.goal && (
        <section>
          <h4>Call goal</h4>
          <p className="summary">🎯 {info.goal}</p>
        </section>
      )}

      {call.summary && (
        <section>
          <h4>Summary</h4>
          <p className="summary">{call.summary}</p>
        </section>
      )}

      {extracted && (
        <section>
          <h4>Captured data</h4>
          <div className="facts">
            {extracted.map(([k, v], i) => (
              <div key={i} className={v.length > 40 ? 'wide' : undefined}><span>{k}</span><b>{v}</b></div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h4>Conversation</h4>
        {turns.length ? (
          <div className="chat">
            {turns.map((t, i) => <p key={i} className={`bubble ${t.who}`}>{t.text}</p>)}
          </div>
        ) : (
          <p className="muted-text">
            {call.status === 'completed' ? 'No transcript for this call.' : info.hangupReason || call.error_message || 'Transcript appears once the call is completed.'}
          </p>
        )}
      </section>
    </div>
  )
}

export default function Responses({ calls, loading, error, refresh, selectedId, onSelect }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const visible = calls
    .filter(FILTERS.find((f) => f.id === filter).test)
    .filter((c) => {
      if (!q) return true
      const i = callInfo(c)
      return [i.name, i.phone, i.insuranceType, i.details, i.vehicleModel, c.summary].some((v) => v?.toLowerCase().includes(q))
    })
  const selected = calls.find((c) => c.id === selectedId)

  return (
    <div className={`responses ${selected ? 'has-detail' : ''}`}>
      <div className="responses-list">
        <PageHeader
          title="Responses"
          subtitle="Every call, its outcome and the conversation"
          action={<button className="icon-btn" onClick={refresh} aria-label="Refresh"><RefreshIcon /></button>}
        />
        <input className="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, insurance…" />
        <div className="chips filter-chips">
          {FILTERS.map((f) => (
            <button key={f.id} type="button" className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label} <em>{calls.filter(f.test).length}</em>
            </button>
          ))}
        </div>
        {error && <p className="error">{error}</p>}
        <div className="card rows">
          {visible.length === 0 ? (
            <div className="empty"><p>{loading ? 'Loading…' : 'No calls match.'}</p></div>
          ) : (
            visible.map((c) => <CallRow key={c.id} call={c} active={c.id === selectedId} onClick={() => onSelect(c.id)} />)
          )}
        </div>
      </div>

      <div className="responses-detail">
        {selected ? (
          <div className="card"><Detail call={selected} onBack={() => onSelect(null)} /></div>
        ) : (
          <div className="card empty detail-empty"><p>Select a call to see the full conversation.</p></div>
        )}
      </div>
    </div>
  )
}
