import 'server-only';

import { createHash } from 'node:crypto';
import { after } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { PublicGuideActionId, PublicGuideOutcome } from '@/lib/ai/publicGuideContract';

export type PublicGuideIntentCategory =
  | 'buying_process'
  | 'listing_fact'
  | 'listing_search'
  | 'location_comparison'
  | 'product'
  | 'selling_process'
  | 'other';

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
  sessionId?: string;
  toolId?: 'search_properties';
  usedListingData?: boolean;
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
      p_target_id: event.actionId || event.toolId || event.intentCategory || event.outcome || 'jamie-guide',
      p_metadata: {
        actionId: event.actionId || null,
        durationMs: clampDuration(event.durationMs),
        hasAgentContext: Boolean(event.hasAgentContext),
        hasListingContext: Boolean(event.hasListingContext),
        intentCategory: event.intentCategory || null,
        outcome: event.outcome || null,
        toolId: event.toolId || null,
        usedListingData: Boolean(event.usedListingData),
      },
      p_severity: event.event === 'guide_error' ? 'WARN' : 'INFO',
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[JAMIE_PUBLIC_GUIDE_TELEMETRY]', error);
  }
}

export function hashPublicGuideSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 20);
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
