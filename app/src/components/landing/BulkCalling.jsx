export default function BulkCalling() {
  return (
    <section>
      <div className="lp-wrap">
        <div className="lp-head"><h2>One list. <span className="lp-hl">Many conversations.</span></h2><p className="lp-sub">Upload your contacts. ArhamAvaz handles the calling.</p></div>
        <div className="lp-bulk">
          <div className="lp-card lp-sheet lp-scan">
            <div className="lp-sheet-h"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="2" strokeLinecap="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/></svg>messy_contacts.xlsx</div>
            <div className="lp-sheet-r"><span>Priya</span><span>9876543210</span></div>
            <div className="lp-sheet-r lp-odd"><span>Rahul</span><span>+91 98123-45678</span></div>
            <div className="lp-sheet-r"><span>Amit</span><span>98200 12345</span></div>
            <div className="lp-sheet-r lp-dup"><span>Priya</span><span>9876543210</span></div>
            <div className="lp-sheet-r lp-odd"><span>Neha</span><span>abc-12</span></div>
          </div>
          <div className="lp-arrow-mid"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M13 6l6 6-6 6"/></svg></div>
          <div className="lp-card lp-sheet">
            <div className="lp-clean-h"><b>Contacts ready</b><span className="lp-pill lp-good">3 ready · 1 invalid</span></div>
            <div className="lp-clean-r lp-hd"><span>Name</span><span>Phone</span><span>Language</span><span>Goal</span><span>Status</span></div>
            <div className="lp-clean-r"><b>Priya Sharma</b><span className="lp-tnum">+91 98765 43210</span><span className="lp-hi">हिन्दी</span><span>Renewal</span><span className="lp-pill lp-good">Ready</span></div>
            <div className="lp-clean-r"><b>Rahul Mehta</b><span className="lp-tnum">+91 98123 45678</span><span>English</span><span>New policy</span><span className="lp-pill lp-good">Ready</span></div>
            <div className="lp-clean-r"><b>Amit Shah</b><span className="lp-tnum">+91 98200 12345</span><span>Hinglish</span><span>Port</span><span className="lp-pill lp-good">Ready</span></div>
            <div className="lp-clean-r"><b>Neha</b><span className="lp-tnum">abc-12</span><span>—</span><span>—</span><span className="lp-pill lp-bad">Invalid</span></div>
            <div className="lp-checks"><span className="lp-pill lp-good">✓ Valid numbers</span><span className="lp-pill lp-good">✓ Duplicate removed</span><span className="lp-pill lp-good">✓ Language column matched</span><span className="lp-pill">+91 added</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
