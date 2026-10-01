const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../lib/core');

test('normalizePhone', () => {
  assert.equal(core.normalizePhone('98765 43210'), '+919876543210');
  assert.equal(core.normalizePhone('09876543210'), '+919876543210');
  assert.equal(core.normalizePhone('919876543210'), '+919876543210');
  assert.equal(core.normalizePhone('+1 (415) 555-2671'), '+14155552671');
  assert.equal(core.normalizePhone('0091 98765 43210'), '+919876543210');
  assert.equal(core.normalizePhone('12345'), null);
  assert.equal(core.normalizePhone('+0123456789'), null);
  assert.equal(core.normalizePhone(null), null);
  assert.equal(core.normalizePhone('abc'), null);
});

test('renderTemplate fills variables and reports missing ones', () => {
  const r = core.renderTemplate('Hi {{customer_name}}, {{ product }} expires {{expiry_date}}', { customer_name: 'Priya', product: 'Motor' });
  assert.equal(r.text, 'Hi Priya, Motor expires ');
  assert.deepEqual(r.missing, ['expiry_date']);
  assert.deepEqual(core.renderTemplate('{{a}} {{a}}', {}).missing, ['a']);
  assert.equal(core.renderTemplate('x {{n}}', { n: 0 }).text, 'x 0');
});

test('templateSyntaxError catches malformed placeholders', () => {
  assert.equal(core.templateSyntaxError('Hello {{name}}'), null);
  assert.ok(core.templateSyntaxError('Hello {{name'));
  assert.ok(core.templateSyntaxError('Hello {{ }}'));
  assert.ok(core.templateSyntaxError('Hello {{1bad}}'));
  assert.deepEqual(core.extractPlaceholders('{{a}} and {{ b }} and {{a}}'), ['a', 'b']);
});

const compliance = {
  callingHours: { enabled: true, start: '09:00', end: '20:00', days: [1, 2, 3, 4, 5, 6], timezone: 'Asia/Kolkata' },
  dnd: { enabled: true, numbers: ['+919000000001'] },
};

test('checkCalling enforces hours, days and DND in the configured time zone', () => {
  // 2026-10-05 is a Monday. 10:00 IST = 04:30 UTC.
  assert.equal(core.checkCalling(compliance, '+919876543210', new Date('2026-10-05T04:30:00Z')), null);
  assert.equal(core.checkCalling(compliance, '+919876543210', new Date('2026-10-05T14:30:00Z')).code, 'outside_calling_hours'); // 20:00 IST
  assert.equal(core.checkCalling(compliance, '+919876543210', new Date('2026-10-05T03:00:00Z')).code, 'outside_calling_hours'); // 08:30 IST
  assert.equal(core.checkCalling(compliance, '+919876543210', new Date('2026-10-04T06:00:00Z')).code, 'outside_calling_hours'); // Sunday
  assert.equal(core.checkCalling(compliance, '+919000000001', new Date('2026-10-05T04:30:00Z')).code, 'dnd');
  assert.equal(core.checkCalling(compliance, '+919876543210', new Date('2026-10-05T04:30:00Z'), { contactDnd: true }).code, 'dnd');
  assert.equal(core.checkCalling({ ...compliance, callingHours: { ...compliance.callingHours, enabled: false } }, '+919876543210', new Date('2026-10-04T23:00:00Z')), null);
  // Bad time zone falls back to IST instead of throwing.
  const badTz = { ...compliance, callingHours: { ...compliance.callingHours, timezone: 'Not/AZone' } };
  assert.equal(core.checkCalling(badTz, '+919876543210', new Date('2026-10-05T04:30:00Z')), null);
});

test('daysUntil / isValidIsoDate', () => {
  const now = new Date('2026-10-05T10:00:00Z');
  assert.equal(core.daysUntil('2026-10-05', now), 0);
  assert.equal(core.daysUntil('2026-11-04', now), 30);
  assert.equal(core.daysUntil('2026-10-01', now), -4);
  assert.equal(core.daysUntil('nope', now), null);
  assert.ok(core.isValidIsoDate('2026-02-28'));
  assert.ok(!core.isValidIsoDate('2026-02-30'));
  assert.ok(!core.isValidIsoDate('26-02-28'));
});

test('webhook signatures verify, and reject tampering, replays and bad format', () => {
  const body = '{"a":1}';
  const h = core.signWebhook('whsec_x', body, 1000);
  assert.ok(core.verifyWebhook('whsec_x', body, h, 300, 1100));
  assert.ok(!core.verifyWebhook('whsec_x', body + ' ', h, 300, 1100));
  assert.ok(!core.verifyWebhook('whsec_y', body, h, 300, 1100));
  assert.ok(!core.verifyWebhook('whsec_x', body, h, 300, 2000)); // too old
  assert.ok(!core.verifyWebhook('whsec_x', body, 'garbage'));
});

test('backoff grows and the attempt cap is consistent', () => {
  assert.equal(core.backoffMs(1), 60e3);
  assert.ok(core.backoffMs(3) > core.backoffMs(2));
  assert.equal(core.backoffMs(core.MAX_ATTEMPTS - 1), 24 * 3600e3);
});

test('recording links expire and cannot be reused for another call', () => {
  const sig = core.signRecordingLink('s', 'call1', 5000);
  assert.ok(core.verifyRecordingLink('s', 'call1', 5000, sig, 4000));
  assert.ok(!core.verifyRecordingLink('s', 'call1', 5000, sig, 6000));
  assert.ok(!core.verifyRecordingLink('s', 'call2', 5000, sig, 4000));
  assert.ok(!core.verifyRecordingLink('s', 'call1', 9000, sig, 4000));
  assert.ok(!core.verifyRecordingLink('s', 'call1', 5000, 'zz', 4000));
});

test('normalizeOutcome prefers extracted data, then falls back to status', () => {
  assert.equal(core.normalizeOutcome({ status: 'completed', conversation_duration: 40, extracted_data: { outcome: 'Already Renewed' } }), 'renewed');
  assert.equal(core.normalizeOutcome({ status: 'completed', conversation_duration: 40, extracted_data: { disposition: 'Quote requested' } }), 'quote_requested');
  assert.equal(core.normalizeOutcome({ status: 'completed', conversation_duration: 40, extracted_data: { do_not_call: true } }), 'do_not_call');
  assert.equal(core.normalizeOutcome({ status: 'completed', conversation_duration: 40 }), 'connected');
  assert.equal(core.normalizeOutcome({ status: 'completed', conversation_duration: 0 }), 'no_answer');
  assert.equal(core.normalizeOutcome({ status: 'busy' }), 'no_answer');
  assert.equal(core.normalizeOutcome({ status: 'failed' }), 'failed');
  assert.equal(core.normalizeOutcome({ status: 'in-progress' }), null);
});

test('eventForStatus and isPrivateAddress', () => {
  assert.equal(core.eventForStatus('completed'), 'call.completed');
  assert.equal(core.eventForStatus('no-answer'), 'call.no_answer');
  assert.equal(core.eventForStatus('error'), 'call.failed');
  assert.equal(core.eventForStatus('ringing'), 'call.initiated');
  assert.equal(core.eventForStatus('queued'), null);
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.5', '172.20.0.1', '169.254.169.254', '::1', 'fd00::1']) assert.ok(core.isPrivateAddress(ip), ip);
  for (const ip of ['8.8.8.8', '172.32.0.1', '203.0.113.9']) assert.ok(!core.isPrivateAddress(ip), ip);
});
