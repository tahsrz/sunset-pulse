import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const routeMocks = vi.hoisted(() => ({
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  getDefaultAgentId: vi.fn(() => 'agent-authoritative'),
  from: vi.fn(),
  update: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: routeMocks.requireOperatorRouteAccess,
  isAuthResponse: routeMocks.isAuthResponse,
}));
vi.mock('@/lib/sites/agentConfig', () => ({
  getDefaultAgentId: routeMocks.getDefaultAgentId,
}));
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: routeMocks.from },
}));

import { POST } from '@/app/api/admin/intelligence/route';

const validIntelligence = {
  grill: {
    name: 'Sunset Gas & Grill',
    tagline: 'Local food and fuel',
    coordinates: [-97.766724, 33.453823],
    address: '101 S. Council, Sunset, TX 76270',
  },
};

describe('admin intelligence route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.requireOperatorRouteAccess.mockResolvedValue({
      allowed: true,
      mode: 'local',
      reason: 'local operator',
    });
    routeMocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    routeMocks.from.mockReturnValue({ update: routeMocks.update });
    routeMocks.update.mockReturnValue({ eq: routeMocks.eq });
    routeMocks.eq.mockReturnValue({ select: routeMocks.select });
    routeMocks.select.mockReturnValue({ maybeSingle: routeMocks.maybeSingle });
    routeMocks.maybeSingle.mockResolvedValue({
      data: { agent_id: 'agent-authoritative' },
      error: null,
    });
  });

  it('requires operator access before reading the request or database', async () => {
    const denied = new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
    routeMocks.requireOperatorRouteAccess.mockResolvedValue(denied);

    const response = await POST(request({ intelligence: validIntelligence }));

    expect(response).toBe(denied);
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it('rejects malformed and over-broad intelligence payloads', async () => {
    const malformed = await POST(new NextRequest('http://localhost/api/admin/intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    }));
    const overBroad = await POST(request({
      intelligence: validIntelligence,
      agentId: 'agent-browser-selected',
    }));

    expect(malformed.status).toBe(400);
    expect(overBroad.status).toBe(400);
    expect(routeMocks.from).not.toHaveBeenCalled();
  });

  it('writes bounded intelligence to the server-selected agent', async () => {
    const response = await POST(request({ intelligence: validIntelligence }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ agentId: 'agent-authoritative', updated: true });
    expect(routeMocks.from).toHaveBeenCalledWith('site_config');
    expect(routeMocks.update).toHaveBeenCalledWith(expect.objectContaining({
      intelligence: validIntelligence,
      last_modified_by: 'Admin',
      updated_at: expect.any(String),
    }));
    expect(routeMocks.eq).toHaveBeenCalledWith('agent_id', 'agent-authoritative');
  });

  it('does not report success when the target site row is missing', async () => {
    routeMocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(request({ intelligence: validIntelligence }));

    expect(response.status).toBe(404);
  });
});

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/admin/intelligence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
