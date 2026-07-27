import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  clearMockSession,
  createMockSession,
  mockSessionStorePath,
  readMockSession,
  toSessionUser,
} from '@/lib/core/mockSessionStore';

const previousMockMode = process.env.NEXT_PUBLIC_MOCK_MODE;
const previousMockAuth = process.env.PULSE_MOCK_AUTH_ENABLED;
const previousPath = process.env.PULSE_MOCK_SESSION_PATH;

afterEach(() => {
  restoreEnv('NEXT_PUBLIC_MOCK_MODE', previousMockMode);
  restoreEnv('PULSE_MOCK_AUTH_ENABLED', previousMockAuth);
  restoreEnv('PULSE_MOCK_SESSION_PATH', previousPath);
  vi.useRealTimers();
});

describe('mock session store', () => {
  it('persists mock sessions to disk and reads them by token', () => {
    const filePath = path.join(os.tmpdir(), `pulse-mock-session-${Date.now()}.json`);
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    process.env.PULSE_MOCK_SESSION_PATH = filePath;

    const session = createMockSession({ email: 'agent@example.com' });
    const restored = readMockSession(session.token);

    expect(mockSessionStorePath()).toBe(filePath);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(restored).toEqual(expect.objectContaining({
      token: session.token,
      userId: session.userId,
      role: 'realtor',
    }));
    expect(toSessionUser(session)).toEqual(expect.objectContaining({
      userId: session.userId,
      email: 'agent@example.com',
      role: 'realtor',
    }));
  });

  it('clears stored mock sessions by token', () => {
    const filePath = path.join(os.tmpdir(), `pulse-mock-session-clear-${Date.now()}.json`);
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    process.env.PULSE_MOCK_SESSION_PATH = filePath;

    const session = createMockSession({ email: 'operator@example.com' });

    expect(clearMockSession(session.token)).toBe(true);
    expect(readMockSession(session.token)).toBeNull();
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
