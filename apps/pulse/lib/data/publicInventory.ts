import { z } from 'zod';
import { searchListings } from './listingRepository';
import type { Listing } from './listingContract';

const publicLocationSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipcode: z.string(),
}).strict();

const publicGeoSchema = z.object({
  type: z.literal('Point'),
  coordinates: z.tuple([z.number(), z.number()]),
}).strict();

/** Compatibility-shaped public record with no private owner or metadata fields. */
export const publicListingSchema = z.object({
  id: z.string(),
  _id: z.string(),
  mls_id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  description: z.string(),
  location: publicLocationSchema,
  location_geo: publicGeoSchema.optional(),
  beds: z.number().nullable().optional(),
  baths: z.number().nullable().optional(),
  square_feet: z.number().nullable().optional(),
  amenities: z.array(z.string()),
  price: z.number().nullable().optional(),
  list_price: z.number().nullable().optional(),
  price_type: z.enum(['sale', 'lease', 'unknown']),
  rates: z.object({
    nightly: z.number().nullable().optional(),
    weekly: z.number().nullable().optional(),
    monthly: z.number().nullable().optional(),
  }).strict(),
  images: z.array(z.string()),
  image_url: z.string().nullable().optional(),
  source: z.enum(['Internal', 'MLS']),
  listing_status: z.string(),
  last_updated: z.string().optional(),
  is_demo: z.literal(false),
  is_featured: z.boolean(),
  display_public: z.literal(true),
}).strict();

export type PublicListing = z.infer<typeof publicListingSchema>;

const HISTORICAL_STATUSES = ['Sold', 'Closed', 'S'] as const;

/** Public historical inventory used by games and other non-live experiences. */
export async function searchHistoricalPublicListings(limit = 200): Promise<PublicListing[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const results = await Promise.all(HISTORICAL_STATUSES.map((status) => searchListings({
    status,
    includeDemo: false,
  }, { limit: boundedLimit, publicOnly: true })));

  const seen = new Set<string>();
  return results
    .flat()
    .filter((listing) => {
      if (seen.has(listing.id)) return false;
      seen.add(listing.id);
      return true;
    })
    .map(projectPublicListing)
    .slice(0, boundedLimit);
}

export function projectPublicListing(listing: Listing): PublicListing {
  if (listing.is_demo || !listing.display_public) {
    throw new Error('Listing is not eligible for public projection.');
  }

  return publicListingSchema.parse({
    id: listing.id,
    _id: listing._id,
    mls_id: listing.mls_id,
    name: listing.name,
    type: listing.type,
    description: listing.description,
    location: listing.location,
    location_geo: listing.location_geo,
    beds: listing.beds,
    baths: listing.baths,
    square_feet: listing.square_feet,
    amenities: listing.amenities,
    price: listing.price,
    list_price: listing.list_price,
    price_type: listing.price_type,
    rates: listing.rates,
    images: listing.images,
    image_url: listing.image_url,
    source: listing.source,
    listing_status: listing.listing_status,
    last_updated: listing.last_updated,
    is_demo: listing.is_demo,
    is_featured: listing.is_featured,
    display_public: true,
  });
}
