import { useEffect, useState } from 'react';
import { getAgents, createAgent, deleteAgent } from '../api';
import { XIcon } from '../components/icons';
import AgentSettings from '../components/AgentSettings';

export default function AgentsPage({ settings, onSaveSettings }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [language, setLanguage] = useState('en');
  
  // Advanced Agent Config
  const [agentName, setAgentName] = useState('Deepali');
  const [companyName, setCompanyName] = useState('ArhamSecure');
  const [greeting, setGreeting] = useState('Hi {name}, I am {agent} from {company}. Do you have two minutes to talk about your {insurance}?');
  const [script, setScript] = useState('Goal: pitch the product.\n1. Ask if they are interested.\n2. Explain benefits.');
  const [guidelines, setGuidelines] = useState('- Never quote exact prices.\n- Be polite and concise.');

  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAgents();
      setAgents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name || !script) return;
    setSaving(true);
    try {
      await createAgent({ name, purpose, language, agentName, companyName, greeting, script, guidelines });
      setIsCreating(false);
      setName('');
      setPurpose('');
      setScript('');
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this agent?')) return;
    try {
      await deleteAgent(id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="narrow">
      <div className="page-header" style={{ marginBottom: isCreating ? '16px' : '24px' }}>
        <div>
          <h2>Your AI Agents</h2>
          <p>Create and manage AI agents with their own goals and scripts.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setIsCreating(!isCreating)} style={{ background: isCreating ? 'var(--field)' : undefined, color: isCreating ? 'var(--text)' : undefined, boxShadow: isCreating ? 'none' : undefined }}>
          {isCreating ? 'Cancel' : 'New Agent'}
        </button>
      </div>

      {isCreating && (
        <form className="card form" onSubmit={handleCreate} style={{ marginBottom: '24px' }}>
          
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem' }}>Basic Info</h3>
          <div className="grid-2">
            <label className="field">
              <span>Agent Profile Name</span>
              <input type="text" placeholder="e.g. Sales Agent - HRMS" value={name} onChange={e => setName(e.target.value)} disabled={saving} required />
            </label>
            <label className="field">
              <span>Purpose / App Name</span>
              <input type="text" placeholder="e.g. HRMS, Cibil Score" value={purpose} onChange={e => setPurpose(e.target.value)} disabled={saving} required />
            </label>
          </div>

          <div className="grid-2" style={{ marginTop: '16px' }}>
            <label className="field">
              <span>AI Name (Speaker)</span>
              <input type="text" value={agentName} onChange={e => setAgentName(e.target.value)} disabled={saving} required />
            </label>
            <label className="field">
              <span>Company Name</span>
              <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={saving} required />
            </label>
          </div>

          <label className="field" style={{ marginTop: '16px' }}>
            <span>Language</span>
            <select value={language} onChange={e => setLanguage(e.target.value)} disabled={saving} style={{ padding: '11px 12px', borderRadius: '12px', border: '1.5px solid transparent', background: '#fff', font: 'inherit', fontSize: '0.95rem' }}>
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="hinglish">Hinglish</option>
              <option value="gu">Gujarati</option>
              <option value="mr">Marathi</option>
              <option value="ta">Tamil</option>
              <option value="te">Telugu</option>
              <option value="kn">Kannada</option>
              <option value="ml">Malayalam</option>
              <option value="bn">Bengali</option>
              <option value="pa">Punjabi</option>
              <option value="od">Odia</option>
            </select>
          </label>

          <h3 style={{ margin: '24px 0 16px 0', fontSize: '1.1rem', paddingTop: '24px', borderTop: '1px solid var(--line)' }}>Script & Flow</h3>
          
          <label className="field">
            <span>Opening Line (Greeting)</span>
            <textarea value={greeting} onChange={e => setGreeting(e.target.value)} disabled={saving} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid transparent', background: '#fff', font: 'inherit', fontSize: '0.95rem', resize: 'vertical' }} />
            <small style={{ color: 'var(--muted)', marginTop: '4px' }}>Use {'{name}'}, {'{agent}'}, {'{company}'}</small>
          </label>

          <label className="field" style={{ marginTop: '16px' }}>
            <span>Script / Goal</span>
            <textarea placeholder="Write the exact script..." rows="5" value={script} onChange={e => setScript(e.target.value)} disabled={saving} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid transparent', background: '#fff', font: 'inherit', fontSize: '0.95rem', resize: 'vertical' }} />
          </label>

          <label className="field" style={{ marginTop: '16px', marginBottom: '24px' }}>
            <span>Guidelines</span>
            <textarea rows="3" value={guidelines} onChange={e => setGuidelines(e.target.value)} disabled={saving} required style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1.5px solid transparent', background: '#fff', font: 'inherit', fontSize: '0.95rem', resize: 'vertical' }} />
          </label>

          <button type="submit" className="cta" disabled={saving}>
            {saving ? 'Saving...' : 'Save Agent'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="empty">
          <p>Loading agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="empty card" style={{ padding: '48px 24px' }}>
          <p>No agents found. Create one to get started.</p>
        </div>
      ) : (
        <div className="rows card">
          {agents.map(agent => (
            <div key={agent.id} className="call-row" style={{ alignItems: 'flex-start' }}>
              <div className="avatar" style={{ background: 'linear-gradient(135deg, #6cc236 0%, var(--brand) 45%, var(--brand-dark) 100%)', color: '#fff' }}>🤖</div>
              <div className="call-main" style={{ minWidth: 0, overflow: 'hidden' }}>
                <b style={{ fontSize: '1.05rem', marginBottom: '4px' }}>{agent.name}</b>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                  <span className="pill tone-info">{agent.purpose}</span>
                  <span className="pill">{agent.language.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {agent.script}
                </div>
              </div>
              <div className="call-meta">
                <button type="button" className="icon-btn" onClick={(e) => { e.stopPropagation(); handleDelete(agent.id); }} title="Delete agent" style={{ borderColor: 'transparent' }}>
                  <XIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {settings && <AgentSettings settings={settings} onSave={onSaveSettings} />}
    </div>
  );
}
