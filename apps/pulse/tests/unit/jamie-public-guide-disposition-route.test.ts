import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  apply: vi.fn(),
  eqRead: vi.fn(),
  from: vi.fn(),
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(),
  readSelect: vi.fn(),
  readSingle: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  isAuthResponse: mocks.isAuthResponse,
  operatorAuditUser: mocks.operatorAuditUser,
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
}));
vi.mock('@/lib/sites/agentLeadActions.server', () => ({
  AgentLeadActionError: class AgentLeadActionError extends Error { constructor(public code?: string) { super(); } },
  applyAgentLeadAction: mocks.apply,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));

import { PATCH } from '@/app/api/admin/agent-leads/route';

describe('Jamie public guide disposition route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.isAuthResponse.mockReturnValue(false);
    mocks.operatorAuditUser.mockReturnValue({ userId: 'operator-1', name: 'Operator', email: null, role: 'local' });
    mocks.from.mockReturnValue({ select: mocks.readSelect });
    mocks.readSelect.mockReturnValue({ eq: mocks.eqRead });
    mocks.eqRead.mockReturnValue({ single: mocks.readSingle });
    mocks.readSingle.mockResolvedValue({ data: {
      metadata: { publicGuideBrief: { schemaVersion: 1 } }, agent_id: 'agent-one',
      funnel_id: FUNNEL_ID, source: 'jamie_public_guide', status: 'new', revision: 1,
    }, error: null });
    mocks.apply.mockResolvedValue({ ok: true, replayed: false, lead: { id: LEAD_ID } });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('uses an atomic replay-safe action and logs a privacy-safe disposition event', async () => {
    const response = await PATCH(request({ action: 'disposition', disposition: 'qualified' }));
    expect(response.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledWith('operator-1', expect.objectContaining({
      action: 'disposition', disposition: 'qualified', expectedRevision: 1,
    }), expect.objectContaining({ userId: 'operator-1' }));
    expect(mocks.rpc).toHaveBeenCalledWith('log_intelligence_event', expect.objectContaining({
      p_type: 'PUBLIC_GUIDE_LEAD_DISPOSITION', p_target_id: LEAD_ID,
      p_metadata: { disposition: 'qualified' },
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain('email');
  });

  it('does not duplicate optional telemetry when an action is replayed', async () => {
    mocks.apply.mockResolvedValue({ ok: true, replayed: true, lead: { id: LEAD_ID } });
    const response = await PATCH(request({ action: 'disposition', disposition: 'contacted' }));
    expect(response.status).toBe(200);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects disposition updates for ordinary agent-site leads', async () => {
    mocks.readSingle.mockResolvedValue({ data: { metadata: {}, source: 'agent_site', status: 'new', revision: 1 }, error: null });
    const response = await PATCH(request({ action: 'disposition', disposition: 'qualified' }));
    expect(response.status).toBe(400);
    expect(mocks.apply).not.toHaveBeenCalled();
  });

  it('keeps a saved disposition successful when optional telemetry is unavailable', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.rpc.mockRejectedValue(new Error('telemetry unavailable'));
    const response = await PATCH(request({ action: 'disposition', disposition: 'contacted' }));
    expect(response.status).toBe(200);
    expect(mocks.apply).toHaveBeenCalledOnce();
    expect(warning).toHaveBeenCalledWith('[JAMIE_PUBLIC_GUIDE_DISPOSITION_EVENT]', 'Error');
    warning.mockRestore();
  });

  it('rejects arbitrary dispositions and missing operation identity before database access', async () => {
    const invalid = await PATCH(request({ action: 'disposition', disposition: 'send_everything' }));
    expect(invalid.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();

    const missingIdentity = await PATCH(new NextRequest('http://localhost/api/admin/agent-leads', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: LEAD_ID, action: 'review', expectedRevision: 1 }),
    }));
    expect(missingIdentity.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

const LEAD_ID = '11111111-1111-4111-8111-111111111111';
const FUNNEL_ID = '22222222-2222-4222-8222-222222222222';
const REQUEST_KEY = '33333333-3333-4333-8333-333333333333';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/agent-leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: LEAD_ID, expectedRevision: 1, requestKey: REQUEST_KEY, ...body }),
  });
}
