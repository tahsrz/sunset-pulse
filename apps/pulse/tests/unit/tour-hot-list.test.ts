import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockSearchListings, mockGetListingById, mockGetStoredTourHotList } = vi.hoisted(() => ({
  mockSearchListings: vi.fn(),
  mockGetListingById: vi.fn(),
  mockGetStoredTourHotList: vi.fn(),
}));

vi.mock('@/lib/data/listingRepository', () => ({
  searchListings: mockSearchListings,
  getListingById: mockGetListingById,
}));

vi.mock('@/lib/data/tourHotListStore', () => ({
  getStoredTourHotList: mockGetStoredTourHotList,
}));

vi.mock('server-only', () => ({}));

import {
  getConfiguredTourHotListTargets,
  getTourHotList,
  isTourHotListQualifiedListing,
} from '@/lib/data/tourHotList';

describe('Tour Studio hot list', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStoredTourHotList.mockResolvedValue(null);
    delete process.env.TOUR_HOT_LIST_ADDRESSES;
    delete process.env.TOUR_HOT_LIST_MLS_IDS;
  });

  it('parses backend-controlled MLS IDs and address lists without comma-splitting addresses', () => {
    const targets = getConfiguredTourHotListTargets({
      TOUR_HOT_LIST_MLS_IDS: 'MLS-1,MLS-2',
      TOUR_HOT_LIST_ADDRESSES: '100 Sunset Lane, Frisco, TX|200 Lake Road, Dallas, TX',
    } as any);

    expect(targets).toEqual([
      { kind: 'mlsId', value: 'MLS-1' },
      { kind: 'mlsId', value: 'MLS-2' },
      { kind: 'address', value: '100 Sunset Lane, Frisco, TX' },
      { kind: 'address', value: '200 Lake Road, Dallas, TX' },
    ]);
  });

  it('falls back to MLS listings with secure remote images when no hot-list targets are configured', async () => {
    mockSearchListings.mockResolvedValue([
      listing('good', { images: ['https://cdn.example.test/good.jpg'] }),
      listing('internal', { source: 'Internal', images: ['https://cdn.example.test/internal.jpg'] }),
      listing('missing-image', { images: [] }),
      listing('sold', { listing_status: 'Sold', images: ['https://cdn.example.test/sold.jpg'] }),
    ]);

    const result = await getTourHotList({ limit: 10 });

    expect(mockSearchListings).toHaveBeenCalledWith({}, { limit: 500, includeLegacy: false });
    expect(result.listings.map((item) => item.id)).toEqual(['good']);
    expect(result.skipped.map((item) => item.reason)).toEqual([
      'not_mls',
      'missing_remote_image',
      'not_active',
    ]);
  });

  it('uses the saved operator hot list before env/config targets', async () => {
    process.env.TOUR_HOT_LIST_MLS_IDS = 'ENV-MLS';
    mockGetStoredTourHotList.mockResolvedValue({
      id: 'default',
      targets: [{ kind: 'mlsId', value: 'SAVED-MLS' }],
      rawMlsIds: 'SAVED-MLS',
      rawAddresses: '',
      limit: 10,
      updatedBy: {},
    });
    mockGetListingById.mockResolvedValue(listing('saved', {
      mls_id: 'SAVED-MLS',
      images: ['https://cdn.example.test/saved.jpg'],
    }));

    const result = await getTourHotList({ limit: 10 });

    expect(mockGetListingById).toHaveBeenCalledWith('SAVED-MLS');
    expect(mockGetListingById).not.toHaveBeenCalledWith('ENV-MLS');
    expect(result.listings.map((item) => item.id)).toEqual(['saved']);
  });

  it('resolves configured MLS IDs in order and rejects listings without MLS images', async () => {
    process.env.TOUR_HOT_LIST_MLS_IDS = 'MLS-1,MLS-2';
    mockGetListingById
      .mockResolvedValueOnce(listing('one', { mls_id: 'MLS-1', images: ['https://cdn.example.test/one.jpg'] }))
      .mockResolvedValueOnce(listing('two', { mls_id: 'MLS-2', images: [] }));

    const result = await getTourHotList({ limit: 10 });

    expect(result.listings.map((item) => item.id)).toEqual(['one']);
    expect(result.skipped).toContainEqual(expect.objectContaining({
      listingId: 'two',
      reason: 'missing_remote_image',
    }));
  });

  it('matches configured addresses against canonical listing addresses', async () => {
    process.env.TOUR_HOT_LIST_ADDRESSES = '100 Sunset Lane, Frisco, TX';
    mockSearchListings.mockResolvedValue([
      listing('match', {
        name: '100 Sunset Lane',
        location: { street: '100 Sunset Ln', city: 'Frisco', state: 'TX', zipcode: '75034' },
        images: ['https://cdn.example.test/match.jpg'],
      }),
    ]);

    const result = await getTourHotList({ limit: 10 });

    expect(mockSearchListings).toHaveBeenCalledWith({ location: 'Frisco' }, { limit: 500, includeLegacy: false });
    expect(result.listings.map((item) => item.id)).toEqual(['match']);
    expect(result.unresolved).toEqual([]);
  });

  it('exposes the qualification guard for homepage callers', () => {
    expect(isTourHotListQualifiedListing(listing('good', { images: ['https://cdn.example.test/good.jpg'] }))).toBe(true);
    expect(isTourHotListQualifiedListing(listing('bad', { images: ['/images/properties/fallback.jpg'] }))).toBe(false);
  });
});

function listing(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    _id: id,
    mls_id: overrides.mls_id || `MLS-${id}`,
    name: overrides.name || `${id} Home`,
    type: 'Residential',
    description: '',
    location: overrides.location || { street: `${id} Street`, city: 'Frisco', state: 'TX', zipcode: '75034' },
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
    source: overrides.source || 'MLS',
    listing_status: overrides.listing_status || 'Active',
    is_demo: false,
    is_featured: false,
    display_public: true,
    metadata: {},
    ...overrides,
  };
}
