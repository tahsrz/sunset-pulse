import type { NormalizedMlsListing } from './mlsTypes';

export type OpenResyncCanonicalListing = NormalizedMlsListing & { display_public: boolean };

export function mapRawOpenResyncProperty(
  row: Record<string, any>,
  mediaByListing: Map<string, string[]> = new Map()
): OpenResyncCanonicalListing {
  const listingKey = String(row.ListingKey || row.ListingId || '');
  const mlsId = String(row.ListingId || row.ListingKey || '');
  if (!listingKey || !mlsId) throw new Error('Raw Property row is missing ListingKey/ListingId.');

  const rawStreet = String(row.UnparsedAddress || [
    row.StreetNumber,
    row.StreetDirPrefix,
    row.StreetName,
    row.StreetSuffix,
    row.UnitNumber ? `#${row.UnitNumber}` : '',
  ].filter(Boolean).join(' '));
  const listPrice = numberOrUndefined(row.ListPrice);
  const propertyType = String(row.PropertyType || row.PropertySubType || 'Residential');
  const isLease = /lease|rental/i.test(propertyType);
  const displayPublic = isAffirmative(row.InternetEntireListingDisplayYN);
  const displayAddress = displayPublic && isAffirmative(row.InternetAddressDisplayYN);
  const street = displayAddress ? rawStreet : '';

  return {
    _id: listingKey,
    name: street || [row.City, propertyType].filter(Boolean).join(' ') || mlsId,
    type: propertyType,
    description: String(row.PublicRemarks || ''),
    location: {
      street,
      city: String(row.City || ''),
      state: String(row.StateOrProvince || 'TX'),
      zipcode: String(row.PostalCode || ''),
    },
    location_geo: validCoordinates(row.Longitude, row.Latitude),
    beds: numberOrUndefined(row.BedroomsTotal),
    baths: numberOrUndefined(row.BathroomsTotalInteger ?? row.BathroomsFull),
    square_feet: numberOrUndefined(row.LivingArea),
    amenities: normalizeArray(row.Appliances),
    list_price: listPrice,
    price: isLease ? undefined : listPrice,
    price_type: isLease ? 'lease' : 'sale',
    rates: { monthly: isLease ? listPrice : undefined },
    images: displayPublic ? (mediaByListing.get(listingKey) || mediaByListing.get(mlsId) || []) : [],
    source: 'MLS',
    mls_id: mlsId,
    listing_status: String(row.StandardStatus || row.MlsStatus || 'Active'),
    last_updated: dateOrUndefined(row.ModificationTimestamp),
    is_demo: false,
    metadata: {
      provider: 'openresync',
      resource: 'Property',
      standardStatus: row.StandardStatus || null,
      listDate: dateOrUndefined(row.ListingContractDate || row.OnMarketDate),
      modificationTimestamp: dateOrUndefined(row.ModificationTimestamp),
      photoCount: numberOrUndefined(row.PhotosCount),
    },
    display_public: displayPublic,
  };
}

function validCoordinates(longitude: unknown, latitude: unknown) {
  const lng = Number(longitude);
  const lat = Number(latitude);
  return Number.isFinite(lng) && Number.isFinite(lat) && Math.abs(lng) <= 180 && Math.abs(lat) <= 90
    ? { type: 'Point' as const, coordinates: [lng, lat] }
    : undefined;
}

function normalizeArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [value];
  } catch {
    return value.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function numberOrUndefined(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function dateOrUndefined(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isAffirmative(value: unknown) {
  return value === true || value === 1 || /^(y|yes|true|1)$/i.test(String(value || ''));
}
