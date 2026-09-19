import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const pulseRoot = fileURLToPath(new URL('../', import.meta.url));
const composeFile = fileURLToPath(new URL('../../../infra/local/compose.yaml', import.meta.url));

// No shell interpolation, env-file loading, Docker socket mount or host DB URL.
export function command(file, args, { input = '', env = process.env, timeout = 120_000, stream = false } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { cwd: pulseRoot, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => child.kill(), timeout);
    child.stdout.on('data', (data) => { stdout += data; if (stream) process.stdout.write(data); });
    child.stderr.on('data', (data) => { stderr += data; if (stream) process.stderr.write(data); });
    child.stdin.on('error', () => {});
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (code !== 0) reject(new Error(`${file} ${args[0]} failed (${signal || code}): ${stderr || stdout}`));
      else resolve(stdout.trim());
    });
    child.stdin.end(input);
  });
}

export async function withDockerService(service, run) {
  if (!['scheduler-test', 'mongo-test'].includes(service)) throw new Error('Unknown acceptance service');
  const project = `pulse-acceptance-${randomUUID().replaceAll('-', '')}`;
  const compose = (...args) => command('docker', ['compose', '-f', composeFile, '-p', project, '--profile', 'acceptance', ...args]);
  console.log(`Starting disposable ${service}: ${project}`);
  try {
    await compose('up', '-d', '--wait', '--wait-timeout', '90', service);
    const container = await compose('ps', '-q', service);
    if (!/^[a-f0-9]{12,64}$/.test(container)) throw new Error('Expected exactly one test container');
    return await run(container, compose);
  } finally {
    // This generated Compose project contains only this invocation's test data.
    await compose('down', '--volumes', '--remove-orphans');
    const remaining = await command('docker', ['ps', '-aq', '--filter', `label=com.docker.compose.project=${project}`]);
    if (remaining) throw new Error(`Test containers remain after cleanup: ${project}`);
    console.log(`Removed disposable fixtures: ${project}`);
  }
}
