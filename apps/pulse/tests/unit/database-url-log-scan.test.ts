import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(__dirname, '../../../..');
const prismaEntryPaths = [
  path.join(repoRoot, 'packages/prisma/index.ts'),
  path.join(repoRoot, 'apps/scheduling/packages/prisma/index.ts'),
];

describe('database URL log safety', () => {
  it('does not send Prisma connection strings to application logs', () => {
    const unsafeLogCalls = prismaEntryPaths.flatMap((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      const logCalls = source.match(/console\.(?:debug|info|log|warn|error)\s*\([\s\S]*?\);/g) ?? [];

      return logCalls
        .filter((call) => /DATABASE_URL|connectionString/.test(call))
        .map((call) => `${path.relative(repoRoot, filePath)}: ${call}`);
    });

    expect(unsafeLogCalls).toEqual([]);
  });
});
