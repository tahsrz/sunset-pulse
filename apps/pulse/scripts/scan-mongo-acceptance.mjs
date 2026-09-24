import { command, pulseRoot, withDockerService } from './docker-acceptance.mjs';
import { fileURLToPath } from 'node:url';

await withDockerService('mongo-test', async (_container, compose) => {
  const endpoint = await compose('port', 'mongo-test', '27017');
  if (!/^127\.0\.0\.1:\d+$/.test(endpoint)) throw new Error('Expected a loopback-only Mongo port');
  await command(process.execPath, [
    fileURLToPath(new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url)),
    'run', '--config', `${pulseRoot}/vitest.integration.config.ts`,
  ], {
    env: { ...process.env, PULSE_TEST_MONGO_URI: `mongodb://${endpoint}/pulse_scan_acceptance`, NEXT_PUBLIC_MOCK_MODE: 'false' },
    stream: true,
  });
}).catch((error) => { console.error(error.message); process.exitCode = 1; });
