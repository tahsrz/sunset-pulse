import { describe, expect, it } from 'vitest';
import { createConsentReceipt, createReviewEvent, isCurrentScanArtifact, propertyScanManifestHash } from '@/lib/scans/propertyScanVersioning';
import { resolvePropertyScanListingReference } from '@/lib/scans/propertyScanListingResolution';

const asset = {
  assetId: 'asset-1',
  path: 'owner/scan/asset-1.jpg',
  fileName: 'living-room.jpg',
  mimeType: 'image/jpeg',
  size: 10,
  capturedAt: null,
  uploadedAt: '2026-09-15T12:00:00.000Z',
};
const secondAsset = { ...asset, assetId: 'asset-2', path: 'owner/scan/asset-2.jpg', fileName: 'kitchen.jpg' };

describe('property scan versioning', () => {
  it('hashes the canonical manifest independently of asset order', () => {
    expect(propertyScanManifestHash([asset, secondAsset])).toBe(propertyScanManifestHash([secondAsset, asset]));
    expect(propertyScanManifestHash([asset, secondAsset])).not.toBe(propertyScanManifestHash([asset]));
  });

  it('requires the exact approved input to keep an artifact current', () => {
    const hash = propertyScanManifestHash([asset]);
    expect(isCurrentScanArtifact({ inputRevision: 2, inputManifestHash: hash }, { revision: 3, manifestHash: hash, approvedManifestRevision: 2, approvedManifestHash: hash })).toBe(true);
    expect(isCurrentScanArtifact({ inputRevision: 1, inputManifestHash: hash }, { revision: 3, manifestHash: hash, approvedManifestRevision: 2, approvedManifestHash: hash })).toBe(false);
    expect(isCurrentScanArtifact({ inputRevision: 2, inputManifestHash: 'stale'.padEnd(64, '0') }, { revision: 3, manifestHash: hash, approvedManifestRevision: 2, approvedManifestHash: hash })).toBe(false);
  });

  it('records consent and review identity at server time', () => {
    const receipt = createConsentReceipt('owner-1', '2026-09-15T12:00:00.000Z');
    const event = createReviewEvent({ status: 'approved', reviewerId: 'reviewer-1', note: null, revision: 2, manifestHash: 'a'.repeat(64) }, '2026-09-15T12:01:00.000Z');
    expect(receipt).toEqual({ actorId: 'owner-1', policyVersion: 'property-scan-consent-v1', acceptedAt: '2026-09-15T12:00:00.000Z' });
    expect(event).toMatchObject({ status: 'approved', reviewerId: 'reviewer-1', revision: 2, createdAt: '2026-09-15T12:01:00.000Z' });
    expect(event.eventId).toEqual(expect.any(String));
  });

  it('keeps ambiguous references unlinked and verifies only one owner-scoped match', () => {
    const candidates = [{ id: 'shortlist-1', mlsId: 'MLS-1', address: '1612 Fair Oaks Drive', city: 'Westlake', state: 'TX' }];
    expect(resolvePropertyScanListingReference({ listingId: 'MLS-1', propertyAddress: 'different address' }, candidates)).toEqual({ listingLinkStatus: 'verified', shortlistEntryId: 'shortlist-1', question: null });
    expect(resolvePropertyScanListingReference({ listingId: 'unknown', propertyAddress: '1612 Fair Oaks Drive, Westlake, TX' }, candidates).listingLinkStatus).toBe('unresolved');
    expect(resolvePropertyScanListingReference({ listingId: 'MLS-1', propertyAddress: '1612 Fair Oaks Drive, Westlake, TX' }, [...candidates, { ...candidates[0], id: 'shortlist-2' }]).shortlistEntryId).toBeNull();
  });
});
