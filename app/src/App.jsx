import { useState, useEffect } from 'react'
import { HomeIcon, ListIcon, PhoneIcon, SettingsIcon, AgentIcon } from './components/icons'
import CallPage from './pages/CallPage'
import Home from './pages/Home'
import Responses from './pages/Responses'
import SettingsPage from './pages/SettingsPage'
import Auth from './pages/Auth'
import AgentsPage from './pages/AgentsPage'
import Onboarding from './pages/Onboarding'
import './onboarding.css'
import { loadSettings, saveSettings } from './settings'
import useCalls from './useCalls'
import { getMe } from './api'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'call', label: 'Call', Icon: PhoneIcon },
  { id: 'responses', label: 'Responses', Icon: ListIcon },
  { id: 'agents', label: 'Agents', Icon: AgentIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]
// Mobile: "Settings" lives in the top header, so the bottom tab bar only shows the rest.
const TABBAR = TABS.filter((t) => t.id !== 'settings')

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const [tab, setTab] = useState(() => (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'home'))
  const [selectedId, setSelectedId] = useState(() => params.get('call'))
  const [settings, setSettings] = useState(loadSettings)
  const { calls, loading, error, refresh } = useCalls()
  
  const [company, setCompany] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [devCode, setDevCode] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('arhamavaz_token')
    if (token) {
      getMe().then(res => setCompany(res.company)).catch(() => localStorage.removeItem('arhamavaz_token')).finally(() => setAuthLoading(false))
    } else {
      setAuthLoading(false)
    }
  }, [])

  function go(next) {
    setTab(next)
    window.scrollTo({ top: 0 })
  }

  function openCall(id) {
    setSelectedId(id)
    go('responses')
  }

  function updateSettings(next) {
    setSettings(next)
    saveSettings(next)
  }

  const renderNav = (items) =>
    items.map(({ id, label, Icon }) => (
      <button
        key={id}
        type="button"
        className={`nav-item ${tab === id ? 'active' : ''}`}
        aria-current={tab === id ? 'page' : undefined}
        onClick={() => go(id)}
      >
        {Icon ? <Icon /> : <span style={{fontSize:'1.2rem'}}>🤖</span>}
        <span>{label}</span>
      </button>
    ))

  if (authLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'var(--muted)' }}>Loading...</div>
  if (!company) return <Auth onAuth={(c, code) => { setDevCode(code || ''); setCompany(c) }} />
  if (company.stage && company.stage !== 'done') return <Onboarding company={company} devCode={devCode} onUpdate={setCompany} />

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="" className="logo" />
          <div>
            <h1>ArhamAvaz</h1>
            <p>{company.name} · AI calls</p>
          </div>
        </div>
        <nav>{renderNav(TABS)}</nav>
        <footer>Powered by Bolna</footer>
      </aside>

      <header className="mobile-top">
        <img src="/logo.jpg" alt="" className="logo" />
        <div className="mobile-title">
          <h1>ArhamAvaz</h1>
          <p>{company.name}</p>
        </div>
        <button
          type="button"
          className={`top-settings ${tab === 'settings' ? 'active' : ''}`}
          aria-label="Settings"
          onClick={() => go('settings')}
        >
          <SettingsIcon />
        </button>
      </header>

      <main className="content" key={tab}>
        {tab === 'home' && <Home calls={calls} loading={loading} onNewCall={() => go('call')} onOpenCall={openCall} />}
        {tab === 'call' && <CallPage settings={settings} onCallPlaced={refresh} onViewResponses={() => go('responses')} />}
        {tab === 'responses' && (
          <Responses calls={calls} loading={loading} error={error} refresh={refresh} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {tab === 'agents' && <AgentsPage />}
        {tab === 'settings' && (
          <div className="narrow" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="card form" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>Account</h3>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Logged in as {company.email}</div>
              </div>
              <button 
                type="button" 
                className="tone-bad" 
                style={{ padding: '8px 16px', borderRadius: '99px', border: 'none', fontWeight: 700, cursor: 'pointer' }} 
                onClick={() => { localStorage.removeItem('arhamavaz_token'); setCompany(null); }}
              >
                Log out
              </button>
            </div>
            <SettingsPage settings={settings} onSave={updateSettings} />
          </div>
        )}
      </main>

      <nav className="tabbar">{renderNav(TABBAR)}</nav>
    </div>
  )
}
