import { UserIcon, BackIcon, CheckIcon, PhoneIcon, SparkIcon, NetworkIcon } from './icons';

export function Brand() {
  return (
    <div className="ob-brand"><img src="/logo.jpg" alt="" /><span>ArhamAvaz</span></div>
  );
}

// Top bar for the post-signup screens: back, brand, account chip.
export function TopBar({ onBack }) {
  return (
    <header className="ob-top">
      {onBack ? <button type="button" className="ob-back" aria-label="Back" onClick={onBack}><BackIcon /></button> : <span className="ob-back-gap" />}
      <div className="ob-brand"><img src="/logo.jpg" alt="" /><span>ArhamAvaz</span></div>
      <span className="ob-avatar" aria-hidden="true"><UserIcon /></span>
    </header>
  );
}

export function Footer() {
  return <p className="ob-foot">Enterprise-grade 256-bit SOC2 compliance</p>;
}

const STEPS = [
  { id: 'signup', label: 'Create your account', hint: 'Name, mobile and password' },
  { id: 'verify', label: 'Verify your mobile', hint: 'Enter the 6-digit code' },
  { id: 'business', label: 'Your business', hint: 'Industry and use cases' },
  { id: 'workspace', label: 'Create workspace', hint: 'Name, URL and team' },
];
const BARS = [10, 22, 34, 24, 40, 56, 36, 48, 26, 38, 20, 12, 8];

// Web-only branded column; hidden on phones and the Android app (see onboarding.css).
export function SidePanel({ stage }) {
  const at = STEPS.findIndex((s) => s.id === stage);
  return (
    <aside className="ob-side" aria-hidden="true">
      <div className="ob-side-in">
        <div className="ob-side-brand"><img src="/logo.jpg" alt="" /><span>ArhamAvaz</span></div>
        <div className="ob-side-mid">
          <h2>Build your AI voice agent in minutes</h2>
          <p>Answer calls, qualify leads, book appointments and handle customer conversations automatically.</p>
          <ol className="ob-track">
            {STEPS.map((st, i) => (
              <li key={st.id} className={i < at ? 'done' : i === at ? 'now' : ''}>
                <span>{i < at ? <CheckIcon /> : i + 1}</span>
                <div><b>{st.label}</b><small>{st.hint}</small></div>
              </li>
            ))}
          </ol>
        </div>
        <div className="ob-side-foot">
          <div className="ob-wave">{BARS.map((h, i) => <span key={i} style={{ height: h * 0.8 }} />)}</div>
          <div className="ob-side-pills">
            <span><PhoneIcon /> Answer calls 24/7</span>
            <span><SparkIcon /> Automate conversations</span>
            <span><NetworkIcon /> Connect your tools</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
