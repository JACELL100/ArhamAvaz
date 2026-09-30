import { CountUp, Track } from './primitives'
import { useLanding } from './LandingContext'

export default function Overview() {
  const { go } = useLanding()
  return (
    <section id="workspace">
      <div className="lp-wrap">
        <div className="lp-head">
          <h2>Every call. <span className="lp-hl">One workspace.</span></h2>
          <p className="lp-sub">Call. Track. Review.</p>
        </div>
        <div className="lp-card lp-dash">
          <div className="lp-dash-bar"><i></i><i></i><i></i><b>ArhamAawaaz · Dashboard</b></div>
          <div className="lp-dash-body">
            <aside className="lp-side">
              <a href="#workspace" className="lp-on" onClick={(e) => go(e, 'workspace')}>Home</a><a href="#workspace"  onClick={(e) => go(e, 'workspace')}>Call</a><a href="#workspace"  onClick={(e) => go(e, 'workspace')}>Responses</a><a href="#workspace"  onClick={(e) => go(e, 'workspace')}>Settings</a>
            </aside>
            <div className="lp-main">
              <div className="lp-kpis">
                <div className="lp-kpi lp-accent"><span>Total calls</span><CountUp className="lp-tnum" to={128} /><small>14 today</small></div>
                <div className="lp-kpi"><span>Answered</span><CountUp className="lp-tnum" to={84} /><small>66% connect rate</small></div>
                <div className="lp-kpi"><span>Missed</span><CountUp className="lp-tnum" to={44} /><small>Busy, no answer or failed</small></div>
                <div className="lp-kpi"><span>Avg. talk time</span><strong className="lp-tnum">2m 14s</strong><small>Sample data</small></div>
              </div>
              <div className="lp-breaks">
                <div className="lp-bk"><h4>Insurance type</h4>
                  <div className="lp-bar-row"><span>Health</span><Track w="82%" /><b>52</b></div>
                  <div className="lp-bar-row"><span>Life</span><Track w="46%" /><b>29</b></div>
                  <div className="lp-bar-row"><span>Motor</span><Track w="75%" /><b>47</b></div></div>
                <div className="lp-bk"><h4>Policy stage</h4>
                  <div className="lp-bar-row"><span>New policy</span><Track w="55%" /><b>35</b></div>
                  <div className="lp-bar-row"><span>Renewal</span><Track w="90%" /><b>58</b></div>
                  <div className="lp-bar-row"><span>Rollover</span><Track w="56%" /><b>35</b></div></div>
                <div className="lp-bk"><h4>Language</h4>
                  <div className="lp-bar-row"><span className="lp-hi">हिन्दी</span><Track w="85%" /><b>66</b></div>
                  <div className="lp-bar-row"><span>English</span><Track w="40%" /><b>31</b></div>
                  <div className="lp-bar-row"><span>Hinglish</span><Track w="40%" /><b>31</b></div></div>
              </div>
              <div className="lp-tbl">
                <div className="lp-tbl-h"><span>Customer</span><span>Insurance</span><span>Language</span><span>Status</span><span>Duration</span></div>
                <div className="lp-tbl-r"><b><span className="lp-avatar">P</span>Priya Sharma</b><span>Health</span><span className="lp-hi">हिन्दी</span><span><span className="lp-pill lp-live">In progress</span></span><span className="lp-tnum">2m 14s</span></div>
                <div className="lp-tbl-r"><b><span className="lp-avatar">R</span>Rahul Mehta</b><span>Motor</span><span>English</span><span><span className="lp-pill lp-good">Completed</span></span><span className="lp-tnum">3m 02s</span></div>
                <div className="lp-tbl-r"><b><span className="lp-avatar">A</span>Amit Shah</b><span>Life</span><span>Hinglish</span><span><span className="lp-pill">Scheduled</span></span><span className="lp-tnum">—</span></div>
              </div>
            </div>
          </div>
        </div>
        <p className="lp-cap-note">Interface preview with sample values.</p>
      </div>
    </section>
  )
}
