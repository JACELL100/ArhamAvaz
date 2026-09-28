export default function Chips({ options, value, onChange, disabled }) {
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
