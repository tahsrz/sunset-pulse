import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), workspace: vi.fn(), read: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ redirect: (path: string) => { throw new Error(path); } }));
vi.mock('@/utils/supabase/server', () => ({ createClient: () => ({ auth: { getUser: mocks.session } }) }));
vi.mock('@/lib/realtor-workspace/buyerRequestStore.server', () => ({ readOwnedBuyerRequests: mocks.read }));
vi.mock('@/lib/realtor-workspace/access.server', () => ({
  RealtorWorkspaceError: class extends Error {}, requirePersonalRealtorWorkspace: mocks.workspace,
}));

import BuyerInbox from '@/app/buyer-inbox/page';

beforeEach(() => vi.resetAllMocks());

it('redirects guests and stops before the reader if workspace access fails', async () => {
  mocks.session.mockResolvedValueOnce({ data: { user: null } });
  await expect(BuyerInbox()).rejects.toThrow('/login?redirect=%2Fbuyer-inbox');
  expect(mocks.workspace).not.toHaveBeenCalled();
  mocks.session.mockResolvedValueOnce({ data: { user: { id: 'other-account' } } });
  mocks.workspace.mockRejectedValueOnce(new Error('Private provider details'));
  const markup = renderToStaticMarkup(await BuyerInbox());
  expect(markup).toContain('Your buyer inbox is unavailable');
  expect(markup).not.toContain('Private provider details');
  expect(mocks.read).not.toHaveBeenCalled();
});

it('reads only the authenticated owner and shows search details and separate permission', async () => {
  mocks.session.mockResolvedValue({ data: { user: { id: 'assigned-agent' } } });
  mocks.workspace.mockResolvedValue({ preferences: { time_zone: 'America/Chicago' } });
  mocks.read.mockResolvedValueOnce([]);
  expect(renderToStaticMarkup(await BuyerInbox())).toContain('No buyer requests have been assigned to you yet');
  mocks.read.mockResolvedValueOnce([{
    id: 'example', name: 'Taylor Example', email: 'taylor@example.test', requestedContactAt: '2026-11-06T17:00:00Z', marketingOptIn: false,
    journey: { mode: 'buy', buyingStage: { state: 'answered', value: 'searching' }, buyerPreferences: {
      destination: { state: 'answered', value: 'local' }, construction: { state: 'unknown' },
      representation: { state: 'skipped' }, preApproval: 'no',
    } },
  }]);
  const markup = renderToStaticMarkup(await BuyerInbox());
  expect(markup).toContain('taylor@example.test');
  expect(markup).toContain('Looking at Homes');
  expect(markup).toContain('Not Sure');
  expect(markup).toContain('Skipped');
  expect(markup).toContain('Only requested a reply about this search');
  expect(mocks.workspace.mock.calls).toEqual([['assigned-agent'], ['assigned-agent']]);
  expect(mocks.read.mock.calls).toEqual([['assigned-agent'], ['assigned-agent']]);
});
