import { useState } from 'react'
import { SCRIPTS, STAGES, TYPES } from './landingData'
import { Marked } from './primitives'

export default function Control() {
  const [type, setType] = useState('health')
  const [stage, setStage] = useState('renewal')
  const script = SCRIPTS[type][stage]
  const typeLabel = TYPES.find((t) => t.id === type).label
  const stageLabel = STAGES.find((s) => s.id === stage).label

  return (
    <section className="lp-bg-white">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Your agent. <span className="lp-hl">Your script.</span></h2>
          <p className="lp-sub">You control what the AI says. Changes apply to the next call.</p>
        </div>
        <div className="lp-ctl">
          <div className="lp-card">
            <h3>Agent identity</h3>
            <div className="lp-field"><label>Agent name</label><div className="lp-in">Deepali</div></div>
            <div className="lp-field"><label>Company</label><div className="lp-in">ArhamSecure</div></div>
            <h3>Opening line</h3>
            <div className="lp-editor" style={{ minHeight: 0 }}>
              <span className="lp-hi">नमस्ते <span className="lp-var">{'{name}'}</span> जी, मैं <span className="lp-var">{'{company}'}</span> से <span className="lp-var">{'{agent}'}</span> बोल रही हूँ…</span>
            </div>
          </div>
          <div className="lp-card">
            <div className="lp-chips" role="group" aria-label="Insurance type">
              {TYPES.map((t) => <button key={t.id} type="button" className="lp-chip" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>)}
            </div>
            <div className="lp-chips" role="group" aria-label="Conversation stage">
              {STAGES.map((s) => <button key={s.id} type="button" className="lp-chip" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>{s.label}</button>)}
            </div>
            <div className="lp-editor" aria-live="polite">
              <span className="lp-ln"><b>Goal:</b> {script.goal}</span>
              {script.steps.map((s, i) => <span className="lp-ln" key={s}>{i + 1}. <Marked text={s} /></span>)}
            </div>
            <div className="lp-saved"><span>{typeLabel} · {stageLabel} script</span><span className="lp-pill lp-good">Saved</span></div>
          </div>
        </div>
      </div>
    </section>
  )
}
