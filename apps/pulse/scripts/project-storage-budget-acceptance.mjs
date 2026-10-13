import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { command } from './docker-acceptance.mjs';
import { uploadWithStorageBudget, createBudgetedSignedUploadUrl } from '../lib/storage/projectStorageBudget.mjs';

// Never loads .env files or connects to a hosted project.
const appRoot = fileURLToPath(new URL('../', import.meta.url));
const cli = process.env.PULSE_TEST_SUPABASE_CLI || resolve(appRoot, '../../node_modules/.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
const project = `pulse_budget_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
const temporaryRoot = await mkdtemp(join(tmpdir(), `${project}-`));
const workdir = join(temporaryRoot, 'project');
let started = false;

function runCli(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(cli, args, { windowsHide: true, shell: process.platform === 'win32',
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill(), 600000);
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      const diagnostic = stderr.split(/\r?\n/).filter((line) => /ERROR|failed|unhealthy|invalid|syntax/i.test(line)
        && !/key|token|secret|password|jwt|authorization/i.test(line)).slice(-8).join('\n');
      if (code === 0) resolveRun(stdout);
      else reject(new Error(`Disposable Supabase ${args[0]} failed (${code}); credentials suppressed. ${diagnostic}`));
    });
  });
}

async function freePort(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePort(true)));
  });
}
function setValue(config, section, key, value) {
  const start = config.indexOf(`[${section}]`);
  assert(start >= 0);
  const next = config.indexOf('\n[', start + 1);
  const end = next < 0 ? config.length : next;
  const block = config.slice(start, end);
  const pattern = new RegExp(`(^|\\n)#?\\s*${key}\\s*=.*(?=\\n|$)`);
  assert.match(block, pattern);
  return config.slice(0, start) + block.replace(pattern, (_, prefix) => `${prefix}${key} = ${value}`) + config.slice(end);
}

