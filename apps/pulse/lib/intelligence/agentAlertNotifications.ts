import 'server-only';

import {
  decideAgentAlertNotification,
  intelligenceEventSchema,
  processIntelligenceEvent,
  type AgentAlert,
} from '@/lib/intelligence/agentAlerts';
import { enrichAgentAlertEvents } from '@/lib/intelligence/agentAlertContext';
import { dispatchAgentAlertNotification } from '@/lib/notifications/agentAlertChannels';
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
  };

  for (const delivery of claimed) {
    const outcome = await dispatchDelivery(delivery);
    result[outcome] += 1;
  }

  return result;
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
