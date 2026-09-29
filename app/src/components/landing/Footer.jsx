import { useLanding } from './LandingContext'

export default function Footer() {
  const { go } = useLanding()
  return (
    <footer>
      <div className="lp-wrap lp-foot">
        <div><a href="#top" className="lp-logo" onClick={(e) => go(e, 'top')}><span className="lp-logo-mark"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round"><path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0"/></svg></span>ArhamAvaz</a><p>AI calling for insurance advisors.</p></div>
        <nav aria-label="Footer"><a href="#product"  onClick={(e) => go(e, 'product')}>Product</a><a href="#how"  onClick={(e) => go(e, 'how')}>How It Works</a><a href="#usecases"  onClick={(e) => go(e, 'usecases')}>Use Cases</a><a href="#start"  onClick={(e) => go(e, 'start')}>Contact</a></nav>
        <small>© ArhamAvaz</small>
      </div>
    </footer>
  )
}
