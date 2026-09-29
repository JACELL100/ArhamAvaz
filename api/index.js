require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'arhamavaz-super-secret-key-2024';

// Initialize SQLite DB
const db = new sqlite3.Database('./dev.db', (err) => {
  if (err) console.error('Error connecting to SQLite:', err);
  else console.log('Connected to SQLite DB.');
});

// Create tables if they don't exist
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  db.run(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      companyId TEXT NOT NULL,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL,
      language TEXT NOT NULL,
      agentName TEXT NOT NULL,
      companyName TEXT NOT NULL,
      greeting TEXT NOT NULL,
      script TEXT NOT NULL,
      guidelines TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(companyId) REFERENCES companies(id)
    )
  `);
});

// Onboarding columns. Existing accounts default to stage 'done' so they skip onboarding.
[
  "ALTER TABLE companies ADD COLUMN stage TEXT NOT NULL DEFAULT 'done'",
  'ALTER TABLE companies ADD COLUMN otpHash TEXT',
  'ALTER TABLE companies ADD COLUMN otpExpires INTEGER',
  'ALTER TABLE companies ADD COLUMN otpSentAt INTEGER',
  'ALTER TABLE companies ADD COLUMN otpAttempts INTEGER NOT NULL DEFAULT 0',
  'ALTER TABLE companies ADD COLUMN industry TEXT',
  'ALTER TABLE companies ADD COLUMN useCases TEXT',
  'ALTER TABLE companies ADD COLUMN workspaceName TEXT',
  'ALTER TABLE companies ADD COLUMN workspaceSlug TEXT',
  'ALTER TABLE companies ADD COLUMN workspaceIcon TEXT',
  'ALTER TABLE companies ADD COLUMN teamSize TEXT',
].forEach((sql) => db.run(sql, () => {})); // errors mean the column already exists

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const publicCompany = (c) => ({
  id: c.id, name: c.name, email: c.email, stage: c.stage,
  industry: c.industry, useCases: c.useCases ? JSON.parse(c.useCases) : [],
  workspaceName: c.workspaceName, workspaceSlug: c.workspaceSlug,
  workspaceIcon: c.workspaceIcon, teamSize: c.teamSize,
});
const dbGet = (sql, p = []) => new Promise((ok, no) => db.get(sql, p, (e, r) => (e ? no(e) : ok(r))));
const dbRun = (sql, p = []) => new Promise((ok, no) => db.run(sql, p, function (e) { e ? no(e) : ok(this); }));

// No mail provider is wired up yet: the code is logged, and returned to the client outside production.
async function issueOtp(company) {
  const code = generateOtp();
  await dbRun('UPDATE companies SET otpHash = ?, otpExpires = ?, otpSentAt = ?, otpAttempts = 0 WHERE id = ?',
    [await bcrypt.hash(code, 8), Date.now() + OTP_TTL_MS, Date.now(), company.id]);
  console.log(`[otp] ${company.email}: ${code}`);
  return isProd ? {} : { devCode: code };
}

const generateId = () => Math.random().toString(36).substring(2, 15);

// Middleware to protect routes
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.companyId = decoded.companyId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// --- Authentication Routes ---

app.post('/api/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) return res.status(400).json({ error: 'Name, email and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await dbGet('SELECT id FROM companies WHERE email = ?', [email.trim().toLowerCase()]);
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const id = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun("INSERT INTO companies (id, name, email, password, stage) VALUES (?, ?, ?, ?, 'verify')",
      [id, name.trim(), email.trim().toLowerCase(), hashedPassword]);
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [id]);
    const extra = await issueOtp(company);
    const token = jwt.sign({ companyId: id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, company: publicCompany(company), ...extra });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-email', auth, async (req, res) => {
  try {
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (company.stage !== 'verify') return res.json({ company: publicCompany(company) });

    if (!company.otpHash || Date.now() > company.otpExpires) return res.status(400).json({ error: 'Code expired. Request a new one.', code: 'expired' });
    if (company.otpAttempts >= 5) return res.status(429).json({ error: 'Too many attempts. Request a new code.', code: 'expired' });

    const ok = await bcrypt.compare(String(req.body.code || ''), company.otpHash);
    if (!ok) {
      await dbRun('UPDATE companies SET otpAttempts = otpAttempts + 1 WHERE id = ?', [company.id]);
      return res.status(400).json({ error: 'Invalid code. Please try again.', code: 'invalid' });
    }
    await dbRun("UPDATE companies SET stage = 'business', otpHash = NULL, otpExpires = NULL WHERE id = ?", [company.id]);
    res.json({ company: publicCompany(await dbGet('SELECT * FROM companies WHERE id = ?', [company.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resend-otp', auth, async (req, res) => {
  try {
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company || company.stage !== 'verify') return res.status(400).json({ error: 'Email already verified' });
    const wait = (company.otpSentAt || 0) + OTP_RESEND_MS - Date.now();
    if (wait > 0) return res.status(429).json({ error: `Please wait ${Math.ceil(wait / 1000)}s before requesting another code`, retryAfter: Math.ceil(wait / 1000) });
    res.json({ ok: true, ...(await issueOtp(company)) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/onboarding/business', auth, async (req, res) => {
  try {
    const { organization, industry, useCases } = req.body;
    if (!organization?.trim() || !industry || !Array.isArray(useCases) || !useCases.length) {
      return res.status(400).json({ error: 'Organization, industry and at least one use case are required' });
    }
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company || company.stage === 'verify') return res.status(403).json({ error: 'Verify your email first' });
    await dbRun('UPDATE companies SET name = ?, industry = ?, useCases = ?, stage = CASE WHEN stage = ? THEN ? ELSE stage END WHERE id = ?',
      [organization.trim(), industry, JSON.stringify(useCases), 'business', 'workspace', company.id]);
    res.json({ company: publicCompany(await dbGet('SELECT * FROM companies WHERE id = ?', [company.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/slug-available', auth, async (req, res) => {
  const slug = String(req.query.slug || '').toLowerCase();
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return res.json({ available: false });
  const row = await dbGet('SELECT id FROM companies WHERE workspaceSlug = ? AND id != ?', [slug, req.companyId]);
  res.json({ available: !row });
});

app.post('/api/onboarding/workspace', auth, async (req, res) => {
  try {
    const { name, slug, icon, teamSize } = req.body;
    const s = String(slug || '').toLowerCase();
    if (!name?.trim() || !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s)) return res.status(400).json({ error: 'Enter a workspace name and a valid URL' });
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company || company.stage === 'verify' || company.stage === 'business') return res.status(403).json({ error: 'Complete the previous step first' });
    if (await dbGet('SELECT id FROM companies WHERE workspaceSlug = ? AND id != ?', [s, company.id])) return res.status(400).json({ error: 'That workspace URL is taken' });
    await dbRun("UPDATE companies SET workspaceName = ?, workspaceSlug = ?, workspaceIcon = ?, teamSize = ?, stage = 'done' WHERE id = ?",
      [name.trim(), s, icon || 'wave', teamSize || null, company.id]);
    res.json({ company: publicCompany(await dbGet('SELECT * FROM companies WHERE id = ?', [company.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get('SELECT * FROM companies WHERE email = ?', [String(email || '').trim().toLowerCase()], async (err, company) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!company) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign({ companyId: company.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, company: publicCompany(company) });
  });
});

app.get('/api/me', auth, (req, res) => {
  db.get('SELECT * FROM companies WHERE id = ?', [req.companyId], (err, company) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company: publicCompany(company) });
  });
});

// --- Agents Routes ---

app.get('/api/agents', auth, (req, res) => {
  db.all('SELECT * FROM agents WHERE companyId = ?', [req.companyId], (err, agents) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(agents);
  });
});

app.post('/api/agents', auth, (req, res) => {
  const { name, purpose, language, agentName, companyName, greeting, script, guidelines } = req.body;
  const id = generateId();
  
  db.run(
    'INSERT INTO agents (id, companyId, name, purpose, language, agentName, companyName, greeting, script, guidelines) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, req.companyId, name, purpose, language, agentName, companyName, greeting, script, guidelines],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get('SELECT * FROM agents WHERE id = ?', [id], (err, agent) => {
        res.json(agent);
      });
    }
  );
});

app.delete('/api/agents/:id', auth, (req, res) => {
  db.run('DELETE FROM agents WHERE id = ? AND companyId = ?', [req.params.id, req.companyId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
