import { describe, expect, it } from 'vitest';
import { privateCmaReviewSchema } from '@/lib/marketing/privateCmaReviewSchema';

const reviewerId = '11111111-1111-4111-8111-111111111111';
const leadId = '22222222-2222-4222-8222-222222222222';
const comparableId = '33333333-3333-4333-8333-333333333333';

const draft = {
  schemaVersion: 1,
  reviewId: '44444444-4444-4444-8444-444444444444',
  revision: 1,
  supersedesReviewId: null,
  leadId,
  status: 'draft',
  useRestriction: 'private-review-only',
  preparedAt: '2026-10-05T12:00:00.000Z',
  expiresAt: '2026-12-05T12:00:00.000Z',
  subject: {
    regionLabel: 'Synthetic test area',
    facts: { bedrooms: 3, bathrooms: 2, livingAreaSqFt: 1800, lotAreaSqFt: 7000, yearBuilt: 2000 },
  },
  comparables: [{
    comparableId,
    soldAt: '2026-09-01',
    salePriceUsd: 300000,
    facts: { bedrooms: 3, bathrooms: 2, livingAreaSqFt: 1750, lotAreaSqFt: 7000, yearBuilt: 2001 },
    source: {
      sourceType: 'seller-provided',
      recordReference: 'synthetic-comparable-a',
      retrievedAt: '2026-10-05T11:00:00.000Z',
      usagePermission: 'unknown',
      permissionEvidenceRef: 'synthetic-fixture-evidence',
    },
    adjustments: [{ category: 'living-area', amountUsd: 5000, rationale: 'Synthetic calculation test adjustment.' }],
    adjustedPriceUsd: 305000,
  }],
  suggestedRangeUsd: { low: 290000, target: 305000, high: 320000 },
  review: {
    reviewerUserId: null,
    reviewedAt: null,
    sellerPermissionEvidenceRef: null,
    methodologyNote: null,
  },
};

describe('private CMA review contract', () => {
  it('accepts a draft without asserting that its synthetic inputs are market evidence', () => {
    expect(privateCmaReviewSchema.parse(draft).status).toBe('draft');
  });

  it('requires the adjusted price to equal the documented sale price plus adjustments', () => {
    const result = privateCmaReviewSchema.safeParse({
      ...draft,
      comparables: [{ ...draft.comparables[0], adjustedPriceUsd: 310000 }],
    });
    expect(result.success).toBe(false);
  });

  it('requires later revisions to point to a distinct prior review and keeps comparable IDs unique', () => {
    expect(privateCmaReviewSchema.safeParse({ ...draft, revision: 2 }).success).toBe(false);
    expect(privateCmaReviewSchema.safeParse({
      ...draft,
      revision: 2,
      supersedesReviewId: draft.reviewId,
    }).success).toBe(false);
    expect(privateCmaReviewSchema.safeParse({
      ...draft,
      revision: 2,
      supersedesReviewId: '55555555-5555-4555-8555-555555555555',
    }).success).toBe(true);
    expect(privateCmaReviewSchema.safeParse({
      ...draft,
      comparables: [draft.comparables[0], draft.comparables[0]],
    }).success).toBe(false);
  });

  it('requires reviewer, seller permission, methodology and authorized source evidence before review', () => {
    expect(privateCmaReviewSchema.safeParse({ ...draft, status: 'reviewed' }).success).toBe(false);

    const reviewed = {
      ...draft,
      status: 'reviewed',
      review: {
        reviewerUserId: reviewerId,
        reviewedAt: '2026-10-05T13:00:00.000Z',
        sellerPermissionEvidenceRef: 'seller-consent-record-1',
        methodologyNote: 'Human reviewer selected and adjusted the comparable using documented criteria.',
      },
      comparables: [{
        ...draft.comparables[0],
        source: { ...draft.comparables[0].source, usagePermission: 'internal-review-authorized' },
      }],
    };
    expect(privateCmaReviewSchema.safeParse(reviewed).success).toBe(true);
    expect(privateCmaReviewSchema.safeParse({
      ...reviewed,
      comparables: [{ ...reviewed.comparables[0], source: { ...reviewed.comparables[0].source, usagePermission: 'restricted' } }],
    }).success).toBe(false);
  });

  it('rejects inverted ranges, executable fields, and public-use status', () => {
    expect(privateCmaReviewSchema.safeParse({ ...draft, suggestedRangeUsd: { low: 320000, target: 305000, high: 290000 } }).success).toBe(false);
    expect(privateCmaReviewSchema.safeParse({ ...draft, execute: 'return 1' }).success).toBe(false);
    expect(privateCmaReviewSchema.safeParse({ ...draft, status: 'published' }).success).toBe(false);
  });
});
