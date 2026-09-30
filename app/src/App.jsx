import { Capacitor } from '@capacitor/core'
import { useEffect, useState } from 'react'
import { HomeIcon, ListIcon, PhoneIcon, SettingsIcon, AgentIcon, WalletIcon } from './components/icons'
import LandingPage from './components/landing/LandingPage'
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
import { getCompliance } from './compliance'

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
      getMe().then(res => { setCompany(res.company); getCompliance().catch(() => {}) }).catch(() => localStorage.removeItem('arhamavaz_token')).finally(() => setAuthLoading(false))
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
        <div className="brand">
          <img src="/logo.jpg" alt="" className="logo" />
          <div>
            <h1>ArhamAvaz</h1>
            <p>{company.name} · AI calls</p>
          </div>
        </div>
        <nav>
          {renderNav(TABS)}
        </nav>
        <footer>Powered by Bolna</footer>
      </aside>

      <header className="mobile-top">
        <img src="/logo.jpg" alt="" className="logo" />
        <div className="mobile-title">
          <h1>ArhamAvaz</h1>
          <p>{company.name}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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
        {tab === 'agents' && <AgentsPage settings={settings} onSaveSettings={updateSettings} />}
        {tab === 'billing' && <BillingPage settings={settings} />}
        {tab === 'settings' && <SettingsPage company={company} onLogout={() => { localStorage.removeItem('arhamavaz_token'); setCompany(null) }} />}
      </main>

      <nav className="tabbar">{renderNav(TABBAR)}</nav>
    </div>
  )
}
