import { describe, expect, it } from 'vitest';
import { buildGoogleMapsRouteUrl, buildTourStudioStops } from '@/lib/tourStudio';

describe('Tour Studio itinerary helpers', () => {
  it('builds buyer-facing stops from MLS listings in order', () => {
    const stops = buildTourStudioStops([
      listing('one', { name: 'One Home', list_price: 725000 }),
      listing('two', { name: 'Two Home', beds: 5, square_feet: 3100 }),
    ] as any);

    expect(stops).toMatchObject([
      {
        stopNumber: 1,
        listingId: 'one',
        propertyHref: '/properties/one',
        title: 'One Home',
        priceLabel: '$725,000',
        specs: ['4 bd', '3 ba', '2,400 sqft'],
      },
      {
        stopNumber: 2,
        listingId: 'two',
        title: 'Two Home',
        specs: ['5 bd', '3 ba', '3,100 sqft'],
      },
    ]);
  });

  it('creates Google Maps links for single-stop and multi-stop tours', () => {
    const stops = buildTourStudioStops([
      listing('one', { location: { street: '100 Sunset Ln', city: 'Frisco', state: 'TX', zipcode: '75034' } }),
      listing('two', { location: { street: '200 Lake Rd', city: 'Dallas', state: 'TX', zipcode: '75201' } }),
    ] as any);

    expect(buildGoogleMapsRouteUrl(stops.slice(0, 1))).toContain('google.com/maps/search');
    expect(buildGoogleMapsRouteUrl(stops)).toContain('google.com/maps/dir');
    expect(buildGoogleMapsRouteUrl(stops)).toContain('destination=200%20Lake%20Rd');
    expect(buildGoogleMapsRouteUrl([])).toBeNull();
  });
});

function listing(id: string, overrides: Record<string, any> = {}) {
  return {
    id,
    _id: id,
    mls_id: `MLS-${id}`,
    name: `${id} Home`,
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
    images: [`https://cdn.example.test/${id}.jpg`],
    image_url: `https://cdn.example.test/${id}.jpg`,
    source: 'MLS',
    listing_status: 'Active',
    is_demo: false,
    is_featured: false,
    display_public: true,
    metadata: {},
    ...overrides,
  };
}
