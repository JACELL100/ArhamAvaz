import { useState, useEffect } from 'react'

const DEFAULT_MEMBERS = [
  {
    id: 'owner-1',
    name: 'Arham Support',
    email: 'support@arhamfintech.ai',
    role: 'Owner',
    subtext: 'Owner · signed this organisation up',
    isOwner: true,
  },
  {
    id: 'co-owner-1',
    name: 'Chirag Gehlot',
    email: 'chirag.g@arhamfintech.ai',
    role: '👑 Co-owner',
    subtext: 'Chirag Gehlot · Co-owner · signs in with their mail password',
    isOwner: false,
  },
  {
    id: 'admin-1',
    name: 'HR Team',
    email: 'hr@arhamfintech.ai',
    role: 'Admin',
    subtext: 'HR Team · Admin · manages agents, scripts & campaigns',
    isOwner: false,
  },
  {
    id: 'user-admin-1',
    name: 'Rahul Sharma',
    email: 'rahul.s@arhamfintech.ai',
    role: 'User admin',
    subtext: 'Rahul Sharma · User admin · lead assignment & call operations',
    isOwner: false,
  }
]

export default function TeamPage() {
  const [members, setMembers] = useState(() => {
    try {
      const saved = localStorage.getItem('arhamaawaaz_team_members')
      return saved ? JSON.parse(saved) : DEFAULT_MEMBERS
    } catch {
      return DEFAULT_MEMBERS
    }
  })

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('Admin')
  const [toast, setToast] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem('arhamaawaaz_team_members', JSON.stringify(members))
    } catch (e) {
      console.error('Failed to save team members', e)
    }
  }, [members])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const handleAddMember = (e) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Please enter member name')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }
    if (members.some((m) => m.email.toLowerCase() === email.trim().toLowerCase())) {
      setError('This email is already added to console access')
      return
    }

    const newMember = {
      id: `m-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role === 'Co-owner' ? '👑 Co-owner' : role,
      subtext: `${name.trim()} · ${role} · signs in with mail`,
      isOwner: false,
    }

    setMembers([...members, newMember])
    setName('')
    setEmail('')
    setPassword('')
    showToast(`Successfully added ${newMember.name} as ${role}`)
  }

  const handleRemoveMember = (id, memberName) => {
    if (window.confirm(`Are you sure you want to remove console access for ${memberName}?`)) {
      setMembers(members.filter((m) => m.id !== id))
      showToast(`Removed console access for ${memberName}`)
    }
  }

  return (
    <div className="lp-team-container">
      {/* Toast Alert */}
      {toast && (
        <div className="lp-team-toast">
          <span>✓ {toast}</span>
        </div>
      )}

      {/* Header */}
      <div className="lp-team-header">
        <h1>Team</h1>
        <p>Give someone their own sign-in, and choose how much of the console they reach.</p>
      </div>

      {/* Add a Team Member Card */}
      <div className="lp-team-card">
        <h3>Add a team member</h3>
        
        {error && <div className="lp-team-error">{error}</div>}

        <form onSubmit={handleAddMember} className="lp-team-form">
          <div className="lp-form-field">
            <label>NAME</label>
            <input
              type="text"
              placeholder="Priya Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="lp-team-input"
            />
          </div>

          <div className="lp-form-field">
            <label>EMAIL</label>
            <input
              type="email"
              placeholder="priya@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="lp-team-input"
            />
          </div>

          <div className="lp-form-field">
            <label>CONSOLE PASSWORD</label>
            <input
              type="password"
              placeholder="Leave empty if they have mail"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="lp-team-input"
            />
          </div>

          <div className="lp-form-field">
            <label>ROLE</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="lp-team-select"
            >
              <option value="👑 Co-owner">👑 Co-owner</option>
              <option value="Admin">Admin</option>
              <option value="User admin">User admin</option>
            </select>
          </div>

          <button type="submit" className="lp-btn lp-btn-primary lp-team-submit-btn">
            Add member
          </button>
        </form>

        {/* Role Descriptions Legend */}
        <div className="lp-role-legend">
          <div className="lp-role-item">
            <span className="lp-role-title">👑 Co-owner</span>
            <span className="lp-role-desc">
              Everything the owner can do, except deleting the organisation or removing the owner.
            </span>
          </div>
          <div className="lp-role-item">
            <span className="lp-role-title">Admin</span>
            <span className="lp-role-desc">
              Domains, mailboxes, groups, agents, scripts and call campaigns. No billing and no team changes.
            </span>
          </div>
          <div className="lp-role-item">
            <span className="lp-role-title">User admin</span>
            <span className="lp-role-desc">
              Lead assignments and daily call operations — the day-to-day 'add a person / run call' role.
            </span>
          </div>
        </div>
      </div>

      {/* People with Console Access Card */}
      <div className="lp-team-card">
        <h3>People with console access</h3>

        <div className="lp-member-list">
          {members.map((m) => (
            <div key={m.id} className="lp-member-row">
              <div className="lp-member-info">
                <strong className="lp-member-email">{m.email}</strong>
                <span className="lp-member-sub">{m.subtext || `${m.name} · ${m.role}`}</span>
              </div>

              <div className="lp-member-actions">
                {m.isOwner ? (
                  <span className="lp-badge-full-access">Full access</span>
                ) : (
                  <>
                    <span className={`lp-badge-role ${m.role.includes('Co-owner') ? 'badge-coowner' : m.role === 'Admin' ? 'badge-admin' : 'badge-useradmin'}`}>
                      {m.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.id, m.name || m.email)}
                      className="lp-team-remove-btn"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
