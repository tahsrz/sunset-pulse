import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDiscoverListings } = vi.hoisted(() => ({ mockDiscoverListings: vi.fn() }));

vi.mock('@/lib/data/listingDiscovery', () => ({
  discoverListings: mockDiscoverListings,
}));

import { formatPropertySearchResult, searchPropertiesForJamie } from '@/lib/ai/jamieTools';

describe('Jamie tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('formats property search results for the legacy Jamie display', () => {
    const summary = formatPropertySearchResult({
      total: 1,
      criteria: { location: 'Frisco' },
      properties: [
        {
          id: 'prop-1',
          name: 'Frisco Test Home',
          city: 'Frisco',
          state: 'TX',
          price: 750000,
          beds: 3,
          baths: 2,
          source: 'MLS',
          image: null,
          href: '/properties/prop-1',
        },
      ],
    });

    expect(summary).toContain('I found 1 matching property');
    expect(summary).toContain('Frisco Test Home');
    expect(summary).toContain('$750,000');
  });

  it('handles empty search results', () => {
    const summary = formatPropertySearchResult({
      total: 0,
      criteria: { location: 'Frisco' },
      properties: [],
    });

    expect(summary).toContain('did not find matching active listings');
  });

  it('uses the shared image-qualified discovery engine', async () => {
    mockDiscoverListings.mockResolvedValue({
      listings: [{
        id: 'prop-1',
        _id: 'prop-1',
        mls_id: 'MLS-1',
        name: 'Frisco Test Home',
        location: { city: 'Frisco', state: 'TX' },
        list_price: 750000,
        beds: 4,
        baths: 3,
        images: ['https://cdn.example.test/home.jpg'],
        source: 'MLS',
      }],
      pagination: { total: 12 },
    });

    const result = await searchPropertiesForJamie({
      city: 'Frisco',
      property_types: ['Single Family'],
      price_min: 500000,
      price_max: 900000,
      beds_min: 4,
    });

    expect(mockDiscoverListings).toHaveBeenCalledWith(expect.objectContaining({
      location: 'Frisco',
      propertyTypes: ['Single Family'],
      priceMin: 500000,
      priceMax: 900000,
      bedsMin: 4,
      pageSize: 6,
    }));
    expect(result.total).toBe(12);
    expect(result.properties[0].image).toBe('https://cdn.example.test/home.jpg');
  });
});
