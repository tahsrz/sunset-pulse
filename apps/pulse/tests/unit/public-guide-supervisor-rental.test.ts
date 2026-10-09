import { describe, expect, it } from 'vitest';

import { supervisePublicGuideReply } from '@/lib/ai/publicGuideSupervisor';

describe('public guide rental search fallback', () => {
  it('asks for the missing rental qualifiers when no verified matches exist', () => {
    const result = supervisePublicGuideReply({
      draft: 'No results.',
      userMessage: "I'm looking for a three bedroom two bath in Arlington on a one year lease",
      listingSearch: { total: 0, criteria: { city: 'Arlington', price_type: 'lease', beds_min: '3', full_baths_min: '2', lease_term_months: '12' }, properties: [] },
    });

    expect(result.content).toContain('maximum monthly rent');
    expect(result.content).toContain('preferred move-in date');
    expect(result.outcome).toBe('listing_search');
    expect(result.usedListingData).toBe(true);
  });
});
