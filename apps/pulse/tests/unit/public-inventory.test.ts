import { describe, expect, it } from 'vitest';
import { projectPublicListing, projectPublicListingDetail, publicListingSchema } from '@/lib/data/publicInventory';
import { normalizeListing } from '@/lib/data/listingContract';

function listing() {
  return normalizeListing({
    id: 'listing-a',
    mls_id: 'MLS-A',
    name: 'Public Home',
    description: 'Public remarks',
    city: 'Sunset',
    state: 'TX',
    owner: 'private-owner-id',
    metadata: {
      seller_phone: '555-0100',
      internal_score: 99,
    },
    display_public: true,
    is_demo: false,
    location_geo: { type: 'Point', coordinates: [-97.7, 33.4] },
  });
}

describe('public inventory projection', () => {
  it('returns only the explicit public allow-list', () => {
    const projected = projectPublicListing(listing());

    expect(projected).toMatchObject({
      id: 'listing-a',
      name: 'Public Home',
      display_public: true,
      is_demo: false,
    });
    expect(projected).not.toHaveProperty('owner');
    expect(projected).not.toHaveProperty('metadata');
    expect(projected).not.toHaveProperty('seller_phone');
    expect(publicListingSchema.safeParse(projected).success).toBe(true);
  });

  it('does not allow a projection to manufacture a private or demo record', () => {
    const input = listing();
    expect(() => projectPublicListing({ ...input, is_demo: true })).toThrow();
    expect(() => projectPublicListing({ ...input, display_public: false })).toThrow();
  });

  it('extends the detail response with validated public facts while leaving inventory cards compact', () => {
    const original = listing();
    const input = {
      ...original,
      metadata: {
        ...original.metadata,
        property_subtype: ' Single Family Residence ',
        subdivision: 'Hillstead',
        lot_size_sqft: 6000,
        lot_size_acres: 0.138,
        year_built: 2026,
        levels: '',
        builder: { private_notes: 'never return this' },
      },
    };
    const detail = projectPublicListingDetail(input);

    expect(detail.facts).toEqual({
      property_subtype: 'Single Family Residence', subdivision: 'Hillstead',
      lot_size_sqft: 6000, lot_size_acres: 0.138, year_built: 2026,
    });
    expect(detail).not.toHaveProperty('metadata');
    expect(detail).not.toHaveProperty('owner');
    expect(publicListingSchema.safeParse(detail).success).toBe(true);
    expect(projectPublicListing(input)).not.toHaveProperty('facts');
    expect(projectPublicListingDetail(original)).not.toHaveProperty('facts');
  });
});
