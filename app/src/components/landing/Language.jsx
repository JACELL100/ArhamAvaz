import { useState } from 'react'
import { Wave } from './primitives'

const LANGS = [
  {
    id: 'hi', label: 'Hindi', deva: true,
    lines: [
      { who: 'ai', text: 'नमस्ते प्रिया जी, मैं ArhamAawaaz से दीपाली बोल रही हूँ। आपकी पॉलिसी रिन्यूअल के बारे में बात करनी थी।' },
      { who: 'cust', text: 'पॉलिसी का रिन्यूअल कब है?' },
      { who: 'ai', text: 'जी, मैं आपकी पॉलिसी की रिन्यूअल डिटेल्स चेक करने में मदद करती हूँ।' },
    ],
  },
  {
    id: 'en', label: 'English',
    lines: [
      { who: 'ai', text: 'Hi Priya, this is Deepali from ArhamAawaaz. I am calling about your policy renewal.' },
      { who: 'cust', text: 'When is my renewal due?' },
      { who: 'ai', text: 'Let me check your renewal details and help you with the next step.' },
    ],
  },
  {
    id: 'hinglish', label: 'Hinglish',
    lines: [
      { who: 'ai', text: 'Hello Priya ji, main Deepali bol rahi hoon ArhamAawaaz se. Aapki policy renewal ke baare mein baat karni thi.' },
      { who: 'cust', text: 'Policy ka renewal kab hai?' },
      { who: 'ai', text: 'Ji, main aapki policy renewal details check karne mein help karti hoon.' },
    ],
  },
]

export default function Language() {
  const [id, setId] = useState('hi')
  const lang = LANGS.find((l) => l.id === id)

  return (
    <section id="languages">
      <div className="lp-wrap lp-lang-grid">
        <div className="lp-lang-copy">
          <h2>Your customers speak naturally. <span className="lp-hl">Your AI adapts.</span></h2>
          <p className="lp-sub">Hindi, English and Hinglish, with the same caller and the same script. Pick a language to hear how the conversation changes.</p>
        </div>
        <div className="lp-card lp-lang-card lp2-lang-card">
          <div className="lp-chips" role="group" aria-label="Language">
            {LANGS.map((l) => (
              <button key={l.id} type="button" className="lp-chip" aria-pressed={id === l.id} onClick={() => setId(l.id)}>{l.label}</button>
            ))}
          </div>
          <div className="lp-speak">
            <div className="lp-person"><span className="lp-avatar">D</span><div><b>AI Voice · Deepali</b><small>ArhamAawaaz</small></div></div>
            <span className="lp-pill lp-live">Speaking</span>
          </div>
          <Wave n={44} style={{ height: '40px' }} />
          <div className="lp2-lang-chat" key={id} aria-live="polite">
            {lang.lines.map((l, i) => (
              <div key={i} className={`lp2-lang-line lp2-lang-${l.who}${lang.deva ? ' lp-hi' : ''}`} style={{ animationDelay: `${i * 0.35}s` }}>
                <span>{l.who === 'ai' ? 'Deepali' : 'Customer'}</span>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
