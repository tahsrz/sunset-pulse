import 'server-only';

import { discoverListingById } from '@/lib/data/listingDiscovery';
import type { Listing } from '@/lib/data/listingContract';

const MAX_DESCRIPTION_LENGTH = 1_200;

export type JamieListingContext = Pick<
  Listing,
  | 'id'
  | '_id'
  | 'mls_id'
  | 'name'
  | 'type'
  | 'location'
  | 'beds'
  | 'baths'
  | 'square_feet'
  | 'price'
  | 'list_price'
  | 'price_type'
  | 'rates'
  | 'source'
  | 'listing_status'
  | 'last_updated'
> & { description: string };

type JamieListingDependencies = {
  discoverById?: typeof discoverListingById;
};

export async function resolveJamieListingContext(
  listingId: string | null | undefined,
  dependencies: JamieListingDependencies = {},
): Promise<JamieListingContext | undefined> {
  const normalizedId = listingId?.trim();
  if (!normalizedId) return undefined;

  const listing = await (dependencies.discoverById || discoverListingById)(normalizedId);
  if (!listing) return undefined;

  return {
    id: listing.id,
    _id: listing._id,
    mls_id: listing.mls_id,
    name: listing.name,
    type: listing.type,
    description: listing.description.slice(0, MAX_DESCRIPTION_LENGTH),
    location: listing.location,
    beds: listing.beds,
    baths: listing.baths,
    square_feet: listing.square_feet,
    price: listing.price,
    list_price: listing.list_price,
    price_type: listing.price_type,
    rates: listing.rates,
    source: listing.source,
    listing_status: listing.listing_status,
    last_updated: listing.last_updated,
  };
}
