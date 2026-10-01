# One-command demo of the Arham Secure integration. Starts a fake Bolna, a fake webhook receiver and the API,
# runs the whole scenario, prints OK/FAIL for each step, then cleans everything up.
#   cd api
#   powershell -ExecutionPolicy Bypass -File manual-test/demo.ps1
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

$Base = 'http://localhost:3200/api/v1'
$script:ok = 0; $script:bad = 0
function Step($t) { Write-Host "`n== $t" -ForegroundColor Cyan }
function Check($name, $cond, $detail) {
  if ($cond) { $script:ok++; Write-Host "  OK    $name" -ForegroundColor Green }
  else { $script:bad++; Write-Host "  FAIL  $name  $detail" -ForegroundColor Red }
}
function api($method, $path, $body = $null, $extra = @{}) {
  $a = @{ Method = $method; Uri = "$Base$path"; Headers = (@{ Authorization = "Bearer $Key" } + $extra); ContentType = 'application/json' }
  if ($body) { $a.Body = ($body | ConvertTo-Json -Depth 6) }
  try { Invoke-RestMethod @a }
  catch { if ($_.ErrorDetails.Message) { $_.ErrorDetails.Message | ConvertFrom-Json } else { Write-Host "  REQUEST FAILED: $($_.Exception.Message)" -ForegroundColor Red; $null } }
}

