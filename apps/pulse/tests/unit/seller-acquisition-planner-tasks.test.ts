import { describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const mocks = vi.hoisted(() => ({ from: vi.fn(), requireWorkspace: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: mocks.from } }));
vi.mock('@/lib/realtor-workspace/access.server', () => ({ requirePersonalRealtorWorkspace: mocks.requireWorkspace }));
vi.mock('@/lib/realtor-workspace/http.server', () => ({
  realtorApi: async (_request: unknown, work: (actorId: string) => Promise<unknown>) => {
    try { return NextResponse.json({ ok: true, result: await work('11111111-1111-4111-8111-111111111111') }, { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch { return NextResponse.json({ ok: false }, { status: 500 }); }
  },
}));

import { GET } from '@/app/api/realtor/planner/campaign-tasks/route';

describe('seller acquisition planner bridge', () => {
  it('returns only owned, open, unscheduled campaign tasks in a bounded page', async () => {
    vi.clearAllMocks();
    mocks.requireWorkspace.mockResolvedValue({ workspaceId: '22222222-2222-4222-8222-222222222222' });
    const backlogQuery: Record<string, any> = {};
    for (const method of ['select', 'eq', 'like', 'in', 'order']) backlogQuery[method] = vi.fn(() => backlogQuery);
    backlogQuery.limit = vi.fn(() => Promise.resolve({ data: [
      { id: 'task-open', title: 'Record seller video', priority: 2, estimate_minutes: 45, source_id: 'seller-acquisition:2026-10-05:record-video' },
      { id: 'task-scheduled', title: 'Refresh guide', priority: 3, estimate_minutes: 60, source_id: 'seller-acquisition:2026-10-05:refresh-guide' },
    ], error: null }));
    const plannerQuery: Record<string, any> = {};
    for (const method of ['select', 'eq', 'in']) plannerQuery[method] = vi.fn(() => plannerQuery);
    plannerQuery.then = (resolve: (result: unknown) => unknown) => Promise.resolve({ data: [{ source_sprint_task_id: 'task-scheduled' }], error: null }).then(resolve);
    mocks.from.mockImplementation((table: string) => table === 'sprint_backlog_items' ? backlogQuery : plannerQuery);

    const response = await GET(new NextRequest('https://sunsetpulse.app/api/realtor/planner/campaign-tasks'));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, result: { tasks: [{ id: 'task-open', sourceId: 'seller-acquisition:2026-10-05:record-video' }], truncated: false } });
    expect(backlogQuery.eq).toHaveBeenCalledWith('owner_id', '11111111-1111-4111-8111-111111111111');
    expect(backlogQuery.like).toHaveBeenCalledWith('source_id', 'seller-acquisition:%');
    expect(plannerQuery.eq).toHaveBeenCalledWith('workspace_id', '22222222-2222-4222-8222-222222222222');
  });
});
