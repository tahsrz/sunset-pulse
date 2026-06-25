import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type MockListing = {
  mlsNumber?: string;
  standardStatus?: string;
  listPrice?: number;
  originalPrice?: number;
  daysOnMarket?: number;
  simpleDaysOnMarket?: number;
  photoCount?: number;
  address?: {
    area?: string;
    city?: string;
    neighborhood?: string;
    state?: string;
    streetName?: string;
    streetNumber?: string;
    zip?: string;
  };
  details?: {
    numBathrooms?: number;
    numBathroomsHalf?: number;
    numBedrooms?: number;
    propertyType?: string;
    sqft?: string;
    style?: string;
    yearBuilt?: string;
  };
  estimate?: {
    confidence?: number;
    value?: number;
  };
  imageInsights?: {
    summary?: {
      quality?: {
        qualitative?: { overall?: string };
        quantitative?: { overall?: number };
      };
    };
  };
  lot?: {
    acres?: number;
    squareFeet?: number;
  };
  map?: {
    latitude?: number;
    longitude?: number;
  };
  office?: {
    brokerageName?: string;
  };
};

const MOCK_LISTINGS_PATH = path.join(process.cwd(), 'lib', 'mocks', 'repliers', 'listings.json');

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = clamp(Number(url.searchParams.get('limit') || 100), 1, 500);
  const body = JSON.parse(fs.readFileSync(MOCK_LISTINGS_PATH, 'utf8')) as { listings?: MockListing[] };
  const rows = (body.listings || [])
    .filter((listing) => Number.isFinite(listing.map?.latitude) && Number.isFinite(listing.map?.longitude))
    .slice(0, limit)
    .map(toKeplerListingRow);

  return NextResponse.json({
    dataset: {
      id: 'sunset_listing_signals',
      label: 'Sunset Pulse listing signals',
      rowCount: rows.length,
      rows
    }
  });
}

function toKeplerListingRow(listing: MockListing, index: number) {
  const price = Number(listing.listPrice || 0);
  const estimate = Number(listing.estimate?.value || 0);
  const originalPrice = Number(listing.originalPrice || price);

  return {
    id: listing.mlsNumber || `listing-${index}`,
    latitude: Number(listing.map?.latitude),
    longitude: Number(listing.map?.longitude),
    price,
    originalPrice,
    estimate,
    priceVsEstimate: estimate ? Math.round(price - estimate) : null,
    priceChange: originalPrice ? Math.round(price - originalPrice) : null,
    daysOnMarket: Number(listing.simpleDaysOnMarket || listing.daysOnMarket || 0),
    bedrooms: Number(listing.details?.numBedrooms || 0),
    bathrooms: Number(listing.details?.numBathrooms || 0) + Number(listing.details?.numBathroomsHalf || 0) * 0.5,
    sqft: Number(listing.details?.sqft || 0),
    yearBuilt: Number(listing.details?.yearBuilt || 0),
    lotAcres: Number(listing.lot?.acres || 0),
    lotSquareFeet: Number(listing.lot?.squareFeet || 0),
    photoCount: Number(listing.photoCount || 0),
    imageQuality: Number(listing.imageInsights?.summary?.quality?.quantitative?.overall || 0),
    estimateConfidence: Number(listing.estimate?.confidence || 0),
    status: listing.standardStatus || 'Unknown',
    propertyType: listing.details?.propertyType || 'Unknown',
    style: listing.details?.style || 'Unknown',
    qualityBand: listing.imageInsights?.summary?.quality?.qualitative?.overall || 'unknown',
    city: listing.address?.city || 'Unknown',
    state: listing.address?.state || 'Unknown',
    area: listing.address?.area || 'Unknown',
    neighborhood: listing.address?.neighborhood || 'Unknown',
    brokerage: listing.office?.brokerageName || 'Unknown',
    address: [
      listing.address?.streetNumber,
      listing.address?.streetName,
      listing.address?.city,
      listing.address?.state,
      listing.address?.zip
    ].filter(Boolean).join(' ')
  };
}

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
