import { describe, expect, it } from 'vitest';
import {
  findRestrictedMlsFields,
  isRestrictedMlsField,
  sanitizeMlsForPublicUse,
  sanitizeMlsForTahInput,
} from '@/lib/data/mlsCompliance';

const mlsFixture = {
  _id: 'NTREIS123',
  mls_id: 'NTREIS123',
  name: '100 Test Drive',
  type: 'Residential',
  description: 'Public listing description',
  location: {
    street: '100 Test Drive',
    city: 'Keller',
    state: 'TX',
    zipcode: '76248',
  },
  beds: 4,
  baths: 3,
  square_feet: 2400,
  rates: {
    monthly: 650000,
  },
  images: ['https://example.test/photo.jpg'],
  source: 'MLS',
  listing_status: 'Active',
  last_updated: '2026-05-18T12:00:00.000Z',
  display_public: true,
  PrivateRemarks: 'DO NOT DISPLAY: seller is out of town',
  ShowingInstructions: 'LOCKBOX CODE 1234',
  ListAgentEmail: 'private-agent@example.test',
  metadata: {
    provider: 'reso-web-api',
    resource: 'Property',
    photoCount: 1,
    compensation: '3%',
    lockboxLocation: 'Side gate',
  },
  rawPayload: {
    PrivateRemarks: 'nested private text',
  },
};

describe('MLS compliance sanitizer', () => {
  it('identifies restricted MLS field names', () => {
    expect(isRestrictedMlsField('PrivateRemarks')).toBe(true);
    expect(isRestrictedMlsField('ShowingInstructions')).toBe(true);
    expect(isRestrictedMlsField('ListAgentEmail')).toBe(true);
    expect(isRestrictedMlsField('CompensationDisclosure')).toBe(true);
    expect(isRestrictedMlsField('PublicRemarks')).toBe(false);
  });

  it('finds restricted fields in nested payloads for audit logging', () => {
    expect(findRestrictedMlsFields(mlsFixture)).toEqual(
      expect.arrayContaining([
        'PrivateRemarks',
        'ShowingInstructions',
        'ListAgentEmail',
        'metadata.compensation',
        'metadata.lockboxLocation',
        'rawPayload.PrivateRemarks',
      ])
    );
  });

  it('keeps public property fields and strips private MLS data', () => {
    const publicListing = sanitizeMlsForPublicUse(mlsFixture);
    const serialized = JSON.stringify(publicListing);

    expect(publicListing.mls_id).toBe('NTREIS123');
    expect(publicListing.location.city).toBe('Keller');
    expect(publicListing.metadata.provider).toBe('reso-web-api');
    expect(publicListing.metadata.photoCount).toBe(1);
    expect(publicListing.display_public).toBe(true);
    expect(publicListing).not.toHaveProperty('rawPayload');
    expect(serialized).not.toContain('DO NOT DISPLAY');
    expect(serialized).not.toContain('LOCKBOX CODE');
    expect(serialized).not.toContain('private-agent@example.test');
    expect(serialized).not.toContain('3%');
  });

  it('creates TAH-safe derived input without raw listing prose or media', () => {
    const tahInput = sanitizeMlsForTahInput(mlsFixture);
    const serialized = JSON.stringify(tahInput);

    expect(tahInput).toEqual({
      mls_id: 'NTREIS123',
      city: 'Keller',
      state: 'TX',
      type: 'Residential',
      beds: 4,
      baths: 3,
      square_feet: 2400,
      price: 650000,
      listing_status: 'Active',
      last_updated: '2026-05-18T12:00:00.000Z',
    });
    expect(serialized).not.toContain('Public listing description');
    expect(serialized).not.toContain('photo.jpg');
    expect(serialized).not.toContain('LOCKBOX CODE');
  });
});
