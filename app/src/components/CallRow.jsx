import { callInfo, formatDuration, formatPhone, formatWhen, LANGUAGE_LABELS, statusTone } from '../format'

export function StatusPill({ status }) {
  return <span className={`pill tone-${statusTone(status)}`}>{status.replace(/-/g, ' ')}</span>
}

export default function CallRow({ call, active, onClick }) {
  const info = callInfo(call)
  const title = info.name || formatPhone(info.phone)
  return (
    <button type="button" className={`call-row ${active ? 'active' : ''}`} onClick={onClick}>
      <span className="avatar">{info.name ? info.name[0].toUpperCase() : info.vehicleType === 'bike' ? '🏍️' : '🚗'}</span>
      <span className="call-main">
        <b>{title}</b>
        <small>
          {[info.name && formatPhone(info.phone), info.callType && (info.callType === 'renewal' ? 'Renewal' : 'Sales'), LANGUAGE_LABELS[info.language]]
            .filter(Boolean)
            .join(' · ')}
        </small>
      </span>
      <span className="call-meta">
        <StatusPill status={call.status} />
        <small>{formatWhen(call.created_at)} · {formatDuration(call.conversation_duration)}</small>
      </span>
    </button>
  )
}
