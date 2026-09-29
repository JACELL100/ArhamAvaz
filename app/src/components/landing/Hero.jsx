import { Wave } from './primitives'
import { useLanding } from './LandingContext'

export default function Hero() {
  const { go, launch } = useLanding()
  return (
    <section className="lp-hero">
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow"><i></i>AI calling for insurance advisors</span>
          <h1>Your AI advisor, calling in your <span className="lp-hl">customer's language.</span></h1>
          <p className="lp-sub">Upload contacts. ArhamAvaz calls them, follows your script, and gives you the outcome.</p>
          <div className="lp-hero-cta">
            <button type="button" className="lp-btn lp-btn-primary" onClick={() => launch('call')}>Start Calling
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
            <a href="#how" className="lp-btn lp-btn-ghost" onClick={(e) => go(e, 'how')}>See How It Works</a>
          </div>
          <div className="lp-hero-langs"><span className="lp-pill">Hindi</span><span className="lp-pill">English</span><span className="lp-pill">Hinglish</span><span>Health · Life · Motor</span></div>
        </div>
    
        <div className="lp-hero-stage">
          <div className="lp-float lp-card lp-f1"><span className="lp-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg></span><span>Scheduled<small>Tomorrow, 9:00 AM</small></span></div>
          <div className="lp-float lp-card lp-f2"><span className="lp-ico" style={{ background: 'var(--good-bg)' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg></span><span>Answered<small>Rahul Mehta</small></span></div>
          <div className="lp-float lp-card lp-f3"><span className="lp-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h13"/></svg></span><span>AI Summary<small>Interested in renewing. Follow-up requested.</small></span></div>
          <div className="lp-float lp-card lp-f4"><span className="lp-ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span><span className="lp-tnum">2m 14s<small>Talk time</small></span></div>
    
          <div className="lp-call lp-card">
            <div className="lp-call-top"><span className="lp-cap">AI call in progress</span><span className="lp-pill lp-live">In progress</span></div>
            <div className="lp-person" style={{ marginBottom: '16px' }}><span className="lp-avatar">P</span><div><b>Priya Sharma</b><small>+91 98765 43210</small></div></div>
            <div className="lp-tags"><span className="lp-pill">Health</span><span className="lp-pill">Renewal</span><span className="lp-pill">Hindi</span></div>
            <Wave n={42} className="lp-wave" />
            <div className="lp-bubble"><span className="lp-who">Deepali · AI advisor</span><span className="lp-hi">नमस्ते प्रिया जी, मैं दीपाली बोल रही हूँ…</span></div>
            <div className="lp-ctrls">
              <span className="lp-ctrl" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg></span>
              <span className="lp-ctrl lp-end" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M12 9c-3 0-5.5.9-7.5 2.6-.6.5-.7 1.4-.2 2l1.3 1.6c.4.5 1.1.6 1.7.3l2-1.1c.4-.2.6-.6.6-1v-1.3c1.2-.4 2.9-.4 4.2 0v1.3c0 .4.2.8.6 1l2 1.1c.6.3 1.3.2 1.7-.3l1.3-1.6c.5-.6.4-1.5-.2-2C17.500 9.900 15 9 12 9z"/></svg></span>
              <span className="lp-ctrl" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 9v6h4l5 4V5L8 9H4zM17 9a4 4 0 0 1 0 6"/></svg></span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
