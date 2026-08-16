import 'server-only';

import { pulse_search_with_trace, type PulseSearchTrace } from '@/lib/ai/brain/pulse_query';
import { readWikipediaHeartbeat } from '@/lib/core/wikipedia_heartbeat';

const HEARTBEAT_CACHE_TTL_MS = 30_000;
let heartbeatStatusCache: { status: string; expiresAt: number } | null = null;

export type JamieKnowledgeEvidence = {
  source: string;
  title: string;
  excerpt: string;
  url: string | null;
  score: number;
};

export type JamieKnowledgeContext = {
  query: string;
  evidence: JamieKnowledgeEvidence[];
  crawlerStatus: string;
  trace: PulseSearchTrace | null;
};

export async function retrieveJamieKnowledge(query: string): Promise<JamieKnowledgeContext> {
  const cleanQuery = query.replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!cleanQuery) return { query: '', evidence: [], crawlerStatus: 'unknown', trace: null };
  const [search, heartbeat] = await Promise.all([
    pulse_search_with_trace(cleanQuery, 6).catch(() => ({ results: [], trace: null })),
    readCachedCrawlerStatus(),
  ]);
  const matches = search.results;
  const evidence = matches.flatMap((match): JamieKnowledgeEvidence[] => {
    const text = typeof match?.text === 'string' ? match.text : '';
    const excerpt = cleanExcerpt(text);
    if (!excerpt) return [];
    return [{
      source: String(match?.source || 'TAH cartridge'),
      title: field(text, 'TITLE') || String(match?.source || 'TAH knowledge'),
      excerpt,
      url: field(text, 'SOURCE_URL') || null,
      score: Number.isFinite(Number(match?.score)) ? Number(match.score) : 0,
    }];
  });
  return { query: cleanQuery, evidence, crawlerStatus: heartbeat, trace: search.trace };
}

async function readCachedCrawlerStatus() {
  const now = Date.now();
  if (heartbeatStatusCache && heartbeatStatusCache.expiresAt > now) return heartbeatStatusCache.status;
  const heartbeat = await readWikipediaHeartbeat().catch(() => null);
  const status = heartbeat?.status || 'unknown';
  heartbeatStatusCache = { status, expiresAt: now + HEARTBEAT_CACHE_TTL_MS };
  return status;
}

export function formatJamieKnowledgePrompt(context: JamieKnowledgeContext) {
  if (!context.evidence.length) return '';
  const evidence = context.evidence.map((item, index) => [
    `[TAH ${index + 1}] ${item.title}`,
    `Source cartridge: ${item.source}`,
    item.url ? `Source URL: ${item.url}` : null,
    `Evidence: ${item.excerpt}`,
  ].filter(Boolean).join('\n')).join('\n\n');
  return `SERVER-AUTHORITATIVE TAH KNOWLEDGE:\n${evidence}\n\nAnswer the user's actual question using relevant evidence. Cite source URLs when available. Do not claim that a property-search result is the limit of your general knowledge.`;
}

export function shouldUseJamieKnowledgeFallback(content: string) {
  const normalized = content.trim().toLowerCase();
  return normalized.length < 20 || /\b(no active listings|could not complete the property search|cannot run that lookup|don't have (?:that|enough) information|do not have (?:that|enough) information)\b/.test(normalized);
}

export function buildJamieKnowledgeFallback(context: JamieKnowledgeContext) {
  if (!context.evidence.length) {
    return context.crawlerStatus === 'imported' || context.crawlerStatus === 'healthy'
      ? 'I do not have a reliable cartridge match yet. The Wikipedia knowledge crawler is active, so this topic can be acquired; I will not substitute an unrelated listing result.'
      : 'I do not have a reliable cartridge match yet. I will not substitute an unrelated listing result; the knowledge crawler status is currently unavailable.';
  }
  const points = context.evidence.slice(0, 3).map((item) => `- ${item.excerpt}${item.url ? ` ([${item.title}](${item.url}))` : ` (${item.title})`}`);
  return [`Here is what the shared TAH knowledge layer has on **${context.query}**:`, '', ...points].join('\n');
}

function field(text: string, name: string) {
  return text.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'))?.[1]?.trim() || '';
}

function cleanExcerpt(text: string) {
  return text
    .replace(/^(TITLE|DOMAIN|LANGUAGE|TRUST|SOURCE_URL|SOURCE_PAGE_ID|CRAWLED_AT):.*$/gim, '')
    .replace(/^#+\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 420);
}