try {
  // Check the engine before marking a stack as started, so an offline Docker
  // daemon doesn't hide the startup failure behind an unsuccessful stop.
  await command('docker', ['info', '--format', '{{.ServerVersion}}'], { timeout: 15000 });
  await runCli(['--version']);
  let ports;
  for (let attempt = 0; attempt < 100; attempt++) {
    const base = 56000 + Math.floor(Math.random() * 1000);
    const candidate = Array.from({ length: 7 }, (_, index) => base + index);
    if ((await Promise.all(candidate.map(freePort))).every(Boolean)) { ports = candidate; break; }
  }
  assert(ports, 'No free disposable port range');
  const source = join(appRoot, 'supabase');
  const target = join(workdir, 'supabase');
  await mkdir(join(target, 'migrations'), { recursive: true });
  const migration = '20261013170000_project_storage_budget.sql';
  await writeFile(join(target, 'migrations', migration), await readFile(join(source, 'migrations', migration)));
  let config = (await readFile(join(source, 'config.toml'), 'utf8')).replace(/^project_id\s*=.*$/m, `project_id = "${project}"`);
  for (const [section, key, value] of [
    ['api', 'port', ports[0]], ['db', 'port', ports[1]], ['db', 'shadow_port', ports[2]],
    ['db.pooler', 'port', ports[3]], ['studio', 'port', ports[4]],
    ['studio', 'api_url', `"http://127.0.0.1:${ports[0]}"`],
    ['inbucket', 'port', ports[5]], ['analytics', 'port', ports[6]],
    ['analytics', 'enabled', false], ['inbucket', 'enabled', false], ['db.seed', 'enabled', false],
  ]) config = setValue(config, section, key, String(value));
  await writeFile(join(target, 'config.toml'), config);
  console.log(`Starting disposable Storage acceptance: ${project}`);
  started = true;
  await runCli(['start', '--workdir', workdir, '--exclude', 'analytics,realtime,vector,edge-runtime,functions,imgproxy,inbucket', '--yes']);
  const lines = JSON.parse(await command('docker', ['inspect', `supabase_studio_${project}`, '--format', '{{json .Config.Env}}']));
  const value = (name) => lines.find((line) => line.startsWith(`${name}=`))?.slice(name.length + 1);
  const url = `http://127.0.0.1:${ports[0]}`;
  const admin = createClient(url, value('SUPABASE_SERVICE_KEY'), { auth: { persistSession: false, autoRefreshToken: false } });
  const anon = createClient(url, value('SUPABASE_ANON_KEY'), { auth: { persistSession: false } });
  const sql = (input) => command('docker', ['exec', '-i', `supabase_db_${project}`, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-At'], { input });
  const status = async () => {
    const result = await admin.rpc('project_storage_budget_status');
    assert.equal(result.error, null); return result.data;
  };
  assert.equal((await admin.storage.createBucket('budget-test', { public: false, fileSizeLimit: 1000 })).error, null);
  await sql('UPDATE public.project_storage_budget SET limit_bytes=2500 WHERE singleton;');
  assert((await anon.rpc('reserve_project_storage', { p_bucket: 'budget-test', p_name: 'anon', p_bytes: 1 })).error);
  assert((await admin.from('project_storage_budget').update({ limit_bytes: 800000000 }).eq('singleton', true)).error);
  assert((await admin.storage.from('budget-test').upload('unreserved', Buffer.alloc(1))).error, 'Service-role uploads must not bypass admission');
  assert.equal((await uploadWithStorageBudget(admin, 'budget-test', 'first', Buffer.alloc(900))).error, null);
  assert.equal((await status()).liveBytes, 900);
  assert.equal((await status()).reservedBytes, 0, 'Authorization probes must roll back');
  assert((await admin.storage.from('budget-test').update('first', Buffer.alloc(950))).error, 'Updates must fail before backend writes');
  const concurrent = await Promise.all(['second', 'third'].map((name) => admin.rpc('reserve_project_storage', { p_bucket: 'budget-test', p_name: name, p_bytes: 1 })));
  assert.equal(concurrent.filter((result) => !result.error).length, 1, 'Only one concurrent reservation fits');
  assert.equal((await status()).reservedBytes, 1000, 'Charge provider limit rather than declared bytes');
  const winner = concurrent[0].error ? 'third' : 'second';
  const signed = await createBudgetedSignedUploadUrl(admin, 'budget-test', winner, 1);
  assert.equal(signed.error, null);
  assert.equal((await status()).reservedBytes, 1000, 'Issuing a capability must not settle it');
  assert.equal((await anon.storage.from('budget-test').uploadToSignedUrl(winner, signed.data.token, Buffer.alloc(800))).error, null);
  assert.equal((await status()).liveBytes, 1700);
  assert.equal((await status()).reservedBytes, 0);
  assert((await uploadWithStorageBudget(admin, 'budget-test', 'over-budget', Buffer.alloc(1))).error);
  assert((await admin.storage.from('budget-test').copy('first', 'copy-bypass')).error);
  assert.equal((await admin.storage.from('budget-test').download('first')).error, null, 'Reads remain available at capacity');
  assert.equal((await admin.storage.from('budget-test').remove([winner])).error, null);
  assert.equal((await status()).retiredBytes, 800, 'Asynchronous backend deletion must not release capacity');
  assert((await anon.storage.from('budget-test').uploadToSignedUrl(winner, signed.data.token, Buffer.alloc(800))).error, 'Deleted paths cannot be recreated');
  assert((await admin.storage.from('budget-test').info(winner)).error);
  assert((await admin.rpc('reserve_project_storage', { p_bucket: 'budget-test', p_name: 'oversized', p_bytes: 1001 })).error);
  assert.equal((await admin.storage.createBucket('unbounded', { public: false })).error, null);
  assert((await admin.rpc('reserve_project_storage', { p_bucket: 'unbounded', p_name: 'file', p_bytes: 1 })).error);
  assert((await admin.rpc('reserve_project_storage', { p_bucket: 'cartridges', p_name: 'wiki_en_test.tah', p_bytes: 1 })).error);
  await sql('UPDATE public.project_storage_budget SET paused=true WHERE singleton;');
  assert((await admin.rpc('reserve_project_storage', { p_bucket: 'budget-test', p_name: 'paused', p_bytes: 1 })).error);
  console.log('PASS: real Storage API admission, concurrency, signed upload, replay denial, immutable files, deletion accounting, access controls and reads at capacity.');
} finally {
  if (started) {
    await runCli(['stop', '--project-id', project, '--no-backup', '--yes', '--workdir', workdir]);
    assert.equal(await command('docker', ['ps', '-aq', '--filter', `label=com.supabase.cli.project=${project}`]), '');
    assert.equal(await command('docker', ['volume', 'ls', '-q', '--filter', `label=com.supabase.cli.project=${project}`]), '');
  }
  const resolved = resolve(temporaryRoot);
  assert(resolved.startsWith(resolve(tmpdir()) + sep) && resolved.includes(project));
  await rm(resolved, { recursive: true, force: true });
  console.log(`Removed disposable project ${project}.`);
}
