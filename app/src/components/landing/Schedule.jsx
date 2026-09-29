import { useEffect, useState } from 'react'
import { QUEUE } from './landingData'
import { reducedMotion } from './motion'

const Icon = ({ children }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" strokeWidth="2" strokeLinecap="round">{children}</svg>
)

export default function Schedule() {
  const [when, setWhen] = useState('later')
  const [placed, setPlaced] = useState(0)

  // The queue steps forward every couple of seconds: scheduled -> calling -> called
  useEffect(() => {
    if (reducedMotion()) return undefined
    const id = setInterval(() => setPlaced((p) => (p + 1) % (QUEUE.length + 1)), 2200)
    return () => clearInterval(id)
  }, [])

  const choose = (next) => {
    setWhen(next)
    setPlaced(0)
  }

  return (
    <section className="lp-bg-white">
      <div className="lp-wrap">
        <div className="lp-head"><h2>Call now. <span className="lp-hl">Or call later.</span></h2></div>
        <div className="lp-sched">
          <div className="lp-card">
            <div className="lp-toggle">
              <button type="button" aria-pressed={when === 'now'} onClick={() => choose('now')}>Call now</button>
              <button type="button" aria-pressed={when === 'later'} onClick={() => choose('later')}>Call later</button>
            </div>
            <div className="lp-fields" style={{ opacity: when === 'now' ? 0.45 : 1 }}>
              <div className="lp-field"><label>Date</label><div className="lp-in">Tomorrow<Icon><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></Icon></div></div>
              <div className="lp-field"><label>Time</label><div className="lp-in lp-tnum">09:00 AM<Icon><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Icon></div></div>
              <div className="lp-field lp-full"><label>Spacing between calls</label><div className="lp-in"><span className="lp-tnum">5 min between calls</span><span className="lp-stepper"><span>−</span><span>+</span></span></div></div>
            </div>
            <div className="lp-prog"><i style={{ width: `${(placed / QUEUE.length) * 100}%` }} /></div>
            <span className="lp-cap">{placed} of {QUEUE.length} placed</span>
          </div>
          <div className="lp-card">
            <div className="lp-queue">
              {QUEUE.map((q, i) => {
                const state = i < placed ? 'done' : i === placed ? 'now' : 'wait'
                const time = when === 'now' ? (i === 0 ? 'Now' : `+${i * 5} min`) : q.time
                return (
                  <div key={q.name} className={`lp-q ${state === 'wait' ? '' : `lp-${state}`}`}>
                    <time className="lp-tnum">{time}</time>
                    <span className="lp-person"><span className="lp-avatar">{q.initial}</span><b>{q.name}</b></span>
                    {state === 'done' && <span className="lp-pill lp-good">Called</span>}
                    {state === 'now' && <span className="lp-pill lp-live">Calling</span>}
                    {state === 'wait' && <span className="lp-pill">{when === 'now' ? 'Queued' : 'Scheduled'}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
