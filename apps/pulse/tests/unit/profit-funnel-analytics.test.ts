import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: {} }));

import { buildProfitFunnelAnalytics } from '@/lib/profit/profitFunnelAnalytics';

describe('profit funnel analytics', () => {
  it('builds revenue-oriented funnel and delivery metrics without exposing event payloads', () => {
    const analytics = buildProfitFunnelAnalytics(
      [
        event('open', 'PUBLIC_GUIDE_GUIDE_OPENED', 'session-1'),
        event('response', 'PUBLIC_GUIDE_GUIDE_RESPONSE', 'session-1', { usage: { totalTokens: 1000 } }),
        event('handoff', 'PUBLIC_GUIDE_HANDOFF_OFFERED', 'session-1'),
        event('completed', 'PUBLIC_GUIDE_HANDOFF_COMPLETED', 'session-1'),
        event('tour', 'PUBLIC_GUIDE_TOUR_REQUESTED', 'session-1'),
        event('unanswered', 'PUBLIC_GUIDE_UNANSWERED_QUESTION', 'session-2'),
        event('action', 'AGENT_LEAD_ACTION_OPENED', 'operator-1'),
      ],
      [
        { id: 'lead-1', funnel_id: '22222222-2222-4222-8222-222222222222', status: 'touring', source: 'jamie_public_guide', contact_attempted_at: '2026-08-24T10:01:00.000Z', responded_at: '2026-08-24T10:04:00.000Z', response_source: 'appointment_booked', estimated_pipeline_value: 12500, closed_revenue: null, value_currency: 'USD', value_source: 'operator_estimate', created_at: '2026-08-24T10:00:00.000Z', metadata: { rawInput: 'private' } },
        { id: 'lead-2', status: 'closed', source: 'agent_site_contact', estimated_pipeline_value: 15000, closed_revenue: 30000, value_currency: 'USD', value_source: 'closing_statement', created_at: '2026-08-24T10:00:00.000Z', metadata: null },
      ],
      [
        { id: 'delivery-1', funnel_id: '22222222-2222-4222-8222-222222222222', lead_id: 'lead-1', status: 'sent', provider: 'resend', cost_usd: 0.006, created_at: '2026-08-24T10:00:00.000Z', completed_at: '2026-08-24T10:00:08.000Z' },
        { id: 'delivery-2', lead_id: 'lead-2', status: 'failed', created_at: '2026-08-24T10:00:00.000Z', completed_at: null },
      ],
      [
        { id: 'notification-1', lead_id: 'lead-1', priority: 'high', read_at: '2026-08-24T10:01:00.000Z', created_at: '2026-08-24T10:00:00.000Z' },
        { id: 'notification-2', lead_id: 'lead-2', priority: 'high', read_at: null, created_at: '2026-08-24T10:00:00.000Z' },
      ],
      { modelPer1kTokens: 0.01, notificationPerDelivery: 0.02 },
    );

    expect(analytics.leads).toEqual(expect.objectContaining({ total: 2, jamieTotal: 1, estimatedPipelineValue: 42500, completedLeads: 1, closedLeads: 0, qualificationRate: 100 }));
    expect(analytics.leads.bySource).toEqual([
      { source: 'agent_site_contact', leads: 1, qualified: 1, closed: 1, estimatedPipelineValue: 30000, valuedLeads: 1 },
      { source: 'jamie_public_guide', leads: 1, qualified: 1, closed: 0, estimatedPipelineValue: 12500, valuedLeads: 1 },
    ]);
    expect(analytics.notifications).toEqual(expect.objectContaining({ total: 2, sent: 1, failed: 1, deliveryRate: 50, averageDeliverySeconds: 8, hotTotal: 2, hotRead: 1, hotReadRate: 50, actionOpened: 1, costReceipts: 1, missingCostReceipts: 0 }));
    expect(analytics.acquisition).toEqual({ modelCost: 0.01, notificationCost: 0.006, costPerQualifiedLead: 0.016 });
    expect(analytics.identity).toEqual({ leadsLinked: 1, leadsTotal: 2, deliveriesLinked: 1, deliveriesTotal: 2 });
    expect(analytics.engagement).toEqual({ contacted: 1, responded: 1, appointments: 1, contactRate: 100, responseRate: 100 });
    expect(analytics.baseline).toEqual(expect.objectContaining({
      confidence: 'verified',
      metrics: expect.objectContaining({
        conversations: { value: 1, confidence: 'verified' },
        consentedHandoffs: { value: 1, confidence: 'verified' },
        appointments: { value: 1, confidence: 'verified' },
        revenue: { value: null, confidence: 'unknown' },
        totalVariableCost: { value: 0.016, confidence: 'verified' },
      }),
    }));
    expect(analytics.scopes.notificationOperations).toContain('tied to leads created during the window');
    expect(analytics.failureSignals).toEqual({ unansweredQuestions: 1, failedNotifications: 1, suppressedNotifications: 0 });
    expect(JSON.stringify(analytics)).not.toContain('private');
  });

  it('keeps missing value and cost data unknown', () => {
    const analytics = buildProfitFunnelAnalytics(
      [event('open', 'PUBLIC_GUIDE_GUIDE_OPENED', 'session-1', null)],
      [{ id: 'lead-1', status: 'new', source: 'jamie_public_guide', created_at: '2026-08-24T10:00:00.000Z', metadata: null }],
      [],
      [],
      { modelPer1kTokens: null, notificationPerDelivery: null },
    );

    expect(analytics.leads.estimatedPipelineValue).toBeNull();
    expect(analytics.acquisition).toEqual({ modelCost: null, notificationCost: 0, costPerQualifiedLead: null });
    expect(analytics.identity).toEqual({ leadsLinked: 0, leadsTotal: 1, deliveriesLinked: 0, deliveriesTotal: 0 });
    expect(analytics.engagement).toEqual({ contacted: 0, responded: 0, appointments: 0, contactRate: 0, responseRate: null });
    expect(analytics.baseline.confidence).toBe('partial');
  });
});

function event(id: string, event_type: string, actor_id: string, metadata: Record<string, unknown> | null = null) {
  return { id, event_type, actor_id, target_id: event_type === 'AGENT_LEAD_ACTION_OPENED' ? 'lead-1' : null, metadata, created_at: '2026-08-24T10:00:00.000Z' };
}
