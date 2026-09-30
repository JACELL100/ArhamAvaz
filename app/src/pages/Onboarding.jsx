import { useEffect, useRef, useState } from 'react';
import { verifyOtp, resendOtp, saveBusiness, checkSlug, saveWorkspace } from '../api';
import { TopBar, Footer, SidePanel } from '../components/OnboardingBits';
import {
  MailIcon, ArrowIcon, CheckIcon, ClockIcon, BuildingIcon, CalendarIcon, HeadsetIcon, TrendIcon, RouteIcon,
  OutboundIcon, BellIcon, NetworkIcon, HeartIcon, HomeBuildingIcon, CoinIcon, CartIcon, BedIcon, CarIcon,
  WaveIcon, SparkIcon, ShieldIcon, UploadIcon, PhoneIcon,
} from '../components/icons';

const OTP_LEN = 6;
const RESEND_SECONDS = 60;

const INDUSTRIES = [
  { id: 'Healthcare', Icon: HeartIcon },
  { id: 'Real Estate', Icon: HomeBuildingIcon },
  { id: 'Financial Services', Icon: CoinIcon },
  { id: 'E-commerce', Icon: CartIcon },
  { id: 'Hospitality', Icon: BedIcon },
  { id: 'Automotive', Icon: CarIcon },
];

const USE_CASES = [
  { id: 'appointments', Icon: CalendarIcon, title: 'Appointment Booking', desc: 'Schedule appointments, sync calendar availability, and manage reschedules.' },
  { id: 'support', Icon: HeadsetIcon, title: 'Customer Support', desc: 'Answer customer questions, provide business hours, and resolve common inquiries.' },
  { id: 'sales', Icon: TrendIcon, title: 'Sales & Lead Qualification', desc: 'Talk to prospects, qualify leads, and capture requirements cleanly.' },
  { id: 'reception', Icon: RouteIcon, title: 'Receptionist & Routing', desc: 'Answer incoming calls 24/7 and route warm transfers to human staff.' },
  { id: 'outbound', Icon: OutboundIcon, title: 'Outbound Calling', desc: 'Automatically call leads, follow up on quotes, or remind customers.' },
  { id: 'collections', Icon: BellIcon, title: 'Collections & Reminders', desc: 'Handle payment reminders, invoice notifications, and automated follow-ups.' },
  { id: 'custom', Icon: NetworkIcon, title: 'Custom Workflow', pro: true, desc: 'Build a fully custom voice prompt and real-time webhook API logic.' },
];

const ICONS = [
  { id: 'wave', Icon: WaveIcon }, { id: 'spark', Icon: SparkIcon }, { id: 'shield', Icon: ShieldIcon },
  { id: 'network', Icon: NetworkIcon }, { id: 'phone', Icon: PhoneIcon },
];
const TEAM_SIZES = ['Just me', '2–5', '6–20', '21–50', '50+'];

const slugify = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

function useCountdown(seconds) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return [left, setLeft];
}

