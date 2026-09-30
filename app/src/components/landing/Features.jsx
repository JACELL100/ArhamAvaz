const Arrow = () => <span className="lp2-fv-arrow" aria-hidden="true" />

const SECONDARY = [
  { icon: '📡', title: 'Live call status', body: 'Queued, ringing, in progress, completed or failed, at a glance.' },
  { icon: '💬', title: 'Call transcripts', body: 'Read the full conversation, with the recording alongside.' },
  { icon: '🎯', title: 'Follow-up outcomes', body: 'Summaries surface renewal requests and callbacks.' },
  { icon: '📂', title: 'Bulk contact import', body: 'Excel or CSV, with columns picked up automatically.' },
  { icon: '👛', title: 'Prepaid wallet billing', body: 'Top up in INR or USD, with a full transaction history.' },
  { icon: '✍️', title: 'Custom scripts', body: 'Set the agent, opening line and script for each stage.' },
]

export default function Features() {
  return (
    <section id="product">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>From first dial to <span className="lp-hl">actionable outcome.</span></h2>
          <p className="lp-sub">Everything your team needs to run outbound insurance calls.</p>
        </div>

        <div className="lp2-show">
          <article className="lp-card lp2-show-item">
            <div className="lp2-fv">
              <div className="lp2-fv-node"><span>📋</span><b>Contacts</b></div>
              <Arrow />
              <div className="lp2-fv-node is-live"><span>📞</span><b>AI call</b></div>
              <Arrow />
              <div className="lp2-fv-node"><span>✅</span><b>Outcome</b></div>
            </div>
            <h3>Automated outbound calling</h3>
            <p>Upload contacts and the AI works through the list, so advisors skip the repetitive dialing.</p>
          </article>

          <article className="lp-card lp2-show-item">
            <div className="lp2-fv lp2-fv-lang">
              <div><span className="lp-hi">नमस्ते</span><small>Hindi</small></div>
              <div><span>Hello</span><small>English</small></div>
              <div><span>Namaste ji</span><small>Hinglish</small></div>
            </div>
            <h3>Multilingual AI</h3>
            <p>Each customer is spoken to in the language they are comfortable with.</p>
          </article>

          <article className="lp-card lp2-show-item">
            <div className="lp2-fv lp2-fv-dom">
              <div><span>🩺</span><b>Health</b><small>Renewal · New · Port</small></div>
              <div><span>🛡️</span><b>Life</b><small>Renewal · New · Port</small></div>
              <div><span>🚗</span><b>Motor</b><small>Renewal · New · Rollover</small></div>
            </div>
            <h3>Insurance-focused conversations</h3>
            <p>Scripts built around Health, Life and Motor, not a generic calling bot.</p>
          </article>

          <article className="lp-card lp2-show-item">
            <div className="lp2-fv lp2-fv-intel">
              <div className="lp2-fv-t"><small>Transcript</small><i /><i className="s" /></div>
              <Arrow />
              <div className="lp2-fv-s"><small>AI Summary</small>Wants to renew</div>
              <Arrow />
              <div className="lp2-fv-f">Follow Up</div>
            </div>
            <h3>Call intelligence</h3>
            <p>Know what happened on every call without listening to it.</p>
          </article>
        </div>

        <ul className="lp2-sec">
          {SECONDARY.map((f) => (
            <li key={f.title}>
              <span className="lp2-sec-ico" aria-hidden="true">{f.icon}</span>
              <div><b>{f.title}</b><p>{f.body}</p></div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
