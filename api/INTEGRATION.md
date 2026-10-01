# Arham Secure ↔ Voice Agent integration (API v1)

Arham Secure pushes customers and policies to us, asks us to call, and receives signed webhooks with the results.
Base URL: `https://<api-host>/api/v1`. All bodies are JSON. Errors look like `{ "error": "message", "code": "machine_code" }`.

## 1. Authentication

Create a key in the dashboard (**Settings → API keys**, which issues full-access keys) or, to restrict it, `POST /api/keys` (dashboard JWT) with `"scopes": [...]`.
Send it on every request: `Authorization: Bearer av_live_…`. The key is shown once; only its hash is stored.

| Scope | Allows |
|---|---|
| `contacts:write` | upsert / bulk / erase contacts |
| `policies:write` | upsert / bulk / read policies |
| `scripts:read`, `scripts:write` | read / manage call scripts |
| `calls:create` | create call requests |
| `calls:read` | read call requests, transcripts, recordings |
| `webhooks:manage` | manage webhook endpoints and deliveries |

Use separate keys per job (e.g. a data-sync key with only `contacts:write` + `policies:write`). Keys created before scopes existed keep full access.
Limit: 120 requests/min per key (`429` + `Retry-After`). `GET /me` shows the workspace and the key's scopes.

## 2. Sending customers and policies

Arham's own IDs are the keys; re-sending is safe (upsert).

```http
PUT /contacts/CUST-4471
{ "name": "Priya Shah", "phone": "98765 43210", "language": "hinglish",
  "consent": { "status": "granted", "at": "2026-09-01T10:00:00Z", "source": "policy_form" } }

PUT /policies/POL-889123
{ "contact_external_id": "CUST-4471", "type": "renewal", "product": "motor", "status": "due",
  "expiry_date": "2026-11-12", "premium": 8420, "policy_ref_masked": "****9123",
  "attributes": { "vehicle_make": "Maruti", "vehicle_model": "Swift", "vehicle_number": "KA01AB1234" } }
```

* `phone`: E.164 or a 10-digit Indian mobile; stored as E.164. `language`: `en hi hinglish gu mr ta te kn ml bn pa od`.
* `consent.status`: `granted | revoked | unknown`. **Calls are refused unless it is `granted`.**
* `type`: `renewal | new | lapsed | other`. `attributes`: up to 30 `lower_snake_case` keys, scalar values ≤200 chars; they become script variables.
* Send only a **masked** policy reference. Do not send Aadhaar, PAN, card numbers, or full policy numbers.
* Batches: `POST /contacts/bulk` and `POST /policies/bulk` with `{ "items": [ … ] }` (≤500; each item carries its own `external_id`). Response lists a result per item.
* `DELETE /contacts/{external_id}` erases the contact, their policies, call requests and stored call data.

## 3. Scripts by scenario

A script is a template. Placeholders: `{{customer_name}} {{policy_type}} {{product}} {{status}} {{expiry_date}} {{days_to_expiry}} {{premium}} {{policy_ref}} {{agent_name}} {{company_name}}` plus any policy `attribute`.

```http
POST /scripts
{ "name": "Motor renewal", "policy_type": "renewal", "language": null,
  "agent_name": "Deepali", "company_name": "Arham Secure",
  "greeting": "Namaste {{customer_name}}, main {{agent_name}} bol rahi hoon {{company_name}} se.",
  "script": "Your {{vehicle_make}} {{product}} policy expires on {{expiry_date}} ({{days_to_expiry}} days)…",
  "guidelines": "Be brief. Never ask for OTP, PIN, Aadhaar or card numbers." }
```

`GET/PUT/DELETE /scripts/{id}` manage it (`DELETE` deactivates). Editing the wording bumps `version`; every call request records the version used.
When creating a call you may pass `script_id`; otherwise we pick the active script whose `policy_type` matches the policy (a script with `policy_type: null` matches any), preferring the contact's language.
If a script uses a variable the policy doesn't have, the request is rejected with `missing_variables` — we never call with blanks.

## 4. Placing a call

```http
POST /call-requests
Idempotency-Key: 0c9d…   (recommended: your own unique id for this request)
{ "policy_id": "POL-889123", "script_id": "scr_…", "scheduled_at": "2026-10-06T10:30:00+05:30" }
```

`202` returns the call request (`id`, `status: queued|scheduled`, …). Checked before dialing, with these `code`s:

