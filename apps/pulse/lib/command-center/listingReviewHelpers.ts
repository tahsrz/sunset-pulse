export type ListingReviewFacts = {
  isListingLike: boolean;
  confidence: number;
  extractedFields: string[];
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  propertyType?: string;
  status?: string;
  mlsId?: string;
  daysOnMarket?: string;
  hoaFee?: string;
  yearBuilt?: string;
  lotSize?: string;
  parking?: string;
  brokerage?: string;
  remarks?: string;
  features: string[];
  hooks: string[];
  warnings: string[];
  missingFields: string[];
};

export type ListingFactsTrace = ListingReviewFacts;

export type ListingReviewDraft = {
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  status: string;
  mlsId: string;
  daysOnMarket: string;
  hoaFee: string;
  yearBuilt: string;
  lotSize: string;
  parking: string;
  brokerage: string;
  remarks: string;
  features: string;
};

export type ListingReviewFieldKey = keyof ListingReviewDraft;

export type ListingCopyVariant = 'mls' | 'social' | 'buyer';

export type ListingCopyDrafts = Record<ListingCopyVariant, string>;

export type SavedListingIntake = {
  intakeId: string;
  version: number;
  publishStatus: 'review' | 'ready';
};

export type CanonicalListingComparison = {
  property: {
    id: string;
    mlsId: string | null;
    name: string | null;
    lastUpdated: string | null;
  };
  differences: Array<{
    field: string;
    label: string;
    intakeValue: string | null;
    canonicalValue: string | null;
    differs: boolean;
  }>;
};

export const listingReviewFields: Array<{ key: ListingReviewFieldKey; label: string; multiline?: boolean }> = [
  { key: 'address', label: 'Address' },
  { key: 'price', label: 'Price' },
  { key: 'beds', label: 'Beds' },
  { key: 'baths', label: 'Baths' },
  { key: 'sqft', label: 'Square feet' },
  { key: 'propertyType', label: 'Property type' },
  { key: 'status', label: 'Status' },
  { key: 'mlsId', label: 'MLS' },
  { key: 'daysOnMarket', label: 'Days on market' },
  { key: 'hoaFee', label: 'HOA' },
  { key: 'yearBuilt', label: 'Year built' },
  { key: 'lotSize', label: 'Lot size' },
  { key: 'parking', label: 'Parking' },
  { key: 'brokerage', label: 'Brokerage' },
  { key: 'remarks', label: 'Remarks', multiline: true },
  { key: 'features', label: 'Features', multiline: true },
];

export const listingCopyVariants: Array<{ id: ListingCopyVariant; label: string; ariaLabel: string }> = [
  { id: 'mls', label: 'MLS Summary', ariaLabel: 'MLS summary draft' },
  { id: 'social', label: 'Social Caption', ariaLabel: 'Social caption draft' },
  { id: 'buyer', label: 'Buyer Message', ariaLabel: 'Buyer message draft' },
];

export function createListingReviewDraft(facts: ListingFactsTrace): ListingReviewDraft {
  return {
    address: facts.address || [facts.city, facts.state, facts.zip].filter(Boolean).join(', '),
    price: facts.price || '',
    beds: facts.beds || '',
    baths: facts.baths || '',
    sqft: facts.sqft || '',
    propertyType: facts.propertyType || '',
    status: facts.status || '',
    mlsId: facts.mlsId || '',
    daysOnMarket: facts.daysOnMarket || '',
    hoaFee: facts.hoaFee || '',
    yearBuilt: facts.yearBuilt || '',
    lotSize: facts.lotSize || '',
    parking: facts.parking || '',
    brokerage: facts.brokerage || '',
    remarks: facts.remarks || '',
    features: facts.features.join(', '),
  };
}

export function buildApprovedListingCommand(draft: ListingReviewDraft) {
  const facts = [
    ['Address', draft.address],
    ['Price', draft.price],
    ['Beds', draft.beds],
    ['Baths', draft.baths],
    ['Square Feet', draft.sqft],
    ['Property Type', draft.propertyType],
    ['Status', draft.status],
    ['MLS', draft.mlsId],
    ['Days on Market', draft.daysOnMarket],
    ['HOA', draft.hoaFee],
    ['Year Built', draft.yearBuilt],
    ['Lot Size', draft.lotSize],
    ['Parking', draft.parking],
    ['Brokerage', draft.brokerage],
    ['Public Remarks', draft.remarks],
    ['Features', draft.features],
  ].filter(([, value]) => value.trim());

  return [
    'Create a review-ready listing summary and draft marketing copy from the approved facts below.',
    'Treat these approved facts as authoritative. Do not add unsupported claims.',
    '',
    'APPROVED_LISTING_FACTS:',
    ...facts.map(([label, value]) => `${label}: ${value.trim()}`),
  ].join('\n');
}

export function buildListingCopyDrafts(facts: ListingFactsTrace): ListingCopyDrafts {
  const address = facts.address || [facts.city, facts.state, facts.zip].filter(Boolean).join(', ');
  const subject = address || facts.propertyType || 'This property';
  const specs = [
    facts.price ? `listed at ${facts.price}` : '',
    facts.beds ? `${facts.beds} beds` : '',
    facts.baths ? `${facts.baths} baths` : '',
    facts.sqft ? `${facts.sqft} sqft` : '',
  ].filter(Boolean).join(', ');
  const features = facts.features.slice(0, 4).join(', ');
  const status = facts.status ? `Status: ${facts.status}.` : '';
  const socialLead = address ? `Property spotlight: ${address}.` : 'Property details are ready.';
  const specsSentence = specs ? `${subject}${address && specs ? ' is ' : ': '}${specs}.` : `${subject}.`;
  const featuresSentence = features ? `Verified highlights include ${features}.` : '';
  const remarksSentence = facts.remarks ? facts.remarks.trim() : '';

  return {
    mls: [specsSentence, status, featuresSentence, remarksSentence].filter(Boolean).join(' '),
    social: [
      socialLead,
      specs ? `Verified details: ${specs}.` : '',
      featuresSentence,
      'Reach out for current availability and a closer look.',
    ].filter(Boolean).join(' '),
    buyer: [
      `Take a closer look at ${subject}.`,
      specs ? `The approved listing details include ${specs}.` : '',
      featuresSentence,
      'Reply for current availability or to plan a showing.',
    ].filter(Boolean).join(' '),
  };
}
