export default function Problem() {
  return (
    <section className="lp-bg-white">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Renewals shouldn't depend on <span className="lp-hl">manual dialing.</span></h2>
          <p className="lp-sub">Missed calls become missed conversations.</p>
        </div>
        <div className="lp-ba">
          <div className="lp-card lp-panel lp-old">
            <h3>Manual calling <span className="lp-cap">By hand</span></h3>
            <div className="lp-row"><span><i className="lp-dot-n">1</i>Customer 01</span><span className="lp-pill lp-bad">Missed</span></div>
            <div className="lp-row"><span><i className="lp-dot-n">2</i>Customer 02</span><span className="lp-pill lp-warn">No answer</span></div>
            <div className="lp-row"><span><i className="lp-dot-n">3</i>Customer 03</span><span className="lp-pill lp-mute">Pending</span></div>
            <div className="lp-row"><span><i className="lp-dot-n">4</i>Customer 04</span><span className="lp-pill lp-mute">Not called</span></div>
          </div>
          <div className="lp-arrow-mid"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></div>
          <div className="lp-card lp-panel lp-new">
            <h3>ArhamAvaz <span className="lp-pill lp-live">Calling</span></h3>
            <div className="lp-row"><span><i className="lp-dot-n" style={{ background: 'var(--good-bg)', color: 'var(--good)' }}>1</i>Customer 01</span><span className="lp-pill lp-good">Answered</span></div>
            <div className="lp-row"><span><i className="lp-dot-n" style={{ background: 'var(--sky)', color: 'var(--blue-deep)' }}>2</i>Customer 02</span><span className="lp-pill">Scheduled</span></div>
            <div className="lp-row"><span><i className="lp-dot-n" style={{ background: 'var(--sky)', color: 'var(--blue-deep)' }}>3</i>Customer 03</span><span className="lp-pill lp-live">In progress</span></div>
            <div className="lp-row"><span><i className="lp-dot-n" style={{ background: 'var(--good-bg)', color: 'var(--good)' }}>4</i>Customer 04</span><span className="lp-pill lp-good">Completed</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
