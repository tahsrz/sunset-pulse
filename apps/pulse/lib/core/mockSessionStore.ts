import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const MOCK_SESSION_COOKIE = 'pulse_mock_session';

const SESSION_TTL_HOURS = 24 * 7;

export type MockSessionRecord = {
  token: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    name: string;
    image: string | null;
    role: string;
    isAdvancedMode: boolean;
    isSubscribed: boolean;
    customKeybind: string;
    user_metadata: Record<string, unknown>;
  };
  role: string;
};

export function mockSessionsEnabled() {
  return process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || process.env.PULSE_MOCK_AUTH_ENABLED === 'true';
}

export function mockSessionStorePath() {
  return process.env.PULSE_MOCK_SESSION_PATH || path.join(process.cwd(), '.pulse-local', 'mock_sessions.json');
}

export function createMockSession(input: {
  email: string;
  name?: string;
  role?: string;
}): MockSessionRecord {
  const email = normalizeEmail(input.email);
  const role = input.role || roleForEmail(email);
  const now = new Date().toISOString();
  const record: MockSessionRecord = {
    token: `mock_${crypto.randomBytes(24).toString('hex')}`,
    userId: stableMockUserId(email),
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    user: {
      id: stableMockUserId(email),
      email,
      name: input.name || nameForEmail(email),
      image: null,
      role,
      isAdvancedMode: role === 'realtor' || role === 'admin' || role === 'operator',
      isSubscribed: role === 'realtor' || role === 'admin' || role === 'operator',
      customKeybind: 'P',
      user_metadata: {
        full_name: input.name || nameForEmail(email),
        role,
        isSubscribed: role === 'realtor' || role === 'admin' || role === 'operator',
      },
    },
    role,
  };

  const records = pruneExpired(readMockSessions()).filter((session) => session.userId !== record.userId);
  writeMockSessions([...records, record]);
  return record;
}

export function readMockSession(token?: string | null) {
  if (!token || !mockSessionsEnabled()) return null;
  const records = pruneExpired(readMockSessions());
  writeMockSessions(records);
  return records.find((record) => record.token === token) || null;
}

export function clearMockSession(token?: string | null) {
  if (!token) return false;
  const records = readMockSessions();
  const nextRecords = records.filter((record) => record.token !== token);
  if (nextRecords.length === records.length) return false;
  writeMockSessions(nextRecords);
  return true;
}

export function toSessionUser(record: MockSessionRecord) {
  return {
    user: record.user,
    userId: record.userId,
    email: record.user.email,
    role: record.role,
  };
}

function readMockSessions(): MockSessionRecord[] {
  const filePath = mockSessionStorePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed?.sessions) ? parsed.sessions.filter(isMockSessionRecord) : [];
  } catch {
    return [];
  }
}

function writeMockSessions(sessions: MockSessionRecord[]) {
  const filePath = mockSessionStorePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ sessions }, null, 2), 'utf8');
}

function pruneExpired(records: MockSessionRecord[]) {
  const now = Date.now();
  return records.filter((record) => Date.parse(record.expiresAt) > now);
}

function isMockSessionRecord(value: unknown): value is MockSessionRecord {
  const record = value as Partial<MockSessionRecord>;
  return Boolean(record?.token && record?.userId && record?.expiresAt && record?.user?.email);
}

function stableMockUserId(email: string) {
  return `mock-user-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 16)}`;
}

function normalizeEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return normalized || 'operator@sunsetpulse.local';
}

function nameForEmail(email: string) {
  const prefix = email.split('@')[0] || 'operator';
  return prefix
    .split(/[._-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Mock Operator';
}

function roleForEmail(email: string) {
  if (/admin|operator/.test(email)) return 'admin';
  if (/agent|realtor|broker/.test(email)) return 'realtor';
  return 'consumer';
}
