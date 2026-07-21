import type { Listing } from '@/lib/data/listingContract';
import type { AgentTenantSite } from '@/lib/sites/siteData';

type SiteLike = Pick<AgentTenantSite, 'featuredListings' | 'sections'> & {
  agentProfile: Pick<AgentTenantSite['agentProfile'], 'markets'>;
};

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

export function safeSiteSections(site: Pick<SiteLike, 'sections'>) {
  return safeArray<AgentTenantSite['sections'][number]>(site.sections);
}

export function safeSiteFeaturedListings(site: Pick<SiteLike, 'featuredListings'>) {
  return safeArray<Listing>(site.featuredListings);
}

export function safeAgentMarkets(site: Pick<SiteLike, 'agentProfile'>) {
  return safeArray<string>(site.agentProfile.markets)
    .map((market) => String(market).trim())
    .filter(Boolean);
}

export function safeListingImages(listing: Pick<Listing, 'image_url' | 'images'>) {
  const images = safeArray<string>(listing.images)
    .map((image) => String(image).trim())
    .filter(Boolean);

  if (images.length > 0) return images;

  return listing.image_url ? [String(listing.image_url).trim()].filter(Boolean) : [];
}

export function safeListingAmenities(listing: Pick<Listing, 'amenities'>) {
  return safeArray<string>(listing.amenities)
    .map((amenity) => String(amenity).trim())
    .filter(Boolean);
}
