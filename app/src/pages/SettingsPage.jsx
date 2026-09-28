import '../settings.css'
import { useEffect, useState } from 'react'
import { buildGreeting, DEFAULT_SETTINGS, INSURANCE_TYPES, LANGUAGES, SCRIPT_TYPES } from '../settings'
import PageHeader from '../components/PageHeader'

const PLACEHOLDERS = ['{name}', '{agent}', '{company}', '{insurance}']

export default function SettingsPage({ settings, onSave }) {
  const [draft, setDraft] = useState(settings)
  const [language, setLanguage] = useState('hi')
  const [insuranceType, setInsuranceType] = useState('health')
  const [scriptId, setScriptId] = useState('new')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!saved) return
    const t = setTimeout(() => setSaved(false), 2200)
    return () => clearTimeout(t)
  }, [saved])

  const dirty = JSON.stringify(draft) !== JSON.stringify(settings)
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_SETTINGS)
  const scriptIndex = SCRIPT_TYPES.findIndex((s) => s.id === scriptId)
  const scriptLabel = SCRIPT_TYPES[scriptIndex].label
  const insuranceLabel = INSURANCE_TYPES.find((t) => t.id === insuranceType).label

  const set = (key, value) => { setDraft((d) => ({ ...d, [key]: value })); setSaved(false) }
  const setGreeting = (lang, value) => {
    setDraft((d) => ({ ...d, greetings: { ...d.greetings, [lang]: value } }))
    setSaved(false)
  }
  const setScript = (type, id, value) => {
    setDraft((d) => ({ ...d, scripts: { ...d.scripts, [type]: { ...d.scripts[type], [id]: value } } }))
    setSaved(false)
  }

  function handleSave() {
    onSave(draft)
    setSaved(true)
  }

  function handleReset() {
    setDraft(DEFAULT_SETTINGS)
    setSaved(false)
  }

  return (
    <div className="narrow settings">
      <PageHeader title="Agent settings" subtitle="Customize your AI agent's identity, opening lines and scripts. Changes apply to the next call." />

      <section className="card">
        <h3 className="settings-title">Agent identity</h3>
        <div className="grid-2">
          <label className="field">
            <span>Agent name</span>
            <input value={draft.agentName} onChange={(e) => set('agentName', e.target.value)} placeholder="e.g. Deepali" />
          </label>
          <label className="field">
            <span>Company name</span>
            <input value={draft.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. ArhamSecure" />
          </label>
        </div>
      </section>

      <section className="card">
        <h3 className="settings-title">Opening line</h3>
        <div className="chips">
          {LANGUAGES.map((l) => (
            <button type="button" key={l.id} className={`chip ${language === l.id ? 'active' : ''}`} onClick={() => setLanguage(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{LANGUAGES.find((l) => l.id === language).name} greeting</span>
          <textarea rows={3} value={draft.greetings[language]} onChange={(e) => setGreeting(language, e.target.value)} />
        </label>
        <p className="settings-hint">
          Placeholders: {PLACEHOLDERS.map((p) => <code key={p}>{p}</code>)}
        </p>
        <div className="preview">
          <small>Preview</small>
          <p className="preview-bubble">{buildGreeting(draft, { language, name: 'Rahul', insuranceType: 'health' })}</p>
        </div>
      </section>

      <section className="card">
        <h3 className="settings-title">Conversation scripts</h3>
        <div className="chips insurance-chips" role="group" aria-label="Insurance type">
          {INSURANCE_TYPES.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`chip ${insuranceType === t.id ? 'active' : ''}`}
              aria-pressed={insuranceType === t.id}
              onClick={() => setInsuranceType(t.id)}
            >
              <span className="chip-icon" aria-hidden="true">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="segmented script-segmented" style={{ '--count': SCRIPT_TYPES.length, '--index': scriptIndex }}>
          <span className="segmented-thumb" />
          {SCRIPT_TYPES.map((s) => (
            <button type="button" key={s.id} className={s.id === scriptId ? 'active' : ''} onClick={() => setScriptId(s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="settings-hint">Used for {insuranceLabel} calls when Current policy is set to “{scriptLabel}”.</p>
        <textarea
          className="tall"
          value={draft.scripts[insuranceType][scriptId]}
          onChange={(e) => setScript(insuranceType, scriptId, e.target.value)}
          aria-label={`${insuranceLabel} ${scriptLabel} script`}
        />
      </section>

      <section className="card">
        <h3 className="settings-title">General guidelines</h3>
        <p className="settings-hint">Product knowledge and closing rules shared by every call.</p>
        <textarea className="tall" value={draft.guidelines} onChange={(e) => set('guidelines', e.target.value)} aria-label="General guidelines" />
      </section>

      <div className="settings-bar">
        <span className={`saved-note ${saved ? 'show' : ''}`}>Saved ✓</span>
        {dirty && !saved && <span className="unsaved-note">Unsaved changes</span>}
        <button type="button" className="btn-secondary" onClick={handleReset} disabled={isDefault}>
          Reset to defaults
        </button>
        <button type="button" className="btn-primary" onClick={handleSave} disabled={!dirty}>
          Save changes
        </button>
      </div>
    </div>
  )
}
