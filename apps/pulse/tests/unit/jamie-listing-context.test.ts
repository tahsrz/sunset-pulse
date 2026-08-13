import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { resolveJamieListingContext } from '@/lib/ai/jamieListingContext';

const listing = {
  id: 'listing-104',
  _id: 'listing-104',
  mls_id: 'MLS-104',
  owner: 'private-owner-id',
  name: '104 Main Street',
  type: 'Residential',
  description: 'A'.repeat(1_500),
  location: { street: '104 Main Street', city: 'Frisco', state: 'TX', zipcode: '75034' },
  beds: 4,
  baths: 3,
  square_feet: 2_500,
  amenities: ['Pool'],
  price: 650_000,
  list_price: 650_000,
  price_type: 'sale' as const,
  rates: {},
  images: ['https://example.com/private-photo.jpg'],
  image_url: 'https://example.com/private-photo.jpg',
  source: 'MLS' as const,
  listing_status: 'Active',
  last_updated: new Date().toISOString(),
  is_demo: false,
  is_featured: false,
  display_public: true,
  metadata: { privateNote: 'do not expose' },
};

describe('Jamie listing context', () => {
  it('hydrates a compact canonical listing context', async () => {
    const context = await resolveJamieListingContext(' listing-104 ', {
      discoverById: vi.fn().mockResolvedValue(listing),
    });

    expect(context).toMatchObject({
      id: 'listing-104',
      mls_id: 'MLS-104',
      name: '104 Main Street',
      location: { city: 'Frisco' },
      list_price: 650_000,
    });
    expect(context?.description).toHaveLength(1_200);
    expect(context).not.toHaveProperty('owner');
    expect(context).not.toHaveProperty('metadata');
    expect(context).not.toHaveProperty('images');
  });

  it('returns no context when the canonical listing is unavailable', async () => {
    const context = await resolveJamieListingContext('missing', {
      discoverById: vi.fn().mockResolvedValue(null),
    });

    expect(context).toBeUndefined();
  });
});
