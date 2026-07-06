import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { mockSearchListings, mockGetListingById } = vi.hoisted(() => ({
  mockSearchListings: vi.fn(),
  mockGetListingById: vi.fn(),
}));

vi.mock('@/lib/data/listingRepository', () => ({
  searchListings: mockSearchListings,
  getListingById: mockGetListingById,
}));

import { PulseCache } from '@/utils/security/PulseCache';
import { GET as advancedSearchGET } from '@/app/api/properties/search/advanced/route';
import { GET as discoveryGET } from '@/app/api/properties/discover/route';
import { GET as propertyDetailGET } from '@/app/api/properties/[id]/route';
import { GET as keplerGET } from '@/app/api/kepler/listings/route';

const listing = {
  id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
  _id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
  mls_id: 'NTREIS-100',
  name: '100 Sunset Lane',
  type: 'Residential',
  description: '',
  location: { street: '100 Sunset Lane', city: 'Fort Worth', state: 'TX', zipcode: '76102' },
  location_geo: { type: 'Point', coordinates: [-97.3308, 32.7555] },
  beds: 3,
  baths: 2,
  square_feet: 1800,
  amenities: [],
  price: 425000,
  list_price: 425000,
  price_type: 'sale',
  rates: {},
  images: ['https://example.test/front.jpg'],
  source: 'MLS',
  listing_status: 'Active',
  last_updated: new Date().toISOString(),
  is_demo: false,
  is_featured: false,
  display_public: true,
  metadata: { daysOnMarket: 5 },
};

beforeEach(() => {
  vi.clearAllMocks();
  PulseCache.purge();
  mockSearchListings.mockResolvedValue([listing]);
  mockGetListingById.mockResolvedValue(listing);
});

describe('canonical listing read surfaces', () => {
  it('uses the repository for advanced property search', async () => {
    const response = await advancedSearchGET(new NextRequest(
      'http://localhost:3000/api/properties/search/advanced?location=Fort%20Worth&beds=3'
    ));
    const body = await response.json();

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      location: 'Fort Worth',
      beds: '3',
    }), { limit: 500 });
    expect(body.data[0]).toMatchObject({ id: listing.id, mls_id: 'NTREIS-100' });
  });

  it('uses the same stable Sunset ID for property detail', async () => {
    const response = await propertyDetailGET(
      new NextRequest(`http://localhost:3000/api/properties/${listing.id}`),
      { params: Promise.resolve({ id: listing.id }) }
    );
    const body = await response.json();

    expect(mockGetListingById).toHaveBeenCalledWith(listing.id);
    expect(body.data).toMatchObject({ id: listing.id, _id: listing.id, images: listing.images });
  });

  it('exposes image-qualified MLS discovery with pagination metadata', async () => {
    const response = await discoveryGET(new Request(
      'http://localhost:3000/api/properties/discover?city=Fort%20Worth&pageSize=10'
    ));
    const body = await response.json();

    expect(mockSearchListings).toHaveBeenCalledWith(expect.objectContaining({
      location: 'Fort Worth',
      source: 'MLS',
      status: 'Active',
    }), { limit: 500, includeLegacy: false });
    expect(body.data).toHaveLength(1);
    expect(body.pagination).toMatchObject({ page: 1, pageSize: 10, total: 1 });
    expect(response.headers.get('X-Cache')).toBe('MISS');
  });

  it('builds the spatial dataset from the same repository listing', async () => {
    const response = await keplerGET(new Request('http://localhost:3000/api/kepler/listings?limit=20'));
    const body = await response.json();

    expect(mockSearchListings).toHaveBeenCalledWith({}, { limit: 20 });
    expect(body.dataset.rows[0]).toMatchObject({
      id: listing.id,
      latitude: 32.7555,
      longitude: -97.3308,
      price: 425000,
      city: 'Fort Worth',
    });
  });
});
