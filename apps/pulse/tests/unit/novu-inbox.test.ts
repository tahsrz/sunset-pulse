import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNovuInboxConfig } from '@/lib/notifications/novuInbox';

vi.mock('server-only', () => ({}));

const originalApplicationIdentifier = process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER;
const originalSecretKey = process.env.NOVU_SECRET_KEY;
const originalApiKey = process.env.NOVU_API_KEY;

afterEach(() => {
  restoreEnv('NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER', originalApplicationIdentifier);
  restoreEnv('NOVU_SECRET_KEY', originalSecretKey);
  restoreEnv('NOVU_API_KEY', originalApiKey);
});

describe('Novu inbox identity', () => {
  it('signs the same tenant-scoped subscriber used by alert delivery', () => {
    process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = 'app-id';
    process.env.NOVU_SECRET_KEY = 'secret-key';

    expect(getNovuInboxConfig('agent-one')).toEqual({
      applicationIdentifier: 'app-id',
      subscriberId: 'sunset-agent:agent-one',
      subscriberHash: createHmac('sha256', 'secret-key')
        .update('sunset-agent:agent-one')
        .digest('hex'),
    });
  });

  it('does not expose an unsigned inbox', () => {
    process.env.NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER = 'app-id';
    delete process.env.NOVU_SECRET_KEY;
    delete process.env.NOVU_API_KEY;

    expect(getNovuInboxConfig('agent-one')).toBeNull();
  });
});

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
