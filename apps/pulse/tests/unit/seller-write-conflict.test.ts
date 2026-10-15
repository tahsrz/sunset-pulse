import { afterEach, describe, expect, it, vi } from 'vitest';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));
import { recordOwnedSellerLeadAction } from '@/lib/realtor-workspace/leadStore.server';
import { savePlannerItem } from '@/lib/realtor-workspace/store.server';
import { plannerItemInputSchema } from '@/lib/realtor-workspace/contracts';

afterEach(() => vi.clearAllMocks());
const leadId = '11111111-1111-4111-8111-111111111111';
const requestKey = '22222222-2222-4222-8222-222222222222';
describe('non-retryable seller write conflicts', () => {
  it('surfaces a stale seller action as a reloadable conflict', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PT409' } });
    await expect(recordOwnedSellerLeadAction('owner', { leadId, requestKey, expectedRevision: 1,
      action: 'record_response', source: 'customer_reply', occurredAt: '2026-10-08T12:00:00Z' }))
      .rejects.toMatchObject({ code: 'CONFLICT' });
    expect(rpc).toHaveBeenCalledOnce();
  });

  it('surfaces a stale seller planner source as a reloadable conflict', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PT409' } });
    const item = plannerItemInputSchema.parse({ kind: 'follow_up', title: 'Respond to seller', requestKey,
      due: { anchorDate: '2026-10-09', localTime: '16:45', timeZone: 'America/Chicago',
        recurrence: { frequency: 'once' }, endsOn: '2026-10-09', reminderOffsetsDays: [] },
      sellerLead: { leadId, actionKey: 'initial-response:v1', expectedLeadRevision: 1 },
    });
    await expect(savePlannerItem('owner', 'workspace', { itemId: null, expectedRevision: null, item }))
      .rejects.toMatchObject({ code: 'CONFLICT' });
    expect(rpc).toHaveBeenCalledOnce();
  });
});
