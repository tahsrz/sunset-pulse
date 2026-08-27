import 'server-only';

import {
  formatKnowledgePrompt,
  retrieveKnowledge,
  type KnowledgeContext,
  type KnowledgeEvidence,
} from '@/lib/ai/knowledgeRetrieval';

export type JamieKnowledgeEvidence = KnowledgeEvidence;
export type JamieKnowledgeContext = KnowledgeContext;

export async function retrieveJamieKnowledge(query: string): Promise<JamieKnowledgeContext> {
  return retrieveKnowledge(query);
}

export function formatJamieKnowledgePrompt(context: JamieKnowledgeContext) {
  const prompt = formatKnowledgePrompt(context);
  if (!prompt) return '';
  return `${prompt}\n\nAnswer the user's actual question using relevant evidence. Cite source URLs when available. Do not claim that a property-search result is the limit of your general knowledge.`;
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
