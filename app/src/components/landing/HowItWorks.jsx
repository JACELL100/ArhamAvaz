import { Wave } from './primitives'

const Arrow = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
)

// One connected workflow: Upload -> Configure -> Call -> Outcome
export default function HowItWorks() {
  return (
    <section className="lp-bg-white" id="how">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>How ArhamAawaaz <span className="lp-hl">works.</span></h2>
          <p className="lp-sub">Four steps from contact list to call outcome.</p>
        </div>
        <ol className="lp2-wf">
          <li className="lp2-wf-step">
            <div className="lp2-wf-top"><b>1</b><span>Upload</span></div>
            <div className="lp2-wf-view">
              <div className="lp2-file">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
                contacts.xlsx
              </div>
              <div className="lp2-rows"><i /><i /><i /></div>
              <span className="lp-pill lp-good">48 contacts</span>
            </div>
            <h3>Upload contacts</h3>
            <p>Import your customer or lead list using Excel or CSV.</p>
          </li>
          <li className="lp2-wf-step">
            <div className="lp2-wf-top"><b>2</b><span>Configure</span></div>
            <div className="lp2-wf-view">
              <div className="lp2-chiprow"><span className="is-on">Hindi</span><span>English</span><span>Hinglish</span></div>
              <div className="lp2-chiprow"><span className="is-on">Health</span><span>Life</span><span>Motor</span></div>
              <div className="lp2-goal"><small>Call goal</small>Renew policy before it lapses</div>
            </div>
            <h3>Choose the conversation</h3>
            <p>Select the language, insurance category and calling script.</p>
          </li>
          <li className="lp2-wf-step">
            <div className="lp2-wf-top"><b>3</b><span>Call</span></div>
            <div className="lp2-wf-view lp2-wf-call">
              <span className="lp-pill lp-live">Speaking...</span>
              <Wave n={30} className="lp-wave" style={{ height: '46px' }} />
              <div className="lp2-mini-bubble">Namaste, main Deepali bol rahi hoon…</div>
            </div>
            <h3>AI calls customers</h3>
            <p>Deepali handles outbound conversations using your configured script.</p>
          </li>
          <li className="lp2-wf-step">
            <div className="lp2-wf-top"><b>4</b><span>Outcome</span></div>
            <div className="lp2-wf-view">
              <div className="lp2-mini-sum"><small>AI Summary</small>Interested in renewal. Follow-up requested.</div>
              <div className="lp2-tags"><span>Renewal</span><span>Follow Up</span></div>
              <span className="lp-pill lp-good">Transcript ready</span>
            </div>
            <h3>Get outcomes</h3>
            <p>Review call status, transcripts, summaries and customer intent.</p>
          </li>
        </ol>
        <p className="lp2-wf-flow" aria-hidden="true">Upload <Arrow /> Configure <Arrow /> Call <Arrow /> Outcome</p>
      </div>
    </section>
  )
}
