const CASES = [
  { icon: '🔄', tone: 'blue', title: 'Policy renewals', problem: 'Renewal dates slip and customers lapse.', action: 'AI calls customers whose policies are approaching renewal.', result: 'Interested customers are surfaced for advisor follow-up.' },
  { icon: '📞', tone: 'violet', title: 'Lead follow-ups', problem: 'Advisors cannot dial every lead by hand.', action: 'AI works through your lead list and opens each conversation.', result: 'Advisors pick up the leads that showed interest.' },
  { icon: '🤝', tone: 'blue', title: 'Customer re-engagement', problem: 'Past customers go quiet.', action: 'AI reconnects and asks whether their cover still fits.', result: 'You see who wants another conversation.' },
  { icon: '🆕', tone: 'violet', title: 'New policy enquiries', problem: 'First conversations are repetitive.', action: 'AI asks the opening questions for Health, Life or Motor cover.', result: 'Summaries show who needs advisor attention.' },
  { icon: '🔁', tone: 'blue', title: 'Port and rollover', problem: 'Customers do not know their options.', action: 'AI explains porting or rollover and what carries over.', result: 'Interested customers are ready for an advisor call.' },
  { icon: '🗓️', tone: 'violet', title: 'Scheduled calls', problem: 'Calls need to land at the right time.', action: 'Schedule calls for a time you choose; the AI places them.', result: 'Outbound calling runs without watching the clock.' },
]

export default function UseCases() {
  return (
    <section id="usecases">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Built for <span className="lp-hl">insurance conversations.</span></h2>
          <p className="lp-sub">Health, Life and Motor, from renewals to rollover.</p>
        </div>
        <div className="lp2-uc-grid">
          {CASES.map((c) => (
            <article key={c.title} className={`lp-card lp2-uc lp2-uc-${c.tone}`}>
              <header><span className="lp2-uc-ico" aria-hidden="true">{c.icon}</span><h3>{c.title}</h3></header>
              <ol className="lp2-uc-flow">
                <li><small>Problem</small>{c.problem}</li>
                <li><small>AI action</small>{c.action}</li>
                <li className="is-result"><small>Result</small>{c.result}</li>
              </ol>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
