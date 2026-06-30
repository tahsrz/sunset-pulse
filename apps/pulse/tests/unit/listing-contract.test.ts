import { describe, expect, it } from 'vitest';
import { hasUsableRemoteListingImage, listingToRow, normalizeListing } from '@/lib/data/listingContract';

describe('canonical listing contract', () => {
  it('maps a flat Postgres row into the shared property shape', () => {
    const listing = normalizeListing({
      id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
      mls_id: 'NTREIS-100',
      name: '100 Sunset Lane',
      type: 'Residential',
      street: '100 Sunset Lane',
      city: 'Fort Worth',
      state: 'TX',
      zip: '76102',
      latitude: 32.7555,
      longitude: -97.3308,
      beds: 3,
      baths: 2,
      sqft: 1800,
      price: 425000,
      price_type: 'sale',
      image_url: 'https://example.test/front.jpg',
      listing_status: 'Active',
      display_public: true,
    });

    expect(listing).toMatchObject({
      id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
      _id: '8e202c99-a88e-4262-bab0-bbc4cd25cd01',
      mls_id: 'NTREIS-100',
      location: {
        street: '100 Sunset Lane',
        city: 'Fort Worth',
        state: 'TX',
        zipcode: '76102',
      },
      location_geo: {
        type: 'Point',
        coordinates: [-97.3308, 32.7555],
      },
      images: ['https://example.test/front.jpg'],
      list_price: 425000,
    });
  });

  it('round-trips an MLS adapter result into the canonical row shape', () => {
    const row = listingToRow({
      _id: 'MLS-200',
      mls_id: 'MLS-200',
      name: '200 Local Road',
      type: 'Residential Lease',
      description: 'Public remarks',
      location: { street: '200 Local Road', city: 'Dallas', state: 'TX', zipcode: '75201' },
      location_geo: { type: 'Point', coordinates: [-96.797, 32.7767] },
      rates: { monthly: 2500 },
      price_type: 'lease',
      images: ['https://example.test/lease.jpg'],
      source: 'MLS',
      listing_status: 'Active',
      last_updated: '2026-06-30T12:00:00.000Z',
      display_public: true,
    });

    expect(row).toMatchObject({
      mls_id: 'MLS-200',
      street: '200 Local Road',
      city: 'Dallas',
      latitude: 32.7767,
      longitude: -96.797,
      price: 2500,
      price_type: 'lease',
      images: ['https://example.test/lease.jpg'],
      display_public: true,
    });
  });

  it('normalizes JSON and SQLite boolean values from the local cache', () => {
    const listing = normalizeListing({
      id: 'local-1',
      name: 'Cached home',
      images: '["https://example.test/cached.jpg"]',
      amenities: '["Pool","Garage"]',
      rates: '{"monthly":2100}',
      metadata: '{"sync":"powersync"}',
      is_demo: 0,
      is_featured: 1,
      display_public: 1,
    });

    expect(listing).toMatchObject({
      images: ['https://example.test/cached.jpg'],
      amenities: ['Pool', 'Garage'],
      rates: { monthly: 2100 },
      metadata: { sync: 'powersync' },
      is_demo: false,
      is_featured: true,
      display_public: true,
    });
  });

  it('keeps listings private unless an ingestion adapter explicitly publishes them', () => {
    expect(normalizeListing({ id: 'private-1', name: 'Private listing' }).display_public).toBe(false);
  });

  it('only qualifies secure remote photos for the homepage MLS feed', () => {
    expect(hasUsableRemoteListingImage({ images: ['https://cdn.example.test/home.jpg'] })).toBe(true);
    expect(hasUsableRemoteListingImage({ images: ['/sample/missing.jpg'] })).toBe(false);
    expect(hasUsableRemoteListingImage({ images: [] })).toBe(false);
  });
});
