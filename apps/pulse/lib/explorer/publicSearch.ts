import { z } from 'zod';
import { publicListingSchema, type PublicListing } from '@/lib/data/publicListingContract';
import { validCoordinates } from './listingGeometry';

export type ExplorerSelection = { type: 'radius' | 'polygon'; data: string };
export type ExplorerResult = { status: 'ready'; listings: PublicListing[] } | { status: 'empty' | 'unavailable' };
export type ExplorerSearchState = ExplorerResult | { status: 'loading' };
export type ExplorerQuery = { url: string; shape: 'list' | 'detail' | 'search' } | { error: string };

const envelope = z.object({ success: z.literal(true), data: z.unknown(), metadata: z.object({ source: z.string().optional() }).passthrough() });
const listData = z.object({ properties: z.array(publicListingSchema).max(100), total: z.number().nonnegative() });
const searchData = z.array(publicListingSchema).max(500);

export function selectionQuery(selection: ExplorerSelection): ExplorerQuery {
  if (selection.data.length > 24000) return { error: 'Choose a smaller area.' };
  const strings = selection.data.split(',');
  if (strings.some(value => !value.trim())) return { error: 'Choose a valid area.' };
  const values = strings.map(Number);
  const params = new URLSearchParams();
  if (selection.type === 'radius') {
    const [lat, lng, radius] = values;
    if (values.length !== 3 || !validCoordinates([lng, lat]) || !Number.isFinite(radius) || radius <= 0 || radius > 500) return { error: 'Choose a valid radius and location.' };
    params.set('center', `${lng},${lat}`);
    params.set('radius', String(radius));
  } else if (selection.type === 'polygon') {
    if (values.length < 8 || values.length > 1002 || values.length % 2 !== 0) return { error: 'Choose a valid polygon.' };
    for (let i = 0; i < values.length; i += 2) if (!validCoordinates([values[i], values[i + 1]])) return { error: 'Choose a valid polygon.' };
    if (values[0] !== values[values.length - 2] || values[1] !== values[values.length - 1]) return { error: 'Close the polygon before searching.' };
    params.set('polygon', values.join(','));
  } else return { error: 'Choose a valid area.' };
  return { url: `/api/properties/search?${params}`, shape: 'search' };
}

export function explorerQuery(params: Pick<URLSearchParams, 'get'>, selection: ExplorerSelection | null): ExplorerQuery {
  if (selection) return selectionQuery(selection);
  const lat = params.get('lat');
  const lng = params.get('lng');
  if (lat !== null || lng !== null) {
    if (lat === null || lng === null) return { error: 'Include both latitude and longitude.' };
    return selectionQuery({ type: 'radius', data: `${lat},${lng},5` });
  }
  const id = params.get('id');
  if (id !== null) {
    if (!id.trim() || id.length > 180) return { error: 'Choose a valid property.' };
    return { url: `/api/properties/${encodeURIComponent(id)}`, shape: 'detail' };
  }
  return { url: '/api/properties?pageSize=100', shape: 'list' };
}

export async function readPublicSearch(query: Extract<ExplorerQuery, { url: string }>, signal: AbortSignal): Promise<ExplorerResult> {
  try {
    const response = await fetch(query.url, { signal });
    if (response.status === 404 && query.shape === 'detail') return { status: 'empty' };
    if (!response.ok) return { status: 'unavailable' };
    const parsed = envelope.safeParse(await response.json());
    if (!parsed.success || parsed.data.metadata.source === 'unavailable') return { status: 'unavailable' };
    let listings: PublicListing[];
    if (query.shape === 'detail') {
      const detail = publicListingSchema.safeParse(parsed.data.data);
      if (!detail.success) return { status: 'unavailable' };
      listings = [detail.data];
    } else if (query.shape === 'list') {
      const list = listData.safeParse(parsed.data.data);
      if (!list.success) return { status: 'unavailable' };
      listings = list.data.properties;
    } else {
      const search = searchData.safeParse(parsed.data.data);
      if (!search.success) return { status: 'unavailable' };
      listings = search.data;
    }
    const seen = new Set<string>();
    listings = listings.filter(listing => {
      if (seen.has(listing.id)) return false;
      seen.add(listing.id);
      return true;
    });
    return listings.length ? { status: 'ready', listings } : { status: 'empty' };
  } catch (error) {
    if (signal.aborted) throw error;
    return { status: 'unavailable' };
  }
}
