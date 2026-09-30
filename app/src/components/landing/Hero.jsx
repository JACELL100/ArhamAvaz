import AIPhone from './AIPhone'
import ChatPhone from './ChatPhone'
import { useLanding } from './LandingContext'

export default function Hero() {

  const { launch, openBookDemo } = useLanding()

  return (
    <section className="lp-hero-section">
      <div className="lp-hero-bg-glow" aria-hidden="true" />
      <div className="lp-wrap">
        <div className="lp-hero-grid">
          {/* LEFT COLUMN */}
          <div className="lp-hero-copy">
            <div className="lp-eyebrow-badge">
              <span className="lp-eyebrow-dot" />
              <span>AI VOICE CALLING FOR INSURANCE ADVISORS</span>
            </div>

            <h1 className="lp-hero-heading">
              Your AI calling assistant,{' '}
              <span className="lp-hl-gradient">speaking in your customer's language.</span>
            </h1>

            <p className="lp-hero-sub">
              ArhamAawaaz calls your leads and customers automatically, follows your script, speaks in Hindi, English or Hinglish, and gives you the outcome with AI summaries.
            </p>

            <div className="lp-hero-cta-group">
              <button
                type="button"
                className="lp-btn lp-btn-primary lp-btn-glow"
                onClick={() => launch('call')}
              >
                Start Calling
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </button>

              <button
                type="button"
                className="lp-btn lp-btn-ghost"
                onClick={openBookDemo}
              >
                Book a Demo
              </button>
            </div>

            <div className="lp-hero-trust-grid">
              <div className="lp-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Human-like AI voice</span>
              </div>
              <div className="lp-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Hindi · English · Hinglish</span>
              </div>
              <div className="lp-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>Insurance-focused conversations</span>
              </div>
              <div className="lp-trust-item">
                <span className="lp-trust-check">✓</span>
                <span>AI-generated call summaries</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: two live phone screens */}
          <div className="lp2-duo">
            <AIPhone />
            <ChatPhone />
          </div>
        </div>
      </div>
    </section>
  )
}
