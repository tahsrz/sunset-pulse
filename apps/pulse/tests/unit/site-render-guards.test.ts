import { describe, expect, it } from 'vitest';
import {
  safeAgentMarkets,
  safeListingAmenities,
  safeListingImages,
  safeSiteFeaturedListings,
  safeSiteSections,
} from '@/lib/sites/siteRenderGuards';

describe('site render guards', () => {
  it('turns malformed tenant site collections into arrays before render', () => {
    const site: any = {
      agentProfile: { markets: 'Fort Worth' },
      featuredListings: { id: 'not-an-array' },
      sections: null,
    };

    expect(safeAgentMarkets(site)).toEqual([]);
    expect(safeSiteFeaturedListings(site)).toEqual([]);
    expect(safeSiteSections(site)).toEqual([]);
  });

  it('normalizes listing image and amenity collections with image_url fallback', () => {
    expect(safeListingImages({ images: 'bad', image_url: 'https://example.test/front.jpg' } as any)).toEqual([
      'https://example.test/front.jpg',
    ]);
    expect(safeListingImages({ images: [' https://example.test/one.jpg ', ''], image_url: null } as any)).toEqual([
      'https://example.test/one.jpg',
    ]);
    expect(safeListingAmenities({ amenities: [' Pool ', '', 'Garage'] } as any)).toEqual(['Pool', 'Garage']);
    expect(safeListingAmenities({ amenities: 'Pool' } as any)).toEqual([]);
  });
});
