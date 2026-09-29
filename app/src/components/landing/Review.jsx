import { useState } from 'react'
import { CALLS } from './landingData'
import { Wave } from './primitives'

function Detail({ call }) {
  const missed = call.status === 'Missed'
  return (
    <div className="lp-rdetail" aria-live="polite">
      <div className="lp-rhead">
        <div className="lp-person"><span className="lp-avatar">{call.name[0]}</span><b>{call.name}</b></div>
        <span className={`lp-pill ${missed ? 'lp-bad' : 'lp-good'}`}>{call.status}</span>
      </div>
      <div className="lp-facts">
        <div><span>Duration</span><b className="lp-tnum">{call.duration}</b></div>
        <div><span>Language</span><b>{call.language}</b></div>
        <div><span>Insurance</span><b>{call.insurance}</b></div>
        <div><span>Policy stage</span><b>{call.stage}</b></div>
      </div>
      {missed ? (
        <div className="lp-sum"><span className="lp-cap">No conversation</span><p>The call was not answered. It stays in Missed so you can try again.</p></div>
      ) : (
        <>
          <div className="lp-player">
            <span className="lp-play"><svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg></span>
            <Wave n={40} played={16} />
            <time className="lp-tnum">Recording</time>
          </div>
          <div className="lp-sum"><span className="lp-cap">AI summary</span><p>{call.summary}</p></div>
          <div className="lp-chat">
            {call.transcript.map((m) => (
              <div key={m.text} className={`lp-bubble ${m.who === 'AI' ? '' : 'lp-cust'}`}>
                <span className="lp-who">{m.who}</span>
                <span className={m.hindi ? 'lp-hi' : undefined}>{m.text}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Review() {
  const [index, setIndex] = useState(0)

  return (
    <section>
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Every conversation, <span className="lp-hl">in writing.</span></h2>
          <p className="lp-sub">Read what happened without listening to every call.</p>
        </div>
        <div className="lp-card lp-review">
          <div className="lp-rlist" role="tablist" aria-label="Calls">
            <div className="lp-rsearch">Search name, phone, insurance…</div>
            <div className="lp-rchips"><span className="lp-chip lp-on">All 3</span><span className="lp-chip">Answered 2</span><span className="lp-chip">Missed 1</span></div>
            {CALLS.map((c, i) => (
              <button key={c.name} type="button" role="tab" className="lp-ritem" aria-selected={index === i} onClick={() => setIndex(i)}>
                <span className="lp-person"><span className="lp-avatar">{c.name[0]}</span><span><b>{c.name}</b><small>{c.sub}</small></span></span>
                <span className={`lp-pill ${c.status === 'Missed' ? 'lp-bad' : 'lp-good'}`}>{c.status}</span>
              </button>
            ))}
          </div>
          <Detail call={CALLS[index]} />
        </div>
      </div>
    </section>
  )
}
