import { z } from 'zod';

const locationSchema = z.object({
  street: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default('TX'),
  zipcode: z.string().optional().default(''),
});

const geoPointSchema = z.object({
  type: z.literal('Point').default('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
}).optional();

export const listingSchema = z.object({
  id: z.string(),
  _id: z.string(),
  mls_id: z.string().optional(),
  owner: z.string().optional(),
  name: z.string().min(1),
  type: z.string().default('Residential'),
  description: z.string().optional().default(''),
  location: locationSchema,
  location_geo: geoPointSchema,
  beds: z.number().nullable().optional(),
  baths: z.number().nullable().optional(),
  square_feet: z.number().nullable().optional(),
  amenities: z.array(z.string()).default([]),
  price: z.number().nullable().optional(),
  list_price: z.number().nullable().optional(),
  price_type: z.enum(['sale', 'lease', 'unknown']).default('unknown'),
  rates: z.object({
    nightly: z.number().nullable().optional(),
    weekly: z.number().nullable().optional(),
    monthly: z.number().nullable().optional(),
  }).default({}),
  images: z.array(z.string()).default([]),
  image_url: z.string().nullable().optional(),
  source: z.enum(['Internal', 'MLS']).default('MLS'),
  listing_status: z.string().default('Active'),
  last_updated: z.string().optional(),
  is_demo: z.boolean().default(false),
  is_featured: z.boolean().default(false),
  display_public: z.boolean().default(false),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type Listing = z.infer<typeof listingSchema>;

export function normalizeListing(input: Record<string, any>): Listing {
  const id = String(input.id || input._id || input.mls_id || input.mls_number || '');
  const longitude = finiteNumber(input.longitude ?? input.location_geo?.coordinates?.[0]);
  const latitude = finiteNumber(input.latitude ?? input.location_geo?.coordinates?.[1]);
  const images = normalizeImages(input.images, input.image_url);
  const listPrice = nullableNumber(input.list_price ?? input.price);

  return listingSchema.parse({
    id,
    _id: id,
    mls_id: optionalString(input.mls_id || input.mls_number),
    owner: optionalString(input.owner || input.owner_id),
    name: String(input.name || input.address || input.mls_id || 'Untitled property'),
    type: String(input.type || input.property_type || 'Residential'),
    description: String(input.description || ''),
    location: {
      street: String(input.location?.street || input.street || ''),
      city: String(input.location?.city || input.city || ''),
      state: String(input.location?.state || input.state || 'TX'),
      zipcode: String(input.location?.zipcode || input.zip || ''),
    },
    location_geo: longitude !== null && latitude !== null
      ? { type: 'Point', coordinates: [longitude, latitude] }
      : undefined,
    beds: nullableNumber(input.beds),
    baths: nullableNumber(input.baths),
    square_feet: nullableNumber(input.square_feet ?? input.sqft),
    amenities: normalizeStringArray(input.amenities),
    price: nullableNumber(input.price ?? input.list_price),
    list_price: listPrice,
    price_type: normalizePriceType(input.price_type),
    rates: normalizeRates(input.rates),
    images,
    image_url: images[0] || null,
    source: input.source === 'Internal' ? 'Internal' : 'MLS',
    listing_status: String(input.listing_status || input.status || 'Active'),
    last_updated: optionalDateString(input.last_updated || input.updated_at || input.updatedAt),
    is_demo: normalizeBoolean(input.is_demo, false),
    is_featured: normalizeBoolean(input.is_featured, false),
    display_public: normalizeBoolean(input.display_public, false),
    metadata: parseRecord(input.metadata),
  });
}

export function listingToRow(input: Record<string, any>) {
  const listing = normalizeListing(input);
  const [longitude, latitude] = listing.location_geo?.coordinates || [null, null];

  return {
    mls_id: listing.mls_id || listing.id,
    name: listing.name,
    type: listing.type,
    description: listing.description,
    street: listing.location.street,
    city: listing.location.city,
    state: listing.location.state,
    zip: listing.location.zipcode,
    latitude,
    longitude,
    beds: listing.beds || 0,
    baths: listing.baths || 0,
    sqft: listing.square_feet || 0,
    price: listing.list_price ?? listing.price ?? listing.rates.monthly ?? 0,
    price_type: listing.price_type,
    rates: listing.rates,
    amenities: listing.amenities,
    images: listing.images,
    image_url: listing.images[0] || null,
    source: listing.source,
    listing_status: listing.listing_status,
    last_updated: listing.last_updated || new Date().toISOString(),
    is_demo: listing.is_demo,
    is_featured: listing.is_featured,
    display_public: listing.display_public,
    metadata: listing.metadata,
  };
}

export function hasUsableRemoteListingImage(input: { images?: unknown; image_url?: unknown }) {
  return normalizeImages(input.images, input.image_url).some((image) => /^https:\/\//i.test(image));
}

function normalizeImages(images: unknown, imageUrl: unknown) {
  const parsed = parseJson(images);
  const candidates = Array.isArray(parsed) ? parsed : imageUrl ? [imageUrl] : [];
  return candidates.map(String).map((value) => value.trim()).filter(Boolean);
}

function normalizeRates(value: unknown) {
  const parsed = parseRecord(value);
  return {
    nightly: nullableNumber(parsed.nightly),
    weekly: nullableNumber(parsed.weekly),
    monthly: nullableNumber(parsed.monthly),
  };
}

function normalizeStringArray(value: unknown) {
  const parsed = parseJson(value);
  return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (value === null || value === undefined || value === '') return fallback;
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  if (value === true || value === 1 || value === '1' || value === 'true') return true;
  return fallback;
}

function parseRecord(value: unknown): Record<string, any> {
  const parsed = parseJson(value);
  return isRecord(parsed) ? parsed : {};
}

function parseJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function normalizePriceType(value: unknown): 'sale' | 'lease' | 'unknown' {
  return value === 'sale' || value === 'lease' ? value : 'unknown';
}

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return finiteNumber(value);
}

function optionalString(value: unknown) {
  return value === null || value === undefined || value === '' ? undefined : String(value);
}

function optionalDateString(value: unknown) {
  if (!value) return undefined;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
