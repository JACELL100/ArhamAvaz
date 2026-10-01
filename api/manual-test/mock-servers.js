// Stand-ins for the outside world, for manual testing:
//   - fake Bolna on :4010  (accepts calls; you "finish" a call by hand)
//   - fake Arham Secure webhook receiver on :4011  (prints every event and checks its signature)
//   node manual-test/mock-servers.js
const http = require('http');
const core = require('../lib/core');

const state = { calls: {}, secret: null };
const out = (...a) => console.log(new Date().toLocaleTimeString(), ...a);

function readBody(req) {
  return new Promise((resolve) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => resolve(b)); });
}

// ---------- fake Bolna ----------
http.createServer(async (req, res) => {
  const body = await readBody(req);
  const url = new URL(req.url, 'http://x');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'POST' && url.pathname === '/call') {
    const j = JSON.parse(body);
    const id = `exec_${Object.keys(state.calls).length + 1}_${Date.now()}`;
    state.calls[id] = { id, status: 'queued' };
    out(`[bolna] CALL placed -> ${j.recipient_phone_number}  (execution ${id})`);
    out('[bolna] greeting :', j.user_data.greeting);
    out('[bolna] script   :', j.user_data.script);
    return res.end(JSON.stringify({ execution_id: id, status: 'queued' }));
  }
  const m = /^\/executions\/(.+)$/.exec(url.pathname);
  if (req.method === 'GET' && m && state.calls[m[1]]) return res.end(JSON.stringify(state.calls[m[1]]));

  // Control: finish a call.  POST /_finish/<execId>?outcome=Already%20Renewed|no-answer|do_not_call
  const f = /^\/_finish\/(.+)$/.exec(url.pathname);
  if (req.method === 'POST' && f && state.calls[f[1]]) {
    const outcome = url.searchParams.get('outcome') || 'Already Renewed';
    if (outcome === 'no-answer') {
      state.calls[f[1]] = { id: f[1], status: 'no-answer' };
    } else {
      state.calls[f[1]] = {
        id: f[1], status: 'completed', conversation_duration: 75, summary: `Call finished, outcome: ${outcome}`,
        transcript: 'assistant: Namaste, main Deepali bol rahi hoon.\nuser: Haan boliye.',
        extracted_data: outcome === 'do_not_call' ? { do_not_call: true } : { outcome },
        telephony_data: { recording_url: 'https://example.com/fake-recording.mp3', hangup_reason: 'Normal Hangup' },
      };
    }
    out(`[bolna] call ${f[1]} marked ${state.calls[f[1]].status} (${outcome})`);
    return res.end(JSON.stringify(state.calls[f[1]]));
  }
  res.statusCode = 404; res.end('{}');
}).listen(4010, () => out('fake Bolna listening on http://localhost:4010'));

// ---------- fake Arham Secure webhook receiver ----------
http.createServer(async (req, res) => {
  const body = await readBody(req);
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/_secret') { state.secret = url.searchParams.get('value'); out('[hook] signing secret stored'); return res.end('ok'); }
  if (url.pathname === '/fail') { out('[hook] /fail hit -> answering 500 (to demo retries)'); res.statusCode = 500; return res.end('nope'); }
  let event = {};
  try { event = JSON.parse(body); } catch {}
  const verdict = !state.secret ? 'signature NOT checked (send the secret to /_secret)'
    : core.verifyWebhook(state.secret, body, req.headers['x-webhook-signature']) ? 'signature VALID' : 'signature INVALID';
  out(`[hook] ${event.type}  ${verdict}`);
  out('       ', JSON.stringify(event.data));
  res.end('ok');
}).listen(4011, () => out('fake webhook receiver listening on http://localhost:4011'));
