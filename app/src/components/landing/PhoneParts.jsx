// Shared iPhone-style hardware details: side buttons, Dynamic Island, status bar, home indicator.
export function SideButtons() {
  return (
    <>
      <i className="lp2-btn lp2-btn-action" aria-hidden="true" />
      <i className="lp2-btn lp2-btn-volup" aria-hidden="true" />
      <i className="lp2-btn lp2-btn-voldown" aria-hidden="true" />
      <i className="lp2-btn lp2-btn-power" aria-hidden="true" />
    </>
  )
}

export function Island() {
  return (
    <div className="lp2-island" aria-hidden="true">
      <span className="lp2-lens" />
    </div>
  )
}

export function StatusBar() {
  return (
    <div className="lp2-status" aria-hidden="true">
      <span className="lp2-status-time">9:41</span>
      <span className="lp2-status-icons">
        <svg width="15" height="10" viewBox="0 0 17 11" fill="currentColor"><rect x="0" y="7" width="3" height="4" rx="1" /><rect x="4.6" y="5" width="3" height="6" rx="1" /><rect x="9.2" y="2.5" width="3" height="8.5" rx="1" /><rect x="13.8" y="0" width="3" height="11" rx="1" /></svg>
        <svg width="14" height="10" viewBox="0 0 16 11" fill="currentColor"><path d="M8 2.2c2.2 0 4.2.9 5.7 2.3l1-1.1A9.6 9.6 0 008 .7 9.6 9.6 0 001.3 3.4l1 1.1A8.1 8.1 0 018 2.2z" /><path d="M8 5.3c1.3 0 2.5.5 3.4 1.3l1-1.1A6.6 6.6 0 008 3.8a6.6 6.6 0 00-4.4 1.7l1 1.1c.9-.8 2.1-1.3 3.4-1.3z" /><path d="M8 8.4c.6 0 1.1.2 1.5.6L8 10.6 6.5 9c.4-.4.9-.6 1.5-.6z" /></svg>
        <svg width="22" height="11" viewBox="0 0 26 12" fill="none"><rect x=".6" y=".6" width="22" height="10.8" rx="3.4" stroke="currentColor" strokeOpacity=".45" /><rect x="2" y="2" width="19" height="8" rx="2.2" fill="currentColor" /><path d="M24.3 4v4c.8-.3 1.4-1.1 1.4-2s-.6-1.7-1.4-2z" fill="currentColor" fillOpacity=".5" /></svg>
      </span>
    </div>
  )
}

export function HomeBar() {
  return <span className="lp2-homebar" aria-hidden="true" />
}
