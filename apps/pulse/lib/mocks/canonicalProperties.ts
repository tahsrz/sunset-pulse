import { mockSearchProperties } from '@/lib/mocks/propertySearch';
import { listingToRow } from '@/lib/data/listingContract';

type MockCanonicalProperty = Record<string, unknown> & {
  id: string;
  mls_id: string;
  last_updated: string | null;
};

const MOCK_CANONICAL_LAST_UPDATED = '2026-01-01T00:00:00.000Z';

type MockCanonicalGlobal = typeof globalThis & {
  __sunsetPulseMockCanonicalProperties?: Map<string, MockCanonicalProperty>;
};

export function readMockCanonicalProperty(reference: string, requireId = false) {
  const value = reference.trim();
  const property = requireId || isUuid(value)
    ? getMockCanonicalProperties().get(value)
    : Array.from(getMockCanonicalProperties().values()).find((row) => row.id === value || row.mls_id === value);
  return property ? cloneRecord(property) : null;
}

export function listMockCanonicalProperties() {
  return Array.from(getMockCanonicalProperties().values()).map(cloneRecord);
}

export function upsertMockCanonicalProperty(input: Record<string, unknown>) {
  const row = listingToRow(input);
  const id = String(input.id || input._id || row.mls_id);
  const existing = getMockCanonicalProperties().get(id);
  const next: MockCanonicalProperty = {
    ...(existing || {}),
    ...row,
    id,
    mls_id: String(row.mls_id || id),
    last_updated: row.last_updated || new Date().toISOString(),
  };
  getMockCanonicalProperties().set(id, next);
  return cloneRecord(next);
}

export function applyMockCanonicalPropertyPatch(
  propertyId: string,
  patch: Record<string, unknown>,
  expectedLastUpdated: string | null,
  nowIso = new Date().toISOString(),
) {
  const store = getMockCanonicalProperties();
  const property = store.get(propertyId);
  if (!property || property.last_updated !== expectedLastUpdated) return null;

  const updated = {
    ...property,
    ...patch,
    last_updated: nowIso,
  };
  store.set(propertyId, updated);
  return cloneRecord(updated);
}

export function resetMockCanonicalPropertiesForTests() {
  const globalStore = globalThis as MockCanonicalGlobal;
  globalStore.__sunsetPulseMockCanonicalProperties = buildSeedProperties();
}

function getMockCanonicalProperties() {
  const globalStore = globalThis as MockCanonicalGlobal;
  if (!globalStore.__sunsetPulseMockCanonicalProperties) {
    globalStore.__sunsetPulseMockCanonicalProperties = buildSeedProperties();
  }
  return globalStore.__sunsetPulseMockCanonicalProperties;
}

function buildSeedProperties() {
  return new Map(mockSearchProperties.map((property) => {
    const [longitude, latitude] = property.location_geo.coordinates;
    const row: MockCanonicalProperty = {
      id: property._id,
      mls_id: property.mls_id,
      name: property.name,
      type: property.type,
      description: property.description,
      street: property.location.street,
      city: property.location.city,
      state: property.location.state,
      zip: property.location.zipcode,
      longitude,
      latitude,
      beds: property.beds,
      baths: property.baths,
      sqft: property.square_feet,
      price: property.list_price,
      price_type: property.price_type,
      rates: {},
      amenities: property.amenities,
      images: property.images,
      image_url: property.image_url,
      source: property.source,
      listing_status: property.listing_status,
      last_updated: MOCK_CANONICAL_LAST_UPDATED,
      is_demo: property.is_demo,
      is_featured: false,
      display_public: true,
      deleted_at: null,
      metadata: {},
    };
    return [row.id, row] as const;
  }));
}

function cloneRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
