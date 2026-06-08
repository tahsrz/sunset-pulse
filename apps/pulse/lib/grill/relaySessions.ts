import crypto from 'node:crypto';

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

const globalStore = globalThis as typeof globalThis & {
  __sunsetPhoneRelaySessions?: Map<string, RelaySession>;
};

const sessions = globalStore.__sunsetPhoneRelaySessions || new Map<string, RelaySession>();
globalStore.__sunsetPhoneRelaySessions = sessions;

export function createRelaySession(input: Pick<RelaySession, 'ticket' | 'callScript' | 'madeDifferent'> & { orderId?: string }) {
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
  return session;
}

export function getRelaySession(id: string) {
  return sessions.get(id) || null;
}

export function updateRelaySession(id: string, updates: Partial<RelaySession>) {
  const existing = getRelaySession(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  sessions.set(id, updated);
  return updated;
}
