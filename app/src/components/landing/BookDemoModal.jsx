import { useState, useEffect } from 'react'

// In dev, Vite proxies /demo-api (the API's CORS only allows its own origin).
const API = import.meta.env.DEV ? '/demo-api' : 'https://inbox.arhamworkspace.tech/api/public/demo'

const pad = (n) => String(n).padStart(2, '0')
const localISODate = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

export default function BookDemoModal({ isOpen, onClose }) {
  const today = localISODate()
  const [date, setDate] = useState(today)
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', company: '' })
  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState('')
  const [meetLink, setMeetLink] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const handleClose = () => {
    setSelected(null)
    setBookError('')
    setMeetLink(null)
    setBooking(false)
    onClose()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleClose()
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  // Load available slots whenever the date changes
  useEffect(() => {
    if (!isOpen || !date) return
    const ctrl = new AbortController()
    setSlotsLoading(true)
    setSlotsError('')
    setSelected(null)
    fetch(`${API}/slots?date=${date}`, { signal: ctrl.signal })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(res.status === 429 ? 'Too many requests. Please try again later.' : data.error || 'Could not load slots.')
        setSlots(data.slots || [])
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setSlots([])
        setSlotsError(err.message || 'Could not load slots.')
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSlotsLoading(false)
      })
    return () => ctrl.abort()
  }, [isOpen, date, reloadKey])

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selected) return
    setBooking(true)
    setBookError('')
    try {
      const res = await fetch(`${API}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'ai-calling',
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim() || undefined,
          start: selected.start,
          end: selected.end,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          // Slot taken: go back to picking and refresh the list
          setSelected(null)
          setReloadKey((k) => k + 1)
        }
        setBookError(data.error || 'Could not book the demo. Please try again.')
        return
      }
      setMeetLink(data.meetLink || '')
    } catch {
      setBookError('Network error. Please check your connection and try again.')
    } finally {
      setBooking(false)
    }
  }

  const done = meetLink !== null

  // Quick-pick strip: the next 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return { iso: localISODate(d), wd: d.toLocaleDateString('en-IN', { weekday: 'short' }), dn: d.getDate(), mo: d.toLocaleDateString('en-IN', { month: 'short' }) }
  })

  return (
    <div className="lp-modal-backdrop" onClick={handleClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="lp-modal-card lp3-card" onClick={(e) => e.stopPropagation()}>
        <div className="lp3-head">
          <div>
            <span className="lp3-eyebrow">ArhamAawaaz · AI Calling</span>
            <h2 id="modal-title">{done ? 'Your demo is booked' : 'Book a demo'}</h2>
            <p>
              {done
                ? 'A calendar invite with the Google Meet link has been emailed to you.'
                : 'See how AI calls insurance leads in Hindi, English and Hinglish. Pick a time that suits you.'}
            </p>
          </div>
          <button type="button" className="lp3-close" onClick={handleClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {!done ? (
          <form onSubmit={handleSubmit} className="lp3-body">
            <div className="lp3-col">
              <h3 className="lp3-step"><b>1</b>Select a date</h3>
              <div className="lp3-days" role="group" aria-label="Pick a date">
                {days.map((d) => (
                  <button key={d.iso} type="button" className={`lp3-day${date === d.iso ? ' is-on' : ''}`} aria-pressed={date === d.iso} onClick={() => setDate(d.iso)}>
                    <small>{d.wd}</small><b>{d.dn}</b><small>{d.mo}</small>
                  </button>
                ))}
              </div>
              <label className="lp3-other">
                <span>Other date</span>
                <input type="date" min={today} value={date} onChange={(e) => setDate(e.target.value || today)} />
              </label>

              <h3 className="lp3-step"><b>2</b>Select a time <em>IST</em></h3>
              {slotsLoading ? (
                <p className="lp3-msg">Loading available times…</p>
              ) : slotsError ? (
                <p className="lp3-msg lp3-err">{slotsError}</p>
              ) : slots.length === 0 ? (
                <p className="lp3-msg">No times available on this day. Please try another date.</p>
              ) : (
                <div className="lp3-slots">
                  {slots.map((s) => (
                    <button key={s.start} type="button" className={`lp3-slot${selected?.start === s.start ? ' is-on' : ''}`} aria-pressed={selected?.start === s.start} onClick={() => setSelected(s)}>
                      {fmtTime(s.start)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="lp3-col lp3-side">
              <h3 className="lp3-step"><b>3</b>Your details</h3>
              <label className="lp3-field">
                <span>Full name <i>*</i></span>
                <input type="text" name="name" required autoComplete="name" placeholder="Priya Sharma" value={form.name} onChange={handleChange} />
              </label>
              <label className="lp3-field">
                <span>Work email <i>*</i></span>
                <input type="email" name="email" required autoComplete="email" placeholder="priya@company.com" value={form.email} onChange={handleChange} />
              </label>
              <label className="lp3-field">
                <span>Company <em>Optional</em></span>
                <input type="text" name="company" autoComplete="organization" placeholder="Company name" value={form.company} onChange={handleChange} />
              </label>

              <div className={`lp3-summary${selected ? ' is-on' : ''}`} aria-live="polite">
                {selected ? (
                  <>
                    <b>{fmtDate(selected.start)} · {fmtTime(selected.start)} IST</b>
                    <span>30-minute demo on Google Meet</span>
                  </>
                ) : (
                  <span>Choose a date and time to continue.</span>
                )}
              </div>

              {bookError && <p className="lp3-msg lp3-err" role="alert">{bookError}</p>}
              <button type="submit" disabled={booking || !selected} className="lp-btn lp-btn-primary lp3-submit">
                {booking ? 'Booking…' : 'Confirm booking'}
              </button>
              <p className="lp3-note">You will receive a calendar invite by email. We never share your details.</p>
            </div>
          </form>
        ) : (
          <div className="lp3-done">
            <span className="lp3-check">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
            </span>
            <h3>Thank you, {form.name.split(' ')[0]}.</h3>
            <div className="lp3-summary is-on">
              <b>{fmtDate(selected.start)} · {fmtTime(selected.start)} IST</b>
              <span>Invite sent to {form.email}</span>
            </div>
            {meetLink && (
              <a className="lp-btn lp-btn-primary" href={meetLink} target="_blank" rel="noopener noreferrer">Open Google Meet link</a>
            )}
            <button type="button" className="lp-btn lp-btn-ghost" onClick={handleClose}>Close</button>
          </div>
        )}
      </div>
    </div>
  )
}
