import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { HomeIcon, ListIcon, PhoneIcon, SettingsIcon, AgentIcon, WalletIcon } from './components/icons'
import LandingPage from './components/landing/LandingPage'
import { GlobeIcon } from './components/landing/LandingIcons'
import BillingPage from './pages/BillingPage'
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
  { id: 'billing', label: 'Billing', Icon: WalletIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]
// Mobile: "Billing" and "Settings" live in the top header, so the bottom tab bar only shows the rest.
const TABBAR = TABS.filter((t) => t.id !== 'settings' && t.id !== 'billing')

export default function App() {
  const [tab, setTab] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    const current = params.get('tab')
    if (current === 'landing') return 'landing'
    if (TABS.some((t) => t.id === current)) return current
    // The installed Android app opens straight into the dashboard; the website opens on the landing page
    return Capacitor.isNativePlatform() ? 'home' : 'landing'
  })
  const [selectedId, setSelectedId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('call')
  })
  const [settings, setSettings] = useState(loadSettings)
  const { calls, loading, error, refresh } = useCalls(tab !== 'landing')

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (tab === 'landing') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const query = params.toString() ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, '', query)
  }, [tab])

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

  if (tab === 'landing') {
    return <LandingPage onLaunchApp={(next) => go(next || 'call')} />
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
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => go('landing')}>
          <img src="/logo.jpg" alt="" className="logo" />
          <div>
            <h1>ArhamAvaz</h1>
            <p>{company.name} · AI calls</p>
          </div>
        </div>
        <nav>
          {renderNav(TABS)}
          <button
            type="button"
            className="nav-item"
            style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}
            onClick={() => go('landing')}
          >
            <GlobeIcon style={{ width: 18, height: 18 }} />
            <span>Landing Page</span>
          </button>
        </nav>
        <footer>Powered by Bolna</footer>
      </aside>

      <header className="mobile-top">
        <img src="/logo.jpg" alt="" className="logo" onClick={() => go('landing')} style={{ cursor: 'pointer' }} />
        <div className="mobile-title" onClick={() => go('landing')} style={{ cursor: 'pointer' }}>
          <h1>ArhamAvaz</h1>
          <p>{company.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="top-settings"
            aria-label="Website"
            onClick={() => go('landing')}
            title="Landing Page"
          >
            <GlobeIcon style={{ width: 18, height: 18 }} />
          </button>
          <button
            type="button"
            className={`top-settings ${tab === 'billing' ? 'active' : ''}`}
            aria-label="Billing"
            onClick={() => go('billing')}
          >
            <WalletIcon />
          </button>
          <button
            type="button"
            className={`top-settings ${tab === 'settings' ? 'active' : ''}`}
            aria-label="Settings"
            onClick={() => go('settings')}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      <main className="content" key={tab}>
        {tab === 'home' && <Home calls={calls} loading={loading} onNewCall={() => go('call')} onOpenCall={openCall} />}
        {tab === 'call' && <CallPage settings={settings} onCallPlaced={refresh} onViewResponses={() => go('responses')} />}
        {tab === 'responses' && (
          <Responses calls={calls} loading={loading} error={error} refresh={refresh} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {tab === 'agents' && <AgentsPage />}
        {tab === 'billing' && <BillingPage settings={settings} />}
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
