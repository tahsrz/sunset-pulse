import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { createServer } from 'node:net';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { command, withDockerService } from './docker-acceptance.mjs';

const appRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const repositoryRoot = resolve(appRoot, '../..');
const supabaseSource = join(appRoot, 'supabase');
const supabaseCli = join(repositoryRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'supabase.cmd' : 'supabase');
const suiteIndex = process.argv.indexOf('--suite');
const suite = suiteIndex < 0 ? 'realtor' : process.argv[suiteIndex + 1];
assert(['realtor', 'scans'].includes(suite), 'Supported suites: realtor, scans');
const startedAt = Date.now();
const projectId = `pulse_auth_${randomUUID().replaceAll('-', '').slice(0, 8)}`;
const temporaryRoot = await mkdtemp(join(tmpdir(), `sunset-pulse-${projectId}-`));
const workdir = join(temporaryRoot, 'project');
const supabaseDir = join(workdir, 'supabase');
const localEnv = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' };
let started = false;

function run(executable, args, { cwd = repositoryRoot, env = localEnv, timeoutMs = 600000, quiet = false } = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(executable, args, {
      cwd, env, windowsHide: true,
      shell: process.platform === 'win32' && /\.(?:cmd|bat)$/i.test(executable),
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), timeoutMs);
    child.stdout.on('data', (chunk) => {
      const value = chunk.toString();
      stdout += value;
      if (!quiet) process.stdout.write(value);
    });
    child.stderr.on('data', (chunk) => {
      const value = chunk.toString();
      stderr += value;
      if (!quiet) process.stderr.write(value);
    });
    child.on('error', (error) => { clearTimeout(timer); rejectRun(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolveRun({ stdout, stderr });
      else {
        const diagnostic = quiet ? (stdout + '\n' + stderr).split(/\r?\n/)
          .filter((line) => /ERROR|failed|unhealthy|invalid|syntax/i.test(line) && !/key|token|secret|password|jwt|authorization/i.test(line))
          .map((line) => line.replace(/eyJ[A-Za-z0-9_.-]+|sb_[A-Za-z0-9_-]+/g, '[redacted]')).slice(-10).join('\n') : '';
        rejectRun(new Error(`${executable} exited with code ${code}${quiet ? '; service credentials suppressed' : ''}${diagnostic ? '\n' + diagnostic : ''}`));
      }
    });
  });
}

async function portIsFree(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once('error', () => resolvePort(false));
    server.listen(port, '127.0.0.1', () => server.close(() => resolvePort(true)));
  });
}

async function choosePortRange(size) {
  const startingOffset = Math.floor(Math.random() * 700);
  for (let attempt = 0; attempt < 700; attempt += 1) {
    const first = 55000 + ((startingOffset + attempt) % 700);
    const ports = Array.from({ length: size }, (_, index) => first + index);
    const available = await Promise.all(ports.map(portIsFree));
    if (available.every(Boolean)) return ports;
  }
  throw new Error('No free loopback port range is available for disposable Supabase acceptance.');
}

function setSectionValue(contents, section, key, value) {
  const header = `[${section}]`;
  const start = contents.indexOf(header);
  assert.notEqual(start, -1, `Supabase config is missing ${header}`);
  const next = contents.indexOf('\n[', start + header.length);
  const end = next === -1 ? contents.length : next + 1;
  const block = contents.slice(start, end);
  const pattern = new RegExp(`(^|\\n)#?\\s*${key}\\s*=.*(?=\\n|$)`);
  assert.match(block, pattern, `${header} is missing ${key}`);
  const updated = block.replace(pattern, (_match, prefix) => `${prefix}${key} = ${value}`);
  return contents.slice(0, start) + updated + contents.slice(end);
}

async function stopDisposableStack() {
  if (!started) return;
  // This project ID is generated here and is never the user's persistent stack.
  await run(supabaseCli, ['stop', '--project-id', projectId, '--no-backup', '--yes', '--workdir', workdir], {
    timeoutMs: 120000, quiet: true,
  });
  const remaining = await command('docker', ['ps', '-aq', '--filter', `label=com.supabase.cli.project=${projectId}`]);
  const volumes = await command('docker', ['volume', 'ls', '-q', '--filter', `label=com.supabase.cli.project=${projectId}`]);
  assert(!remaining && !volumes, `Disposable resources remain for ${projectId}; retained config: ${workdir}`);
  started = false;
}

