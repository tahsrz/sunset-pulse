import 'server-only';

import {
  decideAgentAlertNotification,
  intelligenceEventSchema,
  processIntelligenceEvent,
  type AgentAlert,
} from '@/lib/intelligence/agentAlerts';
import { enrichAgentAlertEvents } from '@/lib/intelligence/agentAlertContext';
import { dispatchAgentAlertNotification, dispatchOperationalAlert } from '@/lib/notifications/agentAlertChannels';
import {
  leadResponseOperatingHoursFromEnv,
  shouldEscalateLeadResponse,
} from '@/lib/intelligence/leadResponseEscalation';
import { supabaseAdmin } from '@/lib/supabase';

const NOTIFICATION_EVENT_TYPES = [
  'PUBLIC_GUIDE_HANDOFF_COMPLETED',
  'PUBLIC_GUIDE_HANDOFF_SUBMIT',
  'PUBLIC_GUIDE_TOUR_REQUESTED',
  'PUBLIC_GUIDE_LISTING_OPENED',
  'VISITOR_PROPERTY_VIEWED',
  'VISITOR_PROPERTIES_COMPARED',
];

type NotificationDelivery = {
  id: string;
  source_event_id: string;
  agent_id: string;
  lead_id: string | null;
  funnel_id: string | null;
  listing_id: string | null;
  alert_kind: 'high_intent_revisit' | 'tour_request';
  workflow_id: string;
  idempotency_key: string;
  attempt_count: number;
  payload: Record<string, unknown>;
};

export type AgentAlertWorkerResult = {
  eventsInspected: number;
  deliveriesEnqueued: number;
  deliveriesClaimed: number;
  sent: number;
  failed: number;
  suppressed: number;
  escalationsEnqueued: number;
  escalationsSent: number;
  escalationsFailed: number;
  escalationsSuppressed: number;
};

export async function runAgentAlertNotificationWorker(limit = 20): Promise<AgentAlertWorkerResult> {
  const events = await loadRecentAlertEvents();
  const deliveriesEnqueued = await enqueueAlertDeliveries(events);
  const claimed = await claimDeliveries(limit);
  const result: AgentAlertWorkerResult = {
    eventsInspected: events.length,
    deliveriesEnqueued,
    deliveriesClaimed: claimed.length,
    sent: 0,
    failed: 0,
    suppressed: 0,
    escalationsEnqueued: 0,
    escalationsSent: 0,
    escalationsFailed: 0,
    escalationsSuppressed: 0,
  };

  for (const delivery of claimed) {
    const outcome = await dispatchDelivery(delivery);
    result[outcome] += 1;
  }

  const escalationResult = await runLeadResponseEscalations(limit);
  result.escalationsEnqueued = escalationResult.enqueued;
  result.escalationsSent = escalationResult.sent;
  result.escalationsFailed = escalationResult.failed;
  result.escalationsSuppressed = escalationResult.suppressed;

  return result;
}

type EscalationDelivery = {
  id: string;
  lead_id: string;
  agent_id: string;
  completed_at: string;
  payload: Record<string, unknown>;
};

type ClaimedEscalation = {
  id: string;
  delivery_id: string;
  lead_id: string;
  agent_id: string;
  attempt_count: number;
  payload: Record<string, unknown>;
};

