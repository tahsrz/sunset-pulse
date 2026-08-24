import 'server-only';

import { supabaseAdmin } from '@/lib/supabase';

const WINDOW_DAYS = 7;
type ConfidenceState = 'verified' | 'partial' | 'unknown';
const FUNNEL_EVENTS = [
  'PUBLIC_GUIDE_GUIDE_OPENED',
  'PUBLIC_GUIDE_GUIDE_RESPONSE',
  'PUBLIC_GUIDE_HANDOFF_OFFERED',
  'PUBLIC_GUIDE_HANDOFF_COMPLETED',
  'PUBLIC_GUIDE_TOUR_REQUESTED',
  'PUBLIC_GUIDE_UNANSWERED_QUESTION',
  'PUBLIC_GUIDE_GUIDE_ERROR',
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
  funnel_id?: string | null;
  metadata: Record<string, unknown> | null;
  status: string | null;
  source: string | null;
  estimated_pipeline_value?: number | string | null;
  closed_revenue?: number | string | null;
  value_currency?: string | null;
  value_source?: string | null;
  created_at: string;
  contact_attempted_at?: string | null;
  responded_at?: string | null;
  response_source?: string | null;
};

type Delivery = {
  id: string;
  funnel_id?: string | null;
  lead_id: string | null;
  status: string;
  created_at: string;
  completed_at: string | null;
  provider?: string | null;
  cost_usd?: number | string | null;
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
      .select('id, funnel_id, metadata, status, source, contact_attempted_at, responded_at, response_source, estimated_pipeline_value, closed_revenue, value_currency, value_source, created_at')
      .gte('created_at', since)
      .limit(2000),
    supabaseAdmin
      .from('notification_deliveries')
      .select('id, funnel_id, lead_id, status, provider, cost_usd, created_at, completed_at')
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
  const jamieLeads = leads.filter((lead) => lead.source === 'jamie_public_guide');
  const cohortLeadIds = new Set(leads.map((lead) => lead.id));
  const cohortDeliveries = deliveries.filter((delivery) => delivery.lead_id && cohortLeadIds.has(delivery.lead_id));
  const cohortNotifications = notifications.filter((notification) => notification.lead_id && cohortLeadIds.has(notification.lead_id));
  const opened = uniqueSessions(events, 'PUBLIC_GUIDE_GUIDE_OPENED');
  const offered = uniqueSessions(events, 'PUBLIC_GUIDE_HANDOFF_OFFERED');
  const completed = uniqueSessions(events, 'PUBLIC_GUIDE_HANDOFF_COMPLETED');
  const tours = uniqueSessions(events, 'PUBLIC_GUIDE_TOUR_REQUESTED');
  const highIntent = uniqueSessions(events.filter(isHighIntentEvent));
  const sent = cohortDeliveries.filter((delivery) => delivery.status === 'sent');
  const failed = cohortDeliveries.filter((delivery) => delivery.status === 'failed');
  const suppressed = cohortDeliveries.filter((delivery) => delivery.status === 'suppressed');
  const leadValues = leads.map(readLeadValue).filter((value): value is number => value !== null);
  const estimatedPipelineValue = leadValues.length ? leadValues.reduce((sum, value) => sum + value, 0) : null;
  const eventCosts = events.map((event) => readModelCost(event.metadata, rates.modelPer1kTokens)).filter((value): value is number => value !== null);
  const modelCost = eventCosts.length ? eventCosts.reduce((sum, value) => sum + value, 0) : null;
  const receiptCosts = sent.map((delivery) => optionalMoney(delivery.cost_usd));
  const hasCompleteNotificationReceipts = receiptCosts.every((value) => value !== null);
  const notificationCost = hasCompleteNotificationReceipts
    ? receiptCosts.reduce<number>((sum, value) => sum + (value || 0), 0)
    : rates.notificationPerDelivery === null ? null : sent.length * rates.notificationPerDelivery;
  const hotNotifications = cohortNotifications.filter((notification) => notification.priority === 'high');
  const readHotNotifications = hotNotifications.filter((notification) => notification.read_at);
  const actionOpened = new Set(events.filter((event) => event.event_type === 'AGENT_LEAD_ACTION_OPENED').map((event) => event.target_id || `event:${event.id}`));
  const completedLeads = jamieLeads.filter((lead) => ['touring', 'closed'].includes((lead.status || '').toLowerCase())).length;
  const closedLeads = jamieLeads.filter((lead) => (lead.status || '').toLowerCase() === 'closed').length;
  const qualifiedLeadIds = new Set(leads.filter((lead) => ['touring', 'closed'].includes((lead.status || '').toLowerCase())).map((lead) => lead.id));
  const closedLeadIds = new Set(leads.filter((lead) => (lead.status || '').toLowerCase() === 'closed').map((lead) => lead.id));
  const contactedLeads = jamieLeads.filter((lead) => Boolean(lead.contact_attempted_at));
  const respondedLeads = jamieLeads.filter((lead) => Boolean(lead.responded_at));
  const appointments = respondedLeads.filter((lead) => lead.response_source === 'appointment_booked');
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const deliveryWithin60Seconds = sent.filter((delivery) => deliverySeconds(delivery) !== null && deliverySeconds(delivery)! <= 60).length;
  const hotLeadIds = new Set(hotNotifications.flatMap((notification) => notification.lead_id ? [notification.lead_id] : []));
  const hotSentByLead = new Map<string, Delivery>();
  for (const delivery of sent) {
    if (!delivery.lead_id || !hotLeadIds.has(delivery.lead_id)) continue;
    const current = hotSentByLead.get(delivery.lead_id);
    if (!current || Date.parse(delivery.completed_at || delivery.created_at) < Date.parse(current.completed_at || current.created_at)) hotSentByLead.set(delivery.lead_id, delivery);
  }
  const contactedWithin10Minutes = Array.from(hotSentByLead.entries()).filter(([leadId, delivery]) => {
    const contactedAt = leadById.get(leadId)?.contact_attempted_at;
    const deliveredAt = delivery.completed_at;
    if (!contactedAt || !deliveredAt) return false;
    const elapsed = Date.parse(contactedAt) - Date.parse(deliveredAt);
    return elapsed >= 0 && elapsed <= 10 * 60 * 1000;
  }).length;
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
      stage('pipeline', 'Jamie lead in touring or closed stage', completedLeads, jamieLeads.length),
      stage('closed', 'Closed Jamie leads', closedLeads, jamieLeads.length),
    ],
    leads: {
      total: leads.length,
      jamieTotal: jamieLeads.length,
      estimatedPipelineValue,
      completedLeads,
      closedLeads,
      qualificationRate: jamieLeads.length ? Math.round((completedLeads / jamieLeads.length) * 100) : null,
      bySource: Array.from(sourceMap.values()).sort((left, right) => (right.estimatedPipelineValue || 0) - (left.estimatedPipelineValue || 0)),
    },
    notifications: {
      total: cohortDeliveries.length,
      sent: sent.length,
      failed: failed.length,
      suppressed: suppressed.length,
      deliveryRate: cohortDeliveries.length ? Math.round((sent.length / cohortDeliveries.length) * 100) : null,
      averageDeliverySeconds: averageDeliverySeconds(sent),
      deliveryWithin60Seconds,
      deliverySlaRate: sent.length ? Math.round((deliveryWithin60Seconds / sent.length) * 100) : null,
      deliverySlaTarget: 90,
      hotTotal: hotNotifications.length,
      hotRead: readHotNotifications.length,
      hotReadRate: hotNotifications.length ? Math.round((readHotNotifications.length / hotNotifications.length) * 100) : null,
      actionOpened: actionOpened.size,
      costReceipts: receiptCosts.filter((value) => value !== null).length,
      missingCostReceipts: receiptCosts.filter((value) => value === null).length,
    },
    acquisition: { modelCost, notificationCost, costPerQualifiedLead },
    engagement: {
      contacted: contactedLeads.length,
      responded: respondedLeads.length,
      appointments: appointments.length,
      contactRate: jamieLeads.length ? Math.round((contactedLeads.length / jamieLeads.length) * 100) : null,
      responseRate: contactedLeads.length ? Math.round((respondedLeads.length / contactedLeads.length) * 100) : null,
      hotDelivered: hotSentByLead.size,
      contactedWithin10Minutes,
      contactSlaRate: hotSentByLead.size ? Math.round((contactedWithin10Minutes / hotSentByLead.size) * 100) : null,
      contactSlaTarget: 80,
      contactWindowScope: 'all_hours_pending_operating_hours_config',
    },
    identity: {
      leadsLinked: leads.filter((lead) => Boolean(lead.funnel_id || stringValue(lead.metadata?.funnelId))).length,
      leadsTotal: leads.length,
      deliveriesLinked: deliveries.filter((delivery) => Boolean(delivery.funnel_id)).length,
      deliveriesTotal: deliveries.length,
    },
    failureAudit: buildFailureAudit(events, jamieLeads, cohortDeliveries),
    baseline: buildBaseline({
      opened: opened.size,
      highIntent: highIntent.size,
      completed: completed.size,
      jamieLeads,
      completedLeads,
      contacted: contactedLeads.length,
      appointments: appointments.length,
      closedLeads,
      modelCost,
      notificationCost,
    }),
    scopes: {
      window: `${WINDOW_DAYS} rolling days`,
      jamieFunnel: 'Jamie sessions and jamie_public_guide leads created during the window',
      channelComparison: 'All lead sources created during the window, using the same status rules',
      notificationOperations: 'Deliveries tied to leads created during the window',
      timestampOwners: {
        conversation: 'intelligence_events.created_at',
        lead: 'agent_site_leads.created_at',
        contact: 'agent_site_leads.contact_attempted_at',
        response: 'agent_site_leads.responded_at',
        close: 'agent_site_leads status and closed_revenue',
      },
    },
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

