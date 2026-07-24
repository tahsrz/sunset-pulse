export type ListingFacts = {
  isListingLike: boolean;
  signalCount: number;
  mlsId?: string;
  address?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  lotSize?: string;
  yearBuilt?: string;
  propertyType?: string;
  status?: string;
  remarks?: string;
  features: string[];
  missingFields: string[];
};

const listingSignals = [
  /\bmls\s*(#|number|no\.?)?\b/i,
  /\b(list\s*price|price|offered at)\b/i,
  /\b(beds?|bedrooms?)\b/i,
  /\b(baths?|bathrooms?)\b/i,
  /\b(sq\s*ft|square feet|sqft)\b/i,
  /\b(acres?|lot size)\b/i,
  /\b(year built|built in)\b/i,
  /\b(single family|townhouse|condo|residential|multifamily)\b/i,
  /\b(public remarks|private remarks|agent remarks|features)\b/i,
];

export function extractListingFacts(input: string): ListingFacts {
  const text = normalize(input);
  const signalCount = listingSignals.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const facts: ListingFacts = {
    isListingLike: signalCount >= 3,
    signalCount,
    mlsId: firstMatch(text, [
      /\bMLS\s*(?:#|Number|No\.?)?\s*[:#-]?\s*([A-Z0-9-]{5,})\b/i,
      /\bListing\s*(?:ID|#)\s*[:#-]?\s*([A-Z0-9-]{5,})\b/i,
    ]),
    address: firstMatch(text, [
      /\b(\d{3,6}\s+[A-Za-z0-9 .'-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Trl|Trail|Way|Blvd|Boulevard|Pkwy|Parkway)\b(?:,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5})?)/i,
      /\bAddress:\s*([^|]+?)(?:\s+(?:MLS|List Price|Price|Beds?|Baths?|Public Remarks):|$)/i,
    ]),
    price: firstMatch(text, [
      /\b(?:List Price|Price|Offered at)\s*[:$]?\s*(\$\s?\d[\d,]*(?:\.\d{2})?)/i,
      /(\$\s?\d[\d,]*(?:\.\d{2})?)/,
    ]),
    beds: firstMatch(text, [/\b(\d+(?:\.\d+)?)\s*(?:beds?|bedrooms?)\b/i]),
    baths: firstMatch(text, [/\b(\d+(?:\.\d+)?)\s*(?:baths?|bathrooms?)\b/i]),
    sqft: firstMatch(text, [/\b(\d[\d,]*)\s*(?:sq\s*ft|square feet|sqft)\b/i]),
    lotSize: firstMatch(text, [
      /\bLot Size\s*[:#-]?\s*([\d,.]+\s*(?:acres?|sq\s*ft|square feet|sqft))\b/i,
      /\b([\d,.]+\s*acres?)\b/i,
    ]),
    yearBuilt: firstMatch(text, [/\b(?:Year Built|Built In)\s*[:#-]?\s*(\d{4})\b/i]),
    propertyType: firstMatch(text, [/\b(Single Family Residential|Single Family|Townhouse|Condo|Condominium|Multifamily|Residential)\b/i]),
    status: firstMatch(text, [/\bStatus\s*[:#-]?\s*(Active|Pending|Coming Soon|Sold|Expired|Withdrawn|Cancelled)\b/i]),
    remarks: extractRemarks(text),
    features: extractFeatures(text),
    missingFields: [],
  };

  facts.missingFields = [
    ['address', facts.address],
    ['price', facts.price],
    ['beds', facts.beds],
    ['baths', facts.baths],
    ['sqft', facts.sqft],
    ['remarks', facts.remarks],
  ].filter(([, value]) => !value).map(([field]) => field || '');

  return facts;
}

export function formatListingFactsBrief(facts?: ListingFacts) {
  if (!facts?.isListingLike) return '';

  const lines = [
    'STRUCTURED_LISTING_FACTS:',
    facts.mlsId ? `MLS: ${facts.mlsId}` : '',
    facts.address ? `Address: ${facts.address}` : '',
    facts.price ? `Price: ${facts.price}` : '',
    facts.beds || facts.baths || facts.sqft ? `Specs: ${[
      facts.beds ? `${facts.beds} beds` : '',
      facts.baths ? `${facts.baths} baths` : '',
      facts.sqft ? `${facts.sqft} sqft` : '',
    ].filter(Boolean).join(', ')}` : '',
    facts.propertyType ? `Type: ${facts.propertyType}` : '',
    facts.yearBuilt ? `Year built: ${facts.yearBuilt}` : '',
    facts.lotSize ? `Lot: ${facts.lotSize}` : '',
    facts.status ? `Status: ${facts.status}` : '',
    facts.features.length ? `Features: ${facts.features.slice(0, 10).join(', ')}` : '',
    facts.remarks ? `Remarks: ${facts.remarks}` : '',
    facts.missingFields.length ? `Missing fields: ${facts.missingFields.join(', ')}` : '',
  ].filter(Boolean);

  return lines.join('\n');
}

export function summarizeListingFacts(facts?: ListingFacts) {
  if (!facts?.isListingLike) return '';
  const summary = [
    facts.price,
    facts.address,
    facts.beds ? `${facts.beds} beds` : '',
    facts.baths ? `${facts.baths} baths` : '',
    facts.sqft ? `${facts.sqft} sqft` : '',
  ].filter(Boolean).join(', ');

  return summary ? `pasted listing (${summary})` : 'pasted listing details';
}

function extractRemarks(text: string) {
  return firstMatch(text, [
    /\bPublic Remarks:\s*(.+?)(?:\s+\b(?:Features|Private Remarks|Agent Remarks|MLS|List Price|Status):|$)/i,
    /\bRemarks:\s*(.+?)(?:\s+\b(?:Features|Private Remarks|Agent Remarks|MLS|List Price|Status):|$)/i,
  ])?.slice(0, 700);
}

function extractFeatures(text: string) {
  const raw = firstMatch(text, [
    /\bFeatures:\s*(.+?)(?:\s+\b(?:Public Remarks|Private Remarks|Agent Remarks|MLS|List Price|Status):|$)/i,
    /\bAmenities:\s*(.+?)(?:\s+\b(?:Public Remarks|Private Remarks|Agent Remarks|MLS|List Price|Status):|$)/i,
  ]);
  if (!raw) return [];

  return raw
    .split(/[,;|]/g)
    .map((feature) => feature.trim())
    .filter((feature) => feature.length > 2)
    .slice(0, 16);
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return match[1].replace(/\s+/g, ' ').trim();
  }
  return undefined;
}

function normalize(value: string) {
  return String(value || '').replace(/\0/g, ' ').replace(/\s+/g, ' ').trim();
}
