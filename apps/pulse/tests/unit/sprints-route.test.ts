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

import { GET, POST } from '@/app/api/sprints/route';

const USER_ID = '11111111-1111-4111-8111-111111111111';

describe('signed-in sprint schedule route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSignedInUser.mockResolvedValue({ allowed: true, user: { id: USER_ID }, mode: 'user' });
    mocks.isAuthResponse.mockImplementation((value) => value instanceof Response);
    mocks.rpc.mockResolvedValue({ data: [{ id: 'schedule-1', revision: 2, enabled: false }], error: null });
  });

  it('persists schedule changes through the owner-scoped revision RPC', async () => {
    const response = await POST(jsonRequest({
      action: 'create_schedule',
      cadence: 'weekly',
      planningMode: 'property_shortlist',
      timeZone: 'America/Chicago',
      localHour: 8,
      localMinute: 30,
      localWeekday: 1,
      expectedRevision: 1,
    }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.schedule).toEqual(expect.objectContaining({ id: 'schedule-1', revision: 2 }));
    expect(mocks.rpc).toHaveBeenCalledWith('save_sprint_planner_schedule', expect.objectContaining({
      p_owner_id: USER_ID,
      p_expected_revision: 1,
      p_planning_mode: 'property_shortlist',
      p_cadence: 'weekly',
      p_time_zone: 'America/Chicago',
      p_local_hour: 8,
      p_local_minute: 30,
      p_local_weekday: 1,
      p_next_run_at: expect.any(String),
    }));
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it('returns a conflict when the database rejects a stale schedule revision', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Schedule revision conflict' } });

    const response = await POST(jsonRequest({
      action: 'create_schedule',
      cadence: 'daily',
      planningMode: 'manual_backlog',
      timeZone: 'America/Chicago',
      localHour: 8,
      localMinute: 0,
      localWeekday: 1,
      expectedRevision: 3,
    }));
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.error).toBe('Schedule revision conflict');
  });

  it('rejects an invalid timezone before calling the persistence boundary', async () => {
    const response = await POST(jsonRequest({
      action: 'create_schedule',
      cadence: 'daily',
      planningMode: 'manual_backlog',
      timeZone: 'Not/A_Timezone',
      localHour: 8,
      localMinute: 0,
      localWeekday: 1,
      expectedRevision: null,
    }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('fails closed when a workspace child query cannot be read', async () => {
    mocks.from.mockImplementation((table: string) => queryFor(table, table === 'sprint_items' ? new Error('items unavailable') : null));

    const response = await GET(new NextRequest('http://localhost/api/sprints'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.error).toBe('items unavailable');
  });
});

function queryFor(table: string, error: Error | null = null) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error }).then(resolve),
  };
  return query;
}

function jsonRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/sprints', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
