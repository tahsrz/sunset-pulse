import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockGetListingById,
  mockSearchListings,
  mockRequireOperatorRouteAccess,
  mockIsAuthResponse,
} = vi.hoisted(() => ({
  mockGetListingById: vi.fn(),
  mockSearchListings: vi.fn(),
  mockRequireOperatorRouteAccess: vi.fn(),
  mockIsAuthResponse: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/data/listingRepository', () => ({
  getListingById: mockGetListingById,
  searchListings: mockSearchListings,
}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mockRequireOperatorRouteAccess,
  isAuthResponse: mockIsAuthResponse,
}));

import { POST } from '@/app/api/admin/properties/hot-list/preview/route';

describe('admin hot-list preview route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    mockIsAuthResponse.mockImplementation((value) => value instanceof Response);
  });

  it('rejects empty previews before querying listings', async () => {
    const response = await POST(jsonRequest({ rawMlsIds: '', rawAddresses: '' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('Add at least one MLS ID or address to preview.');
    expect(mockGetListingById).not.toHaveBeenCalled();
    expect(mockSearchListings).not.toHaveBeenCalled();
  });

  it('resolves operator-supplied MLS IDs through the hot-list rules', async () => {
    mockGetListingById.mockResolvedValue(listing('one', {
      mls_id: 'NTREIS-1',
      images: ['https://cdn.example.test/one.jpg'],
    }));

    const response = await POST(jsonRequest({ rawMlsIds: 'NTREIS-1', limit: 10 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockGetListingById).toHaveBeenCalledWith('NTREIS-1');
    expect(body.data.result.listings).toHaveLength(1);
    expect(body.data.result.listings[0]).toMatchObject({ id: 'one', source: 'MLS' });
  });
});

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/properties/hot-list/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function listing(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    _id: id,
    mls_id: overrides.mls_id || `MLS-${id}`,
    name: `${id} Home`,
    type: 'Residential',
    description: '',
    location: { street: `${id} Street`, city: 'Frisco', state: 'TX', zipcode: '75034' },
    beds: 4,
    baths: 3,
    square_feet: 2400,
    amenities: [],
    price: 650000,
    list_price: 650000,
    price_type: 'sale',
    rates: {},
    images: overrides.images ?? ['https://cdn.example.test/default.jpg'],
    image_url: overrides.images?.[0] || null,
    source: 'MLS',
    listing_status: 'Active',
    is_demo: false,
    is_featured: false,
    display_public: true,
    metadata: {},
    ...overrides,
  };
}
