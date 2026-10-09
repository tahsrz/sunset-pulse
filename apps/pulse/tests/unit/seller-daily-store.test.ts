import { afterEach, expect, it, vi } from 'vitest';
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { rpc } }));
import { readSellerDailySummary } from '@/lib/realtor-workspace/store.server';
import { sellerDailyFixture } from '../fixtures/sellerDailyFixture';
afterEach(() => vi.clearAllMocks());
it('preserves a valid unconfigured workspace instead of calling it a read failure', async () => {
  const data = { status: 'not_configured', timeZone: 'America/Chicago', weekStartDate: '2026-10-05', weekEndDate: '2026-10-11' };
  rpc.mockResolvedValue({ data, error: null });
  expect(await readSellerDailySummary('owner', 'workspace', 'America/Chicago')).toEqual(data);
});
it('binds a validated daily summary to the owner, workspace, and local week', async () => {
  const data = sellerDailyFixture({ generatedAt: '2026-10-08T15:00:00Z', provenance: 'recorded seller requests',
    firstContactTiming: { medianSeconds: null, sampleSize: 0, provenance: 'operator-recorded first contact timestamps' } });
  rpc.mockResolvedValue({ data, error: null });
  expect(await readSellerDailySummary('owner', 'workspace', 'America/Chicago', new Date('2026-10-08T15:00:00Z'))).toEqual(data);
  expect(rpc).toHaveBeenCalledWith('realtor_read_seller_daily_summary', {
    p_actor_id: 'owner', p_workspace_id: 'workspace', p_time_zone: 'America/Chicago', p_local_start: '2026-10-05', p_local_end: '2026-10-12',
  });
});
it.each([null, { status: 'available', counts: {} }])('rejects malformed SQL summaries instead of claiming availability', async (data) => {
  rpc.mockResolvedValue({ data, error: null });
  await expect(readSellerDailySummary('owner', 'workspace', 'America/Chicago')).rejects.toMatchObject({ code: 'FAILED' });
});
