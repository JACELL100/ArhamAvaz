import { HomeBar, Island, SideButtons, StatusBar } from './PhoneParts'
import useSequence from './useSequence'

const MESSAGES = [
  { who: 'cust', text: 'Hi, I want to know about my policy renewal date.', time: '9:40 AM' },
  { who: 'ai', text: "Hello! I'm Deepali from ArhamAawaaz. I can help you with your policy renewal. May I have your policy number please?", time: '9:40 AM' },
  { who: 'cust', text: 'KT-50318', time: '9:41 AM' },
  { who: 'ai', text: 'Your renewal is on 2nd June. Would you like me to help you renew it now?', time: '9:41 AM' },
]
const ACTIONS = ['Renewal', 'Follow Up', 'Share Link']
const SUMMARY = 'Customer wants to renew policy KT-50318 on 2nd June. Share renewal link on WhatsApp.'

const Wavemark = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M4 12v0M8 8v8M12 4v16M16 8v8M20 12v0" /></svg>
)

// Steps 1-4 reveal the messages, step 5 the AI summary, step 6 the action chips.
export default function ChatPhone({ loop = true }) {
  const [ref, step] = useSequence(6, 1300, loop ? 6000 : 0)
  return (
    <div ref={ref} className="lp2-phone lp2-phone-chat" role="img" aria-label="Customer conversation with Deepali about policy renewal, ending in an AI summary">
      <SideButtons />
      <Island />
      <div className="lp2-screen lp2-chat-screen">
        <StatusBar />
        <div className="lp2-chat-head">
          <span className="lp2-chat-logo"><Wavemark /></span>
          <div><b>ArhamAawaaz</b><small><i />AI Assistant Active</small></div>
        </div>
        <div className="lp2-msgs">
          {MESSAGES.map((m, i) => (
            <div key={i} className={`lp2-msg lp2-msg-${m.who}${step > i ? ' is-in' : ''}`}>
              {m.who === 'cust' && <span className="lp2-msg-tag">Customer</span>}
              <p>{m.text}</p>
              <time>{m.time}</time>
            </div>
          ))}
        </div>
        <div className={`lp2-sumcard${step > 4 ? ' is-in' : ''}`}>
          <b>AI Summary</b>
          <p>{SUMMARY}</p>
        </div>
        <div className={`lp2-actions${step > 5 ? ' is-in' : ''}`}>
          {ACTIONS.map((a) => <span key={a}>{a}</span>)}
        </div>
        <HomeBar />
      </div>
    </div>
  )
}
