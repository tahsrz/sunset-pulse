import crypto from 'node:crypto';
import connectDB from '@/lib/core/database';
import PhoneRelaySession from '@/models/PhoneRelaySession';

export type RelaySessionStatus = 'pending' | 'confirmed' | 'repeat_requested' | 'needs_human' | 'no_input';

export interface RelaySession {
  id: string;
  orderId?: string;
  ticket: string;
  callScript: string;
  madeDifferent: boolean;
  status: RelaySessionStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  lastDigits?: string;
}

const SESSION_TTL_HOURS = 6;

const globalStore = globalThis as typeof globalThis & {
  __sunsetPhoneRelaySessions?: Map<string, RelaySession>;
};

const sessions = globalStore.__sunsetPhoneRelaySessions || new Map<string, RelaySession>();
globalStore.__sunsetPhoneRelaySessions = sessions;

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
}

function canPersistRelaySessions() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return false;
  return Boolean(process.env.MONGODB_URI);
}

function normalizeRelaySession(doc: any): RelaySession {
  return {
    id: String(doc.id),
    orderId: doc.orderId ? String(doc.orderId) : undefined,
    ticket: String(doc.ticket),
    callScript: String(doc.callScript),
    madeDifferent: Boolean(doc.madeDifferent),
    status: doc.status,
    attempts: Number(doc.attempts || 0),
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    lastDigits: doc.lastDigits ? String(doc.lastDigits) : undefined,
  };
}

async function persistSession(session: RelaySession) {
  if (!canPersistRelaySessions()) return;

  await connectDB();
  await PhoneRelaySession.findOneAndUpdate(
    { id: session.id },
    {
      $set: {
        ...session,
        expiresAt: sessionExpiresAt(),
      },
    },
    { upsert: true, new: true },
  );
}

export async function createRelaySession(input: Pick<RelaySession, 'ticket' | 'callScript' | 'madeDifferent'> & { orderId?: string }) {
  const now = new Date().toISOString();
  const session: RelaySession = {
    id: crypto.randomUUID(),
    orderId: input.orderId,
    ticket: input.ticket,
    callScript: input.callScript,
    madeDifferent: input.madeDifferent,
    status: 'pending',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(session.id, session);
  await persistSession(session);
  return session;
}

export async function getRelaySession(id: string) {
  if (canPersistRelaySessions()) {
    await connectDB();
    const stored = await PhoneRelaySession.findOne({ id }).lean();
    if (stored) {
      const session = normalizeRelaySession(stored);
      sessions.set(session.id, session);
      return session;
    }
  }

  return sessions.get(id) || null;
}

export async function updateRelaySession(id: string, updates: Partial<RelaySession>) {
  const existing = await getRelaySession(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  sessions.set(id, updated);
  await persistSession(updated);
  return updated;
}
