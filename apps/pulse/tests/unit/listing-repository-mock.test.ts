import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(async () => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_MODE', 'true');
  const { resetMockCanonicalPropertiesForTests } = await import('@/lib/mocks/canonicalProperties');
  resetMockCanonicalPropertiesForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('listing repository mock mode', () => {
  it('filters private fixtures while presenting demo fixtures as public simulations', async () => {
    const { upsertMockCanonicalProperty } = await import('@/lib/mocks/canonicalProperties');
    const { getPublicListingById, searchListings } = await import('@/lib/data/listingRepository');
    upsertMockCanonicalProperty({
      id: 'private-fixture',
      mls_id: 'PRIVATE-1',
      name: 'Private fixture',
      display_public: false,
      is_demo: false,
    });
    upsertMockCanonicalProperty({
      id: 'demo-fixture',
      mls_id: 'DEMO-1',
      name: 'Demo fixture',
      display_public: true,
      is_demo: true,
    });

    const publicListings = await searchListings({}, { publicOnly: true });
    expect(publicListings.some((listing) => listing.id === 'private-fixture')).toBe(false);
    expect(publicListings.find((listing) => listing.id === 'demo-fixture')).toMatchObject({ is_demo: false });
    await expect(getPublicListingById('private-fixture')).resolves.toBeNull();
    await expect(getPublicListingById('demo-fixture')).resolves.toMatchObject({ is_demo: false });
  });
});
