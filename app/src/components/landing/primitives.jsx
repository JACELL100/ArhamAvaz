import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from './motion'

// Calls onSeen(el) once, the first time the element is at least 30% visible
function useSeen(ref, onSeen) {
  const cb = useRef(onSeen)
  useEffect(() => { cb.current = onSeen })
  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion() || !('IntersectionObserver' in window)) return undefined
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        io.disconnect()
        cb.current(el)
      }
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
}

const height = (i) => 22 + Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.53)) * 78

// Decorative voice waveform; the first `played` bars are drawn as played (recording player)
export function Wave({ n, className = 'lp-wave', style, played = 0 }) {
  return (
    <div className={className} style={style} aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={i < played ? 'lp-p' : undefined} style={{ '--h': height(i).toFixed(0), '--d': `${(-i * 0.09).toFixed(2)}s` }} />
      ))}
    </div>
  )
}

// The final value is rendered first so the page is complete at rest; it counts up once when scrolled into view
export function CountUp({ to, className }) {
  const ref = useRef(null)
  const [value, setValue] = useState(to)
  const frame = useRef(0)
  useSeen(ref, () => {
    const start = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - start) / 900)
      setValue(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  })
  useEffect(() => () => cancelAnimationFrame(frame.current), [])
  return <strong ref={ref} className={className}>{value}</strong>
}

// Horizontal bar that grows to `w` once when scrolled into view
export function Track({ w }) {
  const ref = useRef(null)
  useSeen(ref, (el) => {
    el.style.setProperty('--w', '0%')
    requestAnimationFrame(() => requestAnimationFrame(() => el.style.setProperty('--w', w)))
  })
  return <div className="lp-track"><i ref={ref} style={{ '--w': w }} /></div>
}

// Types `text` out one character at a time; remount it (key) to restart
export function Typed({ text }) {
  const [n, setN] = useState(() => (reducedMotion() ? text.length : 0))
  useEffect(() => {
    if (n >= text.length) return undefined
    const id = setTimeout(() => setN(n + 1), 22)
    return () => clearTimeout(id)
  }, [n, text])
  return (
    <>
      {text.slice(0, n)}
      {n < text.length && <span className="lp-caret" />}
    </>
  )
}

// "[[term]]" in a string renders as a highlighted term
export function Marked({ text }) {
  return text.split(/\[\[|\]\]/).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part))
}
