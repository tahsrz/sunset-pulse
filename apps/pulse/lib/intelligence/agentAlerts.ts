import { z } from 'zod';

const scoreReasonSchema = z.object({
  code: z.string(),
  label: z.string(),
  points: z.number(),
}).passthrough();

const metadataSchema = z.object({
  agentId: z.string().trim().min(1).optional(),
  leadId: z.string().uuid().optional(),
  leadName: z.string().trim().min(1).max(200).optional(),
  leadStatus: z.string().trim().min(1).max(80).optional().nullable(),
  listingId: z.string().trim().min(1).optional().nullable(),
  listingName: z.string().trim().min(1).max(300).optional().nullable(),
  notificationStatus: z.enum(['pending', 'processing', 'sent', 'failed', 'suppressed']).optional(),
  propertyIds: z.array(z.string().trim().min(1)).optional(),
  propertyCount: z.number().int().nonnegative().optional(),
  leadIntelligence: z.object({
    score: z.number().min(0).max(100),
    inferredIntent: z.string().optional(),
    reasons: z.array(scoreReasonSchema).default([]),
  }).passthrough().optional(),
}).passthrough();

export const intelligenceEventSchema = z.object({
  id: z.string().uuid(),
  event_type: z.string().trim().min(1).max(160),
  actor_id: z.string().nullable(),
  actor_name: z.string().nullable(),
  target_id: z.string().nullable(),
  description: z.string(),
  metadata: metadataSchema.nullable().default({}),
  severity: z.string().nullable(),
  created_at: z.string().datetime(),
}).strict();

export type IntelligenceEvent = z.infer<typeof intelligenceEventSchema>;
export type AgentAlertKind = 'high_intent_revisit' | 'tour_request' | 'new_lead';

export type AgentAlert = {
  id: string;
  sourceEventId: string;
  sourceEventIds: string[];
  kind: AgentAlertKind;
  priority: 'high' | 'normal';
  leadId?: string;
  agentId?: string;
  listingId?: string;
  title: string;
  detail: string;
  actionHref: string;
  occurrences: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  notificationStatus?: 'pending' | 'processing' | 'sent' | 'failed' | 'suppressed';
};

export type AlertPolicyResult =
  | { action: 'ignore'; reason: string }
  | { action: 'error'; reason: string }
  | { action: 'create'; alert: AgentAlert }
  | { action: 'update'; alert: AgentAlert };

export type AgentAlertNotificationDecision =
  | { action: 'suppress'; reason: string }
  | {
      action: 'enqueue';
      workflowId: string;
      idempotencyKey: string;
      payload: Record<string, unknown>;
    };

const ALERT_WINDOW_MS = 15 * 60 * 1000;

export function processIntelligenceEvent(
  rawEvent: unknown,
  activeAlerts: readonly AgentAlert[],
  nowMs = Date.now(),
): AlertPolicyResult {
  const parsed = intelligenceEventSchema.safeParse(rawEvent);
  if (!parsed.success) return { action: 'error', reason: 'Malformed intelligence event.' };

  const event = parsed.data;
  const metadata = event.metadata || {};
  const score = metadata.leadIntelligence?.score || 0;
  const leadId = metadata.leadId || leadIdForEvent(event);
  const agentId = metadata.agentId;
  const listingId = metadata.listingId || metadata.propertyIds?.[0] || listingIdForEvent(event);
  const classification = classifyAlert(event.event_type, score);

  if (!classification) return { action: 'ignore', reason: 'Event is timeline-only.' };
  if (!agentId && !leadId) return { action: 'ignore', reason: 'Event is not scoped to an agent or lead.' };

  const detail = metadata.leadIntelligence?.reasons?.[0]?.label || event.description;
  const matching = activeAlerts.find((alert) => (
    alert.kind === classification.kind
    && alert.leadId === leadId
    && alert.agentId === agentId
    && nowMs - Date.parse(alert.lastUpdatedAt) <= ALERT_WINDOW_MS
  ));

  if (matching) {
    return {
      action: 'update',
      alert: {
        ...matching,
        sourceEventId: event.id,
        sourceEventIds: [...matching.sourceEventIds, event.id],
        detail,
        listingId: listingId || matching.listingId,
        occurrences: matching.occurrences + 1,
        lastUpdatedAt: event.created_at,
        notificationStatus: metadata.notificationStatus || matching.notificationStatus,
      },
    };
  }

  return {
    action: 'create',
    alert: {
      id: `alert-${event.id}`,
      sourceEventId: event.id,
      sourceEventIds: [event.id],
      kind: classification.kind,
      priority: classification.priority,
      leadId,
      agentId,
      listingId,
      title: classification.title,
      detail,
      actionHref: leadId ? `/admin/agent-leads?leadId=${encodeURIComponent(leadId)}` : '/admin/agent-leads',
      occurrences: 1,
      firstSeenAt: event.created_at,
      lastUpdatedAt: event.created_at,
      notificationStatus: metadata.notificationStatus,
    },
  };
}

