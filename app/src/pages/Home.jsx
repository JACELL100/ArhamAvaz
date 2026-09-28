import PageHeader from '../components/PageHeader'
import CallRow from '../components/CallRow'
import { PhoneIcon } from '../components/icons'
import { callInfo, formatDuration, isAnswered, isMissed, LANGUAGE_LABELS } from '../format'

function Breakdown({ title, rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <div className="card panel">
      <h3>{title}</h3>
      <div className="bars">
        {rows.map((r) => (
          <div className="bar-row" key={r.label}>
            <span>{r.label}</span>
            <div className="bar"><i style={{ width: `${(r.value / max) * 100}%` }} /></div>
            <b>{r.value}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home({ calls, loading, onNewCall, onOpenCall }) {
  const answered = calls.filter(isAnswered)
  const missed = calls.filter(isMissed)
  const talkTime = answered.reduce((sum, c) => sum + (c.conversation_duration || 0), 0)
  const today = calls.filter((c) => new Date(c.created_at).toDateString() === new Date().toDateString())
  const infos = calls.map(callInfo)
  const count = (key, value) => infos.filter((i) => i[key] === value).length

  const stats = [
    { label: 'Total calls', value: calls.length, sub: `${today.length} today` },
    { label: 'Answered', value: answered.length, sub: calls.length ? `${Math.round((answered.length / calls.length) * 100)}% connect rate` : 'No calls yet' },
    { label: 'Missed', value: missed.length, sub: 'Busy, no answer or failed' },
    { label: 'Avg. talk time', value: formatDuration(answered.length ? talkTime / answered.length : 0), sub: `${formatDuration(talkTime)} total` },
  ]

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Overview of your AI insurance calls"
        action={<button className="btn-primary" onClick={onNewCall}><PhoneIcon /> New call</button>}
      />

      <div className="stats">
        {stats.map((s) => (
          <div className="card stat" key={s.label}>
            <span>{s.label}</span>
            <strong>{loading ? '…' : s.value}</strong>
            <small>{s.sub}</small>
          </div>
        ))}
      </div>

      <div className="grid-home">
        <div className="card panel">
          <div className="panel-head">
            <h3>Recent calls</h3>
          </div>
          {calls.length === 0 ? (
            <div className="empty">
              <p>{loading ? 'Loading calls…' : 'No calls yet. Place your first call to see it here.'}</p>
              {!loading && <button className="btn-primary" onClick={onNewCall}>Place a call</button>}
            </div>
          ) : (
            <div className="rows">
              {calls.slice(0, 6).map((c) => <CallRow key={c.id} call={c} onClick={() => onOpenCall(c.id)} />)}
            </div>
          )}
        </div>

        <div className="side-panels">
          <Breakdown title="Call purpose" rows={[{ label: 'Sales', value: count('callType', 'sales') }, { label: 'Renewal', value: count('callType', 'renewal') }]} />
          <Breakdown title="Language" rows={Object.keys(LANGUAGE_LABELS).map((l) => ({ label: LANGUAGE_LABELS[l], value: count('language', l) }))} />
          <Breakdown title="Vehicle" rows={[{ label: 'Car', value: count('vehicleType', 'car') }, { label: 'Bike', value: count('vehicleType', 'bike') }]} />
        </div>
      </div>
    </div>
  )
}
