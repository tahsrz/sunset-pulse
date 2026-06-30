import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const workspaceRoot = resolve(process.cwd(), '../..');

describe('PowerSync local-first configuration', () => {
  it('ships both browser workers referenced by the provider', () => {
    const workerRoot = resolve(process.cwd(), 'public/@powersync/worker');
    expect(existsSync(resolve(workerRoot, 'WASQLiteDB.umd.js'))).toBe(true);
    expect(existsSync(resolve(workerRoot, 'SharedSyncImplementation.umd.js'))).toBe(true);
  });

  it('scopes private streams by the authenticated Supabase user', () => {
    const config = readFileSync(resolve(workspaceRoot, 'infra/powersync/sync-config.yaml'), 'utf8');
    expect(config).toContain('edition: 3');
    expect(config.match(/auth\.user_id\(\)/g)).toHaveLength(5);
    expect(config).toContain("subscription.parameter('south')");
    expect(config).toContain("subscription.parameter('property_id')");
    expect(config).toContain("subscription.parameter('north') - subscription.parameter('south') <= 1.5");
    expect(config).not.toMatch(/display_public, metadata/);
  });
});
