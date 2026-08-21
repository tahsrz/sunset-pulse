import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/location-guess/listings/route';

const mocks = vi.hoisted(() => ({
  searchHistoricalPublicListings: vi.fn(),
}));

vi.mock('@/lib/data/publicInventory', () => ({
  searchHistoricalPublicListings: mocks.searchHistoricalPublicListings,
}));

describe('location guess listing feed route', () => {
  beforeEach(() => {
    mocks.searchHistoricalPublicListings.mockReset();
  });

  it('returns normalized property-grid listings when eligible geocoded records exist', async () => {
    mocks.searchHistoricalPublicListings.mockResolvedValue([
      {
        id: 'route_geo_1',
        _id: 'route_geo_1',
        name: 'Route Geo Home',
        type: 'Single Family',
        source: 'MLS',
        location: { street: '', city: 'Bowie', state: 'TX', zipcode: '' },
        location_geo: { type: 'Point', coordinates: [-97.848, 33.559] },
        images: ['https://images.example.com/bowie.jpg'],
        amenities: [],
        description: '',
        price_type: 'sale',
        rates: {},
        listing_status: 'Sold',
        is_demo: false,
        is_featured: false,
        display_public: true,
      },
    ]);

    const response = await GET(new NextRequest('http://localhost/api/location-guess/listings?limit=10'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe('property-grid');
    expect(body.data.fallback).toBe(false);
    expect(body.data.listings).toHaveLength(1);
    expect(body.data.listings[0]).toEqual(expect.objectContaining({
      id: 'route_geo_1',
      title: 'Route Geo Home',
      city: 'Bowie',
      actualCoordinates: [-97.848, 33.559],
      source: 'MLS'
    }));
    expect(JSON.stringify(body.data.listings[0])).not.toContain('agent_phone');
  });

  it('falls back to curated cards when the property grid cannot be read', async () => {
    mocks.searchHistoricalPublicListings.mockRejectedValue(new Error('db offline'));

    const response = await GET(new NextRequest('http://localhost/api/location-guess/listings'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.source).toBe('curated-fallback');
    expect(body.data.fallback).toBe(true);
    expect(body.data.listings.length).toBeGreaterThan(0);
  });
});
