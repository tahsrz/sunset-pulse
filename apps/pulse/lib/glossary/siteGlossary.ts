export type SiteGlossaryEntry = {
  term: string;
  definition: string;
  sourceTah?: string;
  href?: string;
};

export const siteGlossaryEntries: SiteGlossaryEntry[] = [
  {
    term: '311',
    definition: 'Dallas 311: the city service-request system for reporting non-emergency city issues.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'AI',
    definition: 'Artificial intelligence: software that helps classify, summarize, or generate text.',
    sourceTah: 'wiki_artificial_intelligence.tah',
    href: '/tah/wiki-artificial-intelligence'
  },
  {
    term: 'API',
    definition: 'Application programming interface: a route one system uses to request data or actions from another system.',
    sourceTah: 'sunset_pulse_expertise.tah',
    href: '/tah/sunset-pulse-expertise'
  },
  {
    term: 'CCS',
    definition: 'Code Compliance Services / Code Concern service lane. In Dallas 311 records, this usually points to a code-compliance concern.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'Code Concern',
    definition: 'A Dallas 311 request category for a possible city-code or property-condition issue.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'Community Vitality',
    definition: 'A local context signal about neighborhood condition, public service activity, and civic health.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'Coordinates',
    definition: 'Latitude and longitude. A value of 0, 0 usually means missing or failed geocoding, not a real Dallas location.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'CRM',
    definition: 'Customer relationship management: a system used to track service requests, people, and follow-up.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'ERT',
    definition: 'Estimated response time: the expected response window for a service request.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'geocode',
    definition: 'To convert an address into map coordinates.',
    sourceTah: 'spatial_computing.tah',
    href: '/tah/spatial-computing'
  },
  {
    term: 'IDX',
    definition: 'Internet Data Exchange: a real estate listing feed used on agent and brokerage sites.',
    sourceTah: 'listing_context.tah',
    href: '/tah/listing-context'
  },
  {
    term: 'LLM',
    definition: 'Large language model: an AI model used to read and generate language.',
    sourceTah: 'sunset_pulse_expertise.tah',
    href: '/tah/sunset-pulse-expertise'
  },
  {
    term: 'MLS',
    definition: 'Multiple Listing Service: the shared listing database used by real estate professionals.',
    sourceTah: 'listing_context.tah',
    href: '/tah/listing-context'
  },
  {
    term: 'OSM',
    definition: 'OpenStreetMap: an open map dataset used for place and road context.',
    sourceTah: 'spatial_computing.tah',
    href: '/tah/spatial-computing'
  },
  {
    term: 'Option Fee',
    definition: 'A Texas contract fee tied to the buyer termination-option period. Agents should confirm details with broker or legal guidance.',
    sourceTah: 'texas_contracts_expertise.tah',
    href: '/tah/texas-contracts-expertise'
  },
  {
    term: 'PENDING',
    definition: 'Pending status: the request has been received but is not finished or closed yet.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'pgvector',
    definition: 'A Postgres extension for vector similarity search.',
    sourceTah: 'postgres_mastery.tah',
    href: '/tah/postgres-mastery'
  },
  {
    term: 'Service Request',
    definition: 'A tracking record for a reported city issue or requested city service.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'SR',
    definition: 'Service request: the city tracking record for a reported issue.',
    sourceTah: 'dallas_community_intel.tah',
    href: '/tah/dallas-community-intel'
  },
  {
    term: 'TAH',
    definition: 'A local knowledge cartridge Sunset Pulse uses as structured context.',
    sourceTah: 'sunset_pulse_expertise.tah',
    href: '/tah/sunset-pulse-expertise'
  },
  {
    term: 'TREC',
    definition: 'Texas Real Estate Commission: the Texas agency that regulates real estate licensing and promulgated forms.',
    sourceTah: 'texas_contracts_expertise.tah',
    href: '/tah/texas-contracts-expertise'
  }
];

const glossaryByLowerTerm = new Map(siteGlossaryEntries.map((entry) => [entry.term.toLowerCase(), entry]));

export const siteGlossaryPattern = new RegExp(
  `\\b(${siteGlossaryEntries
    .map((entry) => entry.term)
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')})\\b`,
  'gi'
);

export function lookupGlossaryTerm(term: string) {
  return glossaryByLowerTerm.get(term.toLowerCase()) || null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
