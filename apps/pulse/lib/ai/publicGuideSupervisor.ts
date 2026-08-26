import { sanitizeJamieReply } from '@/lib/ai/jamieResponse';
import type { JamiePropertySearchResult } from '@/lib/ai/jamieTools';
import type { PublicGuideContext, PublicGuideListing, PublicGuideResult } from '@/lib/ai/publicGuideContract';

export const PUBLIC_GUIDE_MLS_DISCLAIMER =
  'Data sourced directly from NTREIS MLS. Deemed reliable but not guaranteed. Verify details with the listing broker.';

const FAIR_HOUSING_REQUEST_PATTERN = /\b(?:safe(?:ty)?|crime|criminal|demographic(?:s)?|racial|ethnic|religious|family[- ]friendly|good families|bad neighborhood|ghetto|wealthy neighborhood|poor neighborhood|segregated|best schools?|good schools?|school quality|school ratings?)\b/i;
const UNSUPPORTED_LISTING_FACT_PATTERN = /\b(?:what(?:'s| is) the (?:price|square footage)|how many (?:beds|bedrooms|baths|bathrooms)|listed at|still active|still available|mls number|lot size|days on market)\b/i;
const INTERNAL_LEAK_PATTERN = /\b(?:system prompt|hidden context|tensorzero|langfuse trace|query_memory\.tah|private helper note|internal worker)\b/i;
const UNVERIFIED_PROPERTY_FACT_OUTPUT_PATTERN = /(?:\$\s?\d[\d,.]*|\b\d[\d,.]*(?:\.\d+)?\s*(?:sq\.?\s*ft|square feet|beds?|bedrooms?|baths?|bathrooms?)\b)/i;
const PRODUCT_OVERVIEW_REQUEST_PATTERN = /\b(?:what is|what does|explain|describe|tell me about|how does)\b.{0,100}\bsunset pulse\b/i;

type SupervisorInput = {
  context?: PublicGuideContext | null;
  draft: string;
  userMessage: string;
  listingSearch?: JamiePropertySearchResult | null;
};

export function supervisePublicGuideReply({
  context,
  draft,
  userMessage,
  listingSearch,
}: SupervisorInput): PublicGuideResult {
  const deterministic = getDeterministicPublicGuideReply({ context, userMessage });
  if (deterministic) return deterministic;

  if (listingSearch) {
    const listings = listingSearch.properties.slice(0, 6);
    const content = listings.length
      ? `I found ${listings.length} active listing${listings.length === 1 ? '' : 's'} that match the search. Open a home below to inspect its verified listing details, or tell me which tradeoff matters most and I will help you narrow the set.`
      : 'I checked the active listing grid, but I did not find a matching home yet. Try widening the location, price range, or property criteria.';

    return {
      content: `${content}\n\n${PUBLIC_GUIDE_MLS_DISCLAIMER}`,
      listings,
      actions: [],
      sources: [{
        label: 'NTREIS MLS via Sunset Pulse',
        detail: listings.length ? 'Validated active listing results.' : 'Validated active listing search; no matches returned.',
      }],
      usedListingData: true,
      outcome: 'listing_search',
    };
  }

  const cleanDraft = stripPublicGuideNavigation(sanitizeJamieReply(draft));
  const content = cleanDraft
    && !INTERNAL_LEAK_PATTERN.test(cleanDraft)
    && !UNVERIFIED_PROPERTY_FACT_OUTPUT_PATTERN.test(cleanDraft)
    ? cleanDraft
    : 'I can help you understand Sunset Pulse, think through a real estate question, or search the active listing grid. Tell me where you would like to begin.';

  return {
    content,
    listings: [],
    actions: [],
    sources: [{ label: 'Jamie public guide', detail: 'Approved public product context and general guidance.' }],
    usedListingData: false,
    outcome: content === cleanDraft ? 'general_guidance' : 'safe_fallback',
  };
}

export function stripPublicGuideNavigation(content: string) {
  return content
    .replace(/<a\b[^>]*>([\s\S]*?)<\/a>/gi, '$1')
    .replace(/!\[([^\]]*)\]\(\s*[^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\(\s*[^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, '$1')
    .replace(/^\s*\[[^\]]+\]:\s*\S+.*$/gm, '')
    .replace(/<https?:\/\/[^>]+>/gi, '')
    .replace(/\bhttps?:\/\/[^\s<]+/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function getDeterministicPublicGuideReply({
  context,
  userMessage,
}: Pick<SupervisorInput, 'context' | 'userMessage'>): PublicGuideResult | null {
  if (FAIR_HOUSING_REQUEST_PATTERN.test(userMessage)) {
    return {
      content: [
        'I cannot characterize a neighborhood by safety, crime reputation, demographics, or protected traits.',
        'I can still help you compare objective details such as commute, taxes, property features, school-district boundaries, nearby services, and official public resources.',
      ].join('\n\n'),
      listings: [],
      actions: [],
      sources: [{ label: 'Fair Housing boundary', detail: 'Objective property and location factors only.' }],
      usedListingData: false,
      outcome: 'fair_housing_redirect',
    };
  }

  if (PRODUCT_OVERVIEW_REQUEST_PATTERN.test(userMessage)) {
    return {
      content: 'Sunset Pulse is a local-first real estate intelligence platform for agents and their clients. Public agent sites present approved branding, active listings, contact paths, and required disclosures. Signed-in agents use the private Command Center for specialized workflows and focused TAH knowledge cartridges. Jamie is the public guide between those spaces: he can explain the system, search validated listings, and point you toward a useful next step.',
      listings: [],
      actions: [],
      sources: [{ label: 'Jamie public guide', detail: 'Approved public product context.' }],
      usedListingData: false,
      outcome: 'general_guidance',
    };
  }

  if (UNSUPPORTED_LISTING_FACT_PATTERN.test(userMessage)) {
    if (context?.listing) {
      return {
        content: `${formatVerifiedListingSnapshot(context.listing)}\n\n${PUBLIC_GUIDE_MLS_DISCLAIMER}`,
        listings: [context.listing],
        actions: [],
        sources: [{ label: 'NTREIS MLS via Sunset Pulse', detail: 'Verified active property context.' }],
        usedListingData: true,
        outcome: 'context_fact',
      };
    }

    return {
      content: 'I do not have verified details for that specific property in this conversation yet. Give me the city, address, MLS number, or search criteria and I will check the active listing grid before answering.',
      listings: [],
      actions: [],
      sources: [{ label: 'Jamie public guide', detail: 'No verified listing payload was available for this answer.' }],
      usedListingData: false,
      outcome: 'listing_unverified',
    };
  }

  return null;
}

function formatVerifiedListingSnapshot(listing: PublicGuideListing) {
  const location = [listing.city, listing.state].filter(Boolean).join(', ');
  const facts = [
    listing.price ? `$${listing.price.toLocaleString()}` : null,
    listing.beds ? `${listing.beds} bedroom${listing.beds === 1 ? '' : 's'}` : null,
    listing.baths ? `${listing.baths} bathroom${listing.baths === 1 ? '' : 's'}` : null,
    listing.squareFeet ? `${listing.squareFeet.toLocaleString()} square feet` : null,
    listing.status || null,
  ].filter(Boolean);

  return `The verified listing snapshot for ${listing.name}${location ? ` in ${location}` : ''} shows ${facts.length ? facts.join(', ') : 'an active public record without complete pricing or dimension fields'}.`;
}
