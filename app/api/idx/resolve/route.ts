import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { mlsService } from '@/lib/data/mls';
import { sanitizeMlsForPublicUse } from '@/lib/data/mlsCompliance';

function normalizeReference(reference: unknown) {
  return typeof reference === 'string' ? reference.trim() : '';
}

function looksLikeAddress(reference: string) {
  return /\d+\s+\S+/.test(reference);
}

function addressScore(property: any, reference: string) {
  const normalizedRef = reference.toLowerCase();
  const addressParts = [
    property?.name,
    property?.location?.street,
    property?.location?.city,
    property?.location?.state,
    property?.location?.zipcode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!addressParts) return 0;
  if (addressParts.includes(normalizedRef)) return 2;

  const tokens = normalizedRef.split(/\s+/).filter((token) => token.length > 2);
  return tokens.reduce((score, token) => score + (addressParts.includes(token) ? 1 : 0), 0);
}

async function resolveListing(reference: string) {
  const directListing = await mlsService.getListingById(reference);
  if (directListing) return directListing;

  if (!looksLikeAddress(reference)) return null;

  const listings = await mlsService.getListings({ search: reference, address: reference });
  if (!Array.isArray(listings) || listings.length === 0) return null;

  return listings
    .map((property: any) => ({ property, score: addressScore(property, reference) }))
    .sort((a, b) => b.score - a.score)[0]?.property || null;
}

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();
    const normalizedReference = normalizeReference(reference);

    if (!normalizedReference) {
      return errorResponse('Enter an MLS number or property address.', 400);
    }

    const listing = await resolveListing(normalizedReference);

    if (!listing) {
      return errorResponse(
        'I could not resolve that listing from the approved MLS provider. Try the MLS number from Matrix for the cleanest match.',
        404,
      );
    }

    return successResponse({
      listing: sanitizeMlsForPublicUse(listing),
      source: 'approved-mls-provider',
    });
  } catch (error: any) {
    console.error('IDX listing resolve failed:', error);
    return errorResponse('Could not resolve MLS listing.', 500, error.message);
  }
}
