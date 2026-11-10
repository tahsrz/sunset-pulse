import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectLocalScheduler, inspectSellerConsultationConfiguration } from './seller-consultation-preflight.mjs';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'SECRET_SENTINEL', KELLER_WESTLAKE_AGENT_SITE: 'agent-one' };
function transport(rows) {
  const calls = [];
  return { calls, fetcher: async (url, init) => { calls.push({ url: String(url), init }); return Response.json(rows.shift()); } };
}

test('missing credentials never trigger a database call or imply a verified authority', async () => {
  const result = await inspectSellerConsultationConfiguration({ env: {}, fetcher: () => { throw new Error('must not fetch'); } });
  assert.equal(result.siteProfile.state, 'missing_read_credentials');
  assert.equal(result.selection, 'fallback_agent');
  assert.equal(result.reservationAuthority, 'not_verified');
});

test('only reads the scoped owner and configuration and redacts contacts and secrets', async () => {
  const api = transport([
    [{ agent_id: 'agent-one', status: 'active', agent_profile: { email: 'PRIVATE_EMAIL_SENTINEL' }, integration_profile: { calendarUrl: 'https://calendar.example/private-link', token: 'SECRET_SENTINEL' } }],
    [{ id: '11111111-1111-4111-8111-111111111111', time_zone: 'America/Chicago' }],
    [{ slug: 'seller-consultation', length_minutes: 30, schedule_id: 'schedule', time_zone: 'America/Chicago', metadata: { secret: 'SECRET_SENTINEL' } }],
  ]);
  const report = await inspectSellerConsultationConfiguration({ env, fetcher: api.fetcher });
  assert.equal(report.siteProfile.calendarLinkPresent, true);
  assert.equal(report.ownedConsultationEventTypes.eventTypes[0].schedulePresent, true);
  assert.equal(report.reservationAuthority, 'not_verified'); // A link and event record do not establish reservation safety.
  assert.doesNotMatch(JSON.stringify(report), /PRIVATE_EMAIL_SENTINEL|SECRET_SENTINEL|private-link/);
  assert.equal(api.calls.length, 3);
  assert.equal(new URL(api.calls[2].url).searchParams.get('owner_id'), 'eq.11111111-1111-4111-8111-111111111111');
  for (const call of api.calls) { assert.equal(call.init.body, undefined); assert.equal(call.init.method, undefined); }
});

test('does not enumerate other owners or event types when the scoped owner is absent', async () => {
  const api = transport([[{ status: 'active', agent_profile: { email: 'fixture@example.test' } }], []]);
  const report = await inspectSellerConsultationConfiguration({ env, fetcher: api.fetcher });
  assert.equal(report.schedulingOwner.state, 'not_found');
  assert.equal(report.ownedConsultationEventTypes.state, 'not_inspected');
  assert.equal(api.calls.length, 2);
});

test('does not pick an arbitrary profile when the configured site matches multiple rows', async () => {
  const api = transport([[{ agent_id: 'one' }, { agent_id: 'two' }]]);
  const report = await inspectSellerConsultationConfiguration({ env, fetcher: api.fetcher });
  assert.equal(report.siteProfile.state, 'ambiguous');
  assert.equal(api.calls.length, 1);
});

test('invalid selectors do not reach the network', async () => {
  const api = transport([]);
  const report = await inspectSellerConsultationConfiguration({ env: { ...env, KELLER_WESTLAKE_AGENT_SITE: 'x),status.eq.active' }, fetcher: api.fetcher });
  assert.equal(report.siteProfile.state, 'invalid_configuration');
  assert.equal(api.calls.length, 0);
});

test('HTTP errors and malformed data are unavailable and never printed as provider details', async () => {
  for (const fetcher of [async () => Response.json({ secret: 'SECRET_SENTINEL' }, { status: 403 }), async () => Response.json({ error: 'SECRET_SENTINEL' }), async () => { throw new Error('SECRET_SENTINEL'); }]) {
    const report = await inspectSellerConsultationConfiguration({ env, fetcher });
    assert.equal(report.siteProfile.state, 'unavailable');
    assert.doesNotMatch(JSON.stringify(report), /SECRET_SENTINEL/);
  }
});

test('local database inspection is explicit and never connects to a remote host', async () => {
  let calls = 0;
  const localInspector = async () => { calls++; return { state: 'unavailable' }; };
  await inspectSellerConsultationConfiguration({ env: {}, localInspector });
  assert.equal(calls, 0);
  await inspectSellerConsultationConfiguration({ env: {}, localInspector, includeLocalDb: true });
  assert.equal(calls, 1);
  assert.deepEqual(await inspectLocalScheduler('https://remote.example/db'), { state: 'skipped_nonlocal_database' });
});
