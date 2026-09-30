import { Wave } from './primitives'
import { useLanding } from './LandingContext'
import useSequence from './useSequence'

const STEPS = [
  { label: 'AI Call Ready', note: 'Deepali is ready to call Priya' },
  { label: 'Calling', note: 'Dialing Priya Sharma…' },
  { label: 'Speaking', note: 'Deepali is speaking in Hindi' },
  { label: 'Customer Responded', note: 'Priya asked about her renewal' },
  { label: 'AI Summary Ready', note: 'Outcome captured for your advisor' },
]
const PERKS = ['Hindi · English · Hinglish', 'Transcripts and AI summaries', 'Excel or CSV import']

const Check = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
)
const Arrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

export default function FinalCTA() {
  const { launch, openBookDemo } = useLanding()
  const [ref, step] = useSequence(STEPS.length - 1, 1500, 4500)
  const speaking = step === 2 || step === 3
  const done = step === STEPS.length - 1

  return (
    <section id="start" style={{ paddingTop: '0' }}>
      <div className="lp-wrap">
        <div className="lp4-cta" ref={ref}>
          <span className="lp4-blob lp4-blob-a" aria-hidden="true" />
          <span className="lp4-blob lp4-blob-b" aria-hidden="true" />
          <span className="lp4-dots" aria-hidden="true" />
          <Wave n={64} className="lp4-wave" />

          <div className="lp4-copy">
            <span className="lp4-eyebrow"><i />Ready when you are</span>
            <h2>Turn repetitive calls into <span>automated conversations.</span></h2>
            <p>See how ArhamAawaaz can fit into your customer calling workflow.</p>
            <div className="lp4-btns">
              <button type="button" className="lp4-primary" onClick={() => launch('call')}>Start Calling <Arrow /></button>
              <button type="button" className="lp4-ghost" onClick={openBookDemo}>Book a Demo</button>
            </div>
            <ul className="lp4-perks">
              {PERKS.map((p) => <li key={p}><Check />{p}</li>)}
            </ul>
          </div>

          <div className={`lp4-card${speaking ? ' is-live' : ''}`} role="img" aria-label="Animated example of an AI call moving from ready to calling, speaking, customer responded and AI summary ready">
            <div className="lp4-card-top">
              <span className="lp4-avatar"><img src="/deepali.jpg" alt="" width="46" height="46" /></span>
              <div><b>Deepali</b><small>AI Advisor · ArhamAawaaz</small></div>
              <span className={`lp4-state${done ? ' is-done' : ''}`}>{STEPS[step].label}</span>
            </div>
            <div className="lp4-contact">
              <span>P</span>
              <div><b>Priya Sharma</b><small>Health Insurance · Hindi</small></div>
            </div>
            <Wave n={40} className="lp4-cardwave" />
            <p className="lp4-note" aria-live="polite">{STEPS[step].note}</p>
            <ol className="lp4-steps">
              {STEPS.map((s, i) => (
                <li key={s.label} className={i < step || done ? 'is-done' : i === step ? 'is-now' : ''}>
                  <span className="lp4-dot">{i < step || done ? <Check /> : null}</span>
                  <b>{s.label}</b>
                </li>
              ))}
            </ol>
            <div className={`lp4-sum${done ? ' is-in' : ''}`}>
              <small>AI Summary</small>
              Wants to renew. Follow-up requested.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
