import '../voice.css'
import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition as NativeSpeech } from '@capacitor-community/speech-recognition'

const native = Capacitor.isNativePlatform()
const WebSpeech = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null
const join = (base, text) => (text ? (base && !/\s$/.test(base) ? `${base} ${text}` : base + text) : base)

const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="12" rx="3" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
)

export default function VoiceTextarea({ value, onChange, lang, placeholder, disabled, rows = 3 }) {
  const [supported, setSupported] = useState(native || !!WebSpeech)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recRef = useRef(null)
  const baseRef = useRef('')
  const latest = useRef({ value, onChange })
  useEffect(() => { latest.current = { value, onChange } })

  const emit = (text) => latest.current.onChange(join(baseRef.current, text.trim()))

  useEffect(() => {
    if (native) NativeSpeech.available().then((r) => setSupported(r.available)).catch(() => setSupported(false))
    return () => {
      recRef.current?.abort?.()
      if (native) {
        NativeSpeech.stop().catch(() => {})
        NativeSpeech.removeAllListeners()
      }
    }
  }, [])

  const stop = async () => {
    setListening(false)
    if (native) {
      await NativeSpeech.stop().catch(() => {})
      await NativeSpeech.removeAllListeners()
    } else recRef.current?.stop()
  }

  const start = async () => {
    setError('')
    baseRef.current = latest.current.value || ''
    if (native) {
      try {
        const perm = await NativeSpeech.requestPermissions()
        if (perm.speechRecognition !== 'granted') return setError('Microphone access is off. Allow it for ArhamAvaz in your phone’s Settings → Apps → Permissions.')
        await NativeSpeech.removeAllListeners()
        await NativeSpeech.addListener('partialResults', (d) => emit(d.matches?.[0] || ''))
        await NativeSpeech.addListener('listeningState', (d) => d.status === 'stopped' && setListening(false))
        setListening(true)
        await NativeSpeech.start({ language: lang, partialResults: true, popup: false })
      } catch (e) {
        setListening(false)
        setError(e?.message || 'Voice input failed.')
      }
      return
    }
    // Ask for the mic explicitly first: SpeechRecognition alone often fails with "not-allowed" without ever prompting.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
    } catch (e) {
      return setError(e?.name === 'NotFoundError'
        ? 'No microphone found on this device.'
        : 'Microphone is blocked. Click the icon at the left of the address bar, set Microphone to Allow, then tap the mic again.')
    }
    const rec = new WebSpeech()
    rec.lang = lang
    rec.continuous = true
    rec.interimResults = true
    rec.onresult = (e) => emit(Array.from(e.results, (r) => r[0].transcript.trim()).join(' '))
    rec.onerror = (e) => {
      if (e.error === 'not-allowed') setError('Microphone is blocked. Click the icon at the left of the address bar, set Microphone to Allow, then try again.')
      else if (e.error === 'service-not-allowed' || e.error === 'language-not-supported') setError('This browser’s voice service doesn’t support this language. Try Google Chrome, or type the goal.')
      else if (e.error === 'network') setError('Voice input needs an internet connection.')
      else if (e.error !== 'aborted' && e.error !== 'no-speech') setError('Voice input error. Please try again.')
    }
    rec.onend = () => { setListening(false); recRef.current = null }
    recRef.current = rec
    rec.start()
    setListening(true)
  }

  return (
    <div className={`voice-field ${listening ? 'listening' : ''}`}>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} rows={rows} />
      {supported && (
        <>
          {listening && <span className="voice-label">Listening…</span>}
          <button type="button" className="voice-mic" onClick={listening ? stop : start} disabled={disabled}
            aria-pressed={listening} title={listening ? 'Stop dictation' : 'Start dictation'}>
            <MicIcon />
          </button>
        </>
      )}
      {error && <p className="voice-error">{error}</p>}
    </div>
  )
}
