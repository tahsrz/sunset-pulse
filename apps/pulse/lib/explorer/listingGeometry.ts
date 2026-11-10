export type Coordinates = [number, number];

export function validCoordinates(value: unknown): value is Coordinates {
  return Array.isArray(value) && value.length === 2 &&
    typeof value[0] === 'number' && Number.isFinite(value[0]) && Math.abs(value[0]) <= 180 &&
    typeof value[1] === 'number' && Number.isFinite(value[1]) && Math.abs(value[1]) <= 90;
}

export type MapListing = {
  id?: string; _id?: string; name?: string; type?: string;
  location_geo?: { coordinates?: unknown };
  price_type?: string; list_price?: number | null; price?: number | null;
  rates?: { monthly?: number | null };
};

const positivePrice = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0;

export function listingPrice(listing: MapListing) {
  if (listing.price_type === 'sale') {
    const amount = [listing.list_price, listing.price].find(positivePrice) ?? null;
    return { kind: 'sale' as const, amount, label: amount === null ? 'Sale price not listed' : `$${amount.toLocaleString('en-US')}` };
  }
  if (listing.price_type === 'lease') {
    const amount = positivePrice(listing.rates?.monthly) ? listing.rates.monthly : null;
    return { kind: 'monthly' as const, amount, label: amount === null ? 'Monthly rent not listed' : `$${amount.toLocaleString('en-US')}/mo` };
  }
  return { kind: 'unknown' as const, amount: null, label: 'Price not listed' };
}

export function buildPublicListingGeoJson(listings: readonly MapListing[]) {
  const seen = new Set<string>();
  return {
    type: 'FeatureCollection' as const,
    features: listings.slice(0, 500).flatMap(listing => {
      if (!listing || !validCoordinates(listing.location_geo?.coordinates)) return [];
      const id = listing.id || listing._id;
      if (typeof id !== 'string' || !id || seen.has(id)) return [];
      seen.add(id);
      const price = listingPrice(listing);
      return [{
        type: 'Feature' as const, id,
        geometry: { type: 'Point' as const, coordinates: listing.location_geo.coordinates },
        properties: { id, name: listing.name || '', category: listing.type || '', dataType: 'property', price: price.amount, priceType: price.kind },
      }];
    }),
  };
}
