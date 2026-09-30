import { useEffect, useRef, useState } from 'react'
import { reducedMotion } from './motion'

// Reveals `count` steps one at a time once the element scrolls into view.
// Reduced motion (or no IntersectionObserver) shows every step immediately.
export default function useSequence(count, interval = 1100, loopAfter = 0) {
  const ref = useRef(null)
  const still = reducedMotion() || typeof IntersectionObserver === 'undefined'
  const [step, setStep] = useState(still ? count : 0)
  const [seen, setSeen] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (still || !el) return undefined
    const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [still])

  useEffect(() => {
    if (still || !seen) return undefined
    if (step >= count) {
      if (!loopAfter) return undefined
      const t = setTimeout(() => setStep(0), loopAfter)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 500 : interval)
    return () => clearTimeout(t)
  }, [still, seen, step, count, interval, loopAfter])

  return [ref, step]
}
