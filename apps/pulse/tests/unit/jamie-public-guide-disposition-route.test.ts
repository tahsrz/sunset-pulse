import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  eqRead: vi.fn(),
  eqUpdate: vi.fn(),
  from: vi.fn(),
  isAuthResponse: vi.fn(),
  operatorAuditUser: vi.fn(),
  readSelect: vi.fn(),
  readSingle: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
  updateSelect: vi.fn(),
  updateSingle: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  isAuthResponse: mocks.isAuthResponse,
  operatorAuditUser: mocks.operatorAuditUser,
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: mocks.from, rpc: mocks.rpc },
}));

import { PATCH } from '@/app/api/admin/agent-leads/route';

describe('Jamie public guide disposition route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.isAuthResponse.mockReturnValue(false);
    mocks.operatorAuditUser.mockReturnValue({
      userId: 'operator-1',
      name: 'Operator',
      email: null,
      role: 'local',
    });
    mocks.from
      .mockReturnValueOnce({ select: mocks.readSelect })
      .mockReturnValueOnce({ update: mocks.update });
    mocks.readSelect.mockReturnValue({ eq: mocks.eqRead });
    mocks.eqRead.mockReturnValue({ single: mocks.readSingle });
    mocks.update.mockReturnValue({ eq: mocks.eqUpdate });
    mocks.eqUpdate.mockReturnValue({ select: mocks.updateSelect });
    mocks.updateSelect.mockReturnValue({ single: mocks.updateSingle });
    mocks.readSingle.mockResolvedValue({
      data: {
        metadata: { publicGuideBrief: { schemaVersion: 1 } },
        source: 'jamie_public_guide',
        status: 'new',
      },
      error: null,
    });
    mocks.updateSingle.mockResolvedValue({
      data: { id: LEAD_ID, status: 'reviewed' },
      error: null,
    });
    mocks.rpc.mockResolvedValue({ error: null });
  });

  it('persists a fixed disposition, preserves metadata, and logs a privacy-safe event', async () => {
    const response = await PATCH(request({ action: 'disposition', disposition: 'qualified' }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'reviewed',
      reviewed_at: expect.any(String),
      metadata: expect.objectContaining({
        publicGuideBrief: { schemaVersion: 1 },
        publicGuideDisposition: expect.objectContaining({ value: 'qualified' }),
      }),
    }));
    expect(mocks.rpc).toHaveBeenCalledWith('log_intelligence_event', expect.objectContaining({
      p_type: 'PUBLIC_GUIDE_LEAD_DISPOSITION',
      p_target_id: LEAD_ID,
      p_metadata: { disposition: 'qualified' },
    }));
    expect(JSON.stringify(mocks.rpc.mock.calls[0])).not.toContain('email');
  });

  it('rejects disposition updates for ordinary agent-site leads', async () => {
    mocks.readSingle.mockResolvedValue({
      data: { metadata: {}, source: 'agent_site', status: 'new' },
      error: null,
    });

    const response = await PATCH(request({ action: 'disposition', disposition: 'contacted' }));

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('keeps a saved disposition successful when optional telemetry is unavailable', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocks.rpc.mockRejectedValue(new Error('telemetry unavailable'));

    const response = await PATCH(request({ action: 'disposition', disposition: 'contacted' }));

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith('[JAMIE_PUBLIC_GUIDE_DISPOSITION_EVENT]', 'Error');
    warning.mockRestore();
  });

  it('rejects arbitrary disposition values before database access', async () => {
    const response = await PATCH(request({ action: 'disposition', disposition: 'send_everything' }));

    expect(response.status).toBe(400);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

const LEAD_ID = '11111111-1111-4111-8111-111111111111';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/agent-leads', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: LEAD_ID, ...body }),
  });
}
