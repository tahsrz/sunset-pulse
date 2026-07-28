export type ListingFacts = {
  isListingLike: boolean;
  signalCount: number;
  confidence: number;
  extractedFields: string[];
  mlsId?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  price?: string;
  beds?: string;
  baths?: string;
  sqft?: string;
  lotSize?: string;
  yearBuilt?: string;
  propertyType?: string;
  status?: string;
  daysOnMarket?: string;
  hoaFee?: string;
  parking?: string;
  brokerage?: string;
  remarks?: string;
  features: string[];
  hooks: string[];
  warnings: string[];
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
  /\b(hoa|days on market|dom|garage|parking)\b/i,
  /"mls(Number|_id|Id)"\s*:/i,
  /"listPrice"\s*:/i,
];

export function extractListingFacts(input: string): ListingFacts {
  const text = normalize(input);
  const jsonFacts = extractJsonListingFacts(input);
  const signalCount = listingSignals.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
  const facts: ListingFacts = {
    isListingLike: false,
    signalCount,
    confidence: 0,
    extractedFields: [],
    mlsId: jsonFacts.mlsId || firstMatch(text, [
      /\bMLS\s*(?:#|Number|No\.?)?\s*[:#-]?\s*([A-Z0-9-]{5,})\b/i,
      /\bMLS\s*ID\s*[:#-]?\s*([A-Z0-9-]{5,})\b/i,
      /\bListing\s*(?:ID|#)\s*[:#-]?\s*([A-Z0-9-]{5,})\b/i,
    ]),
    address: jsonFacts.address || firstMatch(text, [
      /(?<![,.$\d])\b(\d{3,6}\s+[A-Za-z0-9 .'-]+\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Ct|Court|Cir|Circle|Trl|Trail|Way|Blvd|Boulevard|Pkwy|Parkway)\b(?:,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s*\d{5})?)/i,
      /\bAddress:\s*([^|]+?)(?:\s+(?:MLS|List Price|Price|Beds?|Baths?|Public Remarks):|$)/i,
    ]),
    city: jsonFacts.city,
    state: jsonFacts.state,
    zip: jsonFacts.zip,
    price: jsonFacts.price || firstMatch(text, [
      /\b(?:List Price|ListPrice|Price|Offered at|Listed for|Asking)\s*[:$]?\s*(\$\s?\d[\d,]*(?:\.\d{2})?|\$?\s?\d+(?:\.\d+)?\s?[kKmM])\b/i,
      /(\$\s?\d[\d,]*(?:\.\d{2})?|\$\s?\d+(?:\.\d+)?\s?[kKmM])\b/,
    ]),
    beds: jsonFacts.beds || firstMatch(text, [
      /\b(?:Beds?|Bedrooms?)\s*[:#-]\s*(\d+(?:\.\d+)?)\b/i,
      /\b(\d+(?:\.\d+)?)\s*(?:beds?|bedrooms?|bd|bdrms?)\b/i,
    ]),
    baths: jsonFacts.baths || firstMatch(text, [
      /\b(?:Baths?|Bathrooms?)\s*[:#-]\s*(\d+(?:\.\d+)?)\b/i,
      /\b(\d+(?:\.\d+)?)\s*(?:baths?|bathrooms?|ba)\b/i,
    ]),
    sqft: jsonFacts.sqft || firstMatch(text, [
      /\b(?:Living Area|Square Feet|Sq Ft|Sqft|Interior)\s*[:#-]?\s*(\d[\d,]*)\s*(?:sq\s*ft|square feet|sqft|sf)?\b/i,
      /\b(\d[\d,]*)\s*(?:sq\s*ft|square feet|sqft|sf)\b/i,
    ]),
    lotSize: jsonFacts.lotSize || firstMatch(text, [
      /\bLot Size\s*[:#-]?\s*([\d,.]+\s*(?:acres?|sq\s*ft|square feet|sqft))\b/i,
      /\b([\d,.]+\s*acres?)\b/i,
    ]),
    yearBuilt: jsonFacts.yearBuilt || firstMatch(text, [/\b(?:Year Built|Built In)\s*[:#-]?\s*(\d{4})\b/i]),
    propertyType: jsonFacts.propertyType || firstMatch(text, [/\b(Single Family Residential|Single Family Residence|Single Family|Townhouse|Condo|Condominium|Multifamily|Residential)\b/i]),
    status: jsonFacts.status || firstMatch(text, [/\bStatus\s*[:#-]?\s*(Active|Pending|Coming Soon|Sold|Closed|Expired|Withdrawn|Cancelled)\b/i]),
    daysOnMarket: jsonFacts.daysOnMarket || firstMatch(text, [/\b(?:Days on Market|DOM)\s*[:#-]?\s*(\d+)\b/i]),
    hoaFee: jsonFacts.hoaFee || firstMatch(text, [/\bHOA\s*(?:Fee|Dues)?\s*[:#-]?\s*(\$\s?\d[\d,]*(?:\/mo|\/month| monthly)?|\d[\d,]*(?:\/mo|\/month| monthly)?)\b/i]),
    parking: jsonFacts.parking || firstMatch(text, [/\b(?:Parking|Garage)\s*[:#-]\s*([^|]+?)(?:\s+(?:Public Remarks|Features|MLS|List Price|Status|HOA):|$)/i]),
    brokerage: jsonFacts.brokerage,
    remarks: jsonFacts.remarks || extractRemarks(text),
    features: mergeUnique([...(jsonFacts.features || []), ...extractFeatures(text)]),
    hooks: [],
    warnings: [],
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
  facts.extractedFields = collectExtractedFields(facts);
  facts.isListingLike = signalCount >= 3 || facts.extractedFields.length >= 4;
  facts.hooks = buildListingHooks(facts);
  facts.warnings = buildListingWarnings(facts);
  facts.confidence = facts.isListingLike
    ? Math.min(98, Math.max(58, 48 + signalCount * 5 + facts.extractedFields.length * 4 - facts.missingFields.length * 3))
    : Math.min(45, signalCount * 10 + facts.extractedFields.length * 4);

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
    facts.daysOnMarket ? `Days on market: ${facts.daysOnMarket}` : '',
    facts.hoaFee ? `HOA: ${facts.hoaFee}` : '',
    facts.parking ? `Parking: ${facts.parking}` : '',
    facts.features.length ? `Features: ${facts.features.slice(0, 10).join(', ')}` : '',
    facts.hooks.length ? `Likely hooks: ${facts.hooks.slice(0, 4).join('; ')}` : '',
    facts.remarks ? `Remarks: ${facts.remarks}` : '',
    facts.warnings.length ? `Validation warnings: ${facts.warnings.join('; ')}` : '',
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
    /\bPublic Remarks:\s*(.+?)(?:\s+\b(?:Features|Amenities|Private Remarks|Agent Remarks|MLS|List Price|Status|HOA|Days on Market):|$)/i,
    /\bRemarks:\s*(.+?)(?:\s+\b(?:Features|Amenities|Private Remarks|Agent Remarks|MLS|List Price|Status|HOA|Days on Market):|$)/i,
    /\bDescription:\s*(.+?)(?:\s+\b(?:Features|Amenities|Private Remarks|Agent Remarks|MLS|List Price|Status|HOA|Days on Market):|$)/i,
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

function collectExtractedFields(facts: ListingFacts) {
  const fields: string[] = ([
    'mlsId',
    'address',
    'price',
    'beds',
    'baths',
    'sqft',
    'lotSize',
    'yearBuilt',
    'propertyType',
    'status',
    'daysOnMarket',
    'hoaFee',
    'parking',
    'remarks',
  ] as const).filter((field) => Boolean(facts[field])).map((field) => field);
  if (facts.features.length) fields.push('features');
  return fields;
}

function buildListingHooks(facts: ListingFacts) {
  const hooks: string[] = [];
  const haystack = `${facts.remarks || ''} ${facts.features.join(' ')}`.toLowerCase();

  if (/(updated|renovated|remodeled|new roof|recent roof|quartz|hardwood|open kitchen|island)/.test(haystack)) {
    hooks.push('Updated interior and finish story');
  }
  if (/(covered patio|deck|pool|backyard|fenced|outdoor|porch|firepit|view|mountain|waterfront)/.test(haystack)) {
    hooks.push('Outdoor living angle');
  }
  if (/(shops|restaurant|commute|downtown|park|trail|school|amenit)/.test(haystack)) {
    hooks.push('Location and convenience story');
  }
  if (/(office|flex|bonus|suite|walk-in|storage|garage)/.test(haystack)) {
    hooks.push('Flexible space and practical storage');
  }
  if (facts.price && facts.beds && facts.baths && facts.sqft) {
    hooks.push('Clear price-to-specs snapshot');
  }

  return hooks.slice(0, 5);
}

function buildListingWarnings(facts: ListingFacts) {
  const warnings: string[] = [];
  if (!facts.address) warnings.push('Address was not found; verify location before using public copy.');
  if (!facts.price) warnings.push('Price was not found; do not imply pricing.');
  if (!facts.remarks && !facts.features.length) warnings.push('No remarks or features were found; output should stay factual.');
  if (facts.price && /[kKmM]\b/.test(facts.price)) warnings.push('Price uses shorthand; confirm exact list price.');
  if (facts.status && !/active|coming soon/i.test(facts.status)) warnings.push(`Status is ${facts.status}; confirm availability before marketing.`);
  return warnings;
}

function extractJsonListingFacts(input: string): Partial<ListingFacts> {
  const parsed = parseLooseJsonObject(input);
  if (!parsed || typeof parsed !== 'object') return {};

  const record = parsed as Record<string, unknown>;
  const address = readRecord(record, 'address') as Record<string, unknown> | undefined;
  const details = readRecord(record, 'details') as Record<string, unknown> | undefined;
  const lot = readRecord(record, 'lot') as Record<string, unknown> | undefined;
  const condominium = readRecord(record, 'condominium') as Record<string, unknown> | undefined;
  const office = readRecord(record, 'office') as Record<string, unknown> | undefined;

  const features = mergeUnique([
    stringField(details, 'extras'),
    stringField(details, 'flooringType'),
    stringField(details, 'balcony'),
    stringField(lot, 'features'),
    ...roomFeatures(record),
  ].filter(Boolean).flatMap((value) => String(value).split(/[,;|]/g).map((item) => item.trim())));

  const street = [
    stringField(address, 'streetNumber'),
    stringField(address, 'streetDirectionPrefix'),
    stringField(address, 'streetName'),
    stringField(address, 'streetSuffix'),
    stringField(address, 'unitNumber') ? `Unit ${stringField(address, 'unitNumber')}` : '',
  ].filter(Boolean).join(' ');
  const city = stringField(address, 'city');
  const state = stringField(address, 'state');
  const zip = stringField(address, 'zip') || stringField(address, 'postal');
  const fullAddress = [street, [city, state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  const lotSize = formatNumberWithUnit(numberOrStringField(lot, 'size') || numberOrStringField(lot, 'acres'), stringField(lot, 'measurement') || 'acres');
  const hoaFee = numberOrStringField(details, 'HOAFee') || numberOrStringField(condominium ? readRecord(condominium, 'fees') as Record<string, unknown> : undefined, 'maintenance');

  return {
    mlsId: stringField(record, 'mlsNumber') || stringField(record, 'mls_id') || stringField(record, 'listing_id'),
    address: fullAddress || undefined,
    city,
    state,
    zip,
    price: formatPrice(numberOrStringField(record, 'listPrice') || numberOrStringField(record, 'price')),
    beds: numberOrStringField(details, 'numBedrooms'),
    baths: numberOrStringField(details, 'numBathrooms'),
    sqft: formatInteger(numberOrStringField(details, 'sqft') || numberOrStringField(details, 'livingArea')),
    lotSize,
    yearBuilt: numberOrStringField(details, 'yearBuilt'),
    propertyType: stringField(details, 'style') || stringField(details, 'propertyType') || stringField(record, 'class'),
    status: stringField(record, 'standardStatus') || stringField(record, 'status'),
    daysOnMarket: numberOrStringField(record, 'daysOnMarket') || numberOrStringField(record, 'simpleDaysOnMarket'),
    hoaFee: hoaFee ? formatPrice(hoaFee) : undefined,
    parking: stringField(condominium, 'parkingType') || numberOrStringField(details, 'numGarageSpaces'),
    brokerage: stringField(office, 'brokerageName'),
    remarks: stringField(details, 'description')?.replace(/\*+\s*SAMPLE DATA\s*\*+/gi, '').trim().slice(0, 700),
    features,
  };
}

function parseLooseJsonObject(input: string) {
  const trimmed = input.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return undefined;

  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return undefined;
  }
}

function readRecord(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  return value && typeof value === 'object' && !Array.isArray(value) ? value : undefined;
}

function stringField(record: Record<string, unknown> | undefined, key: string) {
  const value = record?.[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberOrStringField(record: Record<string, unknown> | undefined, key: string) {
  return stringField(record, key);
}

function roomFeatures(record: Record<string, unknown>) {
  const rooms = record.rooms;
  if (!Array.isArray(rooms)) return [];
  return rooms.flatMap((room) => {
    if (!room || typeof room !== 'object') return [];
    const item = room as Record<string, unknown>;
    return ['description', 'features', 'features2', 'features3'].map((key) => stringField(item, key)).filter(Boolean);
  });
}

function formatPrice(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith('$')) return trimmed.replace(/\s+/g, '');
  const numeric = Number(trimmed.replace(/,/g, ''));
  if (Number.isFinite(numeric) && numeric >= 1000) {
    return `$${Math.round(numeric).toLocaleString('en-US')}`;
  }
  return trimmed;
}

function formatInteger(value?: string) {
  if (!value) return undefined;
  const numeric = Number(value.replace(/,/g, ''));
  if (Number.isFinite(numeric)) return Math.round(numeric).toLocaleString('en-US');
  return value;
}

function formatNumberWithUnit(value?: string, unit?: string) {
  if (!value) return undefined;
  const cleanUnit = unit?.replace(/^acres$/i, 'acres') || '';
  return `${value}${cleanUnit ? ` ${cleanUnit}` : ''}`.trim();
}

function mergeUnique(values: string[]) {
  const seen = new Set<string>();
  return values
    .map((value) => value.replace(/\s+/g, ' ').replace(/\.$/, '').trim().slice(0, 90))
    .filter((value) => value.length > 2)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 18);
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
