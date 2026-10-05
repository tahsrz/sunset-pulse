import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { command, pulseRoot } from './docker-acceptance.mjs';

function option(name) {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1];
}

const stack = option('--stack');
const workdir = option('--workdir');
const apiUrl = new URL(option('--api-url') || 'http://127.0.0.1:55321');
const originUrl = new URL(option('--origin') || 'http://127.0.0.2:55330');
const isLoopback = (hostname) => hostname === 'localhost' || /^127(?:\.\d{1,3}){3}$/.test(hostname) || hostname === '[::1]';
assert(stack && /^[a-z0-9_-]+$/.test(stack), 'Pass the isolated local Supabase --stack ID.');
assert(workdir, 'Pass the isolated local Supabase --workdir path.');
assert(apiUrl.protocol === 'http:' && isLoopback(apiUrl.hostname), 'Supabase API must be HTTP on loopback.');
assert(originUrl.protocol === 'http:' && isLoopback(originUrl.hostname), 'App origin must be HTTP on loopback.');
assert(originUrl.hostname !== '127.0.0.1' && originUrl.hostname !== 'localhost',
  'Use 127.0.0.2 (or another 127/8 address) so development operator bypass is not used.');

const api = apiUrl.origin;
const origin = originUrl.origin;
const repositoryRoot = resolve(fileURLToPath(new URL('../../../', import.meta.url)));
const supabaseCli = join(repositoryRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
const projectConfig = await readFile(join(resolve(workdir), 'supabase', 'config.toml'), 'utf8');
assert.match(projectConfig, new RegExp(`^project_id\\s*=\\s*['\"]${stack}['\"]`, 'm'),
  'The workdir project_id must match the explicitly disposable stack ID.');

async function capture(executable, args) {
  return new Promise((resolveCapture, rejectCapture) => {
    const child = spawn(executable, args, {
      cwd: repositoryRoot,
      env: process.env,
      windowsHide: true,
      shell: process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(executable),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', () => {});
    child.on('error', rejectCapture);
    child.on('close', (code) => code === 0
      ? resolveCapture(stdout)
      : rejectCapture(new Error('Local Supabase status failed; sensitive status output suppressed.')));
  });
}

const statusOutput = await capture(supabaseCli, ['status', '--workdir', resolve(workdir), '--output', 'env']);
const localEnv = new Map(statusOutput.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2]]] : [];
}));
const unquote = (value) => value?.trim().replace(/^(['"])(.*)\1$/, '$2');
const anon = unquote(localEnv.get('ANON_KEY'));
const service = unquote(localEnv.get('SERVICE_ROLE_KEY'));
assert(anon && service, 'Local Supabase test keys are unavailable.');

const admin = createClient(api, service, { auth: { persistSession: false, autoRefreshToken: false } });
const appCli = fileURLToPath(new URL('../../../node_modules/next/dist/bin/next', import.meta.url));
const users = [];
const siteId = `cma-auth-${randomUUID()}`;
const subdomain = `cma-auth-${randomUUID().slice(0, 12)}`;
const leadId = randomUUID();
let server;
let browser;
let ownerContext;
let otherContext;

async function createRealtor() {
  const email = `cma-${randomUUID()}@example.test`;
  const password = `Test-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: 'realtor' },
  });
  assert(!error && data.user, `Disposable local Auth user creation failed: ${error?.code || 'unknown'}`);
  users.push(data.user.id);
  // The installed Auth trigger materializes profiles and copies this role from
  // user_metadata. Avoid a direct REST upsert here: production profile RLS is
  // intentionally restrictive, and this test should exercise the real trigger.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();
  assert(!profileError && profile?.role === 'realtor',
    `Disposable realtor profile trigger failed: ${profileError?.code || 'missing profile or role'}`);
  return { email, password, id: data.user.id };
}

async function login(user) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/login?redirect=${encodeURIComponent('/seller-plan')}`, { timeout: 120_000 });
  await page.getByRole('heading', { name: 'Sign In', exact: true }).waitFor();
  await page.getByPlaceholder('Email Address').fill(user.email);
  await page.getByPlaceholder('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL(`${origin}/seller-plan`, { timeout: 60_000 });
  assert(!(await context.cookies()).some((cookie) => cookie.name === 'pulse_mock_session'), 'Mock auth must remain disabled.');
  assert.equal(pageErrors.length, 0, `Login browser errors: ${pageErrors.join('; ')}`);
  return { context, page };
}

async function request(page, path, method = 'GET', body) {
  return page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(path, {
      method,
      ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, cacheControl: response.headers.get('cache-control'), data: await response.json() };
  }, { path, method, body });
}

try {
  const owner = await createRealtor();
  const other = await createRealtor();
  const { error: siteError } = await admin.from('site_config').insert({
    agent_id: siteId, owner_id: owner.id, subdomain,
  });
  assert(!siteError, `Disposable owner site setup failed: ${siteError?.code || 'unknown'}`);
  const { error: leadError } = await admin.from('agent_site_leads').insert({
    id: leadId,
    agent_id: siteId,
    site: subdomain,
    source: 'seller_plan',
    name: 'CMA acceptance fixture',
    email: owner.email,
    message: 'Local disposable pricing review.',
    metadata: { sellerPlan: { requestKind: 'pricing_review' } },
  });
  assert(!leadError, `Disposable pricing-review lead setup failed: ${leadError?.code || 'unknown'}`);

  const env = {
    ...process.env,
    NODE_ENV: 'development',
    SUPABASE_URL: api,
    NEXT_PUBLIC_SUPABASE_URL: api,
    SUPABASE_ANON_KEY: anon,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
    SUPABASE_SERVICE_ROLE_KEY: service,
    NEXT_PUBLIC_MOCK_MODE: 'false',
    NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED: 'false',
    PULSE_ALLOW_PRODUCTION_MOCK_AUTH: '',
    E2E_OPERATOR_ACCESS: 'false',
    NEXT_PUBLIC_E2E_MODE: 'false',
    NEXT_PUBLIC_SITE_URL: origin,
    NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN: origin,
    MONGODB_URI: 'mongodb://127.0.0.1:1/pulse_cma_auth_unavailable',
    OPENAI_API_KEY: '',
    GROQ_API_KEY: '',
    RESEND_API_KEY: '',
  };
  server = spawn(process.execPath, [appCli, 'dev', '--hostname', '0.0.0.0', '--port', String(originUrl.port)], {
    cwd: pulseRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [server.stdout, server.stderr]) stream.on('data', () => {});
  server.on('error', () => {});

  let ready = false;
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (server.exitCode !== null) throw new Error('Local Next development server exited before CMA acceptance.');
    try {
      const response = await fetch(`${origin}/api/admin/agent-leads/${leadId}/cma-details`, { signal: AbortSignal.timeout(2_000) });
      if ([401, 403].includes(response.status)) { ready = true; break; }
    } catch {}
    await delay(1_000);
  }
  assert(ready, 'Local CMA API did not become ready for unauthenticated probe.');
  browser = await chromium.launch({ headless: true });
  const ownerSession = await login(owner);
  ownerContext = ownerSession.context;
  const base = `/api/admin/agent-leads/${leadId}/cma-details`;

  const initial = await request(ownerSession.page, base);
  assert.equal(initial.status, 200);
  assert.equal(initial.data.details, null);
  assert.match(initial.cacheControl || '', /private.*no-store/);
  const missingConsent = await request(ownerSession.page, base, 'POST', {
    propertyAddress: '123 Test Acceptance Way, Keller, TX', sellerPermissionConfirmed: false,
  });
  assert.equal(missingConsent.status, 400, 'Address capture must reject missing seller permission.');
  const created = await request(ownerSession.page, base, 'POST', {
    propertyAddress: '123 Test Acceptance Way, Keller, TX', sellerPermissionConfirmed: true,
  });
  assert.equal(created.status, 201, `Owner CMA save failed: ${created.data.error || created.status}`);

  const otherSession = await login(other);
  otherContext = otherSession.context;
  assert.equal((await request(otherSession.page, base)).status, 404, 'Other realtor must not discover the private CMA record.');
  assert.equal((await request(otherSession.page, base, 'POST', {
    propertyAddress: '999 Other Test Road, Keller, TX', sellerPermissionConfirmed: true,
  })).status, 404, 'Other realtor must not create/replace the owner CMA record.');
  assert.equal((await request(otherSession.page, base, 'DELETE')).status, 404, 'Other realtor must not delete the owner CMA record.');

  const read = await request(ownerSession.page, base);
  assert.equal(read.status, 200);
  assert.equal(read.data.details.propertyAddress, '123 Test Acceptance Way, Keller, TX');
  const createdAt = Date.parse(read.data.details.consentCapturedAt);
  const expiresAt = Date.parse(read.data.details.expiresAt);
  assert(Number.isFinite(createdAt) && Number.isFinite(expiresAt));
  assert(Math.abs((expiresAt - createdAt) - 90 * 24 * 60 * 60 * 1_000) < 2_000,
    'CMA details must expire 90 days after capture.');
  const removed = await request(ownerSession.page, base, 'DELETE');
  assert.equal(removed.status, 200);
  assert.equal((await request(ownerSession.page, base)).data.details, null);
  console.log('PASS: real local Supabase browser sessions enforce owner-only CMA read/create/delete, explicit consent and 90-day expiry.');
} finally {
  await otherContext?.close();
  await ownerContext?.close();
  await browser?.close();
  if (server && server.exitCode === null) {
    if (process.platform === 'win32') await command('taskkill', ['/PID', String(server.pid), '/T', '/F']);
    else server.kill();
    await delay(1_000);
  }
  await admin.from('seller_cma_private_details').delete().eq('lead_id', leadId);
  await admin.from('agent_site_leads').delete().eq('id', leadId);
  await admin.from('site_config').delete().eq('agent_id', siteId);
  for (const id of users) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new Error('Could not remove a disposable local CMA Auth account.');
  }
}
