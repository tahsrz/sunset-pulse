import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import nextEnv from '@next/env';
import { parse as parseDotenv } from 'dotenv';

const probes = [
  ['site_config', 'agent_id,owner_id,status'],
  ['realtor_preferences', 'user_id,workspace_id,time_zone,reminders_enabled'],
  ['workflow_jobs', 'id,workflow_key,lease_token,lease_until'],
  ['seller_cases', 'lead_id,revision,publication,sharing_enabled'],
  ['seller_case_events', 'id,request_key,input_hash'],
  ['seller_case_booking_links', 'booking_id,consultation_event_id'],
  ['seller_case_messages', 'id,from_address,attempt_started_at,provider_id,job_id'],
];
const maxResponseBytes = 16_384;
const scope = 'Read-only table/column access and seller_email event contract only. No rows, messages, or credentials are printed; no SQL, worker, cron, provider, or billing changes are executed.';
class ResponseFormatError extends Error {}
class ConfigurationError extends Error {}

function configuration(env, expectedProjectRef) {
  if (!expectedProjectRef || !/^(?:[a-z0-9]{20}|local)$/.test(expectedProjectRef)) {
    throw new ConfigurationError('Supply --expected-project-ref <20-character-project-ref|local> before any network check.');
  }
  const values = [env.SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_URL].filter(Boolean);
  if (!values.length) throw new ConfigurationError('Configure SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL. No fallback project is inferred.');
  const urls = values.map((value) => {
    let url;
    try { url = new URL(value); } catch { throw new ConfigurationError('Configured Supabase URL is invalid.'); }
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') {
      throw new ConfigurationError('Supabase URLs must be plain origins without credentials, paths, queries, or fragments.');
    }
    const valid = expectedProjectRef === 'local'
      ? ['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
      : url.protocol === 'https:' && url.hostname === `${expectedProjectRef}.supabase.co` && !url.port;
    if (!valid) throw new ConfigurationError('Configured Supabase URL does not match the explicitly selected project. No request sent.');
    return url;
  });
  if (urls.some((url) => url.origin !== urls[0].origin)) {
    throw new ConfigurationError('Server and browser Supabase origins differ. Reconcile the selected target before checking.');
  }
  if (env.NEXT_PUBLIC_MOCK_MODE === 'true') throw new ConfigurationError('Mock mode is enabled; it cannot verify database readiness.');
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key || key.startsWith('sb_publishable_')) throw new ConfigurationError('A server-only SUPABASE_SERVICE_ROLE_KEY is required.');
  if (key.startsWith('eyJ')) {
    let payload;
    try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8')); } catch { /* Invalid credential below. */ }
    if (payload?.role !== 'service_role') throw new ConfigurationError('The configured JWT must be a service_role credential.');
  }
  return { origin: urls[0].origin, key };
}

async function readBoundedJson(response) {
  if (!response.body) throw new ResponseFormatError();
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxResponseBytes) throw new ResponseFormatError();
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    await reader.cancel().catch(() => {});
  }
}

function failure(status, body) {
  const message = typeof body?.message === 'string' ? body.message : '';
  const violations = [...new Set(message.match(/\bexceed_[a-z_]+_quota\b/g) || [])];
  if (violations.length) return { status: 'QUOTA_RESTRICTED', violations, nextAction: 'Review the selected organization Usage/Billing. The owner must resolve the quota restriction; this tool changes no plan or spend cap.' };
  if (status === 402) return { status: 'SERVICE_RESTRICTED', nextAction: 'Review the selected project billing/restriction notice.' };
  if (['PGRST202', 'PGRST204', 'PGRST205', '42P01', '42703'].includes(body?.code)) {
    return { status: 'SCHEMA_NOT_READY', code: body.code, nextAction: 'Compare the entire applied migration history with the repository and prepare its pending migrations before release.' };
  }
  if ([401, 403].includes(status) || body?.code === '42501') {
    return { status: 'CREDENTIAL_OR_PERMISSION_FAILURE', nextAction: 'Verify the server-only credential belongs to the selected project and retains the reviewed grants.' };
  }
  return { status: 'HTTP_FAILURE', nextAction: 'Inspect the selected project service status and access configuration. No provider response body is printed.' };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ expectedProjectRef?: string, fetchImpl?: (url: URL, options: RequestInit) => Promise<Response>, timeoutMs?: number }} [options]
 */