async function runLeadResponseEscalations(limit: number) {
  const deliveries = await loadRecentSentDeliveries();
  const leadIds = [...new Set(deliveries.map((delivery) => delivery.lead_id))];
  const leads = await loadEscalationLeads(leadIds);
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const policy = leadResponseOperatingHoursFromEnv();
  const now = new Date();
  const eligible = deliveries.filter((delivery) => {
    const lead = leadById.get(delivery.lead_id);
    return lead && shouldEscalateLeadResponse({
      deliveredAt: delivery.completed_at,
      contactAttemptedAt: lead.contact_attempted_at,
      leadStatus: lead.status,
    }, now, policy);
  });

  let enqueued = 0;
  if (eligible.length) {
    const { data, error } = await supabaseAdmin.from('lead_response_escalations').upsert(
      eligible.map((delivery) => ({
        delivery_id: delivery.id,
        lead_id: delivery.lead_id,
        agent_id: delivery.agent_id,
        status: 'pending',
        payload: delivery.payload,
      })),
      { onConflict: 'delivery_id', ignoreDuplicates: true },
    ).select('id');
    if (error) throw new Error('Unable to enqueue lead response escalations.');
    enqueued = data?.length || 0;
  }

  const { data: claimed, error: claimError } = await supabaseAdmin.rpc('claim_lead_response_escalations', {
    p_limit: Math.max(1, Math.min(50, Math.round(limit))),
  });
  if (claimError) throw new Error('Unable to claim lead response escalations.');
  const claimedEscalations = (claimed || []) as ClaimedEscalation[];
  const missingClaimedLeadIds = [...new Set(claimedEscalations
    .map((escalation) => escalation.lead_id)
    .filter((leadId) => !leadById.has(leadId)))];
  const claimedLeads = await loadEscalationLeads(missingClaimedLeadIds);
  for (const lead of claimedLeads) leadById.set(lead.id, lead);
  const counts = { enqueued, sent: 0, failed: 0, suppressed: 0 };
  for (const escalation of claimedEscalations) {
    const lead = leadById.get(escalation.lead_id);
    if (!lead || lead.contact_attempted_at || ['closed', 'archived'].includes((lead.status || '').toLowerCase())) {
      await updateEscalation(escalation.id, { status: 'resolved', completed_at: now.toISOString() });
      continue;
    }
    const outcome = await dispatchOperationalAlert({
      subject: `Hot lead awaiting contact: ${stringValue(escalation.payload.leadName) || 'Lead'}`,
      idempotencyKey: `lead-response-escalation-${escalation.delivery_id}`,
      text: [
        `${stringValue(escalation.payload.leadName) || 'A hot lead'} has no recorded contact attempt after ${policy.thresholdMinutes} operating minutes.`,
        `Top signal: ${stringValue(escalation.payload.topReason) || 'High-intent activity'}`,
        '',
        'Open Sunset Pulse: https://sunsetpulse.app/admin/agent-leads',
      ].join('\n'),
    });
    if (outcome.status === 'sent') {
      await updateEscalation(escalation.id, { status: 'sent', completed_at: new Date().toISOString(), last_error: null });
      counts.sent += 1;
    } else if (outcome.status === 'suppressed') {
      await updateEscalation(escalation.id, { status: 'suppressed', completed_at: new Date().toISOString(), last_error: outcome.reason });
      counts.suppressed += 1;
    } else {
      await updateEscalation(escalation.id, {
        status: 'failed',
        next_attempt_at: new Date(Date.now() + retryDelayMs(escalation.attempt_count)).toISOString(),
        last_error: outcome.reason,
      });
      counts.failed += 1;
    }
  }
  return counts;
}

async function loadRecentSentDeliveries(): Promise<EscalationDelivery[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin.from('notification_deliveries')
    .select('id, lead_id, agent_id, completed_at, payload')
    .eq('status', 'sent').not('lead_id', 'is', null).not('completed_at', 'is', null)
    .gte('completed_at', since).order('completed_at', { ascending: true }).limit(500);
  if (error) throw new Error('Unable to load sent deliveries for response escalation.');
  return (data || []) as EscalationDelivery[];
}

async function loadEscalationLeads(leadIds: string[]) {
  if (!leadIds.length) return [];
  const { data, error } = await supabaseAdmin.from('agent_site_leads')
    .select('id, status, contact_attempted_at').in('id', leadIds);
  if (error) throw new Error('Unable to load leads for response escalation.');
  return (data || []) as Array<{ id: string; status: string | null; contact_attempted_at: string | null }>;
}

async function updateEscalation(id: string, update: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('lead_response_escalations').update(update).eq('id', id);
  if (error) throw new Error('Unable to persist lead response escalation state.');
}

async function loadRecentAlertEvents() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('intelligence_events')
    .select('id, event_type, actor_id, actor_name, target_id, description, metadata, severity, created_at')
    .in('event_type', NOTIFICATION_EVENT_TYPES)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw new Error('Unable to load intelligence events for notifications.');
  const events = (data || []).flatMap((event) => {
    const parsed = intelligenceEventSchema.safeParse(event);
    return parsed.success ? [parsed.data] : [];
  });
  return enrichAgentAlertEvents(events);
}

