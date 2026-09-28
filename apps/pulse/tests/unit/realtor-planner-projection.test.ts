import { afterEach, describe, expect, it, vi } from 'vitest';

const { from, rpc } = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from, rpc } }));
import { projectPlannerOccurrences, savePlannerItem } from '@/lib/realtor-workspace/store.server';
import { plannerItemInputSchema } from '@/lib/realtor-workspace/contracts';

const due = { anchorDate: '2027-06-01', localTime: null, timeZone: 'America/Chicago', recurrence: { frequency: 'once' }, endsOn: null, reminderOffsetsDays: [] };
function query(data: unknown[]) {
  const builder: any = { then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data, error: null }).then(resolve) };
  for (const name of ['select', 'eq', 'order', 'limit', 'gte', 'lte', 'in']) builder[name] = vi.fn(() => builder);
  return builder;
}
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });
describe('planner occurrence identity', () => {
  it('creates a one-time deadline beyond the recurring 90-day window', async () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-26T12:00:00Z'));
    rpc.mockResolvedValue({ data: { id: 'saved' }, error: null });
    const item = plannerItemInputSchema.parse({ kind: 'professional_deadline', title: 'License renewal', due, requestKey: '00000000-0000-4000-8000-000000000001' });
    await savePlannerItem('actor', 'workspace', { itemId: null, expectedRevision: null, item });
    expect(rpc.mock.calls[0][1].p_occurrences).toEqual([expect.objectContaining({ occurrenceKeyDate: '2027-06-01' })]);
  });
  it('suppresses a materialized occurrence even when rescheduled outside the displayed window', async () => {
    const items = query([{ id: 'item', revision: 1, kind: 'task', title: 'Review', due_spec: due }]);
    const occurrences = query([{ occurrence_key: 'item:2027-06-01' }]);
    from.mockReturnValueOnce(items).mockReturnValueOnce(occurrences);
    const result = await projectPlannerOccurrences('actor', 'workspace', { from: '2027-06-01', through: '2027-06-30', limit: 50 });
    expect(result.items).toEqual([]);
    expect(occurrences.in).toHaveBeenCalledWith('occurrence_key', ['item:2027-06-01']);
    expect(occurrences.gte).not.toHaveBeenCalled();
    expect(occurrences.eq).toHaveBeenCalledWith('user_id', 'actor');
    expect(occurrences.eq).toHaveBeenCalledWith('workspace_id', 'workspace');
  });
});