function uniqueSessions(events: FunnelEvent[], eventType?: string) {
  return new Set(events.filter((event) => !eventType || event.event_type === eventType).map((event) => event.actor_id || `event:${event.id}`));
}

function isHighIntentEvent(event: FunnelEvent) {
  if (['PUBLIC_GUIDE_HANDOFF_OFFERED', 'PUBLIC_GUIDE_HANDOFF_COMPLETED', 'PUBLIC_GUIDE_TOUR_REQUESTED'].includes(event.event_type)) return true;
  const intent = stringValue(event.metadata?.intentCategory);
  return ['buying_process', 'listing_fact', 'listing_search', 'location_comparison', 'selling_process'].includes(intent);
}

type FailureCategory = 'retrieval' | 'qualification' | 'unsupported_inventory' | 'missing_action' | 'delivery' | 'agent_follow_through';

function buildFailureAudit(events: FunnelEvent[], leads: Lead[], deliveries: Delivery[]) {
  const sessions = new Map<string, FunnelEvent[]>();
  for (const event of events) {
    if (!event.actor_id?.startsWith('public:')) continue;
    const current = sessions.get(event.actor_id) || [];
    current.push(event);
    sessions.set(event.actor_id, current);
  }
  const leadsByActor = new Map<string, Lead>();
  for (const lead of leads) {
    const context = isRecord(lead.metadata?.publicGuideContext) ? lead.metadata?.publicGuideContext : {};
    const sessionHash = stringValue(context.sessionIdHash);
    if (sessionHash) leadsByActor.set(`public:${sessionHash}`, lead);
  }
  const deliveriesByLead = new Map<string, Delivery[]>();
  for (const delivery of deliveries) {
    if (!delivery.lead_id) continue;
    const current = deliveriesByLead.get(delivery.lead_id) || [];
    current.push(delivery);
    deliveriesByLead.set(delivery.lead_id, current);
  }

  const samples = Array.from(sessions.entries()).flatMap(([actorId, sessionEvents]) => {
    if (!sessionEvents.some(isHighIntentEvent)) return [];
    const lead = leadsByActor.get(actorId);
    const category = classifyFailure(sessionEvents, lead, lead ? deliveriesByLead.get(lead.id) || [] : []);
    if (!category) return [];
    return [{
      category,
      occurredAt: sessionEvents.map((event) => event.created_at).sort().at(-1) || null,
      estimatedLostOpportunity: lead ? readLeadValue(lead) : null,
      evidence: failureEvidence(category),
    }];
  }).sort((left, right) => (right.estimatedLostOpportunity || 0) - (left.estimatedLostOpportunity || 0)).slice(0, 20);

  const categoryCounts = new Map<FailureCategory, { count: number; estimatedLostOpportunity: number | null }>();
  for (const sample of samples) {
    const current = categoryCounts.get(sample.category) || { count: 0, estimatedLostOpportunity: null };
    current.count += 1;
    if (sample.estimatedLostOpportunity !== null) current.estimatedLostOpportunity = (current.estimatedLostOpportunity || 0) + sample.estimatedLostOpportunity;
    categoryCounts.set(sample.category, current);
  }
  const topLeaks = Array.from(categoryCounts.entries()).map(([category, values]) => ({
    category,
    ...values,
    ...failureRemediation(category),
  })).sort((left, right) => (right.estimatedLostOpportunity || 0) - (left.estimatedLostOpportunity || 0) || right.count - left.count).slice(0, 3);

  return { audited: samples.length, target: 20, transcriptStored: false, samples, topLeaks };
}

