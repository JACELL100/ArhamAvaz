export default function Segmented({ options, value, onChange, disabled }) {
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
