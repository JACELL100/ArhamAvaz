import { useEffect, useState } from 'react'
import { Wave } from './primitives'

const BARS = 48
const TOTAL_SECONDS = 134

const PlayIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
const PauseIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>

// Visual player only: the bars advance, no audio plays
export default function Record() {
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(Math.round(BARS * 0.35))

  useEffect(() => {
    if (!playing) return undefined
    const id = setInterval(() => setPos((p) => (p >= BARS ? 0 : p + 1)), 260)
    return () => clearInterval(id)
  }, [playing])

  const seconds = Math.round((pos / BARS) * TOTAL_SECONDS)
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} / 2:14`

  return (
    <section>
      <div className="lp-wrap lp-trust">
        <div className="lp-card">
          <h2 style={{ fontSize: 'clamp(28px,3.6vw,42px)' }}>Every conversation, <span className="lp-hl">easy to review.</span></h2>
          <p className="lp-sub" style={{ fontSize: '15px' }}>Recordings, transcripts and summaries stay together with each call.</p>
          <div className="lp-player">
            <button type="button" className="lp-play" aria-label={playing ? 'Pause preview' : 'Play preview'} onClick={() => setPlaying(!playing)}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <Wave n={BARS} played={pos} />
            <time className="lp-tnum">{clock}</time>
          </div>
          <div className="lp-sum"><span className="lp-cap">AI summary</span><p>Customer is interested in renewing the policy and requested a follow-up.</p></div>
          <div className="lp-chat">
            <div className="lp-bubble"><span className="lp-who">AI</span><span className="lp-hi">नमस्ते प्रिया जी, आपकी पॉलिसी रिन्यूअल के बारे में…</span></div>
            <div className="lp-bubble lp-cust"><span className="lp-who">Customer</span>Haan, mujhe renewal ke baare mein jaanna tha.</div>
          </div>
        </div>
        <div className="lp-phone" role="img" aria-label="ArhamAvaz on mobile">
          <div className="lp-screen">
            <div className="lp-top"><span>ArhamAvaz</span><span className="lp-pill lp-live">Live</span></div>
            <div className="lp-kpis">
              <div className="lp-kpi lp-accent"><span>Calls</span><strong>128</strong></div>
              <div className="lp-kpi"><span>Answered</span><strong>84</strong></div>
            </div>
            <div className="lp-row"><span>Priya Sharma</span><span className="lp-pill lp-live">In progress</span></div>
            <div className="lp-row"><span>Rahul Mehta</span><span className="lp-pill lp-good">Completed</span></div>
            <div className="lp-row"><span>Amit Shah</span><span className="lp-pill">Scheduled</span></div>
            <div className="lp-tabbar"><span className="lp-on">Home</span><span>Call</span><span>Responses</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
