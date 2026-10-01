// Arham Secure (partner) integration: /api/v1 — contacts, policies, scripts, call requests, webhooks.
// Auth is by workspace API key (Authorization: Bearer av_live_…), scoped per key. See INTEGRATION.md.
const crypto = require('crypto');
const dns = require('dns').promises;
const core = require('./lib/core');

module.exports = function createIntegration(deps) {
  const { app, pool, dbGet, dbRun, dbAll, hashKey, requestBolna, getBolnaAgentId, hasBolna, sanitizeCompliance, languages, signingSecret, isProd } = deps;

  const PUBLIC_API = (process.env.PUBLIC_API_URL || 'https://api-134-209-149-189.nip.io').replace(/\/$/, '');
  const MIN_BALANCE = Number(process.env.CALL_MIN_BALANCE ?? 1);
  const COOLDOWN_MS = Number(process.env.CALL_COOLDOWN_HOURS ?? 24) * 3600e3;
  const REQUIRE_CONSENT = process.env.REQUIRE_CONSENT !== 'false';
  const RATE_LIMIT = Number(process.env.API_RATE_LIMIT_PER_MIN ?? 120);

  const uid = (prefix) => `${prefix}_${crypto.randomBytes(9).toString('hex')}`;
  const iso = (ms) => (ms == null ? null : new Date(Number(ms)).toISOString());
  const fail = (res, status, code, message, extra = {}) => res.status(status).json({ error: message, code, ...extra });
  const handler = (fn) => (req, res) => fn(req, res).catch((err) => {
    console.error(`[v1] ${req.method} ${req.path}:`, err);
    if (!res.headersSent) fail(res, 500, 'internal_error', 'Internal error');
  });

  // ---------- schema ----------
  async function initDb() {
    const ddl = [
      `CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, external_id TEXT NOT NULL, name TEXT, phone TEXT NOT NULL,
        language TEXT, consent_status TEXT NOT NULL DEFAULT 'unknown', consent_at BIGINT, consent_source TEXT,
        dnd BOOLEAN NOT NULL DEFAULT false, created_at BIGINT, updated_at BIGINT, UNIQUE (company_id, external_id))`,
      `CREATE TABLE IF NOT EXISTS policies (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, external_id TEXT NOT NULL, contact_id TEXT NOT NULL,
        type TEXT NOT NULL, product TEXT, status TEXT, expiry_date TEXT, premium NUMERIC, policy_ref_masked TEXT,
        attributes TEXT, created_at BIGINT, updated_at BIGINT, UNIQUE (company_id, external_id))`,
      `CREATE TABLE IF NOT EXISTS scripts (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, name TEXT NOT NULL, policy_type TEXT, language TEXT,
        agent_name TEXT NOT NULL, company_name TEXT NOT NULL, greeting TEXT NOT NULL, script TEXT NOT NULL,
        guidelines TEXT NOT NULL DEFAULT '', version INT NOT NULL DEFAULT 1, active BOOLEAN NOT NULL DEFAULT true,
        created_at BIGINT, updated_at BIGINT)`,
      `CREATE TABLE IF NOT EXISTS call_requests (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, contact_id TEXT NOT NULL, policy_id TEXT, script_id TEXT,
        script_version INT, call_id TEXT, status TEXT NOT NULL, outcome TEXT, error TEXT, scheduled_at BIGINT,
        idempotency_key TEXT, events_emitted TEXT, created_at BIGINT, updated_at BIGINT,
        UNIQUE (company_id, idempotency_key))`,
      `CREATE TABLE IF NOT EXISTS webhook_endpoints (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, url TEXT NOT NULL, events TEXT NOT NULL, secret TEXT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true, created_at BIGINT)`,
      `CREATE TABLE IF NOT EXISTS webhook_deliveries (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, endpoint_id TEXT NOT NULL, event_id TEXT NOT NULL, event_type TEXT NOT NULL,
        payload TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INT NOT NULL DEFAULT 0, next_attempt_at BIGINT,
        last_status_code INT, last_error TEXT, created_at BIGINT, delivered_at BIGINT)`,
      `CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY, company_id TEXT NOT NULL, key_id TEXT, action TEXT NOT NULL, target TEXT, ip TEXT, created_at BIGINT)`,
      'CREATE INDEX IF NOT EXISTS idx_policies_contact ON policies (contact_id)',
      'CREATE INDEX IF NOT EXISTS idx_call_requests_company ON call_requests (company_id, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_deliveries_pending ON webhook_deliveries (status, next_attempt_at)',
      'ALTER TABLE api_keys ADD COLUMN scopes TEXT',
    ];
    for (const sql of ddl) {
      try { await pool.query(sql); } catch (err) { if (err.code !== '42701') console.error('Integration migration error:', err.message); }
    }
  }

  const audit = (req, action, target) =>
    dbRun('INSERT INTO audit_log (id, company_id, key_id, action, target, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uid('aud'), req.companyId, req.keyId || null, action, target || null, req.ip, Date.now()]).catch(() => {});

  // ---------- API key auth (scoped, rate-limited) ----------
  const rate = new Map();
  const touched = new Map();
  const apiKeyAuth = (scope) => async (req, res, next) => {
    try {
      const m = /^Bearer (av_live_[a-f0-9]{48})$/.exec(req.headers.authorization || '');
      if (!m) return fail(res, 401, 'unauthorized', 'Missing or malformed API key. Send "Authorization: Bearer av_live_…"');
      const row = await dbGet('SELECT id, companyId, scopes FROM api_keys WHERE hash = ?', [hashKey(m[1])]);
      if (!row) return fail(res, 401, 'invalid_key', 'API key is invalid or has been revoked');
      const scopes = row.scopes ? JSON.parse(row.scopes) : core.SCOPES; // keys created before scopes existed keep full access
      if (scope && !scopes.includes(scope)) return fail(res, 403, 'insufficient_scope', `This key lacks the "${scope}" scope`);

      const now = Date.now();
      let r = rate.get(row.id);
      if (!r || r.resetAt < now) { r = { n: 0, resetAt: now + 60000 }; rate.set(row.id, r); }
      if (++r.n > RATE_LIMIT) {
        res.set('Retry-After', String(Math.ceil((r.resetAt - now) / 1000)));
        return fail(res, 429, 'rate_limited', `Rate limit of ${RATE_LIMIT} requests/minute exceeded`);
      }
      if ((touched.get(row.id) || 0) < now - 60000) {
        touched.set(row.id, now);
        dbRun('UPDATE api_keys SET lastUsedAt = ? WHERE id = ?', [now, row.id]).catch(() => {});
      }
      req.companyId = row.companyid;
      req.keyId = row.id;
      req.scopes = scopes;
      next();
    } catch (err) {
      console.error('[v1] auth error', err);
      fail(res, 500, 'internal_error', 'Internal error');
    }
  };

  app.get('/api/v1/me', apiKeyAuth(null), handler(async (req, res) => {
    const c = await dbGet('SELECT name FROM companies WHERE id = ?', [req.companyId]);
    res.json({ workspace: c?.name, key_id: req.keyId, scopes: req.scopes });
  }));

  // ---------- contacts ----------
  const publicContact = (r) => ({
    external_id: r.external_id, name: r.name, phone: r.phone, language: r.language,
    consent: { status: r.consent_status, at: iso(r.consent_at), source: r.consent_source },
    dnd: r.dnd, created_at: iso(r.created_at), updated_at: iso(r.updated_at),
  });
  const bad = (status, code, message) => ({ error: { status, code, message } });
  const findContact = (companyId, externalId) => dbGet('SELECT * FROM contacts WHERE company_id = ? AND external_id = ?', [companyId, String(externalId)]);

  async function upsertContact(companyId, externalId, b) {
    if (!b || typeof b !== 'object') return bad(422, 'invalid_body', 'Body must be a JSON object');
    if (typeof externalId !== 'string' || !externalId.trim() || externalId.length > 128) return bad(422, 'invalid_external_id', 'external_id must be a non-empty string up to 128 chars');
    const prev = await findContact(companyId, externalId);
    const phone = b.phone !== undefined ? core.normalizePhone(b.phone) : prev?.phone;
    if (!phone) return bad(422, 'invalid_phone', 'phone is required and must be a valid number (E.164, or a 10-digit Indian mobile)');
    const name = b.name !== undefined ? b.name : prev?.name;
    if (name != null && (typeof name !== 'string' || name.length > 120)) return bad(422, 'invalid_name', 'name must be a string up to 120 chars');
    const language = b.language !== undefined ? b.language : prev?.language;
    if (language != null && !languages.includes(language)) return bad(422, 'invalid_language', `language must be one of: ${languages.join(', ')}`);

    let { consent_status = 'unknown', consent_at = null, consent_source = null } = prev || {};
    if (b.consent !== undefined) {
      const c = b.consent || {};
      if (!core.CONSENT_STATUSES.includes(c.status)) return bad(422, 'invalid_consent', `consent.status must be one of: ${core.CONSENT_STATUSES.join(', ')}`);
      consent_status = c.status;
      consent_at = c.at ? Date.parse(c.at) : Date.now();
      if (Number.isNaN(consent_at)) return bad(422, 'invalid_consent', 'consent.at must be an ISO timestamp');
      consent_source = c.source ? String(c.source).slice(0, 60) : null;
    }
    let dnd = prev?.dnd ?? false;
    if (b.dnd !== undefined) {
      if (typeof b.dnd !== 'boolean') return bad(422, 'invalid_dnd', 'dnd must be a boolean');
      dnd = b.dnd;
    }
    const now = Date.now();
    await dbRun(`INSERT INTO contacts (id, company_id, external_id, name, phone, language, consent_status, consent_at, consent_source, dnd, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (company_id, external_id) DO UPDATE SET name = EXCLUDED.name, phone = EXCLUDED.phone, language = EXCLUDED.language,
        consent_status = EXCLUDED.consent_status, consent_at = EXCLUDED.consent_at, consent_source = EXCLUDED.consent_source,
        dnd = EXCLUDED.dnd, updated_at = EXCLUDED.updated_at`,
      [uid('con'), companyId, externalId, name ?? null, phone, language ?? null, consent_status, consent_at, consent_source, dnd, now, now]);
    return { contact: publicContact(await findContact(companyId, externalId)), created: !prev };
  }

  app.put('/api/v1/contacts/:externalId', apiKeyAuth('contacts:write'), handler(async (req, res) => {
    const r = await upsertContact(req.companyId, req.params.externalId, req.body);
    if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
    audit(req, 'contact.upsert', req.params.externalId);
    res.status(r.created ? 201 : 200).json(r.contact);
  }));

  const BULK_MAX = 500;
  async function bulk(req, res, keyField, fn, action) {
    const items = req.body?.items;
    if (!Array.isArray(items) || !items.length) return fail(res, 422, 'invalid_body', 'Body must be {"items": [...]} with at least one item');
    if (items.length > BULK_MAX) return fail(res, 413, 'too_many_items', `At most ${BULK_MAX} items per request`);
    const results = [];
    for (const item of items) {
      const id = item?.[keyField];
      try {
        const r = await fn(req.companyId, id, item);
        results.push(r.error ? { [keyField]: id ?? null, status: 'error', code: r.error.code, message: r.error.message } : { [keyField]: id, status: r.created ? 'created' : 'updated' });
      } catch (err) {
        console.error('[v1] bulk item error', err);
        results.push({ [keyField]: id ?? null, status: 'error', code: 'internal_error', message: 'Internal error' });
      }
    }
    audit(req, action, `${items.length} items`);
    res.json({ total: results.length, failed: results.filter((x) => x.status === 'error').length, results });
  }

  app.post('/api/v1/contacts/bulk', apiKeyAuth('contacts:write'), handler((req, res) => bulk(req, res, 'external_id', upsertContact, 'contact.bulk')));

  // Erasure: removes the contact, their policies, call requests and stored call data (transcripts/recordings links).
  app.delete('/api/v1/contacts/:externalId', apiKeyAuth('contacts:write'), handler(async (req, res) => {
    const c = await findContact(req.companyId, req.params.externalId);
    if (!c) return fail(res, 404, 'contact_not_found', 'No such contact');
    const crs = await dbAll('SELECT id, call_id FROM call_requests WHERE company_id = ? AND contact_id = ?', [req.companyId, c.id]);
    const callIds = crs.map((x) => x.call_id).filter(Boolean);
    if (callIds.length) await pool.query('DELETE FROM calls WHERE companyId = $1 AND id = ANY($2)', [req.companyId, callIds]);
    await dbRun('DELETE FROM call_requests WHERE company_id = ? AND contact_id = ?', [req.companyId, c.id]);
    await dbRun('DELETE FROM policies WHERE company_id = ? AND contact_id = ?', [req.companyId, c.id]);
    await dbRun('DELETE FROM contacts WHERE id = ?', [c.id]);
    audit(req, 'contact.erase', req.params.externalId);
    res.json({ deleted: true, call_requests_removed: crs.length });
  }));

  // ---------- policies ----------
  const publicPolicy = (r, contactExt) => ({
    external_id: r.external_id, contact_external_id: contactExt, type: r.type, product: r.product, status: r.status,
    expiry_date: r.expiry_date, premium: r.premium == null ? null : Number(r.premium), policy_ref_masked: r.policy_ref_masked,
    attributes: r.attributes ? JSON.parse(r.attributes) : {}, created_at: iso(r.created_at), updated_at: iso(r.updated_at),
  });

  async function upsertPolicy(companyId, externalId, b) {
    if (!b || typeof b !== 'object') return bad(422, 'invalid_body', 'Body must be a JSON object');
    if (typeof externalId !== 'string' || !externalId.trim() || externalId.length > 128) return bad(422, 'invalid_external_id', 'external_id must be a non-empty string up to 128 chars');
    const prev = await dbGet('SELECT * FROM policies WHERE company_id = ? AND external_id = ?', [companyId, externalId]);
    let contact;
    if (b.contact_external_id !== undefined) {
      contact = await findContact(companyId, b.contact_external_id);
      if (!contact) return bad(422, 'contact_not_found', 'contact_external_id does not match a known contact — upsert the contact first');
    } else if (prev) {
      contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [prev.contact_id]);
    } else {
      return bad(422, 'contact_required', 'contact_external_id is required');
    }
    const type = b.type !== undefined ? b.type : prev?.type;
    if (!core.POLICY_TYPES.includes(type)) return bad(422, 'invalid_type', `type must be one of: ${core.POLICY_TYPES.join(', ')}`);
    const str = (v, max, field) => (v == null || (typeof v === 'string' && v.length <= max) ? null : bad(422, `invalid_${field}`, `${field} must be a string up to ${max} chars`));
    const product = b.product !== undefined ? b.product : prev?.product;
    const status = b.status !== undefined ? b.status : prev?.status;
    const ref = b.policy_ref_masked !== undefined ? b.policy_ref_masked : prev?.policy_ref_masked;
    for (const e of [str(product, 40, 'product'), str(status, 40, 'status'), str(ref, 24, 'policy_ref_masked')]) if (e) return e;
    const expiry = b.expiry_date !== undefined ? b.expiry_date : prev?.expiry_date;
    if (expiry != null && !core.isValidIsoDate(expiry)) return bad(422, 'invalid_expiry_date', 'expiry_date must be YYYY-MM-DD');
    const premiumIn = b.premium !== undefined ? b.premium : prev?.premium;
    const premium = premiumIn == null ? null : Number(premiumIn);
    if (premium != null && (!Number.isFinite(premium) || premium < 0)) return bad(422, 'invalid_premium', 'premium must be a non-negative number');

    let attributes = prev?.attributes ? JSON.parse(prev.attributes) : {};
    if (b.attributes !== undefined) {
      const a = b.attributes;
      if (!a || typeof a !== 'object' || Array.isArray(a) || Object.keys(a).length > 30) return bad(422, 'invalid_attributes', 'attributes must be an object with at most 30 keys');
      for (const [k, v] of Object.entries(a)) {
        if (!/^[a-z_][a-z0-9_]{0,40}$/.test(k)) return bad(422, 'invalid_attributes', `attribute key "${k}" must be lower_snake_case`);
        if (!['string', 'number', 'boolean'].includes(typeof v) || String(v).length > 200) return bad(422, 'invalid_attributes', `attribute "${k}" must be a string/number/boolean up to 200 chars`);
      }
      attributes = a;
    }
    const now = Date.now();
    await dbRun(`INSERT INTO policies (id, company_id, external_id, contact_id, type, product, status, expiry_date, premium, policy_ref_masked, attributes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (company_id, external_id) DO UPDATE SET contact_id = EXCLUDED.contact_id, type = EXCLUDED.type, product = EXCLUDED.product,
        status = EXCLUDED.status, expiry_date = EXCLUDED.expiry_date, premium = EXCLUDED.premium, policy_ref_masked = EXCLUDED.policy_ref_masked,
        attributes = EXCLUDED.attributes, updated_at = EXCLUDED.updated_at`,
      [uid('pol'), companyId, externalId, contact.id, type, product ?? null, status ?? null, expiry ?? null, premium, ref ?? null, JSON.stringify(attributes), now, now]);
    const row = await dbGet('SELECT * FROM policies WHERE company_id = ? AND external_id = ?', [companyId, externalId]);
    return { policy: publicPolicy(row, contact.external_id), created: !prev };
  }

  app.put('/api/v1/policies/:externalId', apiKeyAuth('policies:write'), handler(async (req, res) => {
    const r = await upsertPolicy(req.companyId, req.params.externalId, req.body);
    if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
    audit(req, 'policy.upsert', req.params.externalId);
    res.status(r.created ? 201 : 200).json(r.policy);
  }));
  app.post('/api/v1/policies/bulk', apiKeyAuth('policies:write'), handler((req, res) => bulk(req, res, 'external_id', upsertPolicy, 'policy.bulk')));

  app.get('/api/v1/policies/:externalId', apiKeyAuth('policies:write'), handler(async (req, res) => {
    const p = await dbGet('SELECT * FROM policies WHERE company_id = ? AND external_id = ?', [req.companyId, req.params.externalId]);
    if (!p) return fail(res, 404, 'policy_not_found', 'No such policy');
    const c = await dbGet('SELECT external_id FROM contacts WHERE id = ?', [p.contact_id]);
    res.json(publicPolicy(p, c?.external_id));
  }));

  // ---------- scripts ----------
  const publicScript = (r) => ({
    id: r.id, name: r.name, policy_type: r.policy_type, language: r.language, agent_name: r.agent_name, company_name: r.company_name,
    greeting: r.greeting, script: r.script, guidelines: r.guidelines, version: r.version, active: r.active,
    variables: [...new Set([...core.extractPlaceholders(r.greeting), ...core.extractPlaceholders(r.script), ...core.extractPlaceholders(r.guidelines)])],
    created_at: iso(r.created_at), updated_at: iso(r.updated_at),
  });

  function validateScript(b, prev) {
    const v = {
      name: b.name ?? prev?.name, policy_type: b.policy_type !== undefined ? b.policy_type : prev?.policy_type ?? null,
      language: b.language !== undefined ? b.language : prev?.language ?? null,
      agent_name: b.agent_name ?? prev?.agent_name, company_name: b.company_name ?? prev?.company_name,
      greeting: b.greeting ?? prev?.greeting, script: b.script ?? prev?.script, guidelines: b.guidelines ?? prev?.guidelines ?? '',
    };
    for (const f of ['name', 'agent_name', 'company_name', 'greeting', 'script']) {
      if (typeof v[f] !== 'string' || !v[f].trim()) return bad(422, `invalid_${f}`, `${f} is required`);
    }
    if (v.name.length > 120 || v.agent_name.length > 60 || v.company_name.length > 80) return bad(422, 'invalid_length', 'name/agent_name/company_name are too long');
    if (v.greeting.length > 1000 || v.script.length > 20000 || v.guidelines.length > 5000) return bad(422, 'invalid_length', 'greeting/script/guidelines exceed the size limit');
    if (v.policy_type != null && !core.POLICY_TYPES.includes(v.policy_type)) return bad(422, 'invalid_policy_type', `policy_type must be null or one of: ${core.POLICY_TYPES.join(', ')}`);
    if (v.language != null && !languages.includes(v.language)) return bad(422, 'invalid_language', `language must be null or one of: ${languages.join(', ')}`);
    for (const f of ['greeting', 'script', 'guidelines']) {
      const e = core.templateSyntaxError(v[f]);
      if (e) return bad(422, 'invalid_template', `${f}: ${e}`);
    }
    return { value: v };
  }

  app.get('/api/v1/scripts', apiKeyAuth('scripts:read'), handler(async (req, res) => {
    const rows = await dbAll('SELECT * FROM scripts WHERE company_id = ? ORDER BY created_at DESC', [req.companyId]);
    res.json({ items: rows.map(publicScript) });
  }));

  app.get('/api/v1/scripts/:id', apiKeyAuth('scripts:read'), handler(async (req, res) => {
    const r = await dbGet('SELECT * FROM scripts WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!r) return fail(res, 404, 'script_not_found', 'No such script');
    res.json(publicScript(r));
  }));

  app.post('/api/v1/scripts', apiKeyAuth('scripts:write'), handler(async (req, res) => {
    const r = validateScript(req.body || {}, null);
    if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
    const v = r.value, id = uid('scr'), now = Date.now();
    await dbRun('INSERT INTO scripts (id, company_id, name, policy_type, language, agent_name, company_name, greeting, script, guidelines, version, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, true, ?, ?)',
      [id, req.companyId, v.name, v.policy_type, v.language, v.agent_name, v.company_name, v.greeting, v.script, v.guidelines, now, now]);
    audit(req, 'script.create', id);
    res.status(201).json(publicScript(await dbGet('SELECT * FROM scripts WHERE id = ?', [id])));
  }));

  // Editing the wording bumps `version`; each call request records the version it used.
  app.put('/api/v1/scripts/:id', apiKeyAuth('scripts:write'), handler(async (req, res) => {
    const prev = await dbGet('SELECT * FROM scripts WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!prev) return fail(res, 404, 'script_not_found', 'No such script');
    const r = validateScript(req.body || {}, prev);
    if (r.error) return fail(res, r.error.status, r.error.code, r.error.message);
    const v = r.value;
    const active = typeof req.body?.active === 'boolean' ? req.body.active : prev.active;
    const wordingChanged = ['greeting', 'script', 'guidelines', 'agent_name', 'company_name'].some((f) => v[f] !== prev[f]);
    await dbRun('UPDATE scripts SET name = ?, policy_type = ?, language = ?, agent_name = ?, company_name = ?, greeting = ?, script = ?, guidelines = ?, active = ?, version = ?, updated_at = ? WHERE id = ?',
      [v.name, v.policy_type, v.language, v.agent_name, v.company_name, v.greeting, v.script, v.guidelines, active, prev.version + (wordingChanged ? 1 : 0), Date.now(), prev.id]);
    audit(req, 'script.update', prev.id);
    res.json(publicScript(await dbGet('SELECT * FROM scripts WHERE id = ?', [prev.id])));
  }));

  // Deactivates rather than deletes so past call requests keep their script reference.
  app.delete('/api/v1/scripts/:id', apiKeyAuth('scripts:write'), handler(async (req, res) => {
    const prev = await dbGet('SELECT id FROM scripts WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!prev) return fail(res, 404, 'script_not_found', 'No such script');
    await dbRun('UPDATE scripts SET active = false, updated_at = ? WHERE id = ?', [Date.now(), prev.id]);
    audit(req, 'script.deactivate', prev.id);
    res.json({ deactivated: true });
  }));

  // ---------- webhooks (out) ----------
  const publicEndpoint = (r) => ({ id: r.id, url: r.url, events: JSON.parse(r.events), active: r.active, created_at: iso(r.created_at) });

  function validateWebhookUrl(raw) {
    let u;
    try { u = new URL(raw); } catch { return 'url is not a valid URL'; }
    if (String(raw).length > 500 || u.username || u.password) return 'url is too long or contains credentials';
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && local && !isProd)) return 'url must use https';
    if (isProd && (local || core.isPrivateAddress(u.hostname.replace(/^\[|\]$/g, '')))) return 'url must not point to a private address';
    return null;
  }

  app.post('/api/v1/webhooks', apiKeyAuth('webhooks:manage'), handler(async (req, res) => {
    const { url, events } = req.body || {};
    const err = validateWebhookUrl(url);
    if (err) return fail(res, 422, 'invalid_url', err);
    const wanted = events === undefined ? ['*'] : events;
    if (!Array.isArray(wanted) || !wanted.length || wanted.some((e) => e !== '*' && !core.EVENT_TYPES.includes(e))) {
      return fail(res, 422, 'invalid_events', `events must be ["*"] or a subset of: ${core.EVENT_TYPES.join(', ')}`);
    }
    const n = await dbGet('SELECT COUNT(*) AS n FROM webhook_endpoints WHERE company_id = ?', [req.companyId]);
    if (Number(n.n) >= 5) return fail(res, 400, 'limit_reached', 'At most 5 webhook endpoints per workspace');
    const id = uid('whe'), secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
    await dbRun('INSERT INTO webhook_endpoints (id, company_id, url, events, secret, active, created_at) VALUES (?, ?, ?, ?, ?, true, ?)',
      [id, req.companyId, url, JSON.stringify(wanted), secret, Date.now()]);
    audit(req, 'webhook.create', id);
    // The signing secret is shown once.
    res.status(201).json({ ...publicEndpoint(await dbGet('SELECT * FROM webhook_endpoints WHERE id = ?', [id])), secret });
  }));

  app.get('/api/v1/webhooks', apiKeyAuth('webhooks:manage'), handler(async (req, res) => {
    const rows = await dbAll('SELECT * FROM webhook_endpoints WHERE company_id = ? ORDER BY created_at DESC', [req.companyId]);
    res.json({ items: rows.map(publicEndpoint) });
  }));

  app.delete('/api/v1/webhooks/:id', apiKeyAuth('webhooks:manage'), handler(async (req, res) => {
    const e = await dbGet('SELECT id FROM webhook_endpoints WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!e) return fail(res, 404, 'webhook_not_found', 'No such webhook endpoint');
    await dbRun('DELETE FROM webhook_deliveries WHERE endpoint_id = ?', [e.id]);
    await dbRun('DELETE FROM webhook_endpoints WHERE id = ?', [e.id]);
    audit(req, 'webhook.delete', e.id);
    res.json({ deleted: true });
  }));

  const publicDelivery = (d) => ({
    id: d.id, event_id: d.event_id, type: d.event_type, status: d.status, attempts: d.attempts,
    next_attempt_at: d.status === 'pending' ? iso(d.next_attempt_at) : null, last_status_code: d.last_status_code, last_error: d.last_error,
    created_at: iso(d.created_at), delivered_at: iso(d.delivered_at),
  });

  app.get('/api/v1/webhooks/:id/deliveries', apiKeyAuth('webhooks:manage'), handler(async (req, res) => {
    const e = await dbGet('SELECT id FROM webhook_endpoints WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!e) return fail(res, 404, 'webhook_not_found', 'No such webhook endpoint');
    const rows = await dbAll('SELECT * FROM webhook_deliveries WHERE endpoint_id = ? ORDER BY created_at DESC LIMIT 50', [e.id]);
    res.json({ items: rows.map(publicDelivery) });
  }));

  app.post('/api/v1/webhooks/deliveries/:id/replay', apiKeyAuth('webhooks:manage'), handler(async (req, res) => {
    const d = await dbGet('SELECT id FROM webhook_deliveries WHERE id = ? AND company_id = ?', [req.params.id, req.companyId]);
    if (!d) return fail(res, 404, 'delivery_not_found', 'No such delivery');
    await dbRun("UPDATE webhook_deliveries SET status = 'pending', attempts = 0, next_attempt_at = ?, last_error = NULL WHERE id = ?", [Date.now(), d.id]);
    setImmediate(processDeliveries);
    res.json({ queued: true });
  }));

  async function emitEvent(companyId, type, data) {
    const endpoints = await dbAll('SELECT * FROM webhook_endpoints WHERE company_id = ? AND active = true', [companyId]);
    const eventId = uid('evt');
    const payload = JSON.stringify({ id: eventId, type, created_at: new Date().toISOString(), data });
    let queued = 0;
    for (const e of endpoints) {
      const wanted = JSON.parse(e.events);
      if (!wanted.includes('*') && !wanted.includes(type)) continue;
      await dbRun('INSERT INTO webhook_deliveries (id, company_id, endpoint_id, event_id, event_type, payload, status, attempts, next_attempt_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)',
        [uid('dlv'), companyId, e.id, eventId, type, payload, 'pending', Date.now(), Date.now()]);
      queued++;
    }
    if (queued) setImmediate(processDeliveries);
  }

  let delivering = false;
  async function processDeliveries() {
    if (delivering) return;
    delivering = true;
    try {
      const due = await dbAll("SELECT * FROM webhook_deliveries WHERE status = 'pending' AND next_attempt_at <= ? ORDER BY next_attempt_at LIMIT 25", [Date.now()]);
      for (const d of due) {
        // Claim: push next_attempt_at out so a crash mid-send retries instead of double-sending.
        const claim = await pool.query("UPDATE webhook_deliveries SET next_attempt_at = $1 WHERE id = $2 AND status = 'pending' AND next_attempt_at = $3", [Date.now() + 60000, d.id, d.next_attempt_at]);
        if (!claim.rowCount) continue;
        const ep = await dbGet('SELECT * FROM webhook_endpoints WHERE id = ?', [d.endpoint_id]);
        let code = null, errMsg = null;
        if (!ep) {
          errMsg = 'endpoint removed';
        } else {
          try {
            if (isProd) {
              const host = new URL(ep.url).hostname;
              const addrs = await dns.lookup(host, { all: true });
              if (addrs.some((a) => core.isPrivateAddress(a.address))) throw new Error('blocked_address');
            }
            const r = await fetch(ep.url, {
              method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10000),
              headers: {
                'Content-Type': 'application/json', 'User-Agent': 'ArhamAvaz-Webhooks/1',
                'X-Webhook-Id': d.event_id, 'X-Webhook-Signature': core.signWebhook(ep.secret, d.payload),
              },
              body: d.payload,
            });
            code = r.status;
            if (r.status < 200 || r.status >= 300) errMsg = `HTTP ${r.status}`;
          } catch (e) {
            errMsg = e.message === 'blocked_address' ? 'blocked_address' : (e.cause?.code || e.name || 'network_error');
          }
        }
        const attempts = d.attempts + 1;
        if (!errMsg) {
          await dbRun("UPDATE webhook_deliveries SET status = 'delivered', attempts = ?, last_status_code = ?, last_error = NULL, delivered_at = ? WHERE id = ?", [attempts, code, Date.now(), d.id]);
        } else if (!ep || errMsg === 'blocked_address' || attempts >= core.MAX_ATTEMPTS) {
          await dbRun("UPDATE webhook_deliveries SET status = 'failed', attempts = ?, last_status_code = ?, last_error = ? WHERE id = ?", [attempts, code, errMsg, d.id]);
        } else {
          await dbRun('UPDATE webhook_deliveries SET attempts = ?, last_status_code = ?, last_error = ?, next_attempt_at = ? WHERE id = ?', [attempts, code, errMsg, Date.now() + core.backoffMs(attempts), d.id]);
        }
      }
    } catch (err) {
      console.error('[v1] delivery worker error', err.message);
    } finally {
      delivering = false;
    }
  }

  // ---------- call requests ----------
  const FULL_SELECT = `SELECT cr.*, c.external_id AS contact_ext, p.external_id AS policy_ext, k.bolnadata AS bolnadata, k.status AS call_status
    FROM call_requests cr LEFT JOIN contacts c ON c.id = cr.contact_id LEFT JOIN policies p ON p.id = cr.policy_id LEFT JOIN calls k ON k.id = cr.call_id`;
  const loadFull = (companyId, id) => dbGet(`${FULL_SELECT} WHERE cr.company_id = ? AND cr.id = ?`, [companyId, id]);

  function publicCallRequest(r) {
    const bolna = r.bolnadata ? JSON.parse(r.bolnadata) : {};
    return {
      id: r.id, status: r.status, outcome: r.outcome, error: r.error, call_id: r.call_id,
      contact_id: r.contact_ext, policy_id: r.policy_ext, script: { id: r.script_id, version: r.script_version },
      scheduled_at: iso(r.scheduled_at), created_at: iso(r.created_at), updated_at: iso(r.updated_at),
      duration_seconds: bolna.status ? core.callDuration(bolna) : null,
      summary: bolna.summary || null, hangup_reason: bolna.telephony_data?.hangup_reason || null,
      transcript_available: Boolean(bolna.transcript), recording_available: Boolean(bolna.telephony_data?.recording_url),
    };
  }

  const eventData = (r, bolna = {}) => ({
    call_request_id: r.id, call_id: r.call_id, contact_id: r.contact_ext, policy_id: r.policy_ext,
    status: bolna.status || r.status, outcome: r.outcome, error: r.error || undefined,
    duration_seconds: bolna.status ? core.callDuration(bolna) : undefined,
    transcript_url: bolna.transcript ? `${PUBLIC_API}/api/v1/calls/${r.call_id}/transcript` : undefined,
    recording_url: bolna.telephony_data?.recording_url ? `${PUBLIC_API}/api/v1/calls/${r.call_id}/recording` : undefined,
  });

  // Records newly-seen Bolna state for a call request and announces each event exactly once.
  async function applyExecution(cr, bolna) {
    const status = bolna?.status;
    if (!status || !cr.call_id) return;
    await dbRun('UPDATE calls SET status = ?, bolnaData = ? WHERE id = ?', [status, JSON.stringify(bolna), cr.call_id]);
    const terminal = core.TERMINAL_STATUSES.includes(status);
    const outcome = terminal ? core.normalizeOutcome(bolna) : cr.outcome;
    const emitted = JSON.parse(cr.events_emitted || '[]');
    const toEmit = [];
    const statusEvent = core.eventForStatus(status);
    if (statusEvent && !emitted.includes(statusEvent)) toEmit.push(statusEvent);
    if (terminal) {
      if (outcome && !emitted.includes('outcome.recorded')) toEmit.push('outcome.recorded');
      if (bolna.transcript && !emitted.includes('transcript.ready')) toEmit.push('transcript.ready');
      if (bolna.telephony_data?.recording_url && !emitted.includes('recording.ready')) toEmit.push('recording.ready');
    }
    const next = [...emitted, ...toEmit];
    // Optimistic guard so a webhook and the poller racing don't both announce the same events.
    const upd = await pool.query(
      "UPDATE call_requests SET status = $1, outcome = $2, events_emitted = $3, updated_at = $4 WHERE id = $5 AND COALESCE(events_emitted, '[]') = $6",
      [status, outcome ?? null, JSON.stringify(next), Date.now(), cr.id, cr.events_emitted || '[]']);
    if (!upd.rowCount) return;
    if (outcome === 'do_not_call') await dbRun('UPDATE contacts SET dnd = true, updated_at = ? WHERE id = ?', [Date.now(), cr.contact_id]);
    const merged = { ...cr, status, outcome };
    for (const type of toEmit) await emitEvent(cr.company_id, type, eventData(merged, bolna));
  }

  async function syncCallRequest(cr) {
    if (!cr.call_id || !hasBolna || cr.call_id.startsWith('sched_')) return;
    try {
      await applyExecution(cr, await requestBolna(`/executions/${cr.call_id}`));
    } catch (err) {
      console.error('[v1] sync error', cr.id, err.message);
    }
  }

  let polling = false;
  async function pollCalls() {
    if (polling) return;
    polling = true;
    try {
      const open = await dbAll(`${FULL_SELECT} WHERE cr.call_id IS NOT NULL AND cr.status NOT IN (${core.TERMINAL_STATUSES.map(() => '?').join(',')}) AND cr.created_at > ? ORDER BY cr.created_at LIMIT 50`,
        [...core.TERMINAL_STATUSES, Date.now() - 3 * 86400e3]);
      for (const cr of open) await syncCallRequest(cr);
    } catch (err) {
      console.error('[v1] poll error', err.message);
    } finally {
      polling = false;
    }
  }

  function startWorkers() {
    setInterval(processDeliveries, 15000).unref();
    setInterval(pollCalls, 30000).unref();
    setTimeout(processDeliveries, 2000).unref();
  }

  async function loadCompliance(companyId) {
    const row = await dbGet('SELECT compliance FROM companies WHERE id = ?', [companyId]);
    return sanitizeCompliance(row?.compliance ? JSON.parse(row.compliance) : {});
  }

  function pickScript(scripts, policy, language) {
    const score = (s) => (s.policy_type === policy.type ? 2 : s.policy_type == null ? 0 : -1) + (s.language === language ? 1 : s.language == null ? 0 : -1);
    return scripts.filter((s) => score(s) >= 0).sort((a, b) => score(b) - score(a) || Number(b.created_at) - Number(a.created_at))[0];
  }

  app.post('/api/v1/call-requests', apiKeyAuth('calls:create'), handler(async (req, res) => {
    const b = req.body || {};
    const idem = req.get('Idempotency-Key')?.trim() || null;
    if (idem && idem.length > 128) return fail(res, 400, 'invalid_idempotency_key', 'Idempotency-Key must be at most 128 chars');
    if (idem) {
      const prev = await dbGet('SELECT id FROM call_requests WHERE company_id = ? AND idempotency_key = ?', [req.companyId, idem]);
      if (prev) return res.status(200).json({ ...publicCallRequest(await loadFull(req.companyId, prev.id)), idempotent_replay: true });
    }
    if (!hasBolna) return fail(res, 503, 'provider_not_configured', 'Calling is not configured on this server');
    if (!b.policy_id && !b.contact_id) return fail(res, 422, 'invalid_body', 'Provide policy_id or contact_id');

    let policy = null, contact = null;
    if (b.policy_id) {
      policy = await dbGet('SELECT * FROM policies WHERE company_id = ? AND external_id = ?', [req.companyId, String(b.policy_id)]);
      if (!policy) return fail(res, 404, 'policy_not_found', 'No such policy');
      contact = await dbGet('SELECT * FROM contacts WHERE id = ?', [policy.contact_id]);
    }
    if (b.contact_id) {
      const c = await findContact(req.companyId, b.contact_id);
      if (!c) return fail(res, 404, 'contact_not_found', 'No such contact');
      if (contact && contact.id !== c.id) return fail(res, 422, 'mismatch', 'policy_id does not belong to contact_id');
      contact = c;
    }
    if (!policy) return fail(res, 422, 'policy_required', 'A policy_id is required so the agent knows what the call is about');

    let when = new Date();
    let scheduledAt = null;
    if (b.scheduled_at !== undefined && b.scheduled_at !== null) {
      scheduledAt = Date.parse(b.scheduled_at);
      if (Number.isNaN(scheduledAt)) return fail(res, 422, 'invalid_scheduled_at', 'scheduled_at must be an ISO 8601 timestamp with a time zone');
      if (scheduledAt < Date.now() + 60000 || scheduledAt > Date.now() + 30 * 86400e3) return fail(res, 422, 'invalid_scheduled_at', 'scheduled_at must be between 1 minute and 30 days from now');
      when = new Date(scheduledAt);
    }

    // Eligibility
    if (REQUIRE_CONSENT && contact.consent_status !== 'granted') {
      return fail(res, 403, 'consent_required', `Contact consent is "${contact.consent_status}"; calls need consent.status = "granted"`);
    }
    const compliance = await loadCompliance(req.companyId);
    const blocked = core.checkCalling(compliance, contact.phone, when, { contactDnd: contact.dnd });
    if (blocked) return fail(res, 403, blocked.code, blocked.message);
    const wallet = await dbGet('SELECT balance FROM wallets WHERE companyId = ?', [req.companyId]);
    if (Number(wallet?.balance || 0) < MIN_BALANCE) return fail(res, 402, 'insufficient_balance', 'Wallet balance is too low to place calls — top up first');
    const recent = await dbGet(
      "SELECT id FROM call_requests WHERE company_id = ? AND policy_id = ? AND status NOT IN ('failed','canceled','error','busy','no-answer','stopped') AND created_at > ? LIMIT 1",
      [req.companyId, policy.id, Date.now() - COOLDOWN_MS]);
    if (recent) return fail(res, 409, 'duplicate_call_request', 'This policy was already called or queued recently', { existing_id: recent.id });

    // Script
    const language = contact.language || null;
    let script;
    if (b.script_id) {
      script = await dbGet('SELECT * FROM scripts WHERE id = ? AND company_id = ? AND active = true', [String(b.script_id), req.companyId]);
      if (!script) return fail(res, 404, 'script_not_found', 'No such active script');
    } else {
      const all = await dbAll('SELECT * FROM scripts WHERE company_id = ? AND active = true', [req.companyId]);
      script = pickScript(all, policy, language);
      if (!script) return fail(res, 422, 'no_script', `No active script matches policy type "${policy.type}". Create one via POST /api/v1/scripts`);
    }
    const callLanguage = language || script.language || 'en';

    const attributes = policy.attributes ? JSON.parse(policy.attributes) : {};
    const vars = {
      ...attributes,
      customer_name: contact.name || 'not specified', policy_type: policy.type, product: policy.product, status: policy.status,
      expiry_date: policy.expiry_date, premium: policy.premium == null ? null : Number(policy.premium), policy_ref: policy.policy_ref_masked,
      days_to_expiry: core.daysUntil(policy.expiry_date, new Date(), compliance.callingHours.timezone),
      agent_name: script.agent_name, company_name: script.company_name,
    };
    const rendered = {}, missing = [];
    for (const f of ['greeting', 'script', 'guidelines']) {
      const r = core.renderTemplate(script[f], vars);
      rendered[f] = r.text.replace(/\s+([,.।?!])/g, '$1').replace(/[ \t]{2,}/g, ' ').trim();
      missing.push(...r.missing);
    }
    if (missing.length) return fail(res, 422, 'missing_variables', `The script uses variables this policy/contact doesn't have: ${[...new Set(missing)].join(', ')}`, { missing: [...new Set(missing)] });

    // Record first (the unique idempotency key makes concurrent duplicates collapse), then dial.
    const id = uid('cr'), now = Date.now();
    try {
      await dbRun('INSERT INTO call_requests (id, company_id, contact_id, policy_id, script_id, script_version, status, scheduled_at, idempotency_key, events_emitted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, req.companyId, contact.id, policy.id, script.id, script.version, scheduledAt ? 'scheduled' : 'queued', scheduledAt, idem, '["call.queued"]', now, now]);
    } catch (err) {
      if (err.code === '23505' && idem) {
        const prev = await dbGet('SELECT id FROM call_requests WHERE company_id = ? AND idempotency_key = ?', [req.companyId, idem]);
        if (prev) return res.status(200).json({ ...publicCallRequest(await loadFull(req.companyId, prev.id)), idempotent_replay: true });
      }
      throw err;
    }

    let response;
    try {
      response = await requestBolna('/call', {
        method: 'POST',
        body: JSON.stringify({
          agent_id: getBolnaAgentId(callLanguage),
          recipient_phone_number: contact.phone,
          user_data: {
            customer_name: vars.customer_name, agent_name: script.agent_name, company_name: script.company_name, language: callLanguage,
            call_goal: script.name, greeting: rendered.greeting, script: rendered.script, guidelines: rendered.guidelines,
            timezone: compliance.callingHours.timezone,
            policy_type: policy.type, product: policy.product ?? '', expiry_date: policy.expiry_date ?? '', premium: vars.premium ?? '',
            days_to_expiry: vars.days_to_expiry ?? '', ...Object.fromEntries(Object.entries(attributes).map(([k, v]) => [k, String(v)])),
          },
          ...(process.env.BOLNA_FROM_NUMBER && { from_phone_number: process.env.BOLNA_FROM_NUMBER }),
          ...(scheduledAt && { scheduled_at: new Date(scheduledAt).toISOString() }),
        }),
      });
    } catch (err) {
      console.error('[v1] provider error', err.message);
      await dbRun("UPDATE call_requests SET status = 'failed', outcome = 'failed', error = 'provider_error', updated_at = ? WHERE id = ?", [Date.now(), id]);
      emitEvent(req.companyId, 'call.failed', { call_request_id: id, contact_id: contact.external_id, policy_id: policy.external_id, status: 'failed', outcome: 'failed', error: 'provider_error' }).catch(() => {});
      return fail(res, 502, 'provider_error', 'The calling provider rejected the request', { call_request_id: id });
    }

    const execId = response.execution_id || null;
    // Same row the dashboard's /api/calls reads, so these calls also appear in the Responses tab.
    await dbRun('INSERT INTO calls (id, companyId, agentId, phone, customerName, status, createdAt, scheduledAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [execId || `sched_${Date.now()}_${id}`, req.companyId, script.id, contact.phone, contact.name || '', scheduledAt ? 'scheduled' : 'queued', Date.now(), scheduledAt]);
    await dbRun('UPDATE call_requests SET call_id = ?, updated_at = ? WHERE id = ?', [execId, Date.now(), id]);
    audit(req, 'call_request.create', id);

    const full = await loadFull(req.companyId, id);
    emitEvent(req.companyId, 'call.queued', eventData(full)).catch(() => {});
    res.status(202).json(publicCallRequest(full));
  }));

  app.get('/api/v1/call-requests', apiKeyAuth('calls:read'), handler(async (req, res) => {
    const where = ['cr.company_id = ?'], p = [req.companyId];
    if (req.query.status) { where.push('cr.status = ?'); p.push(String(req.query.status)); }
    if (req.query.outcome) { where.push('cr.outcome = ?'); p.push(String(req.query.outcome)); }
    if (req.query.policy_id) { where.push('p.external_id = ?'); p.push(String(req.query.policy_id)); }
    if (req.query.contact_id) { where.push('c.external_id = ?'); p.push(String(req.query.contact_id)); }
    for (const [q, op] of [['from', '>='], ['to', '<=']]) {
      if (req.query[q]) {
        const t = Date.parse(req.query[q]);
        if (Number.isNaN(t)) return fail(res, 422, 'invalid_date', `${q} must be an ISO 8601 timestamp`);
        where.push(`cr.created_at ${op} ?`); p.push(t);
      }
    }
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const rows = await dbAll(`${FULL_SELECT} WHERE ${where.join(' AND ')} ORDER BY cr.created_at DESC LIMIT ${limit} OFFSET ${offset}`, p);
    res.json({ items: rows.map(publicCallRequest), limit, offset });
  }));

  app.get('/api/v1/call-requests/:id', apiKeyAuth('calls:read'), handler(async (req, res) => {
    let r = await loadFull(req.companyId, req.params.id);
    if (!r) return fail(res, 404, 'call_request_not_found', 'No such call request');
    if (r.call_id && !core.TERMINAL_STATUSES.includes(r.status)) {
      await syncCallRequest(r); // fresh status without waiting for the poller
      r = await loadFull(req.companyId, req.params.id);
    }
    res.json(publicCallRequest(r));
  }));

  async function ownedCall(req, res) {
    const r = await dbGet(`${FULL_SELECT} WHERE cr.company_id = ? AND cr.call_id = ?`, [req.companyId, req.params.callId]);
    if (!r) { fail(res, 404, 'call_not_found', 'No such call'); return null; }
    return { r, bolna: r.bolnadata ? JSON.parse(r.bolnadata) : {} };
  }

  app.get('/api/v1/calls/:callId/transcript', apiKeyAuth('calls:read'), handler(async (req, res) => {
    const c = await ownedCall(req, res);
    if (!c) return;
    if (!c.bolna.transcript) return fail(res, 404, 'transcript_not_available', 'No transcript yet');
    audit(req, 'transcript.read', req.params.callId);
    res.json({ call_id: req.params.callId, transcript: c.bolna.transcript, summary: c.bolna.summary || null, extracted_data: c.bolna.extracted_data || null });
  }));

  // Returns a short-lived signed link rather than the provider's permanent recording URL.
  app.get('/api/v1/calls/:callId/recording', apiKeyAuth('calls:read'), handler(async (req, res) => {
    const c = await ownedCall(req, res);
    if (!c) return;
    if (!c.bolna.telephony_data?.recording_url) return fail(res, 404, 'recording_not_available', 'No recording yet');
    const exp = Date.now() + 10 * 60 * 1000;
    audit(req, 'recording.link', req.params.callId);
    res.json({ url: `${PUBLIC_API}/api/v1/recordings/${encodeURIComponent(req.params.callId)}?exp=${exp}&sig=${core.signRecordingLink(signingSecret, req.params.callId, exp)}`, expires_at: iso(exp) });
  }));

  app.get('/api/v1/recordings/:callId', handler(async (req, res) => {
    const exp = Number(req.query.exp);
    if (!core.verifyRecordingLink(signingSecret, req.params.callId, exp, String(req.query.sig || ''))) return fail(res, 403, 'invalid_link', 'Link is invalid or has expired');
    const k = await dbGet('SELECT bolnadata FROM calls WHERE id = ?', [req.params.callId]);
    const url = k?.bolnadata ? JSON.parse(k.bolnadata).telephony_data?.recording_url : null;
    if (!url) return fail(res, 404, 'recording_not_available', 'No recording');
    res.set('Cache-Control', 'no-store').redirect(302, url);
  }));

  // ---------- inbound from Bolna ----------
  // Point the Bolna agent's webhook at  POST <API>/api/bolna/webhook?token=$BOLNA_WEBHOOK_TOKEN
  app.post('/api/bolna/webhook', handler(async (req, res) => {
    const expected = process.env.BOLNA_WEBHOOK_TOKEN;
    if (!expected) return fail(res, 503, 'not_configured', 'BOLNA_WEBHOOK_TOKEN is not set');
    const given = String(req.query.token || req.get('x-webhook-token') || '');
    const a = Buffer.from(given), b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(res, 401, 'unauthorized', 'Invalid token');
    const exec = req.body || {};
    if (!exec.id || !exec.status) return fail(res, 400, 'invalid_body', 'Expected a Bolna execution payload');
    const cr = await dbGet(`${FULL_SELECT} WHERE cr.call_id = ?`, [String(exec.id)]);
    if (cr) await applyExecution(cr, exec);
    else await dbRun('UPDATE calls SET status = ?, bolnaData = ? WHERE id = ?', [exec.status, JSON.stringify(exec), String(exec.id)]);
    res.json({ ok: true });
  }));

  return { initDb, startWorkers };
};
