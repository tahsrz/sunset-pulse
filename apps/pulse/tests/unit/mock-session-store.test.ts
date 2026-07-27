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
const previousMockAuth = process.env.NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED;
const previousAllowProductionMockAuth = process.env.PULSE_ALLOW_PRODUCTION_MOCK_AUTH;
const previousNodeEnv = process.env.NODE_ENV;
const previousPath = process.env.PULSE_MOCK_SESSION_PATH;

afterEach(() => {
  restoreEnv('NEXT_PUBLIC_MOCK_MODE', previousMockMode);
  restoreEnv('NEXT_PUBLIC_PULSE_MOCK_AUTH_ENABLED', previousMockAuth);
  restoreEnv('PULSE_ALLOW_PRODUCTION_MOCK_AUTH', previousAllowProductionMockAuth);
  restoreEnv('NODE_ENV', previousNodeEnv);
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

  it('refuses mock sessions in production unless the explicit danger override is set', () => {
    const filePath = path.join(os.tmpdir(), `pulse-mock-session-production-${Date.now()}.json`);
    vi.stubEnv('NODE_ENV', 'production');
    process.env.NEXT_PUBLIC_MOCK_MODE = 'true';
    process.env.PULSE_MOCK_SESSION_PATH = filePath;

    const session = createMockSession({ email: 'admin@example.com' });

    expect(readMockSession(session.token)).toBeNull();

    process.env.PULSE_ALLOW_PRODUCTION_MOCK_AUTH = 'dangerously_allow_mock_auth';
    expect(readMockSession(session.token)).toEqual(expect.objectContaining({
      token: session.token,
      role: 'admin',
    }));
  });
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
