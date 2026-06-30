import { NextResponse } from 'next/server';
import { searchListings } from '@/lib/data/listingRepository';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = clamp(Number(url.searchParams.get('limit') || 100), 1, 500);
    const listings = await searchListings({}, { limit });
    const rows = listings
      .filter((listing) => listing.location_geo?.coordinates.every(Number.isFinite))
      .map(toKeplerListingRow);

    return NextResponse.json({
      dataset: {
        id: 'sunset_listing_signals',
        label: 'Sunset Pulse listing signals',
        rowCount: rows.length,
        rows
      }
    });
  } catch (error) {
    console.error('[KEPLER_LISTINGS_API] Failed to load listing dataset:', error);
    return NextResponse.json(
      {
        error: 'Kepler listing dataset unavailable.'
      },
      { status: 500 }
    );
  }
}

function toKeplerListingRow(listing: any, index: number) {
  const metadata = listing.metadata || {};
  const price = Number(listing.list_price ?? listing.price ?? listing.rates?.monthly ?? 0);
  const estimate = Number(metadata.estimate || 0);
  const originalPrice = Number(metadata.originalPrice || price);
  const [longitude, latitude] = listing.location_geo.coordinates;

  return {
    id: listing.id || `listing-${index}`,
    latitude,
    longitude,
    price,
    originalPrice,
    estimate,
    priceVsEstimate: estimate ? Math.round(price - estimate) : null,
    priceChange: originalPrice ? Math.round(price - originalPrice) : null,
    daysOnMarket: Number(metadata.daysOnMarket || 0),
    bedrooms: Number(listing.beds || 0),
    bathrooms: Number(listing.baths || 0),
    sqft: Number(listing.square_feet || 0),
    yearBuilt: Number(metadata.yearBuilt || 0),
    lotAcres: Number(metadata.lotAcres || 0),
    lotSquareFeet: Number(metadata.lotSquareFeet || 0),
    photoCount: Number(metadata.photoCount || listing.images.length || 0),
    imageQuality: Number(metadata.imageQuality || 0),
    estimateConfidence: Number(metadata.estimateConfidence || 0),
    status: listing.listing_status || 'Unknown',
    propertyType: listing.type || 'Unknown',
    style: metadata.style || 'Unknown',
    qualityBand: metadata.qualityBand || 'unknown',
    city: listing.location.city || 'Unknown',
    state: listing.location.state || 'Unknown',
    area: metadata.area || 'Unknown',
    neighborhood: metadata.neighborhood || 'Unknown',
    brokerage: metadata.brokerage || 'Unknown',
    address: [listing.location.street, listing.location.city, listing.location.state, listing.location.zipcode]
      .filter(Boolean).join(' ')
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
