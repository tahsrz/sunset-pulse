import { describe, expect, it, vi } from 'vitest';
import { normalizeListing } from '@/lib/data/listingContract';

const searchListings = vi.hoisted(() => vi.fn());
vi.mock('@/lib/data/listingRepository', () => ({ searchListings }));

import { searchHistoricalPublicListings } from '@/lib/data/publicInventory';

describe('historical public inventory', () => {
  it('queries only public historical statuses and projects the results', async () => {
    searchListings
      .mockResolvedValueOnce([listing('sold', 'Sold')])
      .mockResolvedValueOnce([listing('closed', 'Closed')])
      .mockResolvedValueOnce([listing('sold', 'Sold'), listing('s', 'S')]);

    const result = await searchHistoricalPublicListings(10);

    expect(searchListings).toHaveBeenCalledTimes(3);
    for (const call of searchListings.mock.calls) {
      expect(call[0]).toMatchObject({ includeDemo: false });
      expect(call[1]).toEqual({ limit: 10, publicOnly: true });
    }
    expect(result.map((item) => item.id)).toEqual(['sold', 'closed', 's']);
    expect(result[0]).not.toHaveProperty('metadata');
    expect(result[0]).not.toHaveProperty('owner');
  });
});

function listing(id: string, status: string) {
  return normalizeListing({
    id,
    name: `${id} listing`,
    city: 'Sunset',
    state: 'TX',
    listing_status: status,
    display_public: true,
    is_demo: false,
    metadata: { internal: true },
    owner: 'private-owner',
  });
}