try {
  const ports = await choosePortRange(8);
  await mkdir(supabaseDir, { recursive: true });
  await cp(join(supabaseSource, 'migrations'), join(supabaseDir, 'migrations'), { recursive: true });
  let config = await readFile(join(supabaseSource, 'config.toml'), 'utf8');
  config = config.replace(/^project_id\s*=.*$/m, `project_id = "${projectId}"`);
  config = setSectionValue(config, 'api', 'port', String(ports[0]));
  config = setSectionValue(config, 'db', 'port', String(ports[1]));
  config = setSectionValue(config, 'db', 'shadow_port', String(ports[2]));
  config = setSectionValue(config, 'db.pooler', 'port', String(ports[3]));
  config = setSectionValue(config, 'studio', 'port', String(ports[4]));
  config = setSectionValue(config, 'studio', 'api_url', `"http://127.0.0.1:${ports[0]}"`);
  config = setSectionValue(config, 'inbucket', 'port', String(ports[5]));
  config = setSectionValue(config, 'analytics', 'port', String(ports[6]));
  config = setSectionValue(config, 'analytics', 'enabled', 'false');
  config = setSectionValue(config, 'inbucket', 'enabled', 'false');
  config = setSectionValue(config, 'db.seed', 'enabled', 'false');
  await writeFile(join(supabaseDir, 'config.toml'), config, 'utf8');

  console.log(`Starting isolated Supabase project ${projectId} on loopback ports ${ports[0]}–${ports.at(-1)}.`);
  started = true;
  await run(supabaseCli, [
    'start', '--workdir', workdir,
    '--exclude', ['analytics', 'realtime', 'vector', 'edge-runtime', 'functions', 'imgproxy', 'inbucket', ...(suite === 'scans' ? [] : ['storage'])].join(','),
    '--yes',
  ], { timeoutMs: 900000, quiet: true });
  // A fresh `supabase start` applies this project's copied migration chain;
  // the auth harness fails closed if any required version is absent.
  if (suite === 'scans') {
    await withDockerService('mongo-test', async (container) => {
      const port = await command('docker', ['port', container, '27017/tcp']);
      assert.match(port, /^127\.0\.0\.1:\d+$/);
      await run(process.execPath, [join(appRoot, 'scripts', 'scan-storage-acceptance.mjs'),
        '--stack', projectId, '--api-url', `http://127.0.0.1:${ports[0]}`,
        '--origin', `http://127.0.0.1:${ports[7]}`,
      ], { cwd: appRoot, env: { ...localEnv, PULSE_TEST_MONGO_URI: `mongodb://${port}/pulse_scan_acceptance` } });
      const containers = await command('docker', ['ps', '-q', '--filter', `label=com.supabase.cli.project=${projectId}`]);
      console.log(await command('docker', ['stats', '--no-stream', '--format', '{{.Name}}: {{.MemUsage}}; CPU {{.CPUPerc}}', ...containers.split(/\s+/).filter(Boolean), container]));
    });
  } else {
    const runAuth = (env) => run(process.execPath, [
      join(appRoot, 'scripts', 'platform-local-auth-acceptance.mjs'),
      '--stack', projectId, '--api-url', `http://127.0.0.1:${ports[0]}`,
      '--origin', `http://127.0.0.1:${ports[7]}`, '--realtor-only',
      ...(process.argv.includes('--homepage') ? ['--homepage'] : []),
    ], { cwd: appRoot, env, timeoutMs: 900000 });
    if (process.argv.includes('--homepage')) await withDockerService('mongo-test', async (container) => {
      const port = await command('docker', ['port', container, '27017/tcp']);
      assert.match(port, /^127\.0\.0\.1:\d+$/);
      await runAuth({ ...localEnv, PULSE_TEST_MONGO_URI: `mongodb://${port}/pulse_homepage_acceptance` });
    });
    else await runAuth({ ...localEnv, PULSE_TEST_MONGO_URI: '' });
  }
  console.log('PASS: disposable authenticated Supabase acceptance completed.');
} finally {
  await stopDisposableStack();
  const resolvedTemp = resolve(temporaryRoot);
  const tempPrefix = resolve(tmpdir()) + sep;
  if (!resolvedTemp.startsWith(tempPrefix) || !resolvedTemp.includes(projectId)) {
    throw new Error('Refusing to remove an unexpected disposable acceptance directory.');
  }
  await rm(resolvedTemp, { recursive: true, force: true });
  console.log(`Removed disposable Supabase project ${projectId} and its temporary config.`);
  console.log(`Total local ${suite} acceptance runtime: ${Math.round((Date.now() - startedAt) / 1000)}s.`);
}
