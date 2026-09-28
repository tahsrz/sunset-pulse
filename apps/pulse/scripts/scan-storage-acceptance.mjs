import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { command, pulseRoot } from './docker-acceptance.mjs';

const option = (name) => process.argv[process.argv.indexOf(name) + 1];
const stack = option('--stack');
assert.match(stack || '', /^pulse_auth_[a-f0-9]{8}$/);
const api = new URL(option('--api-url'));
const origin = new URL(option('--origin'));
for (const url of [api, origin]) assert(url.protocol === 'http:' && url.hostname === '127.0.0.1');
const mongo = process.env.PULSE_TEST_MONGO_URI || '';
assert.match(mongo, /^mongodb:\/\/127\.0\.0\.1:\d+\/pulse_scan_acceptance$/);
// Inspect only this invocation's generated local project. Never log credentials.
const lines = JSON.parse(await command('docker', ['inspect', `supabase_studio_${stack}`, '--format', '{{json .Config.Env}}']));
const value = (name) => lines.find((line) => line.startsWith(name + '='))?.slice(name.length + 1);
const anon = value('SUPABASE_ANON_KEY'), service = value('SUPABASE_SERVICE_KEY');
assert(anon && service);
const env = { ...process.env, NODE_ENV: 'development',
  SUPABASE_URL: api.origin, NEXT_PUBLIC_SUPABASE_URL: api.origin,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service,
  MONGODB_URI: mongo, PULSE_TEST_MONGO_URI: mongo, PULSE_SCAN_ACCEPTANCE_ORIGIN: origin.origin,
  NEXT_PUBLIC_MOCK_MODE: 'false', NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED: 'false', PULSE_ALLOW_PRODUCTION_MOCK_AUTH: '',
  E2E_OPERATOR_ACCESS: 'false', NEXT_PUBLIC_E2E_MODE: 'false', PROPERTY_SCAN_REVIEWER_IDS: '',
  OPENAI_API_KEY: '', GROQ_API_KEY: '', NEXT_PUBLIC_SITE_URL: origin.origin, NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN: origin.origin,
};
let server;
try {
  server = spawn(process.execPath, [fileURLToPath(new URL('../../../node_modules/next/dist/bin/next', import.meta.url)),
    'dev', '--hostname', '127.0.0.1', '--port', origin.port], { cwd: pulseRoot, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  // Drain, never persist session-bearing server logs.
  for (const stream of [server.stdout, server.stderr]) stream.on('data', () => {});
  let ready = false;
  for (let attempt = 0; attempt < 90; attempt++) {
    assert.equal(server.exitCode, null, 'Local app exited during startup');
    try { if ((await fetch(`${origin.origin}/api/property-scans`, { signal: AbortSignal.timeout(2000) })).status === 401) { ready = true; break; } } catch {}
    await delay(1000);
  }
  assert(ready, 'Local scan API did not become ready');
  await command(process.execPath, [fileURLToPath(new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url)),
    'run', '--config', 'vitest.integration.config.ts', 'tests/integration/scan-storage.test.ts'], { env, timeout: 300000, stream: true });
} finally {
  if (server?.pid && server.exitCode === null) {
    if (process.platform === 'win32') await command('taskkill', ['/PID', String(server.pid), '/T', '/F']);
    else { server.kill('SIGTERM'); await new Promise((resolve) => server.once('close', resolve)); }
  }
}