function VerifyStep({ company, devCode, onDone }) {
  const [digits, setDigits] = useState(Array(OTP_LEN).fill(''));
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState(devCode || '');
  const [left, setLeft] = useCountdown(RESEND_SECONDS);
  const refs = useRef([]);

  const code = digits.join('');

  function setAt(i, v) {
    setDigits((d) => d.map((x, j) => (j === i ? v : x)));
  }

  function onChange(i, raw) {
    const v = raw.replace(/\D/g, '');
    if (!v) return setAt(i, '');
    if (v.length > 1) return fill(v);
    setAt(i, v);
    if (i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  }

  function fill(text) {
    const v = text.replace(/\D/g, '').slice(0, OTP_LEN);
    if (!v) return;
    setDigits(Array.from({ length: OTP_LEN }, (_, i) => v[i] || ''));
    refs.current[Math.min(v.length, OTP_LEN - 1)]?.focus();
  }

  function onKeyDown(i, e) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < OTP_LEN - 1) refs.current[i + 1]?.focus();
  }

  async function pasteFromClipboard() {
    try { fill(await navigator.clipboard.readText()); } catch { setError('Clipboard unavailable. Paste into the first box instead.'); }
  }

  async function submit(e) {
    e?.preventDefault();
    if (code.length < OTP_LEN) return setError('Enter the 6-digit code.');
    setBusy(true);
    setError('');
    try {
      onDone((await verifyOtp(code)).company);
    } catch (err) {
      setError(err.message);
      if (!/expired/i.test(err.message)) { setDigits(Array(OTP_LEN).fill('')); refs.current[0]?.focus(); }
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError('');
    try {
      const r = await resendOtp();
      setHint(r.devCode || '');
      setDigits(Array(OTP_LEN).fill(''));
      setLeft(RESEND_SECONDS);
      refs.current[0]?.focus();
    } catch (err) {
      setError(err.message);
    }
  }

  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  return (
    <div className="ob-wrap ob-center">
      <div className="ob-mailbadge"><div><MailIcon /></div><i><CheckIcon /></i></div>
      <h1 className="ob-hero">Verify your mobile number</h1>
      <p className="ob-sub">We sent a 6-digit verification code to your mobile number.</p>
      <div className="ob-emailchip"><PhoneIcon /><b>{company.phone}</b></div>

      <form className="ob-card" onSubmit={submit}>
        <div className="ob-code-head">
          <span>Security code</span>
          <button type="button" onClick={pasteFromClipboard}>Paste code</button>
        </div>
        <div className="ob-otp">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (refs.current[i] = el)}
              value={d}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              maxLength={OTP_LEN}
              aria-label={`Digit ${i + 1}`}
              className={error ? 'bad' : ''}
              autoFocus={i === 0}
              onChange={(e) => onChange(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={(e) => { e.preventDefault(); fill(e.clipboardData.getData('text')); }}
            />
          ))}
        </div>
        {error && <p className="ob-error" role="alert">{error}</p>}
        <button type="submit" className="ob-btn" disabled={busy || code.length < OTP_LEN}>
          {busy ? <span className="spinner" /> : <>Verify mobile <ArrowIcon /></>}
        </button>
        <p className="ob-resend">
          Didn't receive the code?{' '}
          <button type="button" disabled={left > 0} onClick={resend}>Resend code</button>
        </p>
        {left > 0 && <div className="ob-timer"><ClockIcon /> Resend available in <b>{mm}:{ss}</b></div>}
        {hint && <p className="ob-devhint">Dev mode: no SMS provider connected. Your code is <b>{hint}</b>.</p>}
      </form>

      <p className="ob-secure"><ShieldIcon /> Your session is protected with secure mobile verification</p>
    </div>
  );
}

