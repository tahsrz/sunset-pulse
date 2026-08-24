import { describe, expect, it } from 'vitest';
import { listingSecurityFixtures } from '@/tests/fixtures/listingFixtures';
import {
  PUBLIC_GUIDE_MLS_DISCLAIMER,
  supervisePublicGuideReply,
} from '@/lib/ai/publicGuideSupervisor';

describe('commercial inventory truth gate', () => {
  it('renders only validated fixture inventory with provenance', () => {
    const verified = listingSecurityFixtures.publicListingA;
    const unrelated = listingSecurityFixtures.publicListingB;
    const result = supervisePublicGuideReply({
      draft: `I also found ${unrelated.name} for $12.`,
      userMessage: 'Find active homes in Fort Worth under $500,000.',
      listingSearch: {
        total: 1,
        criteria: { location: 'Fort Worth', maxPrice: '500000', priceType: 'sale' },
        properties: [{
          id: verified.id,
          name: verified.name,
          city: verified.location.city,
          state: verified.location.state,
          price: verified.list_price,
          beds: verified.beds,
          baths: verified.baths,
          source: verified.source,
          image: verified.image_url,
          href: `/properties/${verified.id}`,
        }],
      },
    });

    expect(result.usedListingData).toBe(true);
    expect(result.listings.map((listing) => listing.id)).toEqual([verified.id]);
    expect(result.content).toContain(PUBLIC_GUIDE_MLS_DISCLAIMER);
    expect(result.content).not.toContain(unrelated.name);
    expect(result.content).not.toContain('$12');
    expect(result.sources).toEqual([expect.objectContaining({
      label: expect.stringContaining('MLS'),
      detail: expect.stringContaining('Validated'),
    })]);
    expect(result.listings[0]).not.toHaveProperty('owner');
    expect(result.listings[0]).not.toHaveProperty('metadata');
    expect(result.listings[0]).not.toHaveProperty('privateRemarks');
  });

  it('returns no listing cards when verified retrieval has no match', () => {
    const result = supervisePublicGuideReply({
      draft: `Try ${listingSecurityFixtures.unassignedPublicListing.name}.`,
      userMessage: 'Find a commercial lease in Arlington.',
      listingSearch: {
        total: 0,
        criteria: { location: 'Arlington', priceType: 'lease' },
        properties: [],
      },
    });

    expect(result.listings).toEqual([]);
    expect(result.content).toContain('did not find a verified match');
    expect(result.content).not.toContain(listingSecurityFixtures.unassignedPublicListing.name);
    expect(result.sources[0].detail).toContain('no matches returned');
  });

  it('rejects model-authored listing facts without verified retrieval', () => {
    const result = supervisePublicGuideReply({
      draft: `${listingSecurityFixtures.privateListingA.name} has 3 bedrooms for $425,000.`,
      userMessage: 'What listings do you have?',
    });

    expect(result.listings).toEqual([]);
    expect(result.usedListingData).toBe(false);
    expect(result.outcome).toBe('safe_fallback');
    expect(result.content).not.toContain(listingSecurityFixtures.privateListingA.name);
    expect(result.content).not.toContain('$425,000');
  });
});
