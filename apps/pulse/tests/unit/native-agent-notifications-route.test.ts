import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  isAuthResponse: vi.fn(),
  requireOperatorRouteAccess: vi.fn(),
  resolveOperatorAgentId: vi.fn(),
  loadAgentNotifications: vi.fn(),
  mutateAgentNotifications: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({
  isAuthResponse: mocks.isAuthResponse,
  requireOperatorRouteAccess: mocks.requireOperatorRouteAccess,
}));
vi.mock('@/lib/intelligence/agentNotificationStore', () => ({
  resolveOperatorAgentId: mocks.resolveOperatorAgentId,
  loadAgentNotifications: mocks.loadAgentNotifications,
  mutateAgentNotifications: mocks.mutateAgentNotifications,
}));

import { GET, PATCH } from '@/app/api/admin/agent-leads/notifications/route';

describe('native agent notifications route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOperatorRouteAccess.mockResolvedValue({ allowed: true, mode: 'authenticated', user: { id: 'user-one' } });
    mocks.isAuthResponse.mockReturnValue(false);
    mocks.resolveOperatorAgentId.mockResolvedValue('agent-one');
    mocks.loadAgentNotifications.mockResolvedValue({ notifications: [], unreadCount: 0, nextCursor: null });
    mocks.mutateAgentNotifications.mockResolvedValue(undefined);
  });

  it('loads only the authenticated operator agent inbox', async () => {
    const response = await GET(new NextRequest('http://localhost/api/admin/agent-leads/notifications?limit=10'));
    expect(response.status).toBe(200);
    expect(mocks.loadAgentNotifications).toHaveBeenCalledWith({ agentId: 'agent-one', limit: 10 });
  });

  it('scopes read mutations to the authenticated operator agent', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/admin/agent-leads/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_read', notificationId: '11111111-1111-4111-8111-111111111111' }),
    }));
    expect(response.status).toBe(200);
    expect(mocks.mutateAgentNotifications).toHaveBeenCalledWith({
      agentId: 'agent-one',
      action: 'mark_read',
      notificationId: '11111111-1111-4111-8111-111111111111',
    });
  });

  it('rejects malformed notification mutations', async () => {
    const response = await PATCH(new NextRequest('http://localhost/api/admin/agent-leads/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'archive' }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.mutateAgentNotifications).not.toHaveBeenCalled();
  });
});
