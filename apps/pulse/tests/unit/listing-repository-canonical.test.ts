import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listingToRow } from '@/lib/data/listingContract';

const { mockFrom, mockConnectDB } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockConnectDB: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mockFrom } }));
vi.mock('@/lib/core/database', () => ({ default: mockConnectDB }));

import { getPublicListingById, searchListings } from '@/lib/data/listingRepository';

const row = {
  ...listingToRow({
    id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
    mls_id: 'NTREIS-100',
    name: '100 Sunset Lane',
    price: 425000,
    price_type: 'sale',
    listing_status: 'Active',
    images: ['https://example.test/front.jpg'],
    display_public: true,
    is_demo: false,
  }),
  id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
  deleted_at: null,
  updated_at: '2026-10-16T12:00:00.000Z',
};

// Model PostgREST's missing-column response using the canonical write model.
// Legacy MongoDB aliases are deliberately absent from this schema.
function canonicalQuery() {
  let columns: string[] = [];
  const result = (single = false) => {
    const missing = columns.find((column) => !Object.hasOwn(row, column));
    return missing
      ? { data: null, error: { code: '42703', message: `column properties.${missing} does not exist` } }
      : { data: single ? row : [row], error: null };
  };
  const query = {
    select: vi.fn((projection: string) => {
      columns = projection.split(',').map((column) => column.trim());
      return query;
    }),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(async () => result(true)),
    then: (resolve: (response: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return query;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'false');
  mockConnectDB.mockRejectedValue(new Error('Unexpected legacy database fallback'));
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('canonical listing reads', () => {
  it('returns search results using the canonical schema and public filters', async () => {
    const query = canonicalQuery();
    mockFrom.mockReturnValue(query);

    const listings = await searchListings({}, { publicOnly: true, includeLegacy: false });

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      id: row.id,
      price: 425000,
      list_price: 425000,
      listing_status: 'Active',
      images: row.images,
    });
    expect(query.eq).toHaveBeenCalledWith('display_public', true);
    expect(query.eq).toHaveBeenCalledWith('is_demo', false);
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(mockConnectDB).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it.each([row.id, row.mls_id])('reads public detail for %s without a legacy fallback', async (id) => {
    const query = canonicalQuery();
    mockFrom.mockReturnValue(query);

    const listing = await getPublicListingById(id);

    expect(listing).toMatchObject({ id: row.id, mls_id: row.mls_id, list_price: 425000 });
    expect(query.eq).toHaveBeenCalledWith(id === row.id ? 'id' : 'mls_id', id);
    expect(query.eq).toHaveBeenCalledWith('display_public', true);
    expect(query.eq).toHaveBeenCalledWith('is_demo', false);
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(mockConnectDB).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });
});