function classifyFailure(events: FunnelEvent[], lead: Lead | undefined, deliveries: Delivery[]): FailureCategory | null {
  if (events.some((event) => event.metadata?.outcome === 'listing_unverified')) return 'unsupported_inventory';
  if (events.some((event) => event.event_type === 'PUBLIC_GUIDE_GUIDE_ERROR' || event.event_type === 'PUBLIC_GUIDE_UNANSWERED_QUESTION')) return 'retrieval';
  const offered = events.some((event) => event.event_type === 'PUBLIC_GUIDE_HANDOFF_OFFERED');
  const completed = events.some((event) => event.event_type === 'PUBLIC_GUIDE_HANDOFF_COMPLETED');
  if (!offered) return 'missing_action';
  if (!completed) return 'qualification';
  if (deliveries.some((delivery) => delivery.status === 'failed' || delivery.status === 'suppressed')) return 'delivery';
  if (lead && !lead.contact_attempted_at) return 'agent_follow_through';
  return null;
}

function failureEvidence(category: FailureCategory) {
  const evidence: Record<FailureCategory, string> = {
    retrieval: 'Guide error or unanswered-question event recorded.',
    qualification: 'Handoff was offered but no consented completion was recorded.',
    unsupported_inventory: 'Guide response recorded listing_unverified.',
    missing_action: 'Commercial intent was recorded without a handoff offer.',
    delivery: 'Lead notification delivery failed or was suppressed.',
    agent_follow_through: 'Consented handoff has no authoritative contact-attempt receipt.',
  };
  return evidence[category];
}

