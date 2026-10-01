// Creates (or removes) a throwaway workspace + API key in your LOCAL database for manual testing.
//   node manual-test/seed.js            -> prints an API key
//   node manual-test/seed.js --cleanup  -> deletes everything this workspace created
require('dotenv').config();
const crypto = require('crypto');
const { Pool } = require('pg');

const ID = 'manual_test';
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false } });

async function cleanup() {
  for (const t of ['contacts', 'policies', 'scripts', 'call_requests', 'webhook_endpoints', 'webhook_deliveries', 'audit_log']) {
    await pool.query(`DELETE FROM ${t} WHERE company_id = $1`, [ID]).catch(() => {});
  }
  for (const t of ['calls', 'api_keys', 'wallets']) await pool.query(`DELETE FROM ${t} WHERE companyId = $1`, [ID]).catch(() => {});
  await pool.query('DELETE FROM companies WHERE id = $1', [ID]);
}

(async () => {
  await cleanup();
  if (process.argv.includes('--cleanup')) {
    console.log('Removed the manual_test workspace and everything it created.');
  } else {
    // Calling hours are switched off so you can test at any time of day. DND list is on and empty.
    const compliance = { callingHours: { enabled: false }, dnd: { enabled: true, numbers: [] } };
    await pool.query("INSERT INTO companies (id, name, phone, email, password, stage, compliance) VALUES ($1, 'Manual Test Workspace', '+910000000000', 'manual_test@example.test', 'x', 'done', $2)", [ID, JSON.stringify(compliance)]);
    await pool.query('INSERT INTO wallets (companyId, balance, updatedAt) VALUES ($1, 1000, $2)', [ID, Date.now()]);
    const secret = `av_live_${crypto.randomBytes(24).toString('hex')}`;
    await pool.query('INSERT INTO api_keys (id, companyId, name, prefix, hash, createdAt) VALUES ($1, $2, $3, $4, $5, $6)',
      ['k_manual_test', ID, 'manual test', secret.slice(0, 12), crypto.createHash('sha256').update(secret).digest('hex'), Date.now()]);
    console.log('Workspace "manual_test" created (wallet Rs 1000, calling hours off).\n\nYour API key (full access):\n' + secret);
  }
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
