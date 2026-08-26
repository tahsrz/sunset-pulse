import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  isAuthResponse: mocks.isAuthResponse,
  operatorAuditUser: mocks.operatorAuditUser,
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc: mocks.rpc } }));

import { POST } from '@/app/api/admin/agent-leads/action-events/route';

describe('agent lead action events route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.isAuthResponse.mockReturnValue(false);
    mocks.operatorAuditUser.mockReturnValue({ userId: 'operator-1', name: 'Operator' });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('logs a privacy-safe native action event', async () => {
    const response = await POST(request({
      leadId: LEAD_ID,
      actionType: 'call',
      agentId: 'agent-one',
      listingId: 'MLS-104',
    }));

    expect(response.status).toBe(204);
    expect(mocks.rpc).toHaveBeenCalledWith('log_intelligence_event', expect.objectContaining({
      p_type: 'AGENT_LEAD_ACTION_OPENED',
      p_target_id: LEAD_ID,
      p_metadata: { actionType: 'call', agentId: 'agent-one', listingId: 'MLS-104' },
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain('email');
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain('phone');
  });

  it('rejects unknown action types before telemetry access', async () => {
    const response = await POST(request({ leadId: LEAD_ID, actionType: 'send_everything', agentId: 'agent-one' }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

const LEAD_ID = '11111111-1111-4111-8111-111111111111';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/agent-leads/action-events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
