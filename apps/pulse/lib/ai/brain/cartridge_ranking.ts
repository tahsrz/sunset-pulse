import type { PulseCartridge } from '@/lib/ai/brain/pulse_query';

const STOP_WORDS = new Set([
  'about', 'after', 'also', 'been', 'being', 'does', 'from', 'have', 'into', 'more', 'most',
  'that', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'what', 'when', 'where',
  'which', 'while', 'why', 'with', 'work', 'would', 'your', 'explain', 'usually', 'used',
]);

const SYNONYMS: Record<string, string[]> = {
  home: ['house', 'property', 'real estate'],
  house: ['home', 'property', 'real estate'],
  property: ['home', 'house', 'real estate', 'listing'],
  hoa: ['homeowners association', 'real estate'],
  mls: ['multiple listing service', 'listing', 'real estate'],
  comps: ['comparables', 'comparable sales', 'valuation'],
  ai: ['artificial intelligence', 'machine learning'],
  transformer: ['attention', 'neural network', 'artificial intelligence'],
  database: ['postgres', 'sql', 'query', 'index'],
  security: ['injection', 'guardrail', 'threat'],
  texas: ['dallas', 'tarrant', 'north texas', 'alamo'],
  insulin: ['medical', 'medicine', 'diabetes'],
};

export type CartridgeRankingDocument = {
  cartridge: PulseCartridge;
  title: string;
  searchTerms: string;
  representativeText: string;
  domain: string;
};

export type CartridgeCandidateScore = {
  cartridge: PulseCartridge;
  score: number;
  reasons: string[];
};

export function normalizeRetrievalQuery(query: string) {
  const phrase = normalizeText(query);
  const baseTerms = phrase.split(' ').filter((term) => term.length > 2 && !STOP_WORDS.has(term));
  const expandedTerms = [...baseTerms];
  for (const term of baseTerms) expandedTerms.push(...(SYNONYMS[term] || []).flatMap((value) => normalizeText(value).split(' ')));
  return { phrase, terms: [...new Set(expandedTerms.filter((term) => term.length > 2 && !STOP_WORDS.has(term)))] };
}

export function rankCartridgeDocuments(documents: CartridgeRankingDocument[], query: string): CartridgeCandidateScore[] {
  const normalized = normalizeRetrievalQuery(query);
  return documents.map((document) => scoreDocument(document, normalized.phrase, normalized.terms))
    .sort((left, right) => right.score - left.score || left.cartridge.name.localeCompare(right.cartridge.name));
}

export function scoreRetrievedEvidence(query: string, data: string, candidateScore: number, rawScore: number) {
  const { phrase, terms } = normalizeRetrievalQuery(query);
  const haystack = normalizeText(data);
  const matchingTerms = terms.filter((term) => containsTerm(haystack, term));
  const phraseMatch = phrase.length > 5 && haystack.includes(phrase);
  if (!phraseMatch && matchingTerms.length === 0) return 0;
  const coverage = matchingTerms.length / Math.max(1, terms.length);
  const lexical = Math.min(0.82, (phraseMatch ? 0.35 : 0) + matchingTerms.length * 0.11 + coverage * 0.3);
  const candidate = Math.min(0.13, candidateScore / 100);
  const engine = Math.min(0.05, Math.max(0, Number(rawScore) || 0) * 0.05);
  return Math.min(1, Number((lexical + candidate + engine).toFixed(4)));
}

function scoreDocument(document: CartridgeRankingDocument, phrase: string, terms: string[]): CartridgeCandidateScore {
  const title = normalizeText(document.title);
  const searchTerms = normalizeText(document.searchTerms);
  const representative = normalizeText(document.representativeText);
  const domain = normalizeText(document.domain);
  let score = 0;
  const reasons: string[] = [];

  if (phrase.length > 5 && (title.includes(phrase) || searchTerms.includes(phrase))) {
    score += 40;
    reasons.push('exact phrase');
  }
  const titleMatches = terms.filter((term) => containsTerm(title, term));
  const catalogMatches = terms.filter((term) => containsTerm(searchTerms, term));
  const summaryMatches = terms.filter((term) => containsTerm(representative, term));
  const domainMatches = terms.filter((term) => containsTerm(domain, term));
  if (titleMatches.length) { score += titleMatches.length * 12; reasons.push(`title: ${titleMatches.slice(0, 3).join(', ')}`); }
  if (catalogMatches.length) { score += catalogMatches.length * 8; reasons.push(`catalog: ${catalogMatches.slice(0, 3).join(', ')}`); }
  if (summaryMatches.length) { score += summaryMatches.length * 4; reasons.push(`summary: ${summaryMatches.slice(0, 3).join(', ')}`); }
  if (domainMatches.length) { score += domainMatches.length * 3; reasons.push(`domain: ${domainMatches.slice(0, 2).join(', ')}`); }
  if (/^wiki(?:pedia)?[_-]/i.test(document.cartridge.name) && catalogMatches.length) {
    score += 5;
    reasons.push('wikipedia catalog authority');
  }
  return { cartridge: document.cartridge, score, reasons: reasons.length ? reasons : ['no lexical signal'] };
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9+#]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function containsTerm(haystack: string, term: string) {
  return haystack.includes(term);
}
