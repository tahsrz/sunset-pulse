import mongoose from 'mongoose';
import { supabaseAdmin } from '@/lib/supabase';
import connectDB from '@/lib/core/database';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';
import Property from '@/models/Property';
import { listingToRow, normalizeListing, type Listing } from './listingContract';
import { withRetry } from '@/lib/core/withRetry';
import {
  listMockCanonicalProperties,
  readMockCanonicalProperty,
  upsertMockCanonicalProperty,
} from '@/lib/mocks/canonicalProperties';

export type ListingSearch = {
  location?: string;
  city?: string;
  propertyType?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  beds?: string | number;
  baths?: string | number;
  status?: string;
  source?: 'Internal' | 'MLS';
  updatedSince?: string;
  polygon?: string;
  radius?: string | number;
  center?: string;
  includeDemo?: boolean;
};

export async function searchListings(
  filters: ListingSearch = {},
  options: { limit?: number; includeLegacy?: boolean } = {}
): Promise<Listing[]> {
  const limit = clamp(options.limit || 100, 1, 500);
  if (isMockMode()) return searchMockListings(filters).slice(0, limit);
  const canonical = await searchCanonicalListings(filters, limit);
  const legacy = options.includeLegacy === false ? [] : await searchLegacyListings(filters, limit);
  return deduplicateListings([...canonical, ...legacy]).slice(0, limit);
}

export async function getListingById(id: string): Promise<Listing | null> {
  if (isMockMode()) {
    const property = readMockCanonicalProperty(id);
    return property ? normalizeListing(property) : null;
  }
  const canonical = await getCanonicalListing(id);
  if (canonical) return canonical;

  try {
    await connectDB();
    const legacy = mongoose.Types.ObjectId.isValid(id)
      ? await Property.findById(id).lean()
      : await Property.findOne({ mls_id: id }).lean();
    return legacy ? normalizeListing(legacy as Record<string, any>) : null;
  } catch (error) {
    console.warn('[LISTING_REPOSITORY_LEGACY_DETAIL]', formatError(error));
    return null;
  }
}

export async function upsertCanonicalListing(input: Record<string, any>): Promise<Listing> {
  if (isMockMode()) return normalizeListing(upsertMockCanonicalProperty(input));
  const row = listingToRow(input);
  return withRetry(async () => {
    const { data, error } = await supabaseAdmin
      .from('properties')
      .upsert(row, { onConflict: 'mls_id' })
      .select('*')
      .single();

    if (error) throw Object.assign(new Error(`Canonical listing write failed: ${error.message}`), error);
    return normalizeListing(data);
  }, {
    onRetry: ({ attempt, delayMs, error }) => {
      console.warn('[CANONICAL_LISTING_RETRY]', { mlsId: row.mls_id, attempt, delayMs, error: formatError(error) });
    },
  });
}

function searchMockListings(filters: ListingSearch) {
  return listMockCanonicalProperties()
    .map((property) => normalizeListing(property))
    .filter((listing) => {
      const location = String(filters.city || filters.location || '').trim().toLowerCase();
      const propertyType = String(filters.propertyType || '').trim().toLowerCase();
      const minimumBeds = numberFilter(filters.beds);
      const minimumBaths = numberFilter(filters.baths);
      const minimumPrice = numberFilter(filters.minPrice);
      const maximumPrice = numberFilter(filters.maxPrice);
      const price = listing.list_price ?? listing.price ?? 0;
      const searchable = [
        listing.name,
        listing.description,
        listing.location.street,
        listing.location.city,
        listing.location.state,
        listing.location.zipcode,
        listing.mls_id,
      ].join(' ').toLowerCase();

      if (location && !searchable.includes(location)) return false;
      if (propertyType && propertyType !== 'all' && listing.type.toLowerCase() !== propertyType) return false;
      if (filters.status && listing.listing_status !== filters.status) return false;
      if (filters.source && listing.source !== filters.source) return false;
      if (minimumBeds !== null && Number(listing.beds || 0) < minimumBeds) return false;
      if (minimumBaths !== null && Number(listing.baths || 0) < minimumBaths) return false;
      if (minimumPrice !== null && price < minimumPrice) return false;
      if (maximumPrice !== null && price > maximumPrice) return false;
      return true;
    });
}

function isMockMode() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true';
}

async function searchCanonicalListings(filters: ListingSearch, limit: number): Promise<Listing[]> {
  let query = supabaseAdmin
    .from('properties')
    .select('*')
    .is('deleted_at', null)
    .eq('display_public', true)
    .order('last_updated', { ascending: false })
    .limit(limit);

  const location = filters.city || filters.location;
  if (location) {
    const safeLocation = escapePostgrestValue(location);
    query = query.or(`city.ilike.%${safeLocation}%,state.ilike.%${safeLocation}%,zip.ilike.%${safeLocation}%,name.ilike.%${safeLocation}%`);
  }
  if (filters.propertyType && filters.propertyType !== 'All') query = query.eq('type', filters.propertyType);
  if (filters.status) query = query.eq('listing_status', filters.status);
  if (filters.source) query = query.eq('source', filters.source);
  if (filters.updatedSince) query = query.gte('last_updated', filters.updatedSince);
  if (!filters.includeDemo) query = query.eq('is_demo', false);
  if (filters.minPrice) query = query.gte('price', Number(filters.minPrice));
  if (filters.maxPrice) query = query.lte('price', Number(filters.maxPrice));
  if (filters.beds && filters.beds !== 'Any') query = query.gte('beds', Number(filters.beds));
  if (filters.baths && filters.baths !== 'Any') query = query.gte('baths', Number(filters.baths));

  const { data, error } = await query;
  if (error) {
    console.warn('[LISTING_REPOSITORY_CANONICAL_SEARCH]', error.message);
    return [];
  }

  return (data || []).map((row) => normalizeListing(row));
}

async function getCanonicalListing(id: string): Promise<Listing | null> {
  let query = supabaseAdmin
    .from('properties')
    .select('*')
    .eq('display_public', true)
    .eq('is_demo', false)
    .is('deleted_at', null);
  query = isUuid(id) ? query.eq('id', id) : query.eq('mls_id', id);
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.warn('[LISTING_REPOSITORY_CANONICAL_DETAIL]', error.message);
    return null;
  }
  return data ? normalizeListing(data) : null;
}

async function searchLegacyListings(filters: ListingSearch, limit: number): Promise<Listing[]> {
  try {
    await connectDB();
    const { query } = buildPropertyQuery({
      ...filters,
      includeDemo: filters.includeDemo ? 'true' : 'false',
    });
    const rows = await Property.find(query).limit(limit).lean();
    return rows.map((row) => normalizeListing(row as Record<string, any>));
  } catch (error) {
    console.warn('[LISTING_REPOSITORY_LEGACY_SEARCH]', formatError(error));
    return [];
  }
}

function deduplicateListings(listings: Listing[]) {
  const seen = new Set<string>();
  return listings.filter((listing) => {
    const key = listing.mls_id ? `mls:${listing.mls_id}` : `id:${listing.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function escapePostgrestValue(value: string) {
  return value.replace(/[(),]/g, ' ').trim();
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function numberFilter(value: string | number | undefined) {
  if (value === undefined || value === '' || value === 'Any') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
