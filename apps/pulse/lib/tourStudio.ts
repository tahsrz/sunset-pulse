import type { Listing } from '@/lib/data/listingContract';

export type TourStudioStop = {
  stopNumber: number;
  listingId: string;
  propertyHref: string;
  mlsId?: string;
  title: string;
  addressLine: string;
  cityLine: string;
  priceLabel: string;
  specs: string[];
  imageUrl: string;
  mapQuery: string;
};

export function buildTourStudioStops(listings: Listing[]): TourStudioStop[] {
  return listings.map((listing, index) => {
    const addressLine = formatStreetAddress(listing);
    const cityLine = formatCityLine(listing);
    const price = listing.list_price ?? listing.price ?? listing.rates?.monthly ?? null;

    return {
      stopNumber: index + 1,
      listingId: listing.id,
      propertyHref: `/properties/${listing._id}`,
      mlsId: listing.mls_id,
      title: listing.name,
      addressLine,
      cityLine,
      priceLabel: formatPrice(price),
      specs: formatSpecs(listing),
      imageUrl: listing.images?.[0] || listing.image_url || '',
      mapQuery: [addressLine, cityLine].filter(Boolean).join(', ') || listing.name,
    };
  });
}

export function buildGoogleMapsRouteUrl(stops: TourStudioStop[]) {
  if (stops.length === 0) return null;

  if (stops.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stops[0].mapQuery)}`;
  }

  const destination = stops[stops.length - 1].mapQuery;
  const waypoints = stops.slice(0, -1).map((stop) => stop.mapQuery).join('|');

  return [
    'https://www.google.com/maps/dir/?api=1',
    `destination=${encodeURIComponent(destination)}`,
    `waypoints=${encodeURIComponent(waypoints)}`,
    'travelmode=driving',
  ].join('&');
}

function formatStreetAddress(listing: Listing) {
  return listing.location?.street || listing.name;
}

function formatCityLine(listing: Listing) {
  const cityState = [listing.location?.city, listing.location?.state].filter(Boolean).join(', ');
  return [cityState, listing.location?.zipcode].filter(Boolean).join(' ');
}

function formatPrice(value: number | null | undefined) {
  if (!value) return 'Price on request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatSpecs(listing: Listing) {
  return [
    listing.beds ? `${listing.beds} bd` : '',
    listing.baths ? `${listing.baths} ba` : '',
    listing.square_feet ? `${listing.square_feet.toLocaleString()} sqft` : '',
  ].filter(Boolean);
}
