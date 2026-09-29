import { Wave } from './primitives'

export default function HowItWorks() {
  return (
    <section className="lp-bg-white" id="how">
      <div className="lp-wrap">
        <div className="lp-head"><h2>From contact list to <span className="lp-hl">conversation.</span></h2></div>
        <div className="lp-flow">
          <div className="lp-step"><div className="lp-card lp-mini">
              <div className="lp-file-chip"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>contacts.xlsx</div>
              <div className="lp-line lp-m"></div><div className="lp-line lp-s"></div><div className="lp-line lp-m"></div><span className="lp-pill lp-good" style={{ justifySelf: 'start' }}>48 contacts</span></div>
            <span className="lp-stepno">Step 1</span><h3>Upload</h3><p>Excel / CSV</p></div>
          <div className="lp-step"><div className="lp-card lp-mini">
              <span className="lp-cap">Language</span><div className="lp-chips"><span className="lp-chip lp-on">Hindi</span><span className="lp-chip">English</span></div>
              <span className="lp-cap" style={{ marginTop: '6px' }}>Call goal</span><div className="lp-line lp-m" style={{ height: '34px', borderRadius: '10px', background: 'var(--bg)', border: '1px solid var(--line)' }}></div></div>
            <span className="lp-stepno">Step 2</span><h3>Personalize</h3><p>Language + goal</p></div>
          <div className="lp-step"><div className="lp-card lp-mini" style={{ alignContent: 'center' }}>
              <Wave n={26} className="lp-wave" style={{ height: '44px' }} />
              <div className="lp-bubble" style={{ marginTop: '0', fontSize: '12.5px', padding: '10px 12px' }}>Namaste, main Deepali bol rahi hoon…</div>
              <span className="lp-pill lp-live" style={{ justifySelf: 'start' }}>In progress</span></div>
            <span className="lp-stepno">Step 3</span><h3>Call</h3><p>AI speaks with the customer</p></div>
          <div className="lp-step"><div className="lp-card lp-mini">
              <div className="lp-sum" style={{ padding: '10px 12px' }}><span className="lp-cap">AI summary</span><p style={{ fontSize: '12.5px' }}>Wants to renew. Follow-up requested.</p></div>
              <div className="lp-bubble lp-cust" style={{ marginTop: '2px', fontSize: '12px', padding: '8px 12px' }}>Haan, renewal ke baare mein…</div>
              <span className="lp-pill lp-good" style={{ justifySelf: 'start' }}>Transcript ready</span></div>
            <span className="lp-stepno">Step 4</span><h3>Review</h3><p>Summary + transcript</p></div>
        </div>
      </div>
    </section>
  )
}
