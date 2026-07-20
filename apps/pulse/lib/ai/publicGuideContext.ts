import 'server-only';

import type {
  PublicGuideAgent,
  PublicGuideContext,
  PublicGuideContextInput,
  PublicGuideListing,
} from '@/lib/ai/publicGuideContract';
import { discoverListingById } from '@/lib/data/listingDiscovery';
import { getUsableRemoteListingImages, type Listing } from '@/lib/data/listingContract';
import { getTenantSite } from '@/lib/sites/siteData';
import { getPublicSubdomainOrigin } from '@/lib/sites/siteUrls';

type ContextResolutionOptions = {
  protocol?: string | null;
  requestHost?: string | null;
  rootOrigin: string;
};

export async function resolvePublicGuideContext(
  input: PublicGuideContextInput | null | undefined,
  options: ContextResolutionOptions,
): Promise<PublicGuideContext | null> {
  if (!input) return null;

  const [listing, agent] = await Promise.all([
    input.listingId ? resolveListing(input.listingId, options.rootOrigin) : null,
    input.siteSlug ? resolveAgent(input.siteSlug, options) : null,
  ]);

  return listing || agent ? { ...(listing ? { listing } : {}), ...(agent ? { agent } : {}) } : null;
}

async function resolveListing(id: string, rootOrigin: string): Promise<PublicGuideListing | null> {
  const listing = await discoverListingById(id);
  if (!listing) return null;
  return toPublicGuideListing(listing, rootOrigin);
}

async function resolveAgent(
  siteSlug: string,
  options: ContextResolutionOptions,
): Promise<PublicGuideAgent | null> {
  const e2eAgent = resolveE2eAgentFixture(siteSlug, options);
  if (e2eAgent) return e2eAgent;

  const site = await getTenantSite(siteSlug);
  if (!site.isPublished) return null;

  const publicUrl = site.customDomain
    ? site.publicUrl
    : getPublicSubdomainOrigin(site.site, {
      requestHost: options.requestHost,
      protocol: options.protocol,
    });

  return {
    agentId: site.agentId,
    agentName: site.agentProfile.displayName,
    brokerageName: site.agentProfile.brokerageName,
    primaryColor: site.primaryColor,
    publicUrl,
    site: site.site,
    siteName: site.siteName,
  };
}

function resolveE2eAgentFixture(
  siteSlug: string,
  options: ContextResolutionOptions,
): PublicGuideAgent | null {
  if (
    process.env.JAMIE_PUBLIC_GUIDE_E2E_FIXTURE !== 'true'
    || process.env.VERCEL_ENV === 'production'
    || siteSlug !== 'jamie-e2e-agent'
  ) {
    return null;
  }

  return {
    agentId: 'jamie-e2e-agent-id',
    agentName: 'Jamie E2E Agent',
    brokerageName: 'Sunset Pulse Test Realty',
    primaryColor: '#67e8f9',
    publicUrl: getPublicSubdomainOrigin(siteSlug, {
      requestHost: options.requestHost,
      protocol: options.protocol,
    }),
    site: siteSlug,
    siteName: 'Jamie E2E Homes',
  };
}

function toPublicGuideListing(listing: Listing, rootOrigin: string): PublicGuideListing {
  const id = listing.mls_id || listing.id;
  return {
    id,
    name: listing.name,
    city: listing.location.city,
    state: listing.location.state,
    price: listing.list_price ?? listing.price ?? listing.rates.monthly ?? null,
    beds: listing.beds,
    baths: listing.baths,
    squareFeet: listing.square_feet,
    source: listing.source,
    status: listing.listing_status,
    image: getUsableRemoteListingImages(listing)[0] || null,
    href: `${rootOrigin}/properties/${encodeURIComponent(id)}`,
    mlsId: listing.mls_id,
  };
}
