import { describe, expect, it } from 'vitest';
import { canReadScan, canReviewScan, scanActorFromOperatorAccess } from '@/lib/scans/scanAccess.server';

const owner = { userId: 'owner-1', mode: 'authenticated' as const, role: 'user' };
const reviewer = { userId: 'reviewer-1', mode: 'authenticated' as const, role: 'operator' };
const unrelated = { userId: 'other-1', mode: 'authenticated' as const, role: 'realtor' };
const session = { ownerId: 'owner-1', reviewerIds: ['reviewer-1'] };

describe('property scan access', () => {
  it('allows the owner to read but not approve a scan', () => {
    expect(canReadScan(session, owner)).toBe(true);
    expect(canReviewScan(session, owner)).toBe(false);
  });

  it('allows an explicitly assigned reviewer and denies an unrelated realtor', () => {
    expect(canReadScan(session, reviewer)).toBe(true);
    expect(canReviewScan(session, reviewer)).toBe(true);
    expect(canReadScan(session, unrelated)).toBe(false);
    expect(canReviewScan(session, unrelated)).toBe(false);
  });

  it('keeps local development access explicit', () => {
    const access = scanActorFromOperatorAccess({ allowed: true, mode: 'local', reason: 'test', user: null });
    expect(canReadScan({ ownerId: 'someone-else' }, access)).toBe(true);
    expect(canReviewScan({ ownerId: 'someone-else' }, access)).toBe(true);
  });
});
