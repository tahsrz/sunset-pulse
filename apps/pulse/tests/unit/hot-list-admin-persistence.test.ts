import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockGetListingById,
  mockSearchListings,
  mockRequireOperatorRouteAccess,
  mockIsAuthResponse,
  mockSaveStoredTourHotList,
  mockGetStoredTourHotList,
  mockOperatorAuditUser,
} = vi.hoisted(() => ({
  mockGetListingById: vi.fn(),
  mockSearchListings: vi.fn(),
  mockRequireOperatorRouteAccess: vi.fn(),
  mockIsAuthResponse: vi.fn(),
  mockSaveStoredTourHotList: vi.fn(),
  mockGetStoredTourHotList: vi.fn(),
  mockOperatorAuditUser: vi.fn(() => ({ userId: 'operator', role: 'local' })),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/data/listingRepository', () => ({
  getListingById: mockGetListingById,
  searchListings: mockSearchListings,
}));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mockRequireOperatorRouteAccess,
  isAuthResponse: mockIsAuthResponse,
  operatorAuditUser: mockOperatorAuditUser,
}));
vi.mock('@/lib/data/tourHotListStore', () => ({
  saveStoredTourHotList: mockSaveStoredTourHotList,
  getStoredTourHotList: mockGetStoredTourHotList,
}));

import { GET, PUT } from '@/app/api/admin/properties/hot-list/route';

describe('admin hot-list persistence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local', reason: 'local operator' });
    mockIsAuthResponse.mockImplementation((value) => value instanceof Response);
  });

  it('returns the saved hot list and resolved preview', async () => {
    mockGetStoredTourHotList.mockResolvedValue({
      id: 'default',
      targets: [{ kind: 'mlsId', value: 'NTREIS-1' }],
      rawMlsIds: 'NTREIS-1',
      rawAddresses: '',
      limit: 10,
      updatedBy: {},
    });
    mockGetListingById.mockResolvedValue(listing('one', {
      mls_id: 'NTREIS-1',
      images: ['https://cdn.example.test/one.jpg'],
    }));

    const response = await GET(new NextRequest('http://localhost/api/admin/properties/hot-list'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.saved.rawMlsIds).toBe('NTREIS-1');
    expect(body.data.result.listings[0].id).toBe('one');
  });

  it('saves only when the submitted targets resolve to at least one image-qualified MLS listing', async () => {
    const saved = {
      id: 'default',
      targets: [{ kind: 'mlsId', value: 'NTREIS-1' }],
      rawMlsIds: 'NTREIS-1',
      rawAddresses: '',
      limit: 10,
      updatedBy: {},
    };
    mockGetListingById.mockResolvedValue(listing('one', {
      mls_id: 'NTREIS-1',
      images: ['https://cdn.example.test/one.jpg'],
    }));
    mockSaveStoredTourHotList.mockResolvedValue(saved);

    const response = await PUT(jsonRequest({ rawMlsIds: 'NTREIS-1', rawAddresses: '', limit: 10 }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockSaveStoredTourHotList).toHaveBeenCalledWith(expect.objectContaining({
      rawMlsIds: 'NTREIS-1',
      targets: [{ kind: 'mlsId', value: 'NTREIS-1' }],
    }));
    expect(body.data.saved.rawMlsIds).toBe('NTREIS-1');
  });

  it('rejects saving when no submitted target qualifies for the homepage', async () => {
    mockGetListingById.mockResolvedValue(listing('bad', {
      mls_id: 'NTREIS-BAD',
      images: [],
    }));

    const response = await PUT(jsonRequest({ rawMlsIds: 'NTREIS-BAD', limit: 10 }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.message).toBe('The saved hot list must resolve at least one active MLS listing with a secure image.');
    expect(mockSaveStoredTourHotList).not.toHaveBeenCalled();
  });
});

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/properties/hot-list', {
    method: 'PUT',
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
