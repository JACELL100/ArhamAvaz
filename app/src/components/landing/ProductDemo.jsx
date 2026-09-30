import { useLanding } from './LandingContext'
import AIPhone from './AIPhone'
import useSequence from './useSequence'

const LINES = [
  { who: 'AI', text: 'Namaste, main Deepali bol rahi hoon ArhamAawaaz se. Aapki policy renewal ke baare mein baat karni thi.' },
  { who: 'Customer', text: 'Haan, renewal date kya hai?' },
  { who: 'AI', text: 'Aapki renewal 2nd June ko hai. Kya main renewal link WhatsApp par bhej doon?' },
]
const TAGS = ['Renewal', 'Follow Up', 'Share Link']

export default function ProductDemo() {
  const { openBookDemo } = useLanding()
  const [ref, step] = useSequence(LINES.length + 2, 1500, 7000)
  return (
    <section className="lp-bg-white" id="demo">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Hear the call. <span className="lp-hl">Read the outcome.</span></h2>
          <p className="lp-sub">A sample conversation, from the AI's opening line to the summary your advisor receives.</p>
        </div>
        <div className="lp2-demo" ref={ref}>
          <AIPhone />
          <span className="lp2-demo-arrow" aria-hidden="true" />
          <div className="lp-card lp2-demo-panel">
            <div className="lp2-demo-top"><b>Conversation</b><span className="lp-pill lp-live">Sample call</span></div>
            <div className="lp2-demo-lines" aria-live="polite">
              {LINES.map((l, i) => (
                <div key={i} className={`lp2-line lp2-line-${l.who === 'AI' ? 'ai' : 'cust'}${step > i ? ' is-in' : ''}`}>
                  <span>{l.who === 'AI' ? 'Deepali · AI Advisor' : 'Customer'}</span>
                  {l.text}
                </div>
              ))}
            </div>
            <div className={`lp2-demo-sum${step > LINES.length ? ' is-in' : ''}`}>
              <span className="lp-cap">AI summary</span>
              <p>Customer wants to renew policy KT-50318 on 2nd June. Share renewal link on WhatsApp.</p>
              <div className="lp2-tags">{TAGS.map((t) => <span key={t}>{t}</span>)}</div>
            </div>
          </div>
        </div>
        <div className="lp2-demo-cta">
          <button type="button" className="lp-btn lp-btn-primary" onClick={openBookDemo}>See it live: Book a Demo</button>
        </div>
      </div>
    </section>
  )
}