export async function inspectSellerRuntime(env, { expectedProjectRef, fetchImpl = fetch, timeoutMs = 10_000 } = {}) {
  const { origin, key } = configuration(env, expectedProjectRef);
  const checks = [];
  const report = {
    target: { projectRef: expectedProjectRef, origin }, scope,
    configuration: {
      emailSendEnabled: env.SELLER_EMAIL_SEND_ENABLED === 'true',
      emailKeyConfigured: Boolean(env.RESEND_API_KEY?.trim()),
      emailSenderConfigured: Boolean(env.RESEND_FROM_EMAIL?.trim()),
      emailWebhookConfigured: Boolean(env.RESEND_SELLER_WEBHOOK_SECRET?.trim()),
      cronSecretConfigured: Boolean(env.CRON_SECRET?.trim()),
      sellerIntakeConfigured: Boolean(env.KELLER_WESTLAKE_AGENT_SITE?.trim()),
    },
    checks,
    hostedCadence: 'NOT_VERIFIED', migrationHistory: 'NOT_COMPARED',
    ownerAndClientFlow: 'NOT_VERIFIED', providerDelivery: 'NOT_VERIFIED',
  };
  for (const [table, columns] of [...probes, ['workflow_event_contracts', 'workflow_key,min_payload_version,max_payload_version,enabled']]) {
    const contract = table === 'workflow_event_contracts';
    const url = new URL(`/rest/v1/${table}`, origin);
    url.searchParams.set('select', columns);
    url.searchParams.set('limit', contract ? '2' : '0');
    if (contract) url.searchParams.set('workflow_key', 'eq.seller_email');
    let response;
    let body;
    try {
      response = await fetchImpl(url, {
        method: 'GET', redirect: 'manual', cache: 'no-store', signal: AbortSignal.timeout(timeoutMs),
        headers: { apikey: key, ...(key.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), Accept: 'application/json' },
      });
      try { body = await readBoundedJson(response); }
      catch (error) {
        if (!(error instanceof ResponseFormatError) && !(error instanceof SyntaxError)) throw error;
      }
    } catch {
      checks.push({ table, status: 'NETWORK_OR_TIMEOUT_FAILURE' });
      return { ...report, status: 'NETWORK_OR_TIMEOUT_FAILURE', nextAction: 'Check connectivity to the selected project. Each read has a bounded timeout; no exception details or credentials are printed.' };
    }
    if (!response.ok) {
      const result = failure(response.status, body);
      checks.push({ table, status: result.status, httpStatus: response.status });
      return { ...report, ...result };
    }
    if (!Array.isArray(body) || (!contract && body.length !== 0)) {
      checks.push({ table, status: 'UNEXPECTED_RESPONSE', httpStatus: response.status });
      return { ...report, status: 'UNEXPECTED_RESPONSE', nextAction: 'The selected endpoint did not return the expected bounded JSON result. Verify its API configuration.' };
    }
    if (contract && (body.length !== 1 || body[0]?.workflow_key !== 'seller_email' || body[0]?.enabled !== true
      || !Number.isInteger(body[0]?.min_payload_version) || !Number.isInteger(body[0]?.max_payload_version)
      || body[0].min_payload_version !== 1 || body[0].max_payload_version < 1)) {
      checks.push({ table, status: 'EMAIL_CONTRACT_NOT_READY', httpStatus: response.status });
      return { ...report, status: 'EMAIL_CONTRACT_NOT_READY', nextAction: 'Review the seller_email v1 event contract and its migration/admission state. Do not invoke the worker to test it.' };
    }
    checks.push({ table, status: 'PASS', httpStatus: response.status });
  }
  return { ...report, status: 'READ_ONLY_PROBES_PASSED', nextAction: 'Compare applied migrations and verify the real owner/client flow and authenticated hosted cadence in the explicitly selected release environment. These probes do not establish full release readiness.' };
}

async function main(args) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: node scripts/seller-runtime-preflight.mjs --expected-project-ref <project-ref|local> [--env-file <file>]');
    console.log('Default: effective Next.js development environment. An explicit env file is isolated from ambient credentials. GET probes only; stops at the first failure. No worker or billing action.');
    return;
  }
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!['--expected-project-ref', '--env-file'].includes(flag) || !args[index + 1] || args[index + 1].startsWith('--') || options[flag]) {
      throw new ConfigurationError('Invalid or duplicate arguments. Use --help for usage.');
    }
    options[flag] = args[index + 1];
  }
  if (!/^(?:[a-z0-9]{20}|local)$/.test(options['--expected-project-ref'] || '')) {
    throw new ConfigurationError('Supply --expected-project-ref <20-character-project-ref|local> before loading credentials.');
  }
  let env;
  if (options['--env-file']) {
    try { env = parseDotenv(await readFile(resolve(options['--env-file']), 'utf8')); }
    catch { throw new ConfigurationError('Unable to read the selected environment file.'); }
  } else {
    const appRoot = fileURLToPath(new URL('../', import.meta.url));
    env = nextEnv.loadEnvConfig(appRoot, true, { info() {}, error() {} }).combinedEnv;
  }
  const result = await inspectSellerRuntime(env, { expectedProjectRef: options['--expected-project-ref'] });
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'READ_ONLY_PROBES_PASSED') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(JSON.stringify({ status: 'CONFIGURATION_FAILURE', message: error instanceof ConfigurationError ? error.message : 'Unable to complete runtime preflight. No exception details or credentials are printed.' }));
    process.exitCode = 1;
  });
}
