import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireSignedInUser: vi.fn(),
  isAuthResponse: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('@/lib/core/routeAuth', () => ({
  requireSignedInUser: mocks.requireSignedInUser,
  isAuthResponse: mocks.isAuthResponse,
}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from, rpc: mocks.rpc } }));

import { GET, POST } from '@/app/api/scheduler/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SCHEDULE_ID = '22222222-2222-4222-8222-222222222222';
const JOB_ID = '33333333-3333-4333-8333-333333333333';

describe('signed-in scheduler route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSignedInUser.mockResolvedValue({ allowed: true, user: { id: USER_ID }, mode: 'user' });
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.rpc.mockResolvedValue({ data: true, error: null });
    mocks.from.mockImplementation((table: string) => queryFor(table));
  });

  it('lists only the signed-in user schedule and jobs', async () => {
    const response = await GET(new NextRequest('http://localhost/api/scheduler'));
    const payload = await response.json();
    const scheduleQuery = mocks.from.mock.results[0].value;
    const jobQuery = mocks.from.mock.results[1].value;

    expect(response.status).toBe(200);
    expect(payload.schedules).toEqual([expect.objectContaining({ id: SCHEDULE_ID })]);
    expect(payload.jobs).toEqual([expect.objectContaining({ id: JOB_ID })]);
    expect(scheduleQuery.eq).toHaveBeenCalledWith('user_id', USER_ID);
    expect(jobQuery.eq).toHaveBeenCalledWith('user_id', USER_ID);
  });

  it('uses the signed-in user identity for owner-scoped mutations', async () => {
    const response = await POST(jsonRequest({ action: 'pause', id: SCHEDULE_ID }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('pause_workflow_schedule', {
      p_schedule_id: SCHEDULE_ID,
      p_user_id: USER_ID,
    });
  });

  it('returns the auth response before touching scheduler data', async () => {
    const denied = new Response(JSON.stringify({ error: 'Sign-in is required.' }), { status: 401 });
    mocks.requireSignedInUser.mockResolvedValue(denied);

    const response = await GET(new NextRequest('http://localhost/api/scheduler'));

    expect(response).toBe(denied);
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

function queryFor(table: string) {
  const data = table === 'workflow_schedules'
    ? [{ id: SCHEDULE_ID, enabled: true, workflow_key: 'sprint_planner', cadence: 'weekly', time_zone: 'America/Chicago', next_run_at: '2026-09-21T13:00:00.000Z' }]
    : [{ id: JOB_ID, workflow_key: 'sprint_planner', status: 'queued', attempts: 0 }];
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve),
  };
  return query;
}

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/scheduler', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
