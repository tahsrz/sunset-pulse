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

  it('adds a Pulse result to the owner backlog with idempotent source provenance', async () => {
    const existingQuery = queryFor('sprint_backlog_items');
    existingQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
    const inserted = { id: 'backlog-1', source_type: 'pulse_command', source_id: 'command-1' };
    existingQuery.insert = vi.fn(() => existingQuery);
    existingQuery.single = vi.fn(() => Promise.resolve({ data: inserted, error: null }));
    mocks.from.mockReturnValue(existingQuery);

    const response = await POST(jsonRequest({ action: 'add_backlog_item', title: 'Research this result', description: 'Bounded command result', priority: 3, estimateMinutes: null, sourceType: 'pulse_command', sourceId: 'command-1' }));
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.backlogItem).toEqual(inserted);
    expect(existingQuery.insert).toHaveBeenCalledWith(expect.objectContaining({ owner_id: USER_ID, source_type: 'pulse_command', source_id: 'command-1' }));
  });

  it('reuses an existing Pulse backlog item instead of duplicating a command result', async () => {
    const existing = { id: 'backlog-1', source_type: 'pulse_command', source_id: 'command-1' };
    const existingQuery = queryFor('sprint_backlog_items');
    existingQuery.maybeSingle.mockResolvedValue({ data: existing, error: null });
    existingQuery.insert = vi.fn(() => existingQuery);
    mocks.from.mockReturnValue(existingQuery);

    const response = await POST(jsonRequest({ action: 'add_backlog_item', title: 'Research this result', sourceType: 'pulse_command', sourceId: 'command-1' }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.reused).toBe(true);
    expect(existingQuery.insert).not.toHaveBeenCalled();
  });

  it('preserves backlog description when an older client omits it', async () => {
    const query = queryFor('sprint_backlog_items');
    query.update.mockReturnValue(query);
    query.single.mockResolvedValue({ data: { id: 'backlog-1', description: 'Keep this context.' }, error: null });
    mocks.from.mockReturnValue(query);

    const response = await POST(jsonRequest({ action: 'update_backlog_item', itemId: '44444444-4444-4444-8444-444444444444', title: 'Updated title', priority: 2, estimateMinutes: 30, status: 'open' }));

    expect(response.status).toBe(200);
    expect(query.update).toHaveBeenCalledWith({ title: 'Updated title', priority: 2, estimate_minutes: 30, status: 'open' });
  });

  it('validates supported workers before updating a proposed sprint item', async () => {
    const response = await POST(jsonRequest({ action: 'update_sprint_item', itemId: '44444444-4444-4444-8444-444444444444', sprintId: '55555555-5555-4555-8555-555555555555', expectedSprintRevision: 2, title: 'Updated item', description: 'Context', priority: 2, estimateMinutes: 30, workerId: 'not-a-supported-worker' }));

    expect(response.status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('uses the owner and sprint revision fence for proposed item edits', async () => {
    mocks.rpc.mockResolvedValue({ data: [{ sprint_id: '55555555-5555-4555-8555-555555555555', item_id: '44444444-4444-4444-8444-444444444444', sprint_revision: 3 }], error: null });
    const response = await POST(jsonRequest({ action: 'update_sprint_item', itemId: '44444444-4444-4444-8444-444444444444', sprintId: '55555555-5555-4555-8555-555555555555', expectedSprintRevision: 2, title: 'Updated item', description: 'Context', priority: 2, estimateMinutes: 30, workerId: 'lead-scoring' }));

    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('update_proposed_sprint_item', expect.objectContaining({ p_owner_id: USER_ID, p_expected_sprint_revision: 2, p_worker_id: 'lead-scoring' }));
  });

  it('reuses the winning row when simultaneous command inserts hit the unique index', async () => {
    const query = queryFor('sprint_backlog_items');
    const existing = { id: 'winner', source_id: 'command-race' };
    query.maybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: existing, error: null });
    query.insert = vi.fn(() => query);
    query.single.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate key' } });
    mocks.from.mockReturnValue(query);
    const response = await POST(jsonRequest({ action: 'add_backlog_item', title: 'Research', sourceType: 'pulse_command', sourceId: 'command-race' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ reused: true, backlogItem: existing });
    expect(query.eq).toHaveBeenCalledWith('owner_id', USER_ID);
  });
});

function queryFor(table: string, error: Error | null = null) {
  const query: Record<string, any> = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    limit: vi.fn(() => query),
    maybeSingle: vi.fn(() => Promise.resolve({ data: [], error })),
    update: vi.fn(() => query),
    single: vi.fn(() => Promise.resolve({ data: [], error })),
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
