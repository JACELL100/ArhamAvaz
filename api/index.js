require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./firebase-key.json');

initializeApp({
  credential: cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const JWT_SECRET = process.env.JWT_SECRET || 'arhamavaz-super-secret-key-2024';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => console.error('Unexpected error on idle pg client', err));

// Helpers to replace sqlite3 api
const convertSql = (sql) => {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
};

const dbGet = async (sql, p = []) => {
  const { rows } = await pool.query(convertSql(sql), p);
  return rows[0];
};

const dbRun = async (sql, p = []) => {
  await pool.query(convertSql(sql), p);
};

const dbAll = async (sql, p = []) => {
  const { rows } = await pool.query(convertSql(sql), p);
  return rows;
};

// Initialize DB schema
async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await pool.query(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(companyId) REFERENCES companies(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
        id TEXT PRIMARY KEY,
        companyId TEXT NOT NULL,
        name TEXT NOT NULL,
        prefix TEXT NOT NULL,
        hash TEXT NOT NULL,
        createdAt BIGINT NOT NULL,
        lastUsedAt BIGINT,
        FOREIGN KEY(companyId) REFERENCES companies(id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallets (
        companyId TEXT PRIMARY KEY,
        balance INT DEFAULT 0,
        balanceUsd INT DEFAULT 0,
        updatedAt BIGINT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        companyId TEXT,
        amount INT,
        currency TEXT,
        gateway TEXT,
        description TEXT,
        status TEXT,
        createdAt BIGINT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        companyId TEXT,
        gateway TEXT,
        amount INT,
        createdAt BIGINT
      )
    `);

    // Migrations
    const columns = [
      "ALTER TABLE companies RENAME COLUMN email TO phone",
      "ALTER TABLE companies ADD COLUMN email TEXT UNIQUE",
      "ALTER TABLE companies ADD COLUMN stage TEXT NOT NULL DEFAULT 'done'",
      'ALTER TABLE companies ADD COLUMN otpHash TEXT',
      'ALTER TABLE companies ADD COLUMN otpExpires BIGINT',
      'ALTER TABLE companies ADD COLUMN otpSentAt BIGINT',
      'ALTER TABLE companies ADD COLUMN otpAttempts INTEGER NOT NULL DEFAULT 0',
      'ALTER TABLE companies ADD COLUMN industry TEXT',
      'ALTER TABLE companies ADD COLUMN useCases TEXT',
      'ALTER TABLE companies ADD COLUMN workspaceName TEXT',
      'ALTER TABLE companies ADD COLUMN workspaceSlug TEXT',
      'ALTER TABLE companies ADD COLUMN workspaceIcon TEXT',
      'ALTER TABLE companies ADD COLUMN teamSize TEXT',
      'ALTER TABLE companies ADD COLUMN compliance TEXT',
    ];

    for (const sql of columns) {
      try {
        await pool.query(sql);
      } catch (err) {
        // Ignore column already exists errors (42701 is duplicate column in postgres)
        if (err.code !== '42701') console.error("Migration error:", err.message);
      }
    }
    console.log('Connected to PostgreSQL and verified schema.');
  } catch (err) {
    console.error('Error initializing PostgreSQL:', err);
  }
}
initDb();

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_MS = 60 * 1000;
const isProd = process.env.NODE_ENV === 'production';

const generateOtp = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
const publicCompany = (c) => ({
  id: c.id, name: c.name, email: c.email, phone: c.phone, stage: c.stage,
  industry: c.industry, useCases: c.useCases ? JSON.parse(c.usecases || c.useCases || '[]') : [],
  workspaceName: c.workspacename || c.workspaceName, workspaceSlug: c.workspaceslug || c.workspaceSlug,
  workspaceIcon: c.workspaceicon || c.workspaceIcon, teamSize: c.teamsize || c.teamSize,
});

async function issueOtp(company) {
  const code = generateOtp();
  await dbRun('UPDATE companies SET otpHash = ?, otpExpires = ?, otpSentAt = ?, otpAttempts = 0 WHERE id = ?',
    [await bcrypt.hash(code, 8), Date.now() + OTP_TTL_MS, Date.now(), company.id]);
  console.log(`[otp] ${company.phone}: ${code}`);
  return isProd ? {} : { devCode: code };
}

// Compliance protections are on by default; stored per company as JSON.
const DEFAULT_COMPLIANCE = {
  callingHours: { enabled: true, start: '09:00', end: '20:00', days: [1, 2, 3, 4, 5, 6], timezone: 'Asia/Kolkata' },
  dnd: { enabled: true, numbers: [] },
  numbers: [],
  retentionDays: 90,
  piiRedaction: true,
  rotationDays: 90,
};
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const PHONE = /^\+\d{8,15}$/;

function sanitizeCompliance(input = {}) {
  const d = DEFAULT_COMPLIANCE;
  const h = input.callingHours || {};
  const days = Array.isArray(h.days) ? [...new Set(h.days.filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))] : d.callingHours.days;
  const uniq = (arr) => [...new Set((arr || []).map(String).filter((n) => PHONE.test(n)))].slice(0, 5000);
  const int = (v, min, max, fallback) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);
  return {
    callingHours: {
      enabled: h.enabled !== false,
      start: HHMM.test(h.start) ? h.start : d.callingHours.start,
      end: HHMM.test(h.end) ? h.end : d.callingHours.end,
      days,
      timezone: typeof h.timezone === 'string' && h.timezone.length < 64 ? h.timezone : d.callingHours.timezone,
    },
    dnd: { enabled: input.dnd?.enabled !== false, numbers: uniq(input.dnd?.numbers) },
    numbers: (Array.isArray(input.numbers) ? input.numbers : [])
      .filter((n) => n && PHONE.test(String(n.number)))
      .slice(0, 50)
      .map((n) => ({ id: String(n.id || crypto.randomUUID()).slice(0, 40), label: String(n.label || '').slice(0, 60), number: String(n.number) })),
    retentionDays: int(input.retentionDays, 1, 3650, d.retentionDays),
    piiRedaction: input.piiRedaction !== false,
    rotationDays: int(input.rotationDays, 7, 365, d.rotationDays),
  };
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
    const { name, email, phone, password } = req.body;
    if (!name?.trim() || !email?.trim() || !phone?.trim() || !password) return res.status(400).json({ error: 'Name, email, mobile and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await dbGet('SELECT id FROM companies WHERE phone = ? OR email = ?', [phone.trim(), email.trim().toLowerCase()]);
    if (existing) return res.status(400).json({ error: 'Mobile number or email already exists' });

    const id = generateId();
    const hashedPassword = await bcrypt.hash(password, 10);
    await dbRun("INSERT INTO companies (id, name, email, phone, password, stage) VALUES (?, ?, ?, ?, ?, 'verify')",
      [id, name.trim(), email.trim().toLowerCase(), phone.trim(), hashedPassword]);
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [id]);
    const extra = await issueOtp(company);
    const token = jwt.sign({ companyId: id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, company: publicCompany(company), ...extra });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/verify-otp', auth, async (req, res) => {
  try {
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    if (company.stage !== 'verify') return res.json({ company: publicCompany(company) });

    const firebaseToken = req.body.code;
    if (!firebaseToken) return res.status(400).json({ error: 'Missing verification token' });

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(firebaseToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid verification token' });
    }

    const verifiedPhone = decodedToken.phone_number; // e.g. +919876543210
    const companyPhone = company.phone.startsWith('+') ? company.phone : '+91' + company.phone;

    if (verifiedPhone !== companyPhone) {
      return res.status(400).json({ error: 'Verified phone number does not match registered number' });
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
    if (!company || company.stage !== 'verify') return res.status(400).json({ error: 'Mobile already verified' });
    const wait = (Number(company.otpsentat) || 0) + OTP_RESEND_MS - Date.now();
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
    if (!company || company.stage === 'verify') return res.status(403).json({ error: 'Verify your mobile first' });
    await dbRun('UPDATE companies SET name = ?, industry = ?, useCases = ?, stage = CASE WHEN stage = ? THEN ? ELSE stage END WHERE id = ?',
      [organization.trim(), industry, JSON.stringify(useCases), 'business', 'workspace', company.id]);
    res.json({ company: publicCompany(await dbGet('SELECT * FROM companies WHERE id = ?', [company.id])) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/workspace/slug-available', auth, async (req, res) => {
  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(slug)) return res.json({ available: false });
    const row = await dbGet('SELECT id FROM companies WHERE workspaceSlug = ? AND id != ?', [slug, req.companyId]);
    res.json({ available: !row });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
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

app.post('/api/login', async (req, res) => {
  try {
    const { identifier, phone, password } = req.body;
    const ident = String(identifier || phone || '').trim().toLowerCase();
    const company = await dbGet('SELECT * FROM companies WHERE phone = ? OR email = ?', [ident, ident]);
    if (!company) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, company.password);
    if (!valid) return res.status(401).json({ error: 'Invalid mobile or password' });

    const token = jwt.sign({ companyId: company.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, company: publicCompany(company) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/me', auth, async (req, res) => {
  try {
    const company = await dbGet('SELECT * FROM companies WHERE id = ?', [req.companyId]);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json({ company: publicCompany(company) });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Compliance & API keys ---

app.get('/api/compliance', auth, async (req, res) => {
  try {
    const row = await dbGet('SELECT compliance FROM companies WHERE id = ?', [req.companyId]);
    res.json({ compliance: sanitizeCompliance(row?.compliance ? JSON.parse(row.compliance) : {}) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/compliance', auth, async (req, res) => {
  try {
    const compliance = sanitizeCompliance(req.body);
    await dbRun('UPDATE companies SET compliance = ? WHERE id = ?', [JSON.stringify(compliance), req.companyId]);
    res.json({ compliance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const hashKey = (k) => crypto.createHash('sha256').update(k).digest('hex');

app.get('/api/keys', auth, async (req, res) => {
  try {
    // Postgres converts camelCase column names to lowercase in rows returned (e.g. createdAt -> createdat).
    // Let's alias them to exactly what frontend expects.
    const keys = await dbAll('SELECT id, name, prefix, createdAt as "createdAt", lastUsedAt as "lastUsedAt" FROM api_keys WHERE companyId = ? ORDER BY createdAt DESC', [req.companyId]);
    res.json({ keys });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

// The full key is returned once, here; only its hash is stored.
app.post('/api/keys', auth, async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 60) || 'Untitled key';
    const count = await dbGet('SELECT COUNT(*) AS n FROM api_keys WHERE companyId = ?', [req.companyId]);
    if (Number(count.n) >= 20) return res.status(400).json({ error: 'Key limit reached. Revoke an old key first.' });
    const secret = `av_live_${crypto.randomBytes(24).toString('hex')}`;
    const id = generateId();
    const createdAt = Date.now();
    await dbRun('INSERT INTO api_keys (id, companyId, name, prefix, hash, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [id, req.companyId, name, secret.slice(0, 12), hashKey(secret), createdAt]);
    res.json({ key: { id, name, prefix: secret.slice(0, 12), createdAt, lastUsedAt: null }, secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/keys/:id', auth, async (req, res) => {
  try {
    await dbRun('DELETE FROM api_keys WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Agents Routes ---

app.get('/api/agents', auth, async (req, res) => {
  try {
    const agents = await dbAll('SELECT * FROM agents WHERE companyId = ?', [req.companyId]);
    // Postgres columns are lowercase by default unless quoted, need to map camelCase back
    const mappedAgents = agents.map(a => ({
      ...a,
      companyId: a.companyid,
      agentName: a.agentname,
      companyName: a.companyname,
      createdAt: a.createdat
    }));
    res.json(mappedAgents);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/agents', auth, async (req, res) => {
  try {
    const { name, purpose, language, agentName, companyName, greeting, script, guidelines } = req.body;
    const id = generateId();
    
    await dbRun(
      'INSERT INTO agents (id, companyId, name, purpose, language, agentName, companyName, greeting, script, guidelines) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, req.companyId, name, purpose, language, agentName, companyName, greeting, script, guidelines]
    );
    
    let agent = await dbGet('SELECT * FROM agents WHERE id = ?', [id]);
    agent = {
      ...agent,
      companyId: agent.companyid,
      agentName: agent.agentname,
      companyName: agent.companyname,
      createdAt: agent.createdat
    };
    res.json(agent);
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/agents/:id', auth, async (req, res) => {
  try {
    await dbRun('DELETE FROM agents WHERE id = ? AND companyId = ?', [req.params.id, req.companyId]);
    res.json({ success: true });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// --- Billing ---
const LIMITS = { INR: { min: 1000, max: 1000000 }, USD: { min: 50, max: 10000 } };
const gstRate = () => Number(process.env.GST_RATE || 0.18);
const balanceField = (currency) => (currency === 'USD' ? 'balanceUsd' : 'balance');
const safeEqual = (a, b) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};
const hmac = (secret, data, enc = 'hex') => crypto.createHmac('sha256', secret).update(data).digest(enc);

function parseAmount(amount, currency) {
  const { min, max } = LIMITS[currency];
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt < min || amt > max) {
    throw new Error(`Amount must be between ${min} and ${max} ${currency}`);
  }
  return Math.round(amt);
}

async function creditWallet(companyId, { paymentId, gateway, amount, currency, description }) {
  const txnId = `${gateway}_${paymentId}`;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query('SELECT id FROM wallet_transactions WHERE id = $1', [txnId]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return;
    }
    const balField = balanceField(currency);
    await client.query(`
      INSERT INTO wallets (companyId, ${balField}, updatedAt) 
      VALUES ($1, $2, $3) 
      ON CONFLICT (companyId) DO UPDATE SET ${balField} = wallets.${balField} + $2, updatedAt = $3
    `, [companyId, amount, Date.now()]);
    
    await client.query(`
      INSERT INTO wallet_transactions (id, companyId, amount, currency, gateway, description, status, createdAt)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [txnId, companyId, amount, currency, gateway, description, 'paid', Date.now()]);
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

app.get('/api/wallet', auth, async (req, res) => {
  try {
    let wallet = await dbGet('SELECT * FROM wallets WHERE companyId = ?', [req.companyId]);
    if (!wallet) {
      wallet = { balance: 0, balanceUsd: 0 };
    }
    const txns = await dbAll('SELECT * FROM wallet_transactions WHERE companyId = ? ORDER BY createdAt DESC LIMIT 25', [req.companyId]);
    res.json({
      balance: wallet.balance || 0,
      balanceUsd: wallet.balanceUsd || 0,
      transactions: txns
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const rzpAuth = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

app.post('/api/razorpay/order', auth, async (req, res) => {
  try {
    if (!process.env.RAZORPAY_KEY_ID) return res.status(503).json({ error: 'Razorpay is not configured' });
    const amount = parseAmount(req.body.amount, 'INR');
    const total = Math.round(amount * (1 + gstRate()) * 100);
    
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { Authorization: rzpAuth(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: total, currency: 'INR', notes: { baseAmount: String(amount) } }),
    });
    const order = await rzpRes.json();
    if (!rzpRes.ok) return res.status(502).json({ error: order.error?.description || 'Razorpay order failed' });
    
    await dbRun("INSERT INTO orders (id, companyId, gateway, amount, createdAt) VALUES (?, ?, 'razorpay', ?, ?)", 
      [order.id, req.companyId, amount, Date.now()]);
    
    res.json({ keyId: process.env.RAZORPAY_KEY_ID, orderId: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/razorpay/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body;
    if (!orderId || !paymentId || !signature) return res.status(400).json({ error: 'Missing payment fields' });
    if (!safeEqual(hmac(process.env.RAZORPAY_KEY_SECRET, `${orderId}|${paymentId}`), signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const order = await dbGet('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return res.status(404).json({ error: 'Unknown order' });
    
    await creditWallet(order.companyid || order.companyId, { paymentId, gateway: 'razorpay', amount: order.amount, currency: 'INR', description: 'Wallet top-up' });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/razorpay/webhook', async (req, res) => {
  try {
    const signature = req.get('x-razorpay-signature') || '';
    if (!process.env.RAZORPAY_WEBHOOK_SECRET || !safeEqual(hmac(process.env.RAZORPAY_WEBHOOK_SECRET, req.rawBody), signature)) {
      return res.status(400).json({ error: 'Invalid signature' });
    }
    const payment = req.body?.payload?.payment?.entity;
    if (req.body?.event === 'payment.captured' && payment) {
      const order = await dbGet('SELECT * FROM orders WHERE id = ?', [payment.order_id]);
      if (order) {
        await creditWallet(order.companyid || order.companyId, { paymentId: payment.id, gateway: 'razorpay', amount: order.amount, currency: 'INR', description: 'Wallet top-up' });
      }
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
