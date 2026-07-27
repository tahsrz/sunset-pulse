import { normalizeListing, type Listing } from '@/lib/data/listingContract';

export const listingIntakePropertyFields = [
  'address',
  'city',
  'state',
  'zip',
  'price',
  'beds',
  'baths',
  'sqft',
  'propertyType',
  'status',
  'remarks',
  'features',
] as const;

export type ListingIntakePropertyField = typeof listingIntakePropertyFields[number];

export type ListingIntakePropertyDifference = {
  field: ListingIntakePropertyField;
  label: string;
  intakeValue: string | null;
  canonicalValue: string | null;
  differs: boolean;
};

type ListingIntakeFacts = Record<string, unknown>;

const fieldLabels: Record<ListingIntakePropertyField, string> = {
  address: 'Street address',
  city: 'City',
  state: 'State',
  zip: 'ZIP code',
  price: 'List price',
  beds: 'Bedrooms',
  baths: 'Bathrooms',
  sqft: 'Square feet',
  propertyType: 'Property type',
  status: 'Listing status',
  remarks: 'Public remarks',
  features: 'Features',
};

export function buildListingIntakePropertyDiff(
  approvedFacts: ListingIntakeFacts,
  canonicalProperty: Record<string, unknown>,
): ListingIntakePropertyDifference[] {
  const canonical = normalizeListing(canonicalProperty);
  const intakeValues = toIntakeValues(approvedFacts);
  const canonicalValues = toCanonicalValues(canonical);

  return listingIntakePropertyFields.map((field) => ({
    field,
    label: fieldLabels[field],
    intakeValue: intakeValues[field],
    canonicalValue: canonicalValues[field],
    differs: intakeValues[field] !== null && !equivalent(field, intakeValues[field], canonicalValues[field]),
  }));
}

export function buildCanonicalListingPatch(
  approvedFacts: ListingIntakeFacts,
  selectedFields: ListingIntakePropertyField[],
) {
  const values = toIntakeValues(approvedFacts);
  const patch: Record<string, unknown> = {};

  for (const field of selectedFields) {
    const value = values[field];
    if (value === null) continue;

    switch (field) {
      case 'address':
        patch.name = value;
        patch.street = streetAddress(value, values.city);
        break;
      case 'city':
        patch.city = value;
        break;
      case 'state':
        patch.state = value;
        break;
      case 'zip':
        patch.zip = value;
        break;
      case 'price':
        patch.price = parseNumber(value);
        break;
      case 'beds':
        patch.beds = parseNumber(value);
        break;
      case 'baths':
        patch.baths = parseNumber(value);
        break;
      case 'sqft':
        patch.sqft = parseNumber(value);
        break;
      case 'propertyType':
        patch.type = value;
        break;
      case 'status':
        patch.listing_status = value;
        break;
      case 'remarks':
        patch.description = value;
        break;
      case 'features':
        patch.amenities = value.split(',').map((item) => item.trim()).filter(Boolean);
        break;
    }
  }

  return patch;
}

function toIntakeValues(facts: ListingIntakeFacts): Record<ListingIntakePropertyField, string | null> {
  return {
    address: text(facts.address),
    city: text(facts.city),
    state: text(facts.state),
    zip: text(facts.zip),
    price: text(facts.price),
    beds: text(facts.beds),
    baths: text(facts.baths),
    sqft: text(facts.sqft),
    propertyType: text(facts.propertyType),
    status: text(facts.status),
    remarks: text(facts.remarks),
    features: Array.isArray(facts.features) ? facts.features.map(String).filter(Boolean).join(', ') : text(facts.features),
  };
}

function toCanonicalValues(canonical: Listing): Record<ListingIntakePropertyField, string | null> {
  const price = canonical.list_price ?? canonical.price;
  return {
    address: text(canonical.location.street) || text(canonical.name),
    city: text(canonical.location.city),
    state: text(canonical.location.state),
    zip: text(canonical.location.zipcode),
    price: price === null || price === undefined ? null : formatNumber(price),
    beds: canonical.beds === null || canonical.beds === undefined ? null : formatNumber(canonical.beds),
    baths: canonical.baths === null || canonical.baths === undefined ? null : formatNumber(canonical.baths),
    sqft: canonical.square_feet === null || canonical.square_feet === undefined ? null : formatNumber(canonical.square_feet),
    propertyType: text(canonical.type),
    status: text(canonical.listing_status),
    remarks: text(canonical.description),
    features: canonical.amenities.length ? canonical.amenities.join(', ') : null,
  };
}

function equivalent(field: ListingIntakePropertyField, left: string, right: string | null) {
  if (right === null) return false;
  if (field === 'price' || field === 'beds' || field === 'baths' || field === 'sqft') {
    return parseNumber(left) === parseNumber(right);
  }
  if (field === 'features') return normalizeList(left) === normalizeList(right);
  return normalizeText(left) === normalizeText(right);
}

function parseNumber(value: string) {
  const normalized = value.replace(/[$,\s]/g, '');
  const shorthand = normalized.match(/^([\d.]+)([km])$/i);
  const parsed = shorthand
    ? Number(shorthand[1]) * (shorthand[2].toLowerCase() === 'k' ? 1_000 : 1_000_000)
    : Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(value);
}

function text(value: unknown) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizeList(value: string) {
  return value.split(',').map(normalizeText).filter(Boolean).sort().join(',');
}

function streetAddress(address: string, city: string | null) {
  if (!city) return address;
  const marker = new RegExp(`,?\\s*${escapeRegExp(city)}(?:,|\\s|$)`, 'i');
  const street = address.split(marker)[0]?.trim();
  return street || address;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
