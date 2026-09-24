import { describe, expect, it } from 'vitest';
import { parseScopeTarget, summarizeScopeCandidates, type ScopeCandidate } from '@/scripts/platform-scope-backfill';

const candidate = (overrides: Partial<ScopeCandidate>): ScopeCandidate => ({
  ownerId: 'owner', resourceType: 'profile', resourceId: 'resource', workspaceId: 'workspace', status: 'ready', reason: null,
  ...overrides,
});

describe('platform scope dry-run reporting', () => {
  it('separates ready, unmapped and ambiguous resources by domain', () => {
    expect(summarizeScopeCandidates([
      candidate({ resourceType: 'profile' }),
      candidate({ resourceType: 'site_config', status: 'unmapped', workspaceId: null, reason: 'No workspace.' }),
      candidate({ resourceType: 'property_shortlist', status: 'ambiguous', workspaceId: null, reason: 'Two workspaces.' }),
    ])).toEqual({ 'profile:ready': 1, 'site_config:unmapped': 1, 'property_shortlist:ambiguous': 1 });
  });

  it('requires an explicit non-production environment target', () => {
    expect(parseScopeTarget(['node', 'script', '--target', 'local'])).toBe('local');
    expect(parseScopeTarget(['node', 'script', '--target', 'preview'])).toBe('preview');
    expect(() => parseScopeTarget(['node', 'script'])).toThrow(/explicit --target/);
    expect(() => parseScopeTarget(['node', 'script', '--target', 'qa'])).toThrow(/explicit --target/);
  });
});
