import 'server-only';

import {
  PUBLIC_GUIDE_DISPOSITIONS,
  readPublicGuideDisposition,
  type PublicGuideDispositionId,
} from '@/lib/ai/publicGuideConversionContract';
import {
  PUBLIC_GUIDE_INTENT_CATEGORIES,
  type PublicGuideIntentCategory,
} from '@/lib/ai/publicGuideTelemetry';
import { supabaseAdmin } from '@/lib/supabase';

const ANALYTICS_WINDOW_DAYS = 30;
const PUBLIC_GUIDE_EVENT_TYPES = [
  'PUBLIC_GUIDE_GUIDE_OPENED',
  'PUBLIC_GUIDE_QUESTION_ASKED',
  'PUBLIC_GUIDE_TOOL_USED',
  'PUBLIC_GUIDE_LISTING_OPENED',
  'PUBLIC_GUIDE_HANDOFF_OFFERED',
  'PUBLIC_GUIDE_HANDOFF_COMPLETED',
  'PUBLIC_GUIDE_UNANSWERED_QUESTION',
] as const;

const FUNNEL_STAGES = [
  { id: 'opened', label: 'Guide opened', eventTypes: ['PUBLIC_GUIDE_GUIDE_OPENED'] },
  { id: 'questioned', label: 'Question asked', eventTypes: ['PUBLIC_GUIDE_QUESTION_ASKED'] },
  { id: 'explored', label: 'Listing or tool', eventTypes: ['PUBLIC_GUIDE_TOOL_USED', 'PUBLIC_GUIDE_LISTING_OPENED'] },
  { id: 'offered', label: 'Handoff offered', eventTypes: ['PUBLIC_GUIDE_HANDOFF_OFFERED'] },
  { id: 'completed', label: 'Handoff completed', eventTypes: ['PUBLIC_GUIDE_HANDOFF_COMPLETED'] },
] as const;

type PublicGuideAnalyticsEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type PublicGuideAnalyticsLead = {
  id: string;
  metadata: Record<string, unknown> | null;
};

export type PublicGuideConversionAnalytics = ReturnType<typeof buildPublicGuideConversionAnalytics>;

export async function loadPublicGuideConversionAnalytics(now = new Date()) {
  const since = new Date(now.getTime() - ANALYTICS_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [eventResult, leadResult] = await Promise.all([
    supabaseAdmin
      .from('intelligence_events')
      .select('id, event_type, actor_id, target_id, metadata, created_at')
      .in('event_type', [...PUBLIC_GUIDE_EVENT_TYPES])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from('agent_site_leads')
      .select('id, metadata')
      .eq('source', 'jamie_public_guide')
      .gte('created_at', since)
      .limit(1000),
  ]);

  if (eventResult.error || leadResult.error) {
    throw new Error(eventResult.error?.message || leadResult.error?.message || 'Jamie analytics failed to load.');
  }

  return buildPublicGuideConversionAnalytics(
    (eventResult.data || []) as PublicGuideAnalyticsEvent[],
    (leadResult.data || []) as PublicGuideAnalyticsLead[],
  );
}

export function buildPublicGuideConversionAnalytics(
  events: PublicGuideAnalyticsEvent[],
  leads: PublicGuideAnalyticsLead[],
) {
  const openedSessions = uniqueSessions(events, ['PUBLIC_GUIDE_GUIDE_OPENED']).size;
  const funnel = FUNNEL_STAGES.map((stage) => {
    const sessions = uniqueSessions(events, [...stage.eventTypes]).size;
    return {
      id: stage.id,
      label: stage.label,
      sessions,
      reachRate: openedSessions > 0 ? Math.round((sessions / openedSessions) * 100) : null,
    };
  });
  const completedSessions = funnel.find((stage) => stage.id === 'completed')?.sessions || 0;

  const unanswered = new Map<PublicGuideIntentCategory, {
    category: PublicGuideIntentCategory;
    count: number;
    latestAt: string;
    outcomes: Set<string>;
    sessions: Set<string>;
  }>();

  for (const event of events) {
    if (event.event_type !== 'PUBLIC_GUIDE_UNANSWERED_QUESTION') continue;
    const category = readIntentCategory(event.metadata?.intentCategory);
    const current = unanswered.get(category) || {
      category,
      count: 0,
      latestAt: event.created_at,
      outcomes: new Set<string>(),
      sessions: new Set<string>(),
    };
    current.count += 1;
    current.latestAt = current.latestAt > event.created_at ? current.latestAt : event.created_at;
    current.sessions.add(sessionKey(event));
    const outcome = readUnansweredOutcome(event.metadata?.outcome);
    if (outcome) current.outcomes.add(outcome);
    unanswered.set(category, current);
  }

  const dispositionCounts = Object.fromEntries(
    PUBLIC_GUIDE_DISPOSITIONS.map((disposition) => [disposition.id, 0]),
  ) as Record<PublicGuideDispositionId, number>;
  for (const lead of leads) {
    dispositionCounts[readPublicGuideDisposition(lead.metadata)] += 1;
  }

  return {
    windowDays: ANALYTICS_WINDOW_DAYS,
    funnel,
    openedSessions,
    completedSessions,
    conversionRate: openedSessions > 0 ? Math.round((completedSessions / openedSessions) * 100) : null,
    unanswered: Array.from(unanswered.values())
      .map((item) => ({
        category: item.category,
        count: item.count,
        latestAt: item.latestAt,
        outcomes: Array.from(item.outcomes).sort(),
        sessions: item.sessions.size,
      }))
      .sort((left, right) => right.count - left.count || right.latestAt.localeCompare(left.latestAt)),
    dispositionCounts,
    leadCount: leads.length,
  };
}

function uniqueSessions(events: PublicGuideAnalyticsEvent[], eventTypes: string[]) {
  const accepted = new Set(eventTypes);
  return new Set(events.filter((event) => accepted.has(event.event_type)).map(sessionKey));
}

function sessionKey(event: PublicGuideAnalyticsEvent) {
  return event.actor_id || `event:${event.id}`;
}

function readIntentCategory(value: unknown): PublicGuideIntentCategory {
  return typeof value === 'string' && PUBLIC_GUIDE_INTENT_CATEGORIES.includes(value as PublicGuideIntentCategory)
    ? value as PublicGuideIntentCategory
    : 'other';
}

function readUnansweredOutcome(value: unknown) {
  if (value === 'listing_unverified') return 'Listing unverified';
  if (value === 'safe_fallback') return 'Safe fallback';
  return null;
}