function BusinessStep({ company, onDone }) {
  const [org, setOrg] = useState(company.industry ? company.name : '');
  const [industry, setIndustry] = useState(company.industry || '');
  const [cases, setCases] = useState(company.useCases || []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) => setCases((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const ready = org.trim() && industry && cases.length > 0;

  async function next() {
    setBusy(true);
    setError('');
    try {
      onDone((await saveBusiness({ organization: org, industry, useCases: cases })).company);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ob-wrap">
      <div className="ob-steprow"><b>Step 1 of 2</b><span><ClockIcon /> Takes ~2 mins</span></div>
      <div className="ob-progress"><i style={{ width: '50%' }} /></div>
      <p className="ob-eyebrow"><span className="ob-dot" /> Agent brain calibration</p>
      <h1 className="ob-hero left">Let's build the right AI agent for you</h1>
      <p className="ob-sub left">Tell us what you want your AI voice agent to handle. We'll use this to create your tailored starting setup.</p>

      <section className="ob-card">
        <h3><BuildingIcon /> 1. What does your business do?</h3>
        <label className="ob-field">
          <span>Organization name</span>
          <div className="ob-input"><BuildingIcon /><input value={org} onChange={(e) => setOrg(e.target.value)} placeholder="Acme Healthcare" />{org.trim() && <em className="ob-ok">✓</em>}</div>
        </label>
        <div className="ob-field"><span>Primary industry</span>
          <div className="ob-chips">
            {INDUSTRIES.map(({ id, Icon }) => (
              <button type="button" key={id} className={industry === id ? 'on' : ''} aria-pressed={industry === id} onClick={() => setIndustry(id)}>
                <Icon /> {id} {industry === id && <CheckIcon />}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="ob-usecases">
        <h3>2. What do you want your AI agent to do?</h3>
        <p className="ob-hint">Select all use cases that apply (multiple selections enabled).</p>
        {USE_CASES.map(({ id, Icon, title, desc, pro }) => {
          const on = cases.includes(id);
          return (
            <button type="button" key={id} className={`ob-case ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(id)}>
              <span className="ob-case-ic"><Icon /></span>
              <span className="ob-case-tx"><b>{title}{pro && <em>PRO</em>}</b><small>{desc}</small></span>
              <span className="ob-check">{on && <CheckIcon />}</span>
            </button>
          );
        })}
      </section>

      <div className="ob-note"><WaveIcon /><div><b>Neural Voice Architecture</b><small>{cases.length} use case{cases.length === 1 ? '' : 's'} selected for training</small></div></div>
      <p className="ob-tip"><SparkIcon /> You can adjust voice prompts and change these settings anytime.</p>
      {error && <p className="ob-error" role="alert">{error}</p>}
      <div className="ob-actions">
        <button type="button" className="ob-btn ob-btn-ghost" disabled>Back</button>
        <button type="button" className="ob-btn" disabled={!ready || busy} onClick={next}>
          {busy ? <span className="spinner" /> : <>Continue to Step 2 <ArrowIcon /></>}
        </button>
      </div>
    </div>
  );
}

function WorkspaceStep({ company, onDone }) {
  const initial = company.workspaceName || company.name || '';
  const [name, setName] = useState(initial);
  const [slug, setSlug] = useState(company.workspaceSlug || slugify(initial));
  const [slugTouched, setSlugTouched] = useState(!!company.workspaceSlug);
  const [avail, setAvail] = useState(null); // null=checking, true, false
  const [icon, setIcon] = useState(company.workspaceIcon || 'wave');
  const [team, setTeam] = useState(company.teamSize || '2–5');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (slug.length < 3) { setAvail(false); return; }
    setAvail(null);
    let live = true;
    const t = setTimeout(() => {
      checkSlug(slug).then((r) => live && setAvail(r.available)).catch(() => live && setAvail(false));
    }, 350);
    return () => { live = false; clearTimeout(t); };
  }, [slug]);

  function onName(v) {
    setName(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  async function create() {
    setBusy(true);
    setError('');
    try {
      onDone((await saveWorkspace({ name, slug, icon, teamSize: team })).company);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="ob-wrap">
      <div className="ob-steprow"><b>Step 2 of 2</b><span>Workspace Setup</span></div>
      <div className="ob-progress"><i style={{ width: '100%' }} /></div>
      <h1 className="ob-hero left">Create your workspace</h1>
      <p className="ob-sub left">Your workspace is where you'll manage your AI agents, phone numbers, call logs, and team members.</p>

      <section className="ob-card">
        <label className="ob-field">
          <span>Workspace name</span>
          <div className="ob-input"><input value={name} onChange={(e) => onName(e.target.value)} placeholder="Acme Healthcare" /><BuildingIcon /></div>
        </label>
        <div className="ob-field">
          <span className="ob-row">Workspace URL
            {avail !== null && <em className={`ob-avail ${avail ? '' : 'no'}`}>{avail ? <><CheckIcon /> URL available</> : slug.length < 3 ? 'Too short' : 'Unavailable'}</em>}
          </span>
          <div className="ob-input ob-slug"><b>app.arhamavaz.com/</b><input value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugify(e.target.value)); }} placeholder="acme-healthcare" /></div>
        </div>
        <div className="ob-field"><span>Workspace icon</span>
          <div className="ob-icons">
            {ICONS.map(({ id, Icon }) => (
              <button type="button" key={id} className={icon === id ? 'on' : ''} aria-pressed={icon === id} aria-label={`Icon ${id}`} onClick={() => setIcon(id)}><Icon /></button>
            ))}
            <button type="button" className="up" onClick={() => setError('Custom icon upload is coming soon.')}><UploadIcon /> Upload</button>
          </div>
        </div>
        <div className="ob-field"><span className="ob-q">How many people are on your team?</span>
          <div className="ob-seg">
            {TEAM_SIZES.map((t) => <button type="button" key={t} className={team === t ? 'on' : ''} aria-pressed={team === t} onClick={() => setTeam(t)}>{t}</button>)}
          </div>
        </div>
      </section>

      <div className="ob-note"><PhoneIcon /><div><b>Dedicated SIP Trunk</b><small>Automated low-latency carrier route provisioning</small></div><em>AUTO</em></div>
      {error && <p className="ob-error" role="alert">{error}</p>}
      <button type="button" className="ob-btn" disabled={busy || !name.trim() || avail !== true} onClick={create}>
        {busy ? <span className="spinner" /> : <>Create workspace <ArrowIcon /></>}
      </button>
    </div>
  );
}

export default function Onboarding({ company, devCode, onUpdate }) {
  const stage = company.stage;
  const [reviewing, setReviewing] = useState(false);
  const back = stage === 'workspace' ? () => setReviewing(true) : null;

  // "Back" on the workspace step returns to the business step without losing saved answers.
  if (stage === 'workspace' && reviewing) {
    return (
      <div className="ob-page">
        <SidePanel stage="business" />
        <div className="ob-main">
          <TopBar />
          <BusinessStep company={company} onDone={(c) => { setReviewing(false); onUpdate(c); }} />
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="ob-page">
      <SidePanel stage={stage} />
      <div className="ob-main">
      <TopBar onBack={back} />
      {stage === 'verify' && <VerifyStep company={company} devCode={devCode} onDone={onUpdate} />}
      {stage === 'business' && <BusinessStep company={company} onDone={onUpdate} />}
      {stage === 'workspace' && <WorkspaceStep company={company} onDone={onUpdate} />}
      <Footer />
      </div>
    </div>
  );
}
