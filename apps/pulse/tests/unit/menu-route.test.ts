import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  isAuthResponse: vi.fn(),
  find: vi.fn(),
}));

vi.mock('@/lib/core/database', () => ({ default: mocks.connectDB }));
vi.mock('@/lib/core/routeAuth', () => ({
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/sites/agentConfig', () => ({
  getAgentIdFromInput: vi.fn(() => 'taz-realty-001'),
}));
vi.mock('@/models/MenuItem', () => ({ default: { find: mocks.find } }));

import { GET } from '@/app/api/menu/route';

describe('menu route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'local' });
    mocks.find.mockReturnValue(menuQuery([
      { id: 'burger-01', name: 'Sunset Burger', isAvailable: true },
    ]));
  });

  it('serves available menu items to the public Grill page', async () => {
    const response = await GET(new NextRequest('http://localhost/api/menu'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([
      { id: 'burger-01', name: 'Sunset Burger', isAvailable: true },
    ]);
    expect(mocks.requireOperatorRouteAccess).not.toHaveBeenCalled();
    expect(mocks.find).toHaveBeenCalledWith({ agentId: 'taz-realty-001', isAvailable: true });
  });

  it('keeps unavailable items behind operator access for the menu manager', async () => {
    const response = await GET(new NextRequest('http://localhost/api/menu?includeUnavailable=true'));

    expect(response.status).toBe(200);
    expect(mocks.requireOperatorRouteAccess).toHaveBeenCalledTimes(1);
    expect(mocks.find).toHaveBeenCalledWith({ agentId: 'taz-realty-001' });
  });

  it('returns the operator auth response before reading the menu', async () => {
    const denied = new Response(JSON.stringify({ error: 'Operator access required.' }), { status: 403 });
    mocks.requireOperatorRouteAccess.mockResolvedValue(denied);

    const response = await GET(new NextRequest('http://localhost/api/menu?includeUnavailable=true'));

    expect(response).toBe(denied);
    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.find).not.toHaveBeenCalled();
  });
});

function menuQuery(data: unknown[]) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    sort: vi.fn(() => query),
    lean: vi.fn(() => Promise.resolve(data)),
  };
  return query;
}
