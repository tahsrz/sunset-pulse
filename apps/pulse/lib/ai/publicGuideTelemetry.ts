import 'server-only';

import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { PublicGuideActionId, PublicGuideOutcome } from '@/lib/ai/publicGuideContract';
import { hashVisitorSessionId } from '@/lib/intelligence/visitorSession';
import { persistProviderCost } from '@/lib/profit/internalCostEvents';

export const PUBLIC_GUIDE_INTENT_CATEGORIES = [
  'buying_process',
  'listing_fact',
  'listing_search',
  'location_comparison',
  'product',
  'selling_process',
  'other',
] as const;

export type PublicGuideIntentCategory = typeof PUBLIC_GUIDE_INTENT_CATEGORIES[number];

export type PublicGuideTelemetryEvent = {
  actionId?: PublicGuideActionId;
  durationMs?: number;
  event:
    | 'action_click'
    | 'guide_error'
    | 'guide_opened'
    | 'guide_response'
    | 'handoff_completed'
    | 'handoff_offered'
    | 'handoff_open'
    | 'handoff_submit'
    | 'listing_opened'
    | 'question_asked'
    | 'tool_used'
    | 'unanswered_question';
  hasAgentContext?: boolean;
  hasListingContext?: boolean;
  intentCategory?: PublicGuideIntentCategory;
  outcome?: PublicGuideOutcome;
  funnelId?: string;
  sessionId?: string;
  tenantSite?: string;
  targetId?: string;
  toolId?: 'search_properties';
  usedListingData?: boolean;
  generation?: {
    modelId: string;
    usage: { inputTokens: number; outputTokens: number; totalTokens: number } | null;
  } | null;
};

export function schedulePublicGuideEvent(event: PublicGuideTelemetryEvent) {
  try {
    after(() => recordPublicGuideEvent(event));
  } catch {
    void recordPublicGuideEvent(event);
  }
}

export async function recordPublicGuideEvent(event: PublicGuideTelemetryEvent) {
  const anonymousSession = event.sessionId ? hashPublicGuideSessionId(event.sessionId) : 'anonymous';

  try {
    const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
      p_type: `PUBLIC_GUIDE_${event.event.toUpperCase()}`,
      p_description: `Jamie public guide event: ${event.event}.`,
      p_actor_id: `public:${anonymousSession}`,
      p_actor_name: 'Jamie_Public_Visitor',
      p_target_id: event.targetId || event.actionId || event.toolId || event.intentCategory || event.outcome || 'jamie-guide',
      p_metadata: {
        actionId: event.actionId || null,
        durationMs: clampDuration(event.durationMs),
        hasAgentContext: Boolean(event.hasAgentContext),
        hasListingContext: Boolean(event.hasListingContext),
        intentCategory: event.intentCategory || null,
        outcome: event.outcome || null,
        toolId: event.toolId || null,
        usedListingData: Boolean(event.usedListingData),
        modelId: sanitizeModelId(event.generation?.modelId),
        funnelId: sanitizeUuid(event.funnelId),
        usage: sanitizeUsage(event.generation?.usage),
      },
      p_severity: event.event === 'guide_error' ? 'WARN' : 'INFO',
    });
    if (error) throw error;
    if (event.event === 'guide_response') await recordModelCost(event);
  } catch (error) {
    console.warn('[JAMIE_PUBLIC_GUIDE_TELEMETRY]', error);
  }
}

async function recordModelCost(event: PublicGuideTelemetryEvent) {
  const usage = event.generation?.usage;
  if (!event.tenantSite || !event.sessionId || !event.generation?.modelId || !usage) return;
  const rate = Number(process.env.PROFIT_MODEL_COST_PER_1K_TOKENS);
  const amountUsd = Number.isFinite(rate) && rate >= 0 ? (usage.totalTokens / 1000) * rate : null;
  try {
    await persistProviderCost({
      tenantSite: event.tenantSite,
      funnelId: event.funnelId || null,
      leadId: null,
      provider: event.generation.modelId,
      providerEventId: `${hashPublicGuideSessionId(event.sessionId)}:${usage.totalTokens}:${event.durationMs || 0}`,
      costType: 'model',
      amountUsd,
      occurredAt: new Date().toISOString(),
      evidence: { inputTokens: usage.inputTokens, outputTokens: usage.outputTokens, totalTokens: usage.totalTokens },
    });
  } catch (error) {
    console.warn('[JAMIE_MODEL_COST_LEDGER]', error);
  }
}

function sanitizeUuid(value?: string) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function sanitizeModelId(value?: string) {
  return typeof value === 'string' && /^[a-zA-Z0-9._:/-]{1,160}$/.test(value) ? value : null;
}

function sanitizeUsage(value?: { inputTokens: number; outputTokens: number; totalTokens: number } | null) {
  if (!value) return null;
  return {
    inputTokens: clampTokens(value.inputTokens),
    outputTokens: clampTokens(value.outputTokens),
    totalTokens: clampTokens(value.totalTokens),
  };
}

function clampTokens(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1_000_000, Math.round(value))) : 0;
}

export function hashPublicGuideSessionId(sessionId: string) {
  return hashVisitorSessionId(sessionId);
}

export function classifyPublicGuideIntent(userMessage: string): PublicGuideIntentCategory {
  if (/\b(?:find|search|show|looking for|homes? in|condos?|townhomes?)\b/i.test(userMessage)) return 'listing_search';
  if (/\b(?:price|beds?|bedrooms?|baths?|bathrooms?|square feet|sq\.?\s*ft|available|mls)\b/i.test(userMessage)) return 'listing_fact';
  if (/\b(?:neighborhood|area|commute|walkability|nearby|compare locations?)\b/i.test(userMessage)) return 'location_comparison';
  if (/\b(?:sell|seller|listing my home|home value)\b/i.test(userMessage)) return 'selling_process';
  if (/\b(?:buy|buyer|offer|inspection|closing|mortgage|tour)\b/i.test(userMessage)) return 'buying_process';
  if (/\b(?:sunset pulse|command center|launch kit|agent site|tah)\b/i.test(userMessage)) return 'product';
  return 'other';
}

function clampDuration(durationMs?: number) {
  if (!Number.isFinite(durationMs)) return null;
  return Math.max(0, Math.min(120_000, Math.round(durationMs || 0)));
}
