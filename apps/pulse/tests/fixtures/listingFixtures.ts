import type { Listing } from '@/lib/data/listingContract';

export type InternalListingFixture = Listing & Readonly<{
  seller: Readonly<{ name: string; email: string }>;
  lockboxCode: string;
  privateRemarks: string;
  providerPayload: Readonly<Record<string, unknown>>;
}>;

export type ListingAssignmentFixture = Readonly<{
  id: string;
  tenantId: string;
  listingId: string;
  purpose: 'inventory' | 'featured' | 'hot_list';
  publishedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revision: number;
}>;

export const publicListingA = listing('50000000-0000-4000-8000-000000000001', 'MLS-ALPHA-001', '100 Alpha Lane');
export const publicListingB = listing('50000000-0000-4000-8000-000000000002', 'MLS-BRAVO-002', '200 Bravo Lane');
export const sharedListingAB = listing('50000000-0000-4000-8000-000000000003', 'MLS-SHARED-003', '300 Shared Way');
export const privateListingA = listing('50000000-0000-4000-8000-000000000004', 'MLS-PRIVATE-004', '400 Private Court', {
  display_public: false,
});
export const unassignedPublicListing = listing('50000000-0000-4000-8000-000000000005', 'MLS-UNASSIGNED-005', '500 Open Road');
export const suppressedListing = listing('50000000-0000-4000-8000-000000000006', 'MLS-SUPPRESSED-006', '600 Suppressed Trail', {
  listing_status: 'Suppressed',
});
export const coordinateRestrictedListing = listing(
  '50000000-0000-4000-8000-000000000007',
  'MLS-COORDINATE-007',
  '700 Hidden Point',
  { metadata: { coordinatePolicy: 'fuzz' } }
);

export const listingAssignments = Object.freeze([
  assignment('60000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', publicListingA.id, 'inventory'),
  assignment('60000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', publicListingB.id, 'inventory'),
  assignment('60000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', sharedListingAB.id, 'inventory'),
  assignment('60000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000002', sharedListingAB.id, 'inventory'),
  assignment('60000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000001', privateListingA.id, 'inventory'),
  assignment('60000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000001', unassignedPublicListing.id, 'featured', {
    expiresAt: '2026-08-19T00:00:00.000Z',
  }),
  assignment('60000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000001', coordinateRestrictedListing.id, 'hot_list', {
    revokedAt: '2026-08-20T00:00:00.000Z',
  }),
]);

export const listingSecurityFixtures = Object.freeze({
  publicListingA,
  publicListingB,
  sharedListingAB,
  privateListingA,
  unassignedPublicListing,
  suppressedListing,
  coordinateRestrictedListing,
  assignments: listingAssignments,
});

function listing(
  id: string,
  mlsId: string,
  name: string,
  overrides: Partial<Listing> = {}
): InternalListingFixture {
  return Object.freeze({
    id,
    _id: id,
    mls_id: mlsId,
    owner: `owner-${id}`,
    name,
    type: 'Residential',
    description: 'Fixture listing for tenant-isolation tests.',
    location: {
      street: name,
      city: 'Fort Worth',
      state: 'TX',
      zipcode: '76102',
    },
    location_geo: {
      type: 'Point' as const,
      coordinates: [-97.3308, 32.7555] as [number, number],
    },
    beds: 3,
    baths: 2,
    square_feet: 1_800,
    amenities: ['garage'],
    price: 425_000,
    list_price: 425_000,
    price_type: 'sale',
    rates: {},
    images: ['https://example.test/listing.jpg'],
    image_url: 'https://example.test/listing.jpg',
    source: 'MLS',
    listing_status: 'Active',
    last_updated: '2026-08-20T00:00:00.000Z',
    is_demo: false,
    is_featured: false,
    display_public: true,
    metadata: { daysOnMarket: 5, privateDocumentUrl: 'https://private.example.test/document' },
    seller: { name: 'Private Seller', email: 'seller@example.test' },
    lockboxCode: 'DO-NOT-EXPOSE',
    privateRemarks: 'Internal remarks must never enter public output.',
    providerPayload: { credential: 'fixture-secret', rawStatus: 'internal' },
    ...overrides,
  });
}

function assignment(
  id: string,
  tenantId: string,
  listingId: string,
  purpose: ListingAssignmentFixture['purpose'],
  overrides: Partial<ListingAssignmentFixture> = {}
): ListingAssignmentFixture {
  return Object.freeze({
    id,
    tenantId,
    listingId,
    purpose,
    publishedAt: '2026-08-01T00:00:00.000Z',
    expiresAt: null,
    revokedAt: null,
    revision: 1,
    ...overrides,
  });
}
