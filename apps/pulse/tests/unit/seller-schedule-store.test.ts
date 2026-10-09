import { afterEach, describe, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));
import { findOwnedSellerSchedule } from '@/lib/realtor-workspace/leadStore.server';
afterEach(() => vi.clearAllMocks());
const query = { leadId: '11111111-1111-4111-8111-111111111111', actionKey: 'initial-response:v1' };
describe('owner-scoped seller schedule read', () => {
  it('binds an exact source lookup to the server actor and personal workspace', async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    expect(await findOwnedSellerSchedule('owner', 'workspace', query)).toBeNull();
    expect(rpc).toHaveBeenCalledWith('seller_lead_read_planner_link', {
      p_actor_id: 'owner', p_workspace_id: 'workspace', p_lead_id: query.leadId, p_action_key: query.actionKey,
    });
  });
  it('rejects spoofed owner fields and invalid source identities before reading', async () => {
    for (const changed of [{ ...query, actorId: 'spoof' }, { ...query, actionKey: 'reply:bad' }]) {
      await expect(findOwnedSellerSchedule('owner', 'workspace', changed)).rejects.toThrow();
    }
    expect(rpc).not.toHaveBeenCalled();
  });
  it.each([{ data: null, error: { code: 'XX000' } }, { data: { itemId: 'bad' }, error: null }])('preserves failed or malformed reads rather than claiming no task', async (result) => {
    rpc.mockResolvedValue(result);
    await expect(findOwnedSellerSchedule('owner', 'workspace', query)).rejects.toMatchObject({ code: 'FAILED' });
  });
});
