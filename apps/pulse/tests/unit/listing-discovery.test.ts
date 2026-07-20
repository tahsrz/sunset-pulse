import { describe, expect, it, vi } from 'vitest';
import { normalizeListing, type Listing } from '@/lib/data/listingContract';
import {
  discoverListingById,
  discoverListings,
  listingDiscoveryInputSchema,
  parseListingDiscoverySearchParams,
} from '@/lib/data/listingDiscovery';

const NOW = new Date('2026-07-04T12:00:00.000Z');

describe('MLS listing discovery engine', () => {
  it('applies the public MLS eligibility contract to direct listing context', async () => {
    const eligible = listing('direct');
    const getById = vi.fn()
      .mockResolvedValueOnce(eligible)
      .mockResolvedValueOnce(listing('private-direct', { display_public: false }));

    await expect(discoverListingById('direct', { getById, now: () => NOW }))
      .resolves.toMatchObject({ id: 'direct', image_url: 'https://cdn.example.test/direct.jpg' });
    await expect(discoverListingById('private-direct', { getById, now: () => NOW }))
      .resolves.toBeNull();
  });

  it('only returns fresh, public, active MLS listings with secure remote images', async () => {
    const eligible = listing('eligible', {
      images: ['/local-placeholder.jpg', 'https://cdn.example.test/eligible.jpg'],
    });
    const search = vi.fn().mockResolvedValue([
      eligible,
      listing('internal', { source: 'Internal' }),
      listing('inactive', { listing_status: 'Closed' }),
      listing('stale', { last_updated: '2026-05-01T12:00:00.000Z' }),
      listing('private', { display_public: false }),
      listing('demo', { is_demo: true }),
      listing('local-image', { images: ['/images/properties/fallback.jpg'] }),
      listing('missing-date', { last_updated: undefined }),
    ]);

    const result = await discoverListings({}, { search, now: () => NOW });

    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({
      id: 'eligible',
      images: ['https://cdn.example.test/eligible.jpg'],
      image_url: 'https://cdn.example.test/eligible.jpg',
    });
    expect(search).toHaveBeenCalledWith(expect.objectContaining({
      source: 'MLS',
      status: 'Active',
      updatedSince: '2026-06-04T12:00:00.000Z',
      includeDemo: false,
    }), { limit: 500, includeLegacy: false });
  });

  it('applies listing attributes, map bounds, and radius filters together', async () => {
    const search = vi.fn().mockResolvedValue([
      listing('match', {
        type: 'Single Family',
        name: 'Frisco Modern Home',
        location: { street: '1 Main Street', city: 'Frisco', state: 'TX', zipcode: '75034' },
        location_geo: { type: 'Point', coordinates: [-96.82, 33.15] },
        list_price: 825000,
        beds: 4,
        baths: 3,
        square_feet: 2600,
      }),
      listing('outside-radius', {
        type: 'Single Family',
        name: 'Frisco Far Home',
        location: { street: '2 Main Street', city: 'Frisco', state: 'TX', zipcode: '75034' },
        location_geo: { type: 'Point', coordinates: [-96.5, 33.15] },
        list_price: 800000,
        beds: 4,
        baths: 3,
        square_feet: 2600,
      }),
      listing('wrong-type', { type: 'Condo' }),
    ]);

    const result = await discoverListings({
      location: 'Frisco',
      propertyTypes: ['Single Family'],
      priceMin: 700000,
      priceMax: 900000,
      bedsMin: 4,
      bedsMax: 5,
      bathsMin: 3,
      sqftMin: 2400,
      bounds: { west: -97, south: 33, east: -96, north: 34 },
      center: { longitude: -96.82, latitude: 33.15 },
      radiusMiles: 10,
      sort: 'distance',
    }, { search, now: () => NOW });

    expect(result.listings).toHaveLength(1);
    expect(result.listings[0]).toMatchObject({ id: 'match', distance_miles: 0 });
  });

  it('sorts and paginates deterministically', async () => {
    const search = vi.fn().mockResolvedValue([
      listing('five', { list_price: 500000 }),
      listing('one', { list_price: 100000 }),
      listing('four', { list_price: 400000 }),
      listing('two', { list_price: 200000 }),
      listing('three', { list_price: 300000 }),
    ]);

    const result = await discoverListings({ page: 2, pageSize: 2, sort: 'price_asc' }, {
      search,
      now: () => NOW,
    });

    expect(result.listings.map((item) => item.id)).toEqual(['three', 'four']);
    expect(result.pagination).toMatchObject({
      page: 2,
      pageSize: 2,
      total: 5,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
      candidateLimitReached: false,
    });
  });

  it('rejects contradictory and incomplete filters', () => {
    expect(() => listingDiscoveryInputSchema.parse({ priceMin: 900000, priceMax: 500000 })).toThrow();
    expect(() => listingDiscoveryInputSchema.parse({ center: { longitude: -96.8, latitude: 33.1 } })).toThrow();
    expect(() => listingDiscoveryInputSchema.parse({ sort: 'distance' })).toThrow();
    expect(() => listingDiscoveryInputSchema.parse({ bounds: { west: -97, south: 34, east: -96, north: 33 } })).toThrow();
  });

  it('parses public query aliases into the shared discovery contract', () => {
    const input = parseListingDiscoverySearchParams(new URLSearchParams(
      'city=Frisco&propertyType=Single%20Family,Condo&minPrice=400000&maxPrice=900000&beds=3&bounds=-97,33,-96,34&center=-96.82,33.15&radius=15&limit=12'
    ));
    const parsed = listingDiscoveryInputSchema.parse(input);

    expect(parsed).toMatchObject({
      location: 'Frisco',
      propertyTypes: ['Single Family', 'Condo'],
      priceMin: 400000,
      priceMax: 900000,
      bedsMin: 3,
      bounds: { west: -97, south: 33, east: -96, north: 34 },
      center: { longitude: -96.82, latitude: 33.15 },
      radiusMiles: 15,
      pageSize: 12,
    });
  });
});

function listing(id: string, overrides: Record<string, unknown> = {}): Listing {
  return normalizeListing({
    id,
    mls_id: `MLS-${id}`,
    name: `${id} home`,
    type: 'Single Family',
    location: { street: `${id} Main Street`, city: 'Frisco', state: 'TX', zipcode: '75034' },
    location_geo: { type: 'Point', coordinates: [-96.82, 33.15] },
    beds: 3,
    baths: 2,
    square_feet: 2000,
    list_price: 500000,
    price_type: 'sale',
    images: [`https://cdn.example.test/${id}.jpg`],
    source: 'MLS',
    listing_status: 'Active',
    last_updated: '2026-07-03T12:00:00.000Z',
    is_demo: false,
    display_public: true,
    ...overrides,
  });
}
