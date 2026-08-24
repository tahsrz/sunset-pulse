import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  isAuthResponse: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  from: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  isAuthResponse: mocks.isAuthResponse,
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));

import { GET } from '@/app/api/admin/agent-leads/alerts/route';

describe('agent lead alerts route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.isAuthResponse.mockReturnValue(false);
  });

  it('enriches anonymous visitor activity with authoritative lead context', async () => {
    mocks.from.mockImplementation((table: string) => table === 'intelligence_events'
      ? queryResult([EVENT])
      : queryResult([LEAD]));

    const response = await GET(new NextRequest('http://localhost/api/admin/agent-leads/alerts'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.events[0].metadata).toMatchObject({
      agentId: 'agent-one',
      leadId: LEAD.id,
      listingId: 'MLS-104',
      leadIntelligence: LEAD.metadata.leadIntelligence,
    });
  });

  it('requires a valid timestamp cursor', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/agent-leads/alerts?after=yesterday'));
    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

const EVENT = {
  id: '11111111-1111-4111-8111-111111111111',
  event_type: 'VISITOR_PROPERTY_VIEWED',
  actor_id: 'public:session-hash',
  actor_name: 'Sunset_Pulse_Visitor',
  target_id: 'MLS-104',
  description: 'Visitor viewed a verified property.',
  metadata: { propertyIds: ['MLS-104'] },
  severity: 'INFO',
  created_at: '2026-08-14T12:00:00.000Z',
};

const LEAD = {
  id: '22222222-2222-4222-8222-222222222222',
  agent_id: 'agent-one',
  listing_id: null,
  listing_mls_id: 'MLS-104',
  created_at: '2026-08-14T11:00:00.000Z',
  metadata: {
    sessionIdHash: 'session-hash',
    leadIntelligence: {
      score: 86,
      inferredIntent: 'property_specific',
      reasons: [{ code: 'repeat_property_view', label: 'Returned to the same property', points: 10 }],
    },
  },
};

function queryResult(data: unknown[]) {
  const query: Record<string, unknown> = {};
  for (const method of ['select', 'in', 'order', 'limit', 'gte']) {
    query[method] = vi.fn(() => query);
  }
  query.then = (resolve: (value: unknown) => void) => resolve({ data, error: null });
  return query;
}
