import { describe, expect, it } from 'vitest';
import { mapRawOpenResyncProperty } from '@/lib/data/openResyncMapper';
import { listingToRow } from '@/lib/data/listingContract';

describe('OpenRESync raw property mapper', () => {
  it('maps public RESO fields and media into the canonical contract', () => {
    const listing = mapRawOpenResyncProperty({
      ListingKey: 'key-100',
      ListingId: 'NTREIS-100',
      UnparsedAddress: '100 Sunset Lane',
      City: 'Fort Worth',
      StateOrProvince: 'TX',
      PostalCode: '76102',
      PropertyType: 'Residential',
      StandardStatus: 'Active',
      PublicRemarks: 'Public description',
      ListPrice: '425000',
      BedroomsTotal: 3,
      BathroomsTotalInteger: 2,
      LivingArea: 1800,
      Longitude: -97.3308,
      Latitude: 32.7555,
      InternetEntireListingDisplayYN: 'Y',
      InternetAddressDisplayYN: 'Y',
      ModificationTimestamp: '2026-06-30T12:00:00Z',
      PrivateRemarks: 'never copy this',
    }, new Map([['key-100', ['https://example.test/photo.jpg']]]));

    expect(listing).toMatchObject({
      _id: 'key-100',
      mls_id: 'NTREIS-100',
      name: '100 Sunset Lane',
      display_public: true,
      list_price: 425000,
      images: ['https://example.test/photo.jpg'],
      location_geo: { coordinates: [-97.3308, 32.7555] },
    });
    expect(JSON.stringify(listing)).not.toContain('never copy this');
  });

  it('suppresses address and media when IDX display permission is absent', () => {
    const listing = mapRawOpenResyncProperty({
      ListingKey: 'key-private',
      ListingId: 'NTREIS-PRIVATE',
      UnparsedAddress: '1 Hidden Court',
      City: 'Dallas',
      PropertyType: 'Residential',
      InternetEntireListingDisplayYN: 'N',
      InternetAddressDisplayYN: 'Y',
    }, new Map([['key-private', ['https://example.test/private.jpg']]]));

    expect(listing.display_public).toBe(false);
    expect(listing.location.street).toBe('');
    expect(listing.name).toBe('Dallas Residential');
    expect(listing.images).toEqual([]);
    expect(listingToRow(listing).display_public).toBe(false);
  });
});
