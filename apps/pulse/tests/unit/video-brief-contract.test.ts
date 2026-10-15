import { describe, expect, it } from 'vitest';
import { videoBriefSchema } from '@/lib/marketing/videoBriefSchema';

const draft = {
  schemaVersion: 1,
  briefId: '11111111-1111-4111-8111-111111111111',
  revision: 1,
  supersedesBriefId: null,
  backlogLink: null,
  topic: 'A simple photo-day preparation checklist',
  audienceNeed: 'Homeowners want a calm plan before photography.',
  hook: 'Three small steps can make photo day feel more manageable.',
  script: 'Start with the entry, clear everyday items, and open the window coverings where appropriate.',
  shotList: ['Show a clear entryway before the checklist.'],
  claimEvidence: [],
  listingPermission: { status: 'not-needed', listingReference: null, evidenceReference: null },
  channels: ['tiktok', 'instagram-reels'],
  ctaOfferKey: 'seller-plan',
  campaignKey: 'seller-photo-prep',
  reviewStatus: 'draft',
  reviewedByUserId: null,
  reviewedAt: null,
  reviewNotes: null,
};

describe('video brief contract', () => {
  it('accepts a bounded draft but does not imply posting or approval', () => {
    expect(videoBriefSchema.parse(draft).reviewStatus).toBe('draft');
  });

  it('requires an exact predecessor for later revisions', () => {
    expect(videoBriefSchema.safeParse({ ...draft, revision: 2 }).success).toBe(false);
  });

  it('accepts a revision-fenced backlog link and rejects incomplete link data', () => {
    expect(videoBriefSchema.safeParse({
      ...draft,
      backlogLink: { itemId: '33333333-3333-4333-8333-333333333333', expectedRevision: 4 },
    }).success).toBe(true);
    expect(videoBriefSchema.safeParse({
      ...draft,
      backlogLink: { itemId: '33333333-3333-4333-8333-333333333333', expectedRevision: 0 },
    }).success).toBe(false);
    expect(videoBriefSchema.safeParse({ ...draft, backlogLink: { itemId: 'not-an-id', expectedRevision: 1 } }).success).toBe(false);
  });

  it('requires human approval metadata and exact listing permission for approved listing content', () => {
    const listingBrief = {
      ...draft,
      listingPermission: { status: 'pending', listingReference: 'listing-fixture-1', evidenceReference: null },
      reviewStatus: 'approved',
      reviewedByUserId: '22222222-2222-4222-8222-222222222222',
      reviewedAt: '2026-10-05T17:00:00Z',
    };
    expect(videoBriefSchema.safeParse(listingBrief).success).toBe(false);
    expect(videoBriefSchema.safeParse({
      ...listingBrief,
      listingPermission: { status: 'granted', listingReference: 'listing-fixture-1', evidenceReference: 'permission-record-fixture-1' },
    }).success).toBe(true);
  });

  it('requires source and permission evidence for factual claims before approval', () => {
    const withClaim = {
      ...draft,
      claimEvidence: [{
        claim: 'Synthetic claim used only to test evidence validation.',
        sourceReference: 'synthetic-source-reference',
        sourceDate: '2026-10-01',
        publicationBasis: 'unknown',
        permissionEvidence: null,
      }],
      reviewStatus: 'approved',
      reviewedByUserId: '22222222-2222-4222-8222-222222222222',
      reviewedAt: '2026-10-05T17:00:00Z',
    };
    expect(videoBriefSchema.safeParse(withClaim).success).toBe(false);
    expect(videoBriefSchema.safeParse({
      ...withClaim,
      claimEvidence: [{ ...withClaim.claimEvidence[0], publicationBasis: 'public-permitted', permissionEvidence: 'synthetic-permission-evidence', sourceDate: null }],
    }).success).toBe(false);
  });

  it('rejects executable, credential-like or otherwise unrecognized fields', () => {
    expect(videoBriefSchema.safeParse({ ...draft, execute: 'send now' }).success).toBe(false);
    expect(videoBriefSchema.safeParse({ ...draft, accessToken: 'secret' }).success).toBe(false);
    expect(videoBriefSchema.safeParse({ ...draft, channels: ['tiktok', 'tiktok'] }).success).toBe(false);
  });
});
