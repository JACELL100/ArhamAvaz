import { CountUp, Track } from './primitives'

export default function Insights() {
  return (
    <section className="lp-bg-white" id="insights">
      <div className="lp-wrap">
        <div className="lp-head"><h2>See what's <span className="lp-hl">connecting.</span></h2></div>
        <div className="lp-ins">
          <div className="lp-kpi-row">
            <div className="lp-kpi lp-big lp-card" style={{ padding: '18px' }}><div className="lp-ring" style={{ '--v': '66' }}><b>66%</b></div><div><span className="lp-cap">Connect rate</span><p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Answered ÷ total calls</p></div></div>
            <div className="lp-kpi"><span>Total calls</span><CountUp className="lp-tnum" to={128} /></div>
            <div className="lp-kpi"><span>Answered</span><CountUp className="lp-tnum" to={84} /></div>
            <div className="lp-kpi"><span>Missed</span><CountUp className="lp-tnum" to={44} /></div>
            <div className="lp-kpi"><span>Avg. talk time</span><strong className="lp-tnum">2m 14s</strong></div>
          </div>
          <div className="lp-bk lp-card"><h4>Insurance type</h4>
            <div className="lp-bar-row"><span>Health</span><Track w="82%" /><b>52</b></div>
            <div className="lp-bar-row"><span>Life</span><Track w="46%" /><b>29</b></div>
            <div className="lp-bar-row"><span>Motor</span><Track w="75%" /><b>47</b></div></div>
          <div className="lp-bk lp-card"><h4>Policy stage</h4>
            <div className="lp-bar-row"><span>New policy</span><Track w="55%" /><b>35</b></div>
            <div className="lp-bar-row"><span>Renewal</span><Track w="90%" /><b>58</b></div>
            <div className="lp-bar-row"><span>Rollover</span><Track w="56%" /><b>35</b></div></div>
          <div className="lp-bk lp-card"><h4>Language</h4>
            <div className="lp-bar-row"><span className="lp-hi">हिन्दी</span><Track w="85%" /><b>66</b></div>
            <div className="lp-bar-row"><span>English</span><Track w="40%" /><b>31</b></div>
            <div className="lp-bar-row"><span>Hinglish</span><Track w="40%" /><b>31</b></div></div>
        </div>
        <p className="lp-cap-note">Interface preview with sample values. These are the metrics the dashboard reports.</p>
      </div>
    </section>
  )
}
