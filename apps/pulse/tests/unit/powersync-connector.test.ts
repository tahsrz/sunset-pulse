import { describe, expect, it, vi } from 'vitest';
import { UpdateType } from '@powersync/web';

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));
vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom, auth: { getSession: vi.fn() } },
}));

import { SunsetPowerSyncConnector } from '@/lib/powersync/connector';

describe('PowerSync connector isolation', () => {
  it('uploads at most one CRUD entry so a fatal row cannot discard its neighbors', async () => {
    const complete = vi.fn();
    const getCrudBatch = vi.fn().mockResolvedValue({
      crud: [{ id: 'bad-row', table: 'collections', op: UpdateType.PUT, opData: { user_id: 'wrong-user' } }],
      complete,
    });
    mockFrom.mockReturnValue({
      upsert: vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } }),
    });

    await new SunsetPowerSyncConnector().uploadData({ getCrudBatch } as any);

    expect(getCrudBatch).toHaveBeenCalledWith(1);
    expect(complete).toHaveBeenCalledOnce();
  });
});
