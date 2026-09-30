import { useState } from 'react';
import { login, signup } from '../api';
import { UserIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon, ArrowIcon, PhoneIcon, SparkIcon, NetworkIcon } from '../components/icons';
import { Brand, SidePanel } from '../components/OnboardingBits';

// Score 0-4: length, mixed case, number, symbol.
function passwordScore(pw) {
  return [pw.length >= 8, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
}

const BARS = Array.from({ length: 13 }, (_, i) => [10, 22, 34, 24, 40, 56, 36, 48, 26, 38, 20, 12, 8][i]);

export default function Auth({ onAuth }) {
  const [isLogin, setIsLogin] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const score = passwordScore(password);
  const emailOk = /^\S+@\S+\.\S+$/.test(email);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = isLogin ? await login(email, password) : await signup(name, email, password);
      localStorage.setItem('arhamavaz_token', data.token);
      onAuth(data.company, data.devCode);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ob-page">
      <SidePanel stage="signup" />
      <div className="ob-main">
      <div className="ob-wrap">
        <Brand />
        <h1 className="ob-hero ob-mobile-only">{isLogin ? 'Welcome back' : 'Build your AI voice agent'}</h1>
        <p className="ob-sub ob-mobile-only">
          {isLogin
            ? 'Log in to manage your agents, calls and responses.'
            : 'Create an AI voice agent that can answer calls, qualify leads, book appointments, and handle customer conversations automatically.'}
        </p>

        {!isLogin && (
          <div className="ob-showcase ob-mobile-only">
            <div className="ob-wave" aria-hidden="true">
              {BARS.map((h, i) => <span key={i} style={{ height: h, opacity: i === 6 ? 0.45 : 1 }} />)}
            </div>
            <span className="ob-pill"><PhoneIcon /> Answer calls 24/7</span>
            <span className="ob-pill"><SparkIcon /> Automate repetitive conversations</span>
            <span className="ob-pill"><NetworkIcon /> Connect your existing tools</span>
          </div>
        )}

        <form className="ob-card" onSubmit={handleSubmit}>
          <h2>{isLogin ? 'Log in' : 'Create your account'}</h2>
          <p className="ob-card-sub">{isLogin ? 'Enter your work email and password.' : 'Start deploying enterprise voice agents in minutes.'}</p>

          {!isLogin && (
            <label className="ob-field">
              <span>Full name</span>
              <div className="ob-input"><UserIcon /><input type="text" required placeholder="Alex Morgan" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} /></div>
            </label>
          )}
          <label className="ob-field">
            <span>Work email</span>
            <div className="ob-input">
              <MailIcon />
              <input type="email" required placeholder="alex@company.com" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              {emailOk && <em className="ob-ok" aria-hidden="true">✓</em>}
            </div>
          </label>
          <label className="ob-field">
            <span>Password</span>
            <div className="ob-input">
              <LockIcon />
              <input type={showPw ? 'text' : 'password'} required minLength={isLogin ? undefined : 8} placeholder={isLogin ? 'Your password' : 'Min. 8 characters'} autoComplete={isLogin ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} />
              <button type="button" className="ob-eye" aria-label={showPw ? 'Hide password' : 'Show password'} onClick={() => setShowPw(!showPw)}>{showPw ? <EyeOffIcon /> : <EyeIcon />}</button>
            </div>
          </label>

          {!isLogin && (
            <>
              <div className="ob-strength" aria-hidden="true">
                {[1, 2, 3, 4].map((n) => <i key={n} className={score >= n ? `on s${score}` : ''} />)}
              </div>
              <div className="ob-strength-lbl"><b>Security indicator</b><span>Mix case, numbers &amp; symbols</span></div>
            </>
          )}

          {error && <p className="ob-error" role="alert">{error}</p>}

          <button type="submit" className="ob-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : <>{isLogin ? 'Log in' : 'Create account'} <ArrowIcon /></>}
          </button>

          <p className="ob-switch">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} disabled={loading}>{isLogin ? 'Sign up' : 'Sign in'}</button>
          </p>
        </form>

        {!isLogin && <p className="ob-legal">By continuing, you agree to our <a href="#terms">Terms of Service</a> and <a href="#privacy">Privacy Policy</a>.</p>}
      </div>
      </div>
    </div>
  );
}
