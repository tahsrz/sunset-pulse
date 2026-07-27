import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getListingIntakePublishBlockers } from '@/lib/command-center/listingIntakeStore';

describe('listing intake publish gate', () => {
  it('blocks ready status when parser validation is unresolved', () => {
    const blockers = getListingIntakePublishBlockers({
      sourceCommand: 'Listing details',
      approvedFacts: {},
      drafts: { mls: '', social: '', buyer: '' },
      publishStatus: 'ready',
      missingFields: ['price'],
      warnings: ['Address was not found; verify location before using public copy.'],
    });

    expect(blockers).toEqual([
      'Missing required field: price.',
      'Address was not found; verify location before using public copy.',
    ]);
  });

  it('allows a clean intake to move through review', () => {
    expect(getListingIntakePublishBlockers({
      sourceCommand: 'Listing details',
      approvedFacts: {},
      drafts: { mls: '', social: '', buyer: '' },
      publishStatus: 'review',
      missingFields: [],
      warnings: [],
    })).toEqual([]);
  });
});