| Check | Status / code |
|---|---|
| contact consent is `granted` | 403 `consent_required` |
| contact not opted out / not on the DND list | 403 `dnd` |
| inside the workspace calling hours (at `scheduled_at` if given) | 403 `outside_calling_hours` |
| wallet balance ≥ `CALL_MIN_BALANCE` | 402 `insufficient_balance` |
| no call for this policy in the last `CALL_COOLDOWN_HOURS` (24) | 409 `duplicate_call_request` (+`existing_id`) |
| a script matches and renders | 422 `no_script` / `missing_variables` |

Repeating the same `Idempotency-Key` returns the original request (`200`, `idempotent_replay: true`) without a second call.
`scheduled_at` must be 1 minute – 30 days ahead.

Read back: `GET /call-requests/{id}`, or `GET /call-requests?status=&outcome=&policy_id=&contact_id=&from=&to=&limit=&offset=`.
A call request has `status`, `outcome`, `duration_seconds`, `summary`, `hangup_reason`, `transcript_available`, `recording_available`.

**Outcomes:** `renewed, will_renew, callback_requested, quote_requested, not_interested, wrong_number, do_not_call, connected, no_answer, failed`.
They come from the agent's extracted data (`outcome`/`disposition` field) and otherwise from call status.
`do_not_call` automatically marks the contact as opted out.

## 5. Results back to Arham Secure (webhooks)

```http
POST /webhooks  { "url": "https://arham.example/hooks/voice", "events": ["*"] }
```
Returns a `secret` (`whsec_…`) **once**. In production the URL must be public `https`. Max 5 endpoints.

Events: `call.queued, call.initiated, call.completed, call.failed, call.no_answer, outcome.recorded, transcript.ready, recording.ready`.

```json
{ "id": "evt_…", "type": "call.completed", "created_at": "2026-10-06T05:02:11Z",
  "data": { "call_request_id": "cr_…", "call_id": "…", "contact_id": "CUST-4471", "policy_id": "POL-889123",
            "status": "completed", "outcome": "renewed", "duration_seconds": 75,
            "transcript_url": ".../api/v1/calls/{call_id}/transcript", "recording_url": ".../api/v1/calls/{call_id}/recording" } }
```
Webhooks carry IDs and links, not transcripts. Fetch them with your API key:
`GET /calls/{call_id}/transcript` and `GET /calls/{call_id}/recording` (returns a signed link valid 10 minutes).

**Verify every delivery.** Header `X-Webhook-Signature: t=<unix>,v1=<hex>` where `v1 = HMAC_SHA256(secret, "<t>.<raw body>")`. Reject if `t` is older than 5 minutes. `X-Webhook-Id` is the event id — dedupe on it (delivery is at-least-once).

```js
const [t, v1] = header.match(/t=(\d+),v1=([0-9a-f]+)/).slice(1);
const ok = Math.abs(Date.now()/1000 - t) < 300 &&
  crypto.timingSafeEqual(Buffer.from(v1,'hex'),
    crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest());
```

Respond `2xx` within 10 s. Otherwise we retry after 1 m, 5 m, 30 m, 2 h, 6 h, 12 h, 24 h (8 attempts), then mark the delivery `failed`.
`GET /webhooks/{id}/deliveries` shows status per delivery; `POST /webhooks/deliveries/{id}/replay` re-sends one.

## 6. Server configuration

| Env var | Purpose |
|---|---|
| `BOLNA_API_KEY`, `BOLNA_AGENT_ID…`, `BOLNA_FROM_NUMBER` | calling provider (existing) |
| `BOLNA_WEBHOOK_TOKEN` | enables `POST /api/bolna/webhook?token=…` so call results arrive instantly. Set the same URL as the webhook in the Bolna agent. Without it, a 30-second poller picks results up. |
| `PUBLIC_API_URL` | base URL used in webhook links (default the production host) |
| `LINK_SIGNING_SECRET` | signs recording links (falls back to `JWT_SECRET`) |
| `CALL_MIN_BALANCE` (1), `CALL_COOLDOWN_HOURS` (24), `REQUIRE_CONSENT` (true), `API_RATE_LIMIT_PER_MIN` (120) | policy knobs |
| `BOLNA_BASE_URL`, `DATABASE_SSL=false` | testing / local Postgres without TLS |

## 7. Not in this version

Rule-driven automatic calling (`days_to_expiry` windows), automatic retries of unanswered calls, wallet debit per call minute, per-tenant caller ID, inbound request signing (timestamped HMAC), an admin UI for scripts/webhooks, PII redaction and retention deletion jobs.
