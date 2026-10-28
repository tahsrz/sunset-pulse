import { afterEach, describe, expect, it, vi } from 'vitest';
import { explorerQuery, readPublicSearch, selectionQuery } from '@/lib/explorer/publicSearch';
import { buildPublicListingGeoJson, listingPrice, validCoordinates } from '@/lib/explorer/listingGeometry';
import { explorerEnvelope, explorerListing } from '../fixtures/explorerListing';

afterEach(() => vi.unstubAllGlobals());

describe('Explorer public queries', () => {
  it('uses the correct list and encoded detail endpoints', () => {
    expect(explorerQuery(new URLSearchParams(), null)).toEqual({ url: '/api/properties?pageSize=100', shape: 'list' });
    expect(explorerQuery(new URLSearchParams({ id: 'a/b?c' }), null)).toEqual({ url: '/api/properties/a%2Fb%3Fc', shape: 'detail' });
  });
  it('accepts zero coordinates and gives an area precedence over a detail ID', () => {
    expect(explorerQuery(new URLSearchParams('lat=0&lng=0&id=old'), null)).toEqual({ url: '/api/properties/search?center=0%2C0&radius=5', shape: 'search' });
  });
  it.each(['lat=1', 'lng=1', 'lat=&lng=1', 'lat=91&lng=1', 'lat=NaN&lng=1', 'id='])('rejects invalid deep links: %s', input => {
    expect(explorerQuery(new URLSearchParams(input), null)).toHaveProperty('error');
  });
  it.each(['0,0,0', '0,0,501', '0,0,Infinity', '0,0,1,2'])('rejects invalid radii: %s', data => {
    expect(selectionQuery({ type: 'radius', data })).toHaveProperty('error');
  });
  it('encodes closed polygons and rejects open, out-of-range and oversized geometry', () => {
    const data = '-97,32,-96,32,-96,33,-97,32';
    const query = selectionQuery({ type: 'polygon', data });
    expect(query).toHaveProperty('shape', 'search');
    if ('url' in query) expect(new URL(query.url, 'http://localhost').searchParams.get('polygon')).toBe(data);
    for (const invalid of ['-97,32,-96,32,-96,33,-97,33', '181,32,-96,32,-96,33,181,32', data.repeat(2000)]) {
      expect(selectionQuery({ type: 'polygon', data: invalid })).toHaveProperty('error');
    }
  });
});

describe('Explorer public response boundary', () => {
  const signal = () => new AbortController().signal;
  it.each(['list', 'detail', 'search'] as const)('reads the real %s envelope and deduplicates stable IDs', async shape => {
    const listing = explorerListing();
    const data = shape === 'detail' ? listing : shape === 'list' ? { properties: [listing, listing], total: 2 } : [listing, listing];
    const fetcher = vi.fn(async () => Response.json(explorerEnvelope(data)));
    vi.stubGlobal('fetch', fetcher);
    const abort = signal();
    expect(await readPublicSearch({ url: '/fixture', shape }, abort)).toEqual({ status: 'ready', listings: [listing] });
    expect(fetcher).toHaveBeenCalledWith('/fixture', { signal: abort });
  });
  it.each([
    { success: false, data: [explorerListing()], metadata: {} },
    explorerEnvelope({ error: 'unavailable' }),
    explorerEnvelope([{ ...explorerListing(), display_public: false }]),
    explorerEnvelope([{ ...explorerListing(), owner: 'private sentinel' }]),
    explorerEnvelope([], { source: 'unavailable' }),
  ])('does not turn malformed, private or unavailable payloads into listings', async payload => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(payload)));
    expect(await readPublicSearch({ url: '/fixture', shape: 'search' }, signal())).toEqual({ status: 'unavailable' });
  });
  it('distinguishes an empty search from missing detail and server/network failures', async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json(explorerEnvelope([])))
      .mockResolvedValueOnce(new Response(null, { status: 404 }))
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockRejectedValueOnce(new Error('offline'));
    vi.stubGlobal('fetch', fetcher);
    expect(await readPublicSearch({ url: '/fixture', shape: 'search' }, signal())).toEqual({ status: 'empty' });
    expect(await readPublicSearch({ url: '/fixture', shape: 'detail' }, signal())).toEqual({ status: 'empty' });
    expect(await readPublicSearch({ url: '/fixture', shape: 'search' }, signal())).toEqual({ status: 'unavailable' });
    expect(await readPublicSearch({ url: '/fixture', shape: 'search' }, signal())).toEqual({ status: 'unavailable' });
  });
  it('propagates aborts instead of showing an unavailable message for cancelled searches', async () => {
    const controller = new AbortController();
    const error = new DOMException('Aborted', 'AbortError');
    controller.abort();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(readPublicSearch({ url: '/fixture', shape: 'search' }, controller.signal)).rejects.toBe(error);
  });
});

describe('bounded public geometry and real price intent', () => {
  it.each([undefined, null, [NaN, 0], [0, Infinity], [181, 0], [0, -91], [0], ['0', 0]])('rejects unusable coordinates %j', value => {
    expect(validCoordinates(value)).toBe(false);
  });
  it('keeps zero and boundary coordinates', () => {
    expect(validCoordinates([0, 0])).toBe(true);
    expect(validCoordinates([-180, 90])).toBe(true);
  });
  it('does not infer monthly rent from an asking price or invent prices and yields', () => {
    expect(listingPrice({ price_type: 'lease', price: 400000 })).toMatchObject({ amount: null, label: 'Monthly rent not listed' });
    expect(listingPrice({ price_type: 'lease', rates: { monthly: 2300 }, list_price: 400000 })).toMatchObject({ amount: 2300, label: '$2,300/mo' });
    expect(listingPrice({ price_type: 'sale', list_price: 400000, rates: { monthly: 2300 } })).toMatchObject({ amount: 400000, kind: 'sale' });
    expect(listingPrice({ price_type: 'unknown', price: 10 })).toMatchObject({ amount: null });
    expect(listingPrice({ price_type: 'sale', price: NaN })).toMatchObject({ amount: null });
  });
  it('omits invalid points, deduplicates IDs and projects only public map fields', () => {
    const listing = { ...explorerListing(), owner: 'private sentinel', yield: 5.42, trend: 90 };
    const result = buildPublicListingGeoJson([listing, listing, explorerListing({ id: 'no-geo', location_geo: undefined }), explorerListing({ id: 'bad-geo', location_geo: { type: 'Point', coordinates: [999, 0] } })]);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].properties).toEqual({ id: listing.id, name: listing.name, category: listing.type, dataType: 'property', price: 400000, priceType: 'sale' });
    expect(JSON.stringify(result)).not.toMatch(/private sentinel|yield|trend/);
  });
  it('caps input at 500 and leaves a missing price null', () => {
    const records = Array.from({ length: 510 }, (_, i) => explorerListing({ id: String(i), price_type: 'unknown' }));
    const result = buildPublicListingGeoJson(records);
    expect(result.features).toHaveLength(500);
    expect(result.features[0].properties.price).toBeNull();
  });
});
