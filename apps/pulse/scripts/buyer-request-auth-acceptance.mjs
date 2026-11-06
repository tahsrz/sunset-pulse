import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

export async function buyerRequestAuthAcceptance({ primary, login, request, sql, origin, browser, guidedRetentionSecret }) {
  assert(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
  assert(guidedRetentionSecret, 'A disposable retention secret is required.');
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

  const failedAssets = [];
  const recordAssetFailure = response => {
    const url = new URL(response.url());
    if (url.origin === origin && url.pathname.startsWith('/_next/static/') && response.status() >= 400) {
      failedAssets.push(`${response.status()} ${url.pathname}`);
    }
  };
  other.page.on('response', recordAssetFailure);
  try {
    await other.page.setViewportSize({ width: 390, height: 844 });
    await other.page.goto(origin + '/explorer', { waitUntil: 'domcontentloaded' });
    await other.page.getByRole('link', { name: 'Get Help Finding a Home' }).click();
    await other.page.waitForURL(origin + '/buyer-plan/start');
    for (const answer of ['Looking at Homes', 'Yes', 'Not Sure', 'No', 'Yes']) {
      await other.page.getByRole('radio', { name: answer, exact: true }).check();
      await other.page.getByRole('button', { name: /^Next/ }).click();
    }
  } catch (error) {
    console.error('Buyer form browser errors:', other.pageErrors.join(' | ') || 'none');
    console.error('Failed local buyer form assets:', failedAssets.join(' | ') || 'none');
    throw error;
  } finally {
    other.page.off('response', recordAssetFailure);
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
  // Next can stream a page redirect in a successful HTTP response.
  const guest = await browser.newPage();
  try {
    const inboxResponse = await guest.goto(origin + inboxPath, { waitUntil: 'domcontentloaded' });
    assert(inboxResponse && !(await inboxResponse.text()).includes(payload.email), 'the anonymous document must not contain buyer details');
    await guest.waitForURL(url => url.pathname === '/login' && url.searchParams.get('redirect') === inboxPath);
    await guest.getByRole('heading', { name: 'Sign In', exact: true }).waitFor();
  } finally {
    await guest.close();
  }
  await primary.page.goto(origin + inboxPath, { waitUntil: 'domcontentloaded' });
  await primary.page.getByText(payload.email, { exact: true }).waitFor();
  await other.page.goto(origin + inboxPath, { waitUntil: 'domcontentloaded' });
  await other.page.getByText('No buyer requests have been assigned to you yet.').waitFor();
  assert.equal(await other.page.getByText(payload.email, { exact: true }).count(), 0);

  await sql(`UPDATE public.guided_buyer_requests SET created_at = now() - interval '91 days' WHERE submission_id = '${payload.submissionId}';`);
  assert.equal((await request(primary.page, `${path}?requestId=${encodeURIComponent(row.id)}`)).status, 404);
  await primary.page.reload({ waitUntil: 'domcontentloaded' });
  await primary.page.getByText('No buyer requests have been assigned to you yet.').waitFor();
  const cronUrl = origin + '/api/admin/agent-leads/cma-retention/cron';
  assert.equal((await fetch(cronUrl)).status, 401);
  for (const prunedBuyerRequestCount of [1, 0]) {
    const cleanup = await fetch(cronUrl, { headers: { authorization: `Bearer ${guidedRetentionSecret}` } });
    assert.equal(cleanup.status, 200);
    assert.deepEqual(await cleanup.json(), { ok: true, deletedCount: 0, prunedJourneyCount: 0, prunedBuyerRequestCount });
  }
  assert.equal((await send(payload)).status, 410);
  assert.equal(await sql(`SELECT count(*) FROM public.guided_buyer_requests WHERE submission_id = '${payload.submissionId}'
    AND pruned_at IS NOT NULL AND name IS NULL AND email IS NULL AND journey IS NULL AND campaign IS NULL
    AND requested_contact_at IS NULL AND marketing_opt_in IS NULL;`), '1');
  assert.deepEqual(primary.pageErrors, []);
  assert.deepEqual(other.pageErrors, []);
  console.log('PASS: guided buyer form, retry, owner-only reads, scheduled cleanup and expired replay.');
}
