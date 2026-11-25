import { describe, expect, it } from 'vitest';
import { listingEditorSchema, buildEditedListing, listingEditorValues } from '@/lib/data/listingEditor';
import { listingToRow, normalizeListing } from '@/lib/data/listingContract';
import { projectPublicListing, projectPublicListingDetail } from '@/lib/data/publicInventory';
import { landDetailsSchema } from '@/lib/data/landDetails';
import { kellerHicksListingId } from '@/config/keller_hicks';
import { landEditorInput, landFacts } from '../fixtures/landListing';

describe('land listing contracts', () => {
  it('round-trips acreage, text and source links through canonical storage without losing private metadata', () => {
    const original = normalizeListing({ id: 'test-id', metadata: { private_note: 'owner only', land_details: landFacts } });
    const edited = buildEditedListing(listingEditorSchema.parse(landEditorInput), [], original);
    const saved = normalizeListing({ ...listingToRow(edited), id: original.id });
    // Canonical storage uses 0 for an unknown living area; the optional form must stay blank.
    expect(listingEditorValues(saved).sqft).toBe('');
    expect(saved.metadata).toMatchObject({ private_note: 'owner only', land_details: landFacts });
    expect(listingEditorValues(saved)).toMatchObject({ land_marketed_acres: 5, land_surveyed_acres: 4.866, land_documents: landEditorInput.land_documents });
    expect(projectPublicListingDetail(saved).facts?.land_details).toEqual(landFacts);
    expect(JSON.stringify(projectPublicListingDetail(saved))).not.toContain('owner only');
    expect(projectPublicListing(saved)).not.toHaveProperty('facts');
  });

  it('preloads the Keller pilot for its first edit and honors an explicit removal thereafter', () => {
    const original = normalizeListing({ id: kellerHicksListingId });
    expect(listingEditorValues(original)).toMatchObject({ land_marketed_acres: 5, land_surveyed_acres: 4.866 });
    const cleared = listingEditorSchema.parse({ ...landEditorInput,
      land_marketed_acres: '', land_surveyed_acres: '', land_zoning: '', land_development_status: '', land_constraints: '', land_documents: '',
    });
    const saved = normalizeListing(buildEditedListing(cleared, [], original));
    expect(saved.metadata.land_details).toEqual({ documents: [] });
    expect(listingEditorValues(saved)).toMatchObject({ land_marketed_acres: '', land_surveyed_acres: '', land_documents: '' });
  });

  it('preserves land details for older callers that omit the land section', () => {
    const original = normalizeListing({ id: 'test', metadata: { land_details: landFacts } });
    const saved = buildEditedListing(listingEditorSchema.parse({ ...landEditorInput, land_details_present: undefined }), [], original);
    expect(saved.metadata.land_details).toEqual(landFacts);
  });

  it.each(['javascript:alert(1)', 'http://example.com/packet.pdf', 'https://user:pass@example.com/packet.pdf', 'not-a-url'])('rejects unsafe or malformed document link %s without throwing', (url) => {
    expect(listingEditorSchema.safeParse({ ...landEditorInput, land_documents: `Packet | ${url}` }).success).toBe(false);
  });

  it('bounds collections and numeric values and requires a document label', () => {
    for (const input of [
      { land_documents: Array.from({ length: 9 }, (_, i) => `Source ${i} | https://example.com/${i}`).join('\n') },
      { land_documents: 'https://example.com/packet.pdf' },
      { land_surveyed_acres: '-1' }, { land_surveyed_acres: 'Infinity' },
      { land_zoning: 'z'.repeat(501) },
    ]) expect(listingEditorSchema.safeParse({ ...landEditorInput, ...input }).success).toBe(false);
    expect(landDetailsSchema.safeParse({ ...landFacts, private_note: 'never public' }).success).toBe(false);
  });

  it('omits malformed or private nested metadata from the public detail response', () => {
    const listing = normalizeListing({ id: 'test', display_public: true, metadata: { land_details: { ...landFacts, private_note: 'secret' } } });
    expect(projectPublicListingDetail(listing)).not.toHaveProperty('facts');
  });
});
