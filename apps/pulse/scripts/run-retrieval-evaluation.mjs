import { spawnSync } from 'node:child_process';
import path from 'node:path';

const tsxCli = path.resolve(process.cwd(), '../../node_modules/tsx/dist/cli.mjs');
const result = spawnSync(process.execPath, [tsxCli, 'scripts/evaluate-jamie-retrieval.ts', ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, '--conditions=react-server'].filter(Boolean).join(' ') },
  stdio: 'inherit',
});
process.exitCode = result.status ?? 1;
