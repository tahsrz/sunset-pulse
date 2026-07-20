import 'server-only';

import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase';
import type { PublicGuideActionId, PublicGuideOutcome } from '@/lib/ai/publicGuideContract';

type PublicGuideTelemetryEvent = {
  actionId?: PublicGuideActionId;
  durationMs?: number;
  event: 'action_click' | 'guide_response' | 'handoff_open' | 'handoff_submit' | 'guide_error';
  hasAgentContext?: boolean;
  hasListingContext?: boolean;
  outcome?: PublicGuideOutcome;
  sessionId?: string;
  usedListingData?: boolean;
};

export async function recordPublicGuideEvent(event: PublicGuideTelemetryEvent) {
  const anonymousSession = event.sessionId ? hashSessionId(event.sessionId) : 'anonymous';

  try {
    const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
      p_type: `PUBLIC_GUIDE_${event.event.toUpperCase()}`,
      p_description: `Jamie public guide event: ${event.event}.`,
      p_actor_id: `public:${anonymousSession}`,
      p_actor_name: 'Jamie_Public_Visitor',
      p_target_id: event.actionId || event.outcome || 'jamie-guide',
      p_metadata: {
        actionId: event.actionId || null,
        durationMs: clampDuration(event.durationMs),
        hasAgentContext: Boolean(event.hasAgentContext),
        hasListingContext: Boolean(event.hasListingContext),
        outcome: event.outcome || null,
        usedListingData: Boolean(event.usedListingData),
      },
      p_severity: event.event === 'guide_error' ? 'WARN' : 'INFO',
    });
    if (error) throw error;
  } catch (error) {
    console.warn('[JAMIE_PUBLIC_GUIDE_TELEMETRY]', error);
  }
}

function hashSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 20);
}

function clampDuration(durationMs?: number) {
  if (!Number.isFinite(durationMs)) return null;
  return Math.max(0, Math.min(120_000, Math.round(durationMs || 0)));
}
