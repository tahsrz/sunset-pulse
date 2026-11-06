import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function buyerRequestAuthAcceptance({ primary, login, request, sql, origin }) {
  assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
  const other = await login();
  const today = new Date().toISOString().slice(0, 10);
  for (const account of [primary, other]) {
    assert.match(account.userId, /^[a-f0-9-]{36}$/);
    const setup = await request(account.page, '/api/realtor/preferences', 'POST', {
      timeZone: 'UTC', remindersEnabled: false, gamificationEnabled: false, celebrationsEnabled: false,
      hideAmountsOnToday: true, recordsStartDate: today, expectedRevision: null, requestKey: randomUUID(),
    });
    assert.equal(setup.status, 200, 'set up the signed-in workspace');
  }
  await sql(`INSERT INTO public.site_config(agent_id,subdomain,owner_id,status,branding,agent_profile,integration_profile,compliance_profile) VALUES
    ('buyer-acceptance-site','buyer-acceptance','${primary.userId}','active','{"siteName":"Buyer Fixture"}',
      '{"displayName":"Synthetic Buyer Agent","brokerageName":"Test Brokerage","email":"owner@example.test"}',
      '{"leadEmail":"owner@example.test","hotListMlsIds":["TEST-NOT-A-LISTING"]}',
      '{"footerDisclaimer":"Synthetic local test","mlsDisclaimer":"Synthetic local test"}'),
    ('buyer-acceptance-other','buyer-acceptance-other','${other.userId}','active','{}','{}','{}','{}');`);

  await other.page.goto(origin + '/buyer-plan/start', { waitUntil: 'domcontentloaded' });
  for (const answer of ['Looking at Homes', 'Yes', 'Not Sure', 'No', 'Yes']) {
    await other.page.getByRole('radio', { name: answer, exact: true }).check();
    await other.page.getByRole('button', { name: /^Next/ }).click();
  }
  await other.page.getByRole('heading', { name: 'Review Your Answers' }).waitFor();
  assert.equal(await other.page.getByText('Pre-approved Amount', { exact: true }).count(), 0);
  await other.page.getByRole('button', { name: /^Next/ }).click();
  await other.page.getByLabel('Your Name').fill('Synthetic Buyer');
  await other.page.getByLabel('Email', { exact: true }).fill('synthetic-buyer@example.test');
  await other.page.getByRole('checkbox', { name: /email about this request/ }).check();
  const savedResponse = other.page.waitForResponse(response => response.url() === origin + '/api/buyer-requests' && response.request().method() === 'POST');
  await other.page.getByRole('button', { name: 'Send Request' }).click();
  const saved = await savedResponse;
  assert.equal(saved.status(), 201, 'save through the guided form and the configured published site');
  assert.deepEqual(await saved.json(), { success: true, accepted: true, duplicate: false });
  await other.page.getByRole('heading', { name: 'Request Received' }).waitFor();
  assert.equal(await other.page.getByRole('link', { name: 'Open Explorer' }).getAttribute('href'), '/explorer');

  const payload = saved.request().postDataJSON();
  assert.match(payload.submissionId, /^[a-f0-9-]{36}$/);
  assert.deepEqual(payload.journey, { mode: 'buy', buyingStage: { state: 'answered', value: 'searching' }, buyerPreferences: {
    destination: { state: 'answered', value: 'local' }, construction: { state: 'unknown' },
    representation: { state: 'answered', value: 'no' }, preApproval: 'yes',
  } });
  const send = (body) => fetch(origin + '/api/buyer-requests', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const replay = await send(payload);
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), { success: true, accepted: true, duplicate: true });
  assert.equal((await send({ ...payload, marketingOptIn: true })).status, 409);
  assert.equal(await sql(`SELECT count(*) FROM public.guided_buyer_requests WHERE submission_id='${payload.submissionId}';`), '1');

  const path = '/api/realtor/buyer-requests';
  assert.equal((await fetch(origin + path)).status, 401);
  const owned = await request(primary.page, path);
  assert.equal(owned.status, 200);
  assert.equal(owned.data.result.length, 1);
  const row = owned.data.result[0];
  assert.equal(row.email, payload.email);
  assert.equal(row.marketingOptIn, false);
  assert.deepEqual(row.journey, payload.journey);
  const foreign = await request(other.page, `${path}?requestId=${encodeURIComponent(row.id)}`);
  assert.equal(foreign.status, 404);
  assert.deepEqual((await request(other.page, path)).data, { ok: true, result: [] });
  const inboxPath = '/buyer-inbox';
  const anonymousInbox = await fetch(origin + inboxPath, { redirect: 'manual' });
  assert.equal(anonymousInbox.status, 307);
  assert.match(anonymousInbox.headers.get('location') || '', /\/login\?redirect=%2Fbuyer-inbox/);
  await primary.page.goto(origin + inboxPath, { waitUntil: 'domcontentloaded' });
  await primary.page.getByText(payload.email, { exact: true }).waitFor();
  await other.page.goto(origin + inboxPath, { waitUntil: 'domcontentloaded' });
  await other.page.getByText('No buyer requests have been assigned to you yet.').waitFor();
  assert.equal(await other.page.getByText(payload.email, { exact: true }).count(), 0);
  assert.deepEqual(primary.pageErrors, []);
  assert.deepEqual(other.pageErrors, []);
  console.log('PASS: guided buyer form, replay and conflict keep one private row. The assigned owner can read it in the API and inbox; a second active owner cannot.');
}
