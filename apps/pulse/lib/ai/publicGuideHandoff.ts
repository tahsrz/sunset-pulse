import 'server-only';

import { groq } from '@ai-sdk/groq';
import { generateObject } from 'ai';
import { z } from 'zod';
import {
  publicGuideSearchCriteriaSchema,
  type PublicGuideHandoffBrief,
  type PublicGuideHandoffInput,
  type PublicGuideSearchCriteria,
} from '@/lib/ai/publicGuideHandoffContract';

const generatedBriefSchema = z.object({
  summary: z.string().trim().min(1).max(640),
  searchCriteria: publicGuideSearchCriteriaSchema,
}).strict();

type BuildPublicGuideHandoffBriefInput = {
  handoff: PublicGuideHandoffInput;
  verifiedListingIds: string[];
};

export async function buildPublicGuideHandoffBrief({
  handoff,
  verifiedListingIds,
}: BuildPublicGuideHandoffBriefInput): Promise<PublicGuideHandoffBrief> {
  const conversation = handoff.conversation
    .slice(-12)
    .map((message) => ({
      role: message.role,
      text: sanitizeConversationText(message.text).slice(0, 1600),
    }))
    .filter((message) => message.text.length > 0);
  const fallback = buildDeterministicBrief(conversation);

  if (process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_DISABLED === 'true') {
    return completeBrief(fallback, handoff, verifiedListingIds, 'deterministic');
  }

  try {
    const configuredModel = process.env.JAMIE_PUBLIC_GUIDE_HANDOFF_MODEL
      || process.env.JAMIE_PUBLIC_GUIDE_MODEL
      || process.env.VERCEL_AI_MODEL;
    const model = configuredModel || groq(process.env.JAMIE_GROQ_MODEL || 'llama-3.3-70b-versatile');
    const result = await generateObject({
      model,
      schema: generatedBriefSchema,
      system: [
        'Create a compact real-estate handoff brief for an agent.',
        'Summarize intent, decision factors, and useful follow-up context in no more than 80 words.',
        'Do not include names, email addresses, phone numbers, URLs, protected-class inferences, or invented facts.',
        'Extract only search criteria the visitor explicitly stated. Use null or an empty array when absent.',
        'The raw conversation is transient input and must never be reproduced as a transcript.',
      ].join(' '),
      prompt: JSON.stringify({ conversation }),
      temperature: 0,
      maxOutputTokens: 600,
      abortSignal: AbortSignal.timeout(7_000),
    });
    const generated = generatedBriefSchema.parse(result.object);

    return completeBrief({
      summary: sanitizeBriefText(generated.summary) || fallback.summary,
      searchCriteria: generated.searchCriteria,
    }, handoff, verifiedListingIds, 'model');
  } catch (error) {
    console.warn(
      '[JAMIE_PUBLIC_GUIDE_HANDOFF_SUMMARY_FALLBACK]',
      error instanceof Error ? error.name : 'UnknownError',
    );
    return completeBrief(fallback, handoff, verifiedListingIds, 'deterministic');
  }
}

function completeBrief(
  generated: z.infer<typeof generatedBriefSchema>,
  handoff: PublicGuideHandoffInput,
  verifiedListingIds: string[],
  generatedBy: PublicGuideHandoffBrief['generatedBy'],
): PublicGuideHandoffBrief {
  return {
    schemaVersion: 1,
    summary: generated.summary,
    searchCriteria: generated.searchCriteria,
    discussedListingIds: Array.from(new Set(verifiedListingIds)).slice(0, 8),
    statedNextStep: handoff.nextStep,
    conversationTurnCount: handoff.conversation.length,
    generatedBy,
    transcriptStored: false,
  };
}

function buildDeterministicBrief(conversation: Array<{ role: 'user' | 'assistant'; text: string }>) {
  const userMessages = conversation
    .filter((message) => message.role === 'user')
    .map((message) => message.text)
    .filter(Boolean);
  const recentTopics = userMessages.slice(-3).map((message) => trimSentence(message, 150));
  const summary = recentTopics.length
    ? `Visitor asked about ${recentTopics.join('; ')}.`
    : 'Visitor requested a follow-up without adding further public conversation context.';

  return {
    summary: sanitizeBriefText(summary).slice(0, 640),
    searchCriteria: extractDeterministicSearchCriteria(userMessages.join(' ')),
  };
}

function extractDeterministicSearchCriteria(text: string): PublicGuideSearchCriteria {
  const normalized = text.replace(/,/g, ' ');
  const priceMax = readAmount(normalized.match(/\b(?:under|below|up to|maximum(?: of)?|max(?: of)?)\s*\$?([\d.]+)\s*([km])?\b/i));
  const priceMin = readAmount(normalized.match(/\b(?:over|above|at least|minimum(?: of)?|min(?: of)?)\s*\$?([\d.]+)\s*([km])?\b/i));
  const bedsMin = readNumber(normalized.match(/\b(?:at least\s+)?([\d.]+)\+?\s*(?:beds?|bedrooms?)\b/i));
  const bathsMin = readNumber(normalized.match(/\b(?:at least\s+)?([\d.]+)\+?\s*(?:baths?|bathrooms?)\b/i));
  const propertyTypes = [
    ['single-family', /\bsingle[- ]family\b/i],
    ['condo', /\bcondo(?:minium)?s?\b/i],
    ['townhome', /\btown(?:home|house)s?\b/i],
    ['ranch', /\branch(?:es)?\b/i],
    ['land', /\b(?:land|acreage|lot)\b/i],
  ].filter(([, pattern]) => (pattern as RegExp).test(normalized)).map(([label]) => label as string);
  const priorities = [
    ['commute', /\bcommut(?:e|ing)\b/i],
    ['outdoor space', /\b(?:yard|outdoor space|acreage)\b/i],
    ['walkability', /\bwalkab(?:le|ility)\b/i],
    ['more space', /\b(?:more space|square feet|sq\.?\s*ft)\b/i],
    ['move-in ready', /\bmove[- ]in ready\b/i],
  ].filter(([, pattern]) => (pattern as RegExp).test(normalized)).map(([label]) => label as string);

  return publicGuideSearchCriteriaSchema.parse({
    priceMin,
    priceMax,
    bedsMin,
    bathsMin,
    propertyTypes,
    priorities,
  });
}

function readAmount(match: RegExpMatchArray | null) {
  const value = readNumber(match);
  if (value === null) return null;
  const suffix = match?.[2]?.toLowerCase();
  return suffix === 'm' ? value * 1_000_000 : suffix === 'k' ? value * 1_000 : value;
}

function readNumber(match: RegExpMatchArray | null) {
  const value = Number(match?.[1]);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function sanitizeConversationText(text: string) {
  return text
    .replace(/\b[^\s@]+@[^\s@]+\.[^\s@]+\b/g, '[email removed]')
    .replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[phone removed]')
    .replace(/\bhttps?:\/\/\S+/gi, '[link removed]')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeBriefText(text: string) {
  return sanitizeConversationText(text)
    .replace(/\[(?:email|phone|link) removed\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function trimSentence(text: string, maxLength: number) {
  const normalized = text.replace(/[.?!]+$/g, '').trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`;
}
