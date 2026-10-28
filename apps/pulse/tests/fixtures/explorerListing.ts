import type { PublicListing } from '@/lib/data/publicListingContract';

export function explorerListing(overrides: Partial<PublicListing> = {}): PublicListing {
  return {
    id: 'explorer-fixture', _id: 'explorer-fixture', name: '808 W Abram St',
    type: 'Mixed Use', description: '',
    location: { street: '808 W Abram St', city: 'Arlington', state: 'TX', zipcode: '76013' },
    location_geo: { type: 'Point', coordinates: [-97.116, 32.736] },
    amenities: [], price_type: 'sale', list_price: 400000, rates: {}, images: [],
    source: 'Internal', listing_status: 'Active', is_demo: false, is_featured: false, display_public: true,
    ...overrides,
  };
}

export const explorerEnvelope = (data: unknown, metadata = {}) => ({ success: true, data, metadata });
