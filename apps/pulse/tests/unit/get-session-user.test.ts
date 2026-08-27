import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createClient: vi.fn()
}));

vi.mock('@/utils/supabase/server', () => ({
  createClient: mocks.createClient
}));

vi.mock('@/lib/core/mockSessionStore', () => ({
  MOCK_SESSION_COOKIE: 'mock-session',
  mockSessionsEnabled: () => false,
  readMockSession: vi.fn(),
  toSessionUser: vi.fn()
}));

import { getSessionUser } from '@/lib/core/getSessionUser';

describe('getSessionUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the authenticated profile role used by operator routes', async () => {
    const select = vi.fn();
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        avatar_url: null,
        full_name: 'Taz',
        role: 'admin',
        is_subscribed: true,
        custom_keybind: 'V'
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({ maybeSingle });
    select.mockReturnValue({ eq });

    mocks.createClient.mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'taz-user',
              email: 'taz@example.com',
              user_metadata: {}
            }
          },
          error: null
        })
      },
      from: vi.fn().mockReturnValue({ select })
    });

    const session = await getSessionUser();

    expect(select).toHaveBeenCalledWith(
      'avatar_url, full_name, role, is_subscribed, custom_keybind'
    );
    expect(session).toMatchObject({
      userId: 'taz-user',
      role: 'admin',
      user: {
        role: 'admin',
        isSubscribed: true,
        customKeybind: 'V'
      }
    });
  });
});