export function mergeIntelligenceEvents(
  currentAlerts: readonly AgentAlert[],
  events: readonly unknown[],
  dismissedEventIds: ReadonlySet<string> = new Set(),
): AgentAlert[] {
  const next = [...currentAlerts];
  const seen = new Set(next.flatMap((alert) => alert.sourceEventIds));

  for (const event of events) {
    const eventId = rawEventId(event);
    if (!eventId || seen.has(eventId) || dismissedEventIds.has(eventId)) continue;
    const result = processIntelligenceEvent(event, next, Date.parse(rawEventCreatedAt(event)) || Date.now());
    seen.add(eventId);
    if (result.action === 'create') next.unshift(result.alert);
    if (result.action === 'update') {
      const index = next.findIndex((alert) => alert.id === result.alert.id);
      if (index >= 0) next[index] = result.alert;
    }
  }

  return next.sort((left, right) => Date.parse(right.lastUpdatedAt) - Date.parse(left.lastUpdatedAt));
}

export function decideAgentAlertNotification(
  alert: AgentAlert,
  event: IntelligenceEvent,
): AgentAlertNotificationDecision {
  const metadata = event.metadata || {};
  const leadStatus = metadata.leadStatus?.toLowerCase();
  if (leadStatus === 'archived' || leadStatus === 'closed') {
    return { action: 'suppress', reason: `Lead is ${leadStatus}.` };
  }
  if (alert.kind === 'new_lead') {
    return { action: 'suppress', reason: 'Initial lead email is handled by the existing Resend workflow.' };
  }
  if (!alert.agentId || !alert.leadId) {
    return { action: 'suppress', reason: 'Alert has no authoritative agent and lead scope.' };
  }

  const score = metadata.leadIntelligence?.score || 0;
  if (alert.kind === 'high_intent_revisit' && score < 85 && alert.occurrences < 2) {
    return { action: 'suppress', reason: 'Warm revisit requires two signals within the aggregation window.' };
  }

  const windowStart = Math.floor(Date.parse(alert.firstSeenAt) / ALERT_WINDOW_MS) * ALERT_WINDOW_MS;
  return {
    action: 'enqueue',
    workflowId: process.env.NOVU_HIGH_INTENT_WORKFLOW_ID || 'lead-high-intent-activity',
    idempotencyKey: `agent-alert:${alert.agentId}:${alert.leadId}:${alert.kind}:${windowStart}`,
    payload: {
      alertKind: alert.kind,
      leadId: alert.leadId,
      leadName: metadata.leadName || 'Lead',
      listingId: alert.listingId || null,
      listingName: metadata.listingName || null,
      score,
      topReason: metadata.leadIntelligence?.reasons?.[0]?.label || alert.detail,
      occurrences: alert.occurrences,
      recommendedAction: metadata.leadIntelligence?.recommendedAction || null,
      commandCenterPath: alert.actionHref,
    },
  };
}

function classifyAlert(eventType: string, score: number) {
  if (eventType === 'PUBLIC_GUIDE_HANDOFF_COMPLETED' || eventType === 'PUBLIC_GUIDE_HANDOFF_SUBMIT') {
    return { kind: 'new_lead' as const, priority: 'high' as const, title: 'New Jamie lead' };
  }
  if (eventType === 'PUBLIC_GUIDE_TOUR_REQUESTED') {
    return { kind: 'tour_request' as const, priority: 'high' as const, title: 'Tour requested' };
  }
  if ((eventType === 'VISITOR_PROPERTY_VIEWED' || eventType === 'PUBLIC_GUIDE_LISTING_OPENED') && score >= 70) {
    return { kind: 'high_intent_revisit' as const, priority: score >= 85 ? 'high' as const : 'normal' as const, title: 'High-intent property revisit' };
  }
  if (eventType === 'VISITOR_PROPERTIES_COMPARED' && score >= 70) {
    return { kind: 'high_intent_revisit' as const, priority: 'normal' as const, title: 'Active listing comparison' };
  }
  return null;
}

function leadIdForEvent(event: IntelligenceEvent) {
  return event.event_type.includes('HANDOFF') && event.target_id && z.string().uuid().safeParse(event.target_id).success
    ? event.target_id
    : undefined;
}

function listingIdForEvent(event: IntelligenceEvent) {
  return event.event_type.includes('LISTING') || event.event_type.includes('PROPERTY') ? event.target_id || undefined : undefined;
}

function rawEventId(event: unknown) {
  return typeof event === 'object' && event !== null && typeof (event as { id?: unknown }).id === 'string'
    ? (event as { id: string }).id
    : null;
}

function rawEventCreatedAt(event: unknown) {
  return typeof event === 'object' && event !== null && typeof (event as { created_at?: unknown }).created_at === 'string'
    ? (event as { created_at: string }).created_at
    : '';
}