function failureRemediation(category: FailureCategory) {
  const remediation: Record<FailureCategory, { owner: string; intervention: string; expectedMetric: string }> = {
    retrieval: { owner: 'Jamie retrieval', intervention: 'Review failed intent and inventory retrieval coverage.', expectedMetric: 'Fewer unanswered commercial questions' },
    qualification: { owner: 'Jamie conversion', intervention: 'Reduce handoff friction and ask only for missing qualification fields.', expectedMetric: 'Higher consented handoff conversion' },
    unsupported_inventory: { owner: 'Inventory', intervention: 'Close verified inventory gaps without relaxing provenance rules.', expectedMetric: 'Fewer unverified listing outcomes' },
    missing_action: { owner: 'Jamie conversion', intervention: 'Offer the next verified action for commercial intent.', expectedMetric: 'Higher handoff-offer rate' },
    delivery: { owner: 'Notifications', intervention: 'Repair recipient configuration or provider delivery failures.', expectedMetric: 'Higher alert delivery rate' },
    agent_follow_through: { owner: 'Agent operations', intervention: 'Contact delivered hot leads and record the attempt.', expectedMetric: 'Higher ten-minute contact rate' },
  };
  return remediation[category];
}

function buildBaseline(input: {
  opened: number;
  highIntent: number;
  completed: number;
  jamieLeads: Lead[];
  completedLeads: number;
  contacted: number;
  appointments: number;
  closedLeads: number;
  modelCost: number | null;
  notificationCost: number | null;
}) {
  const linked = input.jamieLeads.filter((lead) => Boolean(lead.funnel_id || stringValue(lead.metadata?.funnelId))).length;
  const identityConfidence: ConfidenceState = input.jamieLeads.length === 0 ? 'unknown' : linked === input.jamieLeads.length ? 'verified' : 'partial';
  const closedRevenueValues = input.jamieLeads.filter((lead) => (lead.status || '').toLowerCase() === 'closed').map((lead) => optionalMoney(lead.closed_revenue));
  const revenue = closedRevenueValues.length && closedRevenueValues.every((value) => value !== null)
    ? closedRevenueValues.reduce<number>((sum, value) => sum + (value || 0), 0)
    : null;
  const variableCost = input.modelCost !== null && input.notificationCost !== null ? input.modelCost + input.notificationCost : null;
  return {
    confidence: identityConfidence,
    metrics: {
      conversations: metric(input.opened, 'verified'),
      highIntentConversations: metric(input.highIntent, input.opened ? 'partial' : 'unknown'),
      consentedHandoffs: metric(input.completed, identityConfidence),
      qualifiedLeads: metric(input.completedLeads, identityConfidence),
      agentContacts: metric(input.contacted, identityConfidence),
      appointments: metric(input.appointments, identityConfidence),
      closedOpportunities: metric(input.closedLeads, identityConfidence),
      revenue: metric(revenue, revenue === null ? 'unknown' : identityConfidence),
      totalVariableCost: metric(variableCost, variableCost === null ? (input.modelCost !== null || input.notificationCost !== null ? 'partial' : 'unknown') : 'verified'),
    },
  };
}

function metric(value: number | null, confidence: ConfidenceState) {
  return { value, confidence };
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

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
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

function deliverySeconds(delivery: Delivery) {
  if (!delivery.completed_at) return null;
  const elapsed = Date.parse(delivery.completed_at) - Date.parse(delivery.created_at);
  return Number.isFinite(elapsed) && elapsed >= 0 ? Math.round(elapsed / 1000) : null;
}
