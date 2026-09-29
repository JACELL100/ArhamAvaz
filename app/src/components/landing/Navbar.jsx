import { useState } from 'react'
import { useLanding } from './LandingContext'

const LINKS = [
  { id: 'product', label: 'Product' },
  { id: 'how', label: 'How It Works' },
  { id: 'usecases', label: 'Use Cases' },
  { id: 'insights', label: 'Insights' },
]

function LogoMark() {
  return (
    <span className="lp-logo-mark">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0" /></svg>
    </span>
  )
}

export default function Navbar() {
  const { go, launch } = useLanding()
  const [open, setOpen] = useState(false)
  const jump = (e, id) => {
    setOpen(false)
    go(e, id)
  }

  return (
    <div className="lp-nav-shell">
      <header className="lp-nav" id="top">
        <a className="lp-logo" href="#top" aria-label="ArhamAvaz home" onClick={(e) => go(e, 'top')}>
          <LogoMark />
          ArhamAvaz
        </a>
        <ul>
          {LINKS.map((l) => (
            <li key={l.id}><a href={`#${l.id}`} onClick={(e) => go(e, l.id)}>{l.label}</a></li>
          ))}
        </ul>
        <div className="lp-actions">
          <a className="lp-btn lp-btn-ghost" href="#how" onClick={(e) => go(e, 'how')}>See Demo</a>
          <button type="button" className="lp-btn lp-btn-primary" onClick={() => launch('call')}>Start Calling</button>
        </div>
        <button type="button" className="lp-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="lp-menu" onClick={() => setOpen(!open)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </header>
      <div className={`lp-menu lp-card ${open ? 'lp-open' : ''}`} id="lp-menu">
        {LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} onClick={(e) => jump(e, l.id)}>{l.label}</a>
        ))}
        <button type="button" className="lp-btn lp-btn-primary" onClick={() => launch('call')}>Start Calling</button>
      </div>
    </div>
  )
}
