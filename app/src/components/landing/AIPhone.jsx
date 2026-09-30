import { useEffect, useState } from 'react'
import { HomeBar, Island, SideButtons, StatusBar } from './PhoneParts'
import { reducedMotion } from './motion'

const BARS = 22
const barStyle = (i) => ({
  '--h': (30 + Math.abs(Math.sin(i * 1.3) * Math.cos(i * 0.6)) * 70).toFixed(0),
  '--d': `${(-i * 0.11).toFixed(2)}s`,
})

const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function Ctl({ label, children, active }) {
  return (
    <div className="lp2-ctl">
      <span className={`lp2-ctl-btn${active ? ' is-on' : ''}`}>{children}</span>
      <small>{label}</small>
    </div>
  )
}

export default function AIPhone() {
  const [secs, setSecs] = useState(18)
  useEffect(() => {
    if (reducedMotion()) return undefined
    const id = setInterval(() => setSecs((s) => (s >= 599 ? 18 : s + 1)), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="lp2-phone lp2-phone-call" role="img" aria-label="ArhamAawaaz AI voice call screen: Deepali, AI Advisor, speaking">
      <SideButtons />
      <Island />
      <div className="lp2-screen lp2-call-screen">
        <StatusBar />
        <time className="lp2-timer">{clock(secs)}</time>
        <h4 className="lp2-call-brand">ArhamAawaaz</h4>
        <p className="lp2-call-role">AI Insurance Advisor</p>
        <div className="lp2-avatar-row">
          <div className="lp2-avatar-ring"><img src="/deepali.jpg" alt="" width="96" height="96" /></div>
        </div>
        <h5 className="lp2-call-name">Deepali</h5>
        <p className="lp2-call-role">AI Advisor</p>
        <span className="lp2-speaking"><i />Speaking...</span>
        <div className="lp2-wide-wave" aria-hidden="true">
          {Array.from({ length: BARS + 12 }, (_, i) => <span key={i} style={barStyle(i)} />)}
        </div>
        <div className="lp2-ctls">
          <Ctl label="Mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3M3 3l18 18" /></svg>
          </Ctl>
          <Ctl label="Keypad">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="6" cy="5" r="1.6" /><circle cx="12" cy="5" r="1.6" /><circle cx="18" cy="5" r="1.6" /><circle cx="6" cy="11" r="1.6" /><circle cx="12" cy="11" r="1.6" /><circle cx="18" cy="11" r="1.6" /><circle cx="6" cy="17" r="1.6" /><circle cx="12" cy="17" r="1.6" /><circle cx="18" cy="17" r="1.6" /></svg>
          </Ctl>
          <Ctl label="Speaker" active>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9v6h4l5 4V5L8 9z" /><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11" /></svg>
          </Ctl>
        </div>
        <span className="lp2-end" aria-hidden="true">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="#fff" style={{ transform: 'rotate(135deg)' }}><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.6 3.6a1 1 0 01-.25 1z" /></svg>
        </span>
        <HomeBar />
      </div>
    </div>
  )
}
