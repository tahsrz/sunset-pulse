import 'server-only';

import { listShortlistEntries } from '@/lib/property-sprints/shortlist.server';
import { resolvePropertyScanListingReference } from './propertyScanListingResolution';

export async function resolveOwnerPropertyScanListing(ownerId: string, input: { listingId: string | null; propertyAddress: string }) {
  if (!input.listingId) return resolvePropertyScanListingReference(input, []);
  const candidates = await listShortlistEntries(ownerId);
  return resolvePropertyScanListingReference(input, candidates.map((candidate) => ({ id: candidate.id, mlsId: candidate.mlsId, address: candidate.address, city: candidate.city, state: candidate.state })));
}
