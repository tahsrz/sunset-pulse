import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ auth: vi.fn(), access: vi.fn(), enqueue: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/core/routeAuth', () => ({ requireSignedInUser: mocks.auth, isAuthResponse: (value: unknown) => value instanceof Response }));
vi.mock('@/lib/platform/access/workspaceAccess.server', () => ({ requireWorkspaceAccess: mocks.access, WorkspaceAccessError: class WorkspaceAccessError extends Error { constructor(public code: string, message: string) { super(message); } } }));
vi.mock('@/lib/autonomous-workflows/schedulerEvents.server', () => ({ enqueueConnectorHealthCheck: mocks.enqueue, SchedulerEventError: class SchedulerEventError extends Error { constructor(public code: 'DISABLED' | 'FAILED') { super(); } } }));

import { POST } from '@/app/api/workspaces/[workspaceId]/connector-health/check/route';

const actor = '11111111-1111-4111-8111-111111111111';
const workspace = '22222222-2222-4222-8222-222222222222';
const connector = '33333333-3333-4333-8333-333333333333';
const context = () => ({ params: Promise.resolve({ workspaceId: workspace }) });
const request = (body: unknown, origin = 'http://localhost') => new NextRequest(`http://localhost/api/workspaces/${workspace}/connector-health/check`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: JSON.stringify(body),
});

describe('connector health scheduling route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.auth.mockResolvedValue({ user: { id: actor }, allowed: true, mode: 'user' });
    mocks.access.mockResolvedValue({ workspaceId: workspace });
    mocks.enqueue.mockResolvedValue({ id: '44444444-4444-4444-8444-444444444444', workflow_key: 'connector_health_check', event_key: 'health-1', scheduled_for: '2026-09-23T12:00:00.000Z', status: 'queued' });
  });

  it('requires workspace-management authority and enqueues explicit connector scope', async () => {
    const result = await POST(request({ connectorId: connector, eventKey: 'health-1' }), context());
    expect(result.status).toBe(200);
    expect(mocks.access).toHaveBeenCalledWith(actor, workspace, 'workspace:manage_apps');
    expect(mocks.enqueue).toHaveBeenCalledWith(expect.objectContaining({ userId: actor, workspaceId: workspace, connectorId: connector, eventKey: 'health-1' }));
    expect((await result.json()).result).toMatchObject({ workflowKey: 'connector_health_check', eventKey: 'health-1', status: 'queued' });
  });

  it('rejects cross-origin writes before scheduling', async () => {
    const result = await POST(request({ connectorId: connector, eventKey: 'health-2' }, 'https://foreign.example'), context());
    expect(result.status).toBe(403);
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });
});
