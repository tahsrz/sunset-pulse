import { extractMemoriaTerms } from '@/lib/core/memoria_builder';

export type WeightedTerm = {
  term: string;
  weight: number;
  source: 'exact' | 'domain' | 'alias' | 'normalized';
};

const STOP_TERMS = new Set([
  'call',
  'first',
  'this',
  'that',
  'with',
  'worker',
  'model',
  'small',
  'tell',
  'give',
  'make',
  'find'
]);

const DOMAIN_SYNONYMS: Record<string, string[]> = {
  lead: ['prospect', 'buyer', 'client', 'contact', 'inquiry', 'pipeline', 'opportunity'],
  prospect: ['lead', 'buyer', 'client', 'contact'],
  buyer: ['lead', 'prospect', 'client', 'homebuyer', 'purchaser'],
  seller: ['owner', 'vendor', 'listing client', 'homeowner'],
  client: ['lead', 'prospect', 'buyer', 'seller', 'contact'],
  contact: ['lead', 'prospect', 'client'],
  priority: ['urgency', 'rank', 'ranking', 'order', 'triage'],
  urgent: ['hot', 'ready', 'priority', 'high intent'],
  hot: ['urgent', 'ready', 'active', 'high intent'],
  intent: ['motivation', 'readiness', 'temperature', 'signal'],
  motivation: ['intent', 'readiness', 'temperature'],
  follow: ['message', 'text', 'email', 'touch', 'outreach'],
  followup: ['follow up', 'message', 'text', 'email', 'touch'],
  message: ['text', 'email', 'follow up', 'outreach'],
  text: ['message', 'sms', 'follow up'],
  email: ['message', 'follow up', 'outreach'],
  listing: ['property', 'home', 'house', 'inventory', 'asset'],
  property: ['listing', 'home', 'house', 'inventory'],
  home: ['property', 'listing', 'house'],
  angle: ['hook', 'positioning', 'story', 'campaign', 'pitch'],
  hook: ['angle', 'positioning', 'story', 'campaign'],
  neighborhood: ['area', 'community', 'local context', 'place', 'location'],
  area: ['neighborhood', 'community', 'location', 'place'],
  community: ['neighborhood', 'area', 'local context', 'place'],
  local: ['nearby', 'neighborhood', 'community', 'place'],
  nearby: ['local', 'around', 'area', 'neighborhood'],
  business: ['commerce', 'shop', 'restaurant', 'service', 'local business'],
  commerce: ['business', 'shop', 'restaurant', 'service'],
  comps: ['comparables', 'recent sales', 'sold properties', 'valuation', 'price check'],
  comparable: ['comp', 'comps', 'recent sale', 'similar property'],
  comparables: ['comps', 'recent sales', 'valuation'],
  valuation: ['price check', 'pricing', 'comps', 'comparables'],
  price: ['pricing', 'valuation', 'market value'],
  pricing: ['price', 'valuation', 'market value'],
  market: ['trend', 'movement', 'shift', 'conditions'],
  movement: ['trend', 'shift', 'change', 'market'],
  trend: ['movement', 'shift', 'signal'],
  objection: ['pushback', 'concern', 'resistance', 'hesitation'],
  pushback: ['objection', 'concern', 'resistance'],
  compliance: ['risk', 'safe language', 'rules', 'guardrails'],
  brand: ['voice', 'tone', 'style'],
  voice: ['brand', 'tone', 'style'],
  tone: ['voice', 'brand', 'style']
};

const NORMALIZATION_ALIASES: Record<string, string[]> = {
  'follow-up': ['follow up', 'followup'],
  followup: ['follow up', 'follow'],
  comps: ['comp', 'comparables'],
  comparable: ['comparables', 'comp'],
  buyers: ['buyer'],
  sellers: ['seller'],
  leads: ['lead'],
  listings: ['listing'],
  properties: ['property'],
  neighborhoods: ['neighborhood'],
  communities: ['community']
};

export function expandCommandTerms(text: string, aliases: string[] = []): WeightedTerm[] {
  const exactTerms = [
    ...extractMemoriaTerms(text),
    ...text.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean)
  ];

  const weighted = new Map<string, WeightedTerm>();
  exactTerms.forEach((term) => addTerm(weighted, normalizeTerm(term), 1, 'exact'));

  for (const term of Array.from(weighted.keys())) {
    addNormalizedVariants(weighted, term);
    const synonyms = DOMAIN_SYNONYMS[term] || [];
    synonyms.forEach((synonym) => addTerm(weighted, normalizeTerm(synonym), 0.75, 'domain'));
  }

  aliases.forEach((alias) => {
    addTerm(weighted, normalizeTerm(alias), 0.85, 'alias');
    extractMemoriaTerms(alias).forEach((term) => addTerm(weighted, normalizeTerm(term), 0.8, 'alias'));
  });

  return Array.from(weighted.values())
    .filter((item) => item.term.length > 2 && !STOP_TERMS.has(item.term))
    .sort((a, b) => b.weight - a.weight || a.term.localeCompare(b.term))
    .slice(0, 64);
}

export function expandedTextForSearch(text: string, aliases: string[] = []) {
  return [
    text,
    ...expandCommandTerms(text, aliases)
      .filter((term) => term.weight >= 0.7)
      .map((term) => term.term)
  ].join(' ');
}

export function scoreTermMatches(haystack: string, terms: WeightedTerm[]) {
  const normalized = haystack.toLowerCase();
  return terms.reduce((score, item) => score + (normalized.includes(item.term) ? item.weight : 0), 0);
}

export function countTermMatches(haystack: string, terms: WeightedTerm[]) {
  const normalized = haystack.toLowerCase();
  return terms.filter((item) => normalized.includes(item.term)).length;
}

function addNormalizedVariants(weighted: Map<string, WeightedTerm>, term: string) {
  const variants = new Set<string>();
  if (term.endsWith('s') && term.length > 4) variants.add(term.slice(0, -1));
  if (term.endsWith('ing') && term.length > 6) variants.add(term.slice(0, -3));
  if (term.endsWith('ed') && term.length > 5) variants.add(term.slice(0, -2));
  (NORMALIZATION_ALIASES[term] || []).forEach((variant) => variants.add(variant));
  variants.forEach((variant) => addTerm(weighted, normalizeTerm(variant), 0.9, 'normalized'));
}

function addTerm(weighted: Map<string, WeightedTerm>, term: string, weight: number, source: WeightedTerm['source']) {
  if (!term || STOP_TERMS.has(term)) return;
  const existing = weighted.get(term);
  if (!existing || weight > existing.weight) {
    weighted.set(term, { term, weight, source });
  }
}

function normalizeTerm(term: string) {
  return term
    .toLowerCase()
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
