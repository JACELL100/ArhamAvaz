import { useState } from 'react'
import { HomeIcon, ListIcon, PhoneIcon, SettingsIcon, UploadIcon } from './components/icons'
import BulkCallPage from './pages/BulkCallPage'
import CallPage from './pages/CallPage'
import Home from './pages/Home'
import Responses from './pages/Responses'
import SettingsPage from './pages/SettingsPage'
import { loadSettings, saveSettings } from './settings'
import useCalls from './useCalls'

const TABS = [
  { id: 'home', label: 'Home', Icon: HomeIcon },
  { id: 'call', label: 'Call', Icon: PhoneIcon },
  { id: 'bulk', label: 'Bulk', Icon: UploadIcon },
  { id: 'responses', label: 'Responses', Icon: ListIcon },
  { id: 'settings', label: 'Settings', Icon: SettingsIcon },
]
// Mobile: "Call" lives in the top header, so the bottom tab bar only shows the rest.
const TABBAR = TABS.filter((t) => t.id !== 'call')

export default function App() {
  const params = new URLSearchParams(window.location.search)
  const [tab, setTab] = useState(() => (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'home'))
  const [selectedId, setSelectedId] = useState(() => params.get('call'))
  const [settings, setSettings] = useState(loadSettings)
  const { calls, loading, error, refresh } = useCalls()

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
        <Icon />
        <span>{label}</span>
      </button>
    ))

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/logo.jpg" alt="" className="logo" />
          <div>
            <h1>ArhamAvaz</h1>
            <p>{settings.companyName} · AI calls</p>
          </div>
        </div>
        <nav>{renderNav(TABS)}</nav>
        <footer>Powered by Bolna</footer>
      </aside>

      <header className="mobile-top">
        <img src="/logo.jpg" alt="" className="logo" />
        <div className="mobile-title">
          <h1>ArhamAvaz</h1>
          <p>{settings.companyName || 'AI calls'}</p>
        </div>
        <button
          type="button"
          className={`top-call ${tab === 'call' ? 'active' : ''}`}
          aria-current={tab === 'call' ? 'page' : undefined}
          aria-label="New call"
          onClick={() => go('call')}
        >
          <PhoneIcon />
          <span>Call</span>
        </button>
      </header>

      <main className="content" key={tab}>
        {tab === 'home' && <Home calls={calls} loading={loading} onNewCall={() => go('call')} onOpenCall={openCall} />}
        {tab === 'call' && <CallPage settings={settings} onCallPlaced={refresh} onViewResponses={() => go('responses')} />}
        {tab === 'bulk' && <BulkCallPage settings={settings} onCallPlaced={refresh} />}
        {tab === 'responses' && (
          <Responses calls={calls} loading={loading} error={error} refresh={refresh} selectedId={selectedId} onSelect={setSelectedId} />
        )}
        {tab === 'settings' && <SettingsPage settings={settings} onSave={updateSettings} />}
      </main>

      <nav className="tabbar">{renderNav(TABBAR)}</nav>
    </div>
  )
}
