import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const { updateReminder } = vi.hoisted(() => ({ updateReminder: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/realtor-workspace/access.server', () => ({ requirePersonalRealtorWorkspace: async () => ({ workspaceId: 'workspace' }) }));
vi.mock('@/lib/realtor-workspace/store.server', () => ({ updateReminder, listVisibleReminders: vi.fn() }));
vi.mock('@/lib/realtor-workspace/http.server', () => ({
  realtorApi: async (_req: unknown, work: (actor: string) => Promise<unknown>) => {
    try { return Response.json(await work('actor')); } catch { return Response.json({}, { status: 400 }); }
  }, readRealtorBody: (request: Request) => request.json(),
}));
import { PATCH } from '@/app/api/realtor/reminders/route';
const reminderId = '00000000-0000-4000-8000-000000000001';
const requestKey = '00000000-0000-4000-8000-000000000002';
describe('reminder mutation request envelope', () => {
  beforeEach(() => { vi.clearAllMocks(); updateReminder.mockResolvedValue({ revision: 2 }); });
  for (const action of ['dismiss', 'snooze']) it(`accepts ${action} from the actual UI envelope`, async () => {
    const input = { action, expectedRevision: 1, requestKey, ...(action === 'snooze' ? { until: '2026-10-01T12:00:00Z' } : {}) };
    const result = await PATCH(new NextRequest('http://localhost/api/realtor/reminders', { method: 'PATCH', body: JSON.stringify({ reminderId, ...input }) }));
    expect(result.status).toBe(200);
    expect(updateReminder).toHaveBeenCalledWith('actor', 'workspace', reminderId, input);
  });
  it('still rejects unknown action fields', async () => {
    const result = await PATCH(new NextRequest('http://localhost/api/realtor/reminders', { method: 'PATCH', body: JSON.stringify({ reminderId, action: 'dismiss', expectedRevision: 1, requestKey, forged: true }) }));
    expect(result.status).toBe(400); expect(updateReminder).not.toHaveBeenCalled();
  });
});