$mock = $null; $srv = $null
try {
  Step 'Setting up (test workspace, fake Bolna, fake webhook receiver, API)'
  $Key = (node manual-test/seed.js | Select-String '^av_live_').ToString().Trim()
  $mockLog = "$env:TEMP\demo-mock.log"
  $mock = Start-Process node -ArgumentList 'manual-test/mock-servers.js' -PassThru -WindowStyle Hidden -RedirectStandardOutput $mockLog
  $env:PORT = '3200'; $env:BOLNA_API_KEY = 'test'; $env:BOLNA_BASE_URL = 'http://localhost:4010'; $env:BOLNA_WEBHOOK_TOKEN = 'tok123'
  $srv = Start-Process node -ArgumentList 'index.js' -PassThru -WindowStyle Hidden -RedirectStandardOutput "$env:TEMP\demo-api.log"
  for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Milliseconds 500; try { if ((api GET /me).workspace) { break } } catch {} }
  $me = api GET /me
  Check 'API is up and the key works' ($me.workspace -eq 'Manual Test Workspace')
  if (-not $me.workspace) { throw 'API did not start; see ' + "$env:TEMP\demo-api.log" }

  Step '1. Security'
  try { Invoke-RestMethod "$Base/me" | Out-Null; Check 'request without a key is rejected' $false } catch { Check 'request without a key is rejected (401)' ($_.Exception.Response.StatusCode.value__ -eq 401) }

  Step '2. Arham Secure sends a customer and a policy'
  $c = api PUT /contacts/CUST-1 @{ name = 'Priya Shah'; phone = '98765 43210'; language = 'hinglish' }
  Check 'phone cleaned to +919876543210' ($c.phone -eq '+919876543210')
  Check 'bad phone is rejected' ((api PUT /contacts/CUST-2 @{ phone = '123' }).code -eq 'invalid_phone')
  $p = api PUT /policies/POL-1 @{ contact_external_id = 'CUST-1'; type = 'renewal'; product = 'motor'; expiry_date = '2026-11-12'; premium = 8420; attributes = @{ vehicle_make = 'Maruti' } }
  Check 'policy saved' ($p.external_id -eq 'POL-1')

  Step '3. Script for the renewal scenario'
  $s = api POST /scripts @{ name = 'Motor renewal'; policy_type = 'renewal'; agent_name = 'Deepali'; company_name = 'Arham Secure'
    greeting = 'Namaste {{customer_name}}, main {{agent_name}} bol rahi hoon {{company_name}} se.'
    script = 'Your {{vehicle_make}} {{product}} policy expires on {{expiry_date}}. Premium Rs {{premium}}.' }
  Check 'script created' ($s.id -like 'scr_*')
  Check 'broken template is rejected' ((api POST /scripts @{ name = 'x'; agent_name = 'a'; company_name = 'b'; greeting = 'Hi {{name'; script = 'x' }).code -eq 'invalid_template')

  Step '4. Safety checks block the call'
  Check 'no consent -> refused' ((api POST /call-requests @{ policy_id = 'POL-1' }).code -eq 'consent_required')
  api PUT /contacts/CUST-1 @{ consent = @{ status = 'granted'; source = 'demo' } } | Out-Null
  api PUT /policies/POL-5 @{ contact_external_id = 'CUST-1'; type = 'renewal'; product = 'x'; expiry_date = '2026-12-01' } | Out-Null
  Check 'script needs data the policy lacks -> refused' ((api POST /call-requests @{ policy_id = 'POL-5' }).code -eq 'missing_variables')
  api PUT /contacts/CUST-1 @{ dnd = $true } | Out-Null
  Check 'opted-out customer -> refused' ((api POST /call-requests @{ policy_id = 'POL-1' }).code -eq 'dnd')
  api PUT /contacts/CUST-1 @{ dnd = $false } | Out-Null

  Step '5. Webhook + place the call'
  $wh = api POST /webhooks @{ url = 'http://localhost:4011/hook' }
  Check 'webhook registered, secret returned once' ($wh.secret -like 'whsec_*')
  Invoke-RestMethod -Method Post "http://localhost:4011/_secret?value=$($wh.secret)" | Out-Null
  $cr = api POST /call-requests @{ policy_id = 'POL-1' } @{ 'Idempotency-Key' = 'demo-1' }
  Check 'call accepted (queued)' ($cr.status -eq 'queued')
  $again = api POST /call-requests @{ policy_id = 'POL-1' } @{ 'Idempotency-Key' = 'demo-1' }
  Check 'same request sent twice -> only one call' ($again.id -eq $cr.id -and $again.idempotent_replay)
  Check 'calling the same policy again -> blocked' ((api POST /call-requests @{ policy_id = 'POL-1' } @{ 'Idempotency-Key' = 'demo-2' }).code -eq 'duplicate_call_request')

  Step '6. Call finishes, result comes back'
  Invoke-RestMethod -Method Post "http://localhost:4010/_finish/$($cr.call_id)?outcome=Already%20Renewed" | Out-Null
  $r = api GET "/call-requests/$($cr.id)"
  Check 'status = completed' ($r.status -eq 'completed')
  Check 'outcome = renewed' ($r.outcome -eq 'renewed')
  Check 'transcript + recording available' ($r.transcript_available -and $r.recording_available)
  Check 'transcript can be fetched' ((api GET "/calls/$($cr.call_id)/transcript").transcript -like '*Namaste*')
  $rec = api GET "/calls/$($cr.call_id)/recording"
  Check 'recording link is signed + temporary (not the provider URL)' ($rec.url -like '*sig=*' -and $rec.url -notlike '*example.com*')
  Start-Sleep -Seconds 2

  Step '7. Customer asks not to be called again'
  api PUT /contacts/CUST-3 @{ name = 'Ravi'; phone = '9876543212'; consent = @{ status = 'granted' } } | Out-Null
  api PUT /policies/POL-3 @{ contact_external_id = 'CUST-3'; type = 'renewal'; product = 'motor'; expiry_date = '2026-12-01'; premium = 5000; attributes = @{ vehicle_make = 'Tata' } } | Out-Null
  $c3 = api POST /call-requests @{ policy_id = 'POL-3' }
  Invoke-RestMethod -Method Post "http://localhost:4010/_finish/$($c3.call_id)?outcome=do_not_call" | Out-Null
  Check 'outcome = do_not_call' ((api GET "/call-requests/$($c3.id)").outcome -eq 'do_not_call')
  api PUT /policies/POL-4 @{ contact_external_id = 'CUST-3'; type = 'renewal'; product = 'motor'; expiry_date = '2026-12-01'; premium = 5000; attributes = @{ vehicle_make = 'Tata' } } | Out-Null
  Check 'that customer is now blocked automatically' ((api POST /call-requests @{ policy_id = 'POL-4' }).code -eq 'dnd')

  Step '8. Delete a customer (privacy)'
  Check 'customer erased' ((api DELETE /contacts/CUST-1).deleted)
  Check 'their call data is gone' ((api GET "/call-requests/$($cr.id)").code -eq 'call_request_not_found')

  Step 'What the fake webhook receiver got (signatures checked with the secret)'
  Get-Content $mockLog | Where-Object { $_ -match '\[hook\]|\[bolna\] (CALL|greeting|script)' } | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
}
finally {
  if ($srv) { Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue }
  if ($mock) { Stop-Process -Id $mock.Id -Force -ErrorAction SilentlyContinue }
  node manual-test/seed.js --cleanup | Out-Null
  Write-Host "`nDone: $($script:ok) OK, $($script:bad) FAIL. Test data removed." -ForegroundColor $(if ($script:bad) { 'Red' } else { 'Green' })
}
