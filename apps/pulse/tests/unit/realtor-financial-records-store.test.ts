import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from } }));
vi.mock('./recurrence', () => ({ expandOccurrences: vi.fn(), reminderInstant: vi.fn() }));
vi.mock('./money', () => ({ normalizeCommission: vi.fn() }));
vi.mock('./progress', () => ({ localDateInZone: vi.fn(), mondayOfLocalDate: vi.fn(), readWeeklyReviewEvidence: vi.fn() }));
vi.mock('./access.server', () => ({
  RealtorWorkspaceError: class RealtorWorkspaceError extends Error { constructor(public code: string) { super(code); } },
  throwRealtorRpcError: vi.fn(),
}));

import { listFinancialRecords } from '@/lib/realtor-workspace/store.server';

const workspaceId = '00000000-0000-4000-8000-000000000010';
const rowOne = { id: '00000000-0000-4000-8000-000000000001', effective_date: '2026-03-10' };
const rowTwo = { id: '00000000-0000-4000-8000-000000000002', effective_date: '2026-03-10' };
const rowThree = { id: '00000000-0000-4000-8000-000000000003', effective_date: '2026-03-10' };

function query(data: unknown[]) {
  const builder: any = {};
  for (const method of ['select', 'eq', 'gte', 'lt', 'order', 'or']) builder[method] = vi.fn(() => builder);
  builder.limit = vi.fn(async () => ({ data, error: null }));
  return builder;
}

describe('realtor financial-record keyset pages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('orders by date then ID and continues after the last visible row for tied dates', async () => {
    const first = query([rowThree, rowTwo, rowOne]);
    const second = query([rowOne]);
    from.mockReturnValueOnce(first).mockReturnValueOnce(second);

    const pageOne = await listFinancialRecords('actor-1', workspaceId, 2026, 2);
    expect(pageOne.entries.map((entry) => entry.id)).toEqual([rowThree.id, rowTwo.id]);
    expect(pageOne.nextCursor).toEqual({
      workspaceId, year: 2026, limit: 2, effectiveDate: rowTwo.effective_date, id: rowTwo.id,
    });
    expect(first.order).toHaveBeenNthCalledWith(1, 'effective_date', { ascending: false });
    expect(first.order).toHaveBeenNthCalledWith(2, 'id', { ascending: false });
    expect(first.limit).toHaveBeenCalledWith(3);
    expect(first.eq).toHaveBeenCalledWith('user_id', 'actor-1');
    expect(first.eq).toHaveBeenCalledWith('workspace_id', workspaceId);

    const pageTwo = await listFinancialRecords('actor-1', workspaceId, 2026, 2, pageOne.nextCursor!);
    expect(second.or).toHaveBeenCalledWith(`effective_date.lt.2026-03-10,and(effective_date.eq.2026-03-10,id.lt.${rowTwo.id})`);
    expect(pageTwo.entries.map((entry) => entry.id)).toEqual([rowOne.id]);
    expect(pageTwo.nextCursor).toBeNull();
  });
});
