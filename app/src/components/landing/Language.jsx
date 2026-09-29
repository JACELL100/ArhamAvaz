import { useState } from 'react'
import { GREETINGS, LANGUAGE_CHIPS } from './landingData'
import { Typed, Wave } from './primitives'

export default function Language() {
  const [lang, setLang] = useState('hi')

  return (
    <section id="languages">
      <div className="lp-wrap lp-lang-grid">
        <div className="lp-lang-copy">
          <h2>Speak their <span className="lp-hl">language.</span></h2>
          <p className="lp-sub">Hindi. English. Hinglish.</p>
          <p className="lp-sub" style={{ fontSize: '15px' }}>Same caller, same script. The opening line follows the customer.</p>
        </div>
        <div className="lp-card lp-lang-card">
          <div className="lp-chips" role="group" aria-label="Language">
            {LANGUAGE_CHIPS.map((l) => (
              <button key={l.id} type="button" className="lp-chip" aria-pressed={lang === l.id} onClick={() => setLang(l.id)}>{l.label}</button>
            ))}
          </div>
          <div className="lp-speak">
            <div className="lp-person"><span className="lp-avatar">D</span><div><b>AI Voice · Deepali</b><small>ArhamSecure</small></div></div>
            <span className="lp-pill lp-live">Speaking</span>
          </div>
          <div className={`lp-greet ${lang === 'hi' ? 'lp-hi' : ''}`} aria-live="polite">
            <Typed key={lang} text={GREETINGS[lang]} />
          </div>
          <Wave n={52} />
        </div>
      </div>
    </section>
  )
}