async function enqueueAlertDeliveries(events: Awaited<ReturnType<typeof loadRecentAlertEvents>>) {
  const alerts: AgentAlert[] = [];
  const rows: Array<Record<string, unknown>> = [];
  const nativeRows = new Map<string, Record<string, unknown>>();

  for (const event of events) {
    const result = processIntelligenceEvent(event, alerts, Date.parse(event.created_at));
    if (result.action === 'create') alerts.push(result.alert);
    if (result.action === 'update') {
      const index = alerts.findIndex((alert) => alert.id === result.alert.id);
      if (index >= 0) alerts[index] = result.alert;
    }
    if (result.action !== 'create' && result.action !== 'update') continue;

    const decision = decideAgentAlertNotification(result.alert, event);
    if (decision.action !== 'enqueue' || result.alert.kind === 'new_lead') continue;
    nativeRows.set(decision.idempotencyKey, {
      source_event_id: event.id,
      agent_id: result.alert.agentId,
      lead_id: result.alert.leadId,
      funnel_id: stringValue(decision.payload.funnelId) || null,
      listing_id: result.alert.listingId || null,
      kind: result.alert.kind,
      priority: result.alert.priority,
      title: result.alert.title,
      body: result.alert.detail,
      action_href: result.alert.actionHref,
      action_label: 'Open lead',
      occurrences: result.alert.occurrences,
      idempotency_key: decision.idempotencyKey,
      first_seen_at: result.alert.firstSeenAt,
      last_seen_at: result.alert.lastUpdatedAt,
      metadata: decision.payload,
    });
    rows.push({
      source_event_id: event.id,
      agent_id: result.alert.agentId,
      lead_id: result.alert.leadId,
      funnel_id: stringValue(decision.payload.funnelId) || null,
      listing_id: result.alert.listingId || null,
      alert_kind: result.alert.kind,
      workflow_id: decision.workflowId,
      idempotency_key: decision.idempotencyKey,
      status: 'pending',
      payload: { ...decision.payload, agentId: result.alert.agentId },
    });
  }

  if (!rows.length) return 0;
  const { error: nativeError } = await supabaseAdmin
    .from('agent_notifications')
    .upsert([...nativeRows.values()], { onConflict: 'idempotency_key' });
  if (nativeError) throw new Error('Unable to persist native agent notifications.');

  const { data, error } = await supabaseAdmin
    .from('notification_deliveries')
    .upsert(rows, { onConflict: 'idempotency_key', ignoreDuplicates: true })
    .select('id');
  if (error) throw new Error('Unable to enqueue agent alert notifications.');
  return data?.length || 0;
}

async function claimDeliveries(limit: number): Promise<NotificationDelivery[]> {
  const { data, error } = await supabaseAdmin.rpc('claim_notification_deliveries', {
    p_limit: Math.max(1, Math.min(50, Math.round(limit))),
  });
  if (error) throw new Error('Unable to claim notification deliveries.');
  return (data || []) as NotificationDelivery[];
}

async function dispatchDelivery(delivery: NotificationDelivery): Promise<'sent' | 'failed' | 'suppressed'> {
  const recipient = await loadAgentRecipient(delivery.agent_id);
  if (!recipient.email && !recipient.phone) {
    await updateDelivery(delivery.id, {
      status: 'suppressed',
      completed_at: new Date().toISOString(),
      last_error: 'No agent notification email or phone is configured.',
    });
    return 'suppressed';
  }

  const record = await dispatchAgentAlertNotification({
    recipient,
    idempotencyKey: delivery.idempotency_key,
    payload: delivery.payload,
  });

  if (record.status === 'sent') {
    await updateDelivery(delivery.id, {
      status: 'sent',
      completed_at: new Date().toISOString(),
      provider: record.provider,
      cost_usd: notificationCost(record.provider),
      provider_message_id: record.messageId ? `${record.provider}:${record.messageId}` : record.provider,
      last_error: null,
    });
    return 'sent';
  }

  if (record.status === 'suppressed') {
    await updateDelivery(delivery.id, {
      status: 'suppressed',
      completed_at: new Date().toISOString(),
      last_error: record.reason,
    });
    return 'suppressed';
  }

  await updateDelivery(delivery.id, {
    status: 'failed',
    provider: record.provider,
    next_attempt_at: new Date(Date.now() + retryDelayMs(delivery.attempt_count)).toISOString(),
    last_error: record.reason,
  });
  return 'failed';
}

async function loadAgentRecipient(agentId: string) {
  const { data } = await supabaseAdmin
    .from('site_config')
    .select('agent_id, owner_name, agent_profile, integration_profile')
    .eq('agent_id', agentId)
    .maybeSingle();
  const agentProfile = isRecord(data?.agent_profile) ? data.agent_profile : {};
  const integrationProfile = isRecord(data?.integration_profile) ? data.integration_profile : {};
  const displayName = stringValue(agentProfile.displayName) || stringValue(data?.owner_name) || 'Agent';
  const [firstName, ...lastParts] = displayName.split(/\s+/);
  return {
    subscriberId: `sunset-agent:${agentId}`,
    firstName,
    lastName: lastParts.join(' ') || undefined,
    email: stringValue(integrationProfile.leadEmail) || stringValue(agentProfile.email) || undefined,
    phone: stringValue(agentProfile.phone) || undefined,
    smsEnabled: integrationProfile.agentAlertSmsEnabled === true,
  };
}

async function updateDelivery(id: string, update: Record<string, unknown>) {
  const { error } = await supabaseAdmin.from('notification_deliveries').update(update).eq('id', id);
  if (error) {
    console.error('[AGENT_ALERT_NOTIFICATION_LEDGER]', error.message);
    throw new Error('Unable to persist notification delivery state.');
  }
}

function notificationCost(provider: 'resend' | 'telnyx') {
  const value = provider === 'resend'
    ? process.env.PROFIT_RESEND_COST_PER_DELIVERY
    : process.env.PROFIT_TELNYX_COST_PER_DELIVERY;
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function retryDelayMs(attemptCount: number) {
  return Math.min(60 * 60 * 1000, 60_000 * 2 ** Math.max(0, attemptCount - 1));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}
