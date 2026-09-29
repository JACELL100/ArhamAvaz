import { Wave } from './primitives'
import { useLanding } from './LandingContext'

export default function FinalCTA() {
  const { go, launch } = useLanding()
  return (
    <section id="start" style={{ paddingTop: '0' }}>
      <div className="lp-wrap">
        <div className="lp-final">
          <Wave n={60} className="lp-wave-bg" />
          <h2 style={{ position: 'relative', zIndex: '2' }}>Ready to make your next call?</h2>
          <p className="lp-sub" style={{ position: 'relative', zIndex: '2' }}>Upload a list. Let ArhamAvaz do the dialing.</p>
          <div className="lp-ready">
            <span className="lp-pill lp-live" style={{ justifySelf: 'start' }}>AI call ready</span>
            <div className="lp-person"><span className="lp-avatar">P</span><div><b>Priya Sharma</b><small>Health Insurance · Hindi</small></div></div>
            <button type="button" className="lp-btn lp-btn-primary" style={{ background: 'var(--blue)', color: '#fff' }} onClick={() => launch('call')}>Start Call
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
          </div>
          <div className="lp-hero-cta"><button type="button" className="lp-btn lp-btn-primary" onClick={() => launch('call')}>Start Calling</button><a href="#how" className="lp-btn lp-btn-ghost" onClick={(e) => go(e, 'how')}>See How It Works</a></div>
        </div>
      </div>
    </section>
  )
}
