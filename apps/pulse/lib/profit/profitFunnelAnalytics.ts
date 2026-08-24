import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

const WINDOW_DAYS = 7;
const FUNNEL_EVENTS = [
  'PUBLIC_GUIDE_GUIDE_OPENED',
  'PUBLIC_GUIDE_GUIDE_RESPONSE',
  'PUBLIC_GUIDE_HANDOFF_OFFERED',
  'PUBLIC_GUIDE_HANDOFF_COMPLETED',
  'PUBLIC_GUIDE_TOUR_REQUESTED',
  'PUBLIC_GUIDE_UNANSWERED_QUESTION',
  'AGENT_LEAD_ACTION_OPENED',
] as const;

type FunnelEvent = {
  id: string;
  event_type: string;
  actor_id: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Lead = {
  id: string;
  metadata: Record<string, unknown> | null;
  status: string | null;
  source: string | null;
  estimated_pipeline_value?: number | string | null;
  closed_revenue?: number | string | null;
  value_currency?: string | null;
  value_source?: string | null;
  created_at: string;
};

type Delivery = {
  id: string;
  lead_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type AgentNotification = {
  id: string;
  lead_id: string | null;
  priority: string;
  read_at: string | null;
  created_at: string;
};

export type ProfitFunnelAnalytics = ReturnType<typeof buildProfitFunnelAnalytics>;

export type ProfitCostRates = {
  modelPer1kTokens: number | null;
  notificationPerDelivery: number | null;
};

export async function loadProfitFunnelAnalytics(now = new Date()) {
  const since = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [eventResult, leadResult, deliveryResult, notificationResult] = await Promise.all([
    supabaseAdmin
      .from('intelligence_events')
      .select('id, event_type, actor_id, target_id, metadata, created_at')
      .in('event_type', [...FUNNEL_EVENTS])
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000),
    supabaseAdmin
      .from('agent_site_leads')
      .select('id, metadata, status, source, estimated_pipeline_value, closed_revenue, value_currency, value_source, created_at')
      .gte('created_at', since)
      .limit(2000),
    supabaseAdmin
      .from('notification_deliveries')
      .select('id, lead_id, status, created_at, completed_at')
      .gte('created_at', since)
      .limit(2000),
    supabaseAdmin
      .from('agent_notifications')
      .select('id, lead_id, priority, read_at, created_at')
      .gte('created_at', since)
      .limit(2000),
  ]);

  if (eventResult.error || leadResult.error || deliveryResult.error || notificationResult.error) {
    throw new Error(eventResult.error?.message || leadResult.error?.message || deliveryResult.error?.message || notificationResult.error?.message || 'Profit analytics failed to load.');
  }

  return buildProfitFunnelAnalytics(
    (eventResult.data || []) as FunnelEvent[],
    (leadResult.data || []).map((lead) => ({ ...lead, source: lead.source || null })) as Lead[],
    (deliveryResult.data || []) as Delivery[],
    (notificationResult.data || []) as AgentNotification[],
    readCostRates(),
  );
}

export function buildProfitFunnelAnalytics(
  events: FunnelEvent[],
  leads: Lead[],
  deliveries: Delivery[],
  notifications: AgentNotification[] = [],
  rates: ProfitCostRates = readCostRates(),
) {
  const opened = uniqueSessions(events, 'PUBLIC_GUIDE_GUIDE_OPENED');
  const offered = uniqueSessions(events, 'PUBLIC_GUIDE_HANDOFF_OFFERED');
  const completed = uniqueSessions(events, 'PUBLIC_GUIDE_HANDOFF_COMPLETED');
  const tours = uniqueSessions(events, 'PUBLIC_GUIDE_TOUR_REQUESTED');
  const sent = deliveries.filter((delivery) => delivery.status === 'sent');
  const failed = deliveries.filter((delivery) => delivery.status === 'failed');
  const suppressed = deliveries.filter((delivery) => delivery.status === 'suppressed');
  const leadValues = leads.map(readLeadValue).filter((value): value is number => value !== null);
  const estimatedPipelineValue = leadValues.length ? leadValues.reduce((sum, value) => sum + value, 0) : null;
  const eventCosts = events.map((event) => readModelCost(event.metadata, rates.modelPer1kTokens)).filter((value): value is number => value !== null);
  const modelCost = eventCosts.length ? eventCosts.reduce((sum, value) => sum + value, 0) : null;
  const notificationCost = rates.notificationPerDelivery === null ? null : sent.length * rates.notificationPerDelivery;
  const hotNotifications = notifications.filter((notification) => notification.priority === 'high');
  const readHotNotifications = hotNotifications.filter((notification) => notification.read_at);
  const actionOpened = new Set(events.filter((event) => event.event_type === 'AGENT_LEAD_ACTION_OPENED').map((event) => event.target_id || `event:${event.id}`));
  const completedLeads = leads.filter((lead) => ['touring', 'closed'].includes((lead.status || '').toLowerCase())).length;
  const closedLeads = leads.filter((lead) => (lead.status || '').toLowerCase() === 'closed').length;
  const qualifiedLeadIds = new Set(leads.filter((lead) => ['touring', 'closed'].includes((lead.status || '').toLowerCase())).map((lead) => lead.id));
  const closedLeadIds = new Set(leads.filter((lead) => (lead.status || '').toLowerCase() === 'closed').map((lead) => lead.id));
  const totalVariableCost = modelCost !== null && notificationCost !== null ? modelCost + notificationCost : null;
  const costPerQualifiedLead = totalVariableCost !== null && completedLeads > 0 ? totalVariableCost / completedLeads : null;
  const sourceMap = new Map<string, { source: string; leads: number; qualified: number; closed: number; estimatedPipelineValue: number | null; valuedLeads: number }>();
  for (const lead of leads) {
    const source = lead.source?.trim() || 'unknown';
    const current = sourceMap.get(source) || { source, leads: 0, qualified: 0, closed: 0, estimatedPipelineValue: null, valuedLeads: 0 };
    current.leads += 1;
    if (qualifiedLeadIds.has(lead.id)) current.qualified += 1;
    if (closedLeadIds.has(lead.id)) current.closed += 1;
    const value = readLeadValue(lead);
    if (value !== null) {
      current.estimatedPipelineValue = (current.estimatedPipelineValue || 0) + value;
      current.valuedLeads += 1;
    }
    sourceMap.set(source, current);
  }

  return {
    windowDays: WINDOW_DAYS,
    generatedAt: new Date().toISOString(),
    funnel: [
      stage('conversations', 'Jamie conversations', opened.size, opened.size),
      stage('handoffOffered', 'Handoff offered', offered.size, opened.size),
      stage('handoffCompleted', 'Handoff completed', completed.size, opened.size),
      stage('tourRequested', 'Tour requested', tours.size, opened.size),
      stage('pipeline', 'Lead in touring or closed stage', completedLeads, leads.length),
      stage('closed', 'Closed leads', closedLeads, leads.length),
    ],
    leads: {
      total: leads.length,
      estimatedPipelineValue,
      completedLeads,
      closedLeads,
      qualificationRate: leads.length ? Math.round((completedLeads / leads.length) * 100) : null,
      bySource: Array.from(sourceMap.values()).sort((left, right) => (right.estimatedPipelineValue || 0) - (left.estimatedPipelineValue || 0)),
    },
    notifications: {
      total: deliveries.length,
      sent: sent.length,
      failed: failed.length,
      suppressed: suppressed.length,
      deliveryRate: deliveries.length ? Math.round((sent.length / deliveries.length) * 100) : null,
      averageDeliverySeconds: averageDeliverySeconds(sent),
      hotTotal: hotNotifications.length,
      hotRead: readHotNotifications.length,
      hotReadRate: hotNotifications.length ? Math.round((readHotNotifications.length / hotNotifications.length) * 100) : null,
      actionOpened: actionOpened.size,
    },
    acquisition: { modelCost, notificationCost, costPerQualifiedLead },
    failureSignals: {
      unansweredQuestions: events.filter((event) => event.event_type === 'PUBLIC_GUIDE_UNANSWERED_QUESTION').length,
      failedNotifications: failed.length,
      suppressedNotifications: suppressed.length,
    },
  };
}

function stage(id: string, label: string, count: number, denominator: number) {
  return { id, label, count, conversionRate: denominator ? Math.round((count / denominator) * 100) : null };
}

function uniqueSessions(events: FunnelEvent[], eventType: string) {
  return new Set(events.filter((event) => event.event_type === eventType).map((event) => event.actor_id || `event:${event.id}`));
}

function readLeadValue(lead: Lead) {
  const closed = optionalMoney(lead.closed_revenue);
  if (closed !== null) return closed;
  return optionalMoney(lead.estimated_pipeline_value);
}

function optionalMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function readModelCost(metadata: Record<string, unknown> | null, ratePer1kTokens: number | null) {
  if (!metadata) return null;
  const direct = metadata.costUsd ?? metadata.modelCostUsd;
  if (typeof direct === 'number' && Number.isFinite(direct) && direct >= 0) return direct;
  const usage = isRecord(metadata.usage) ? metadata.usage : metadata;
  const tokens = numberValue(usage.totalTokens)
    ?? ((numberValue(usage.inputTokens) || 0) + (numberValue(usage.outputTokens) || 0));
  return tokens > 0 && ratePer1kTokens !== null ? (tokens / 1000) * ratePer1kTokens : null;
}

function readCostRates(): ProfitCostRates {
  return {
    modelPer1kTokens: optionalNonNegativeNumber(process.env.PROFIT_MODEL_COST_PER_1K_TOKENS),
    notificationPerDelivery: optionalNonNegativeNumber(process.env.PROFIT_NOTIFICATION_COST_PER_DELIVERY),
  };
}

function optionalNonNegativeNumber(value: string | undefined) {
  if (!value?.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function numberValue(value: unknown) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function averageDeliverySeconds(deliveries: Delivery[]) {
  const values = deliveries
    .map((delivery) => delivery.completed_at ? Date.parse(delivery.completed_at) - Date.parse(delivery.created_at) : null)
    .filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
  return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length / 1000) : null;
}
