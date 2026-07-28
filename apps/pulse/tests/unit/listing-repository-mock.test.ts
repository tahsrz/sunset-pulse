import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('listing repository mock mode', () => {
  it('uses local fixtures for search and detail reads', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
    const { getListingById, searchListings } = await import('@/lib/data/listingRepository');

    const listings = await searchListings({ city: 'Fort Worth', beds: 3 });
    const detail = await getListingById('MOCK-FTW-418');

    expect(listings).toHaveLength(1);
    expect(listings[0]?.mls_id).toBe('MOCK-FTW-418');
    expect(detail?.name).toBe('418 Cedar Ridge Drive');
  });
});
