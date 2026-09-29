import { useState } from 'react'
import { SCRIPTS, STAGES, TYPES } from './landingData'
import { Marked } from './primitives'

export default function ScriptDemo() {
  const [type, setType] = useState('health')
  const [stage, setStage] = useState('new')
  const script = SCRIPTS[type][stage]
  const typeLabel = TYPES.find((t) => t.id === type).label
  const stageLabel = STAGES.find((s) => s.id === stage).long

  return (
    <section className="lp-bg-white">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Your script. <span className="lp-hl">Your insurance context.</span></h2>
          <p className="lp-sub">Not a generic voice bot.</p>
        </div>
        <div className="lp-script-wrap">
          <div className="lp-card lp-selectors">
            <div>
              <h3>Insurance type</h3>
              <div className="lp-chips" role="group" aria-label="Insurance type">
                {TYPES.map((t) => (
                  <button key={t.id} type="button" className="lp-chip" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.label}</button>
                ))}
              </div>
            </div>
            <div>
              <h3>Conversation stage</h3>
              <div className="lp-stage-list" role="group" aria-label="Conversation stage">
                {STAGES.map((s) => (
                  <button key={s.id} type="button" className="lp-chip" aria-pressed={stage === s.id} onClick={() => setStage(s.id)}>{s.long}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="lp-card lp-preview" aria-live="polite">
            <div className="lp-preview-head"><span className="lp-cap">Script preview</span><span className="lp-pill">{typeLabel} · {stageLabel}</span></div>
            <p className="lp-goal">Goal: {script.goal}</p>
            <div className="lp-opening"><Marked text={script.open} /></div>
            <ol className="lp-steps-l">
              {script.steps.map((s) => <li key={s}><span><Marked text={s} /></span></li>)}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
