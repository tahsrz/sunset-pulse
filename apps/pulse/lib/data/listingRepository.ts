import mongoose from 'mongoose';
import { supabaseAdmin } from '@/lib/supabase';
import connectDB from '@/lib/core/database';
import { buildPropertyQuery } from '@/lib/core/propertyQueryBuilder';
import Property from '@/models/Property';
import { listingToRow, normalizeListing, type Listing } from './listingContract';
import { withRetry } from '@/lib/core/withRetry';

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
  const canonical = await searchCanonicalListings(filters, limit);
  const legacy = options.includeLegacy === false ? [] : await searchLegacyListings(filters, limit);
  return deduplicateListings([...canonical, ...legacy]).slice(0, limit);
}

export async function getListingById(id: string): Promise<Listing | null> {
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

function formatError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
