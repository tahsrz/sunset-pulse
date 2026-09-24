export type PropertyScanListingCandidate = {
  id: string;
  mlsId: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
};

export type PropertyScanListingResolution = {
  listingLinkStatus: 'unresolved' | 'verified';
  shortlistEntryId: string | null;
  question: string | null;
};

export function resolvePropertyScanListingReference(input: { listingId: string | null; propertyAddress: string }, candidates: PropertyScanListingCandidate[]): PropertyScanListingResolution {
  if (!input.listingId?.trim()) return { listingLinkStatus: 'unresolved', shortlistEntryId: null, question: null };
  const reference = normalize(input.listingId);
  const matches = candidates.filter((candidate) => normalize(candidate.id) === reference || normalize(candidate.mlsId) === reference);
  if (matches.length !== 1) return { listingLinkStatus: 'unresolved', shortlistEntryId: null, question: matches.length > 1 ? 'Confirm which owner-scoped shortlist property this reference belongs to.' : 'Confirm the MLS/internal reference against an owner-scoped shortlist property.' };
  return { listingLinkStatus: 'verified', shortlistEntryId: matches[0].id, question: null };
}

function normalize(value: string | null | undefined) {
  return String(value || '').trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, '');
}
