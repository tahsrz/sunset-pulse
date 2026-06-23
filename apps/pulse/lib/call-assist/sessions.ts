import crypto from 'node:crypto';
import connectDB from '@/lib/core/database';
import CallAssistSession from '@/models/CallAssistSession';
import Lead from '@/models/Lead';
import { analyzeCallAssist, type CallAssistAnalysis, type CallAssistConsent, type CallAssistContext } from './analyzer';

const CallAssistSessionModel = CallAssistSession as any;
const LeadModel = Lead as any;

export type CallAssistSessionStatus =
  | 'created'
  | 'consent_pending'
  | 'bridging'
  | 'streaming'
  | 'completed'
  | 'failed'
  | 'declined';

export type CallAssistSessionRecord = {
  id: string;
  leadId?: string;
  customerPhone?: string;
  agentPhone?: string;
  status: CallAssistSessionStatus;
  callSid?: string;
  streamSid?: string;
  streamName?: string;
  streamUrl?: string;
  bridgeUrl?: string;
  context: CallAssistContext;
  consent: CallAssistConsent;
  transcript: string;
  analysis?: CallAssistAnalysis;
  summarySavedAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
};

export type CreateCallAssistSessionInput = {
  leadId?: string;
  customerPhone?: string;
  agentPhone?: string;
  streamUrl?: string;
  bridgeUrl?: string;
  context?: CallAssistContext;
  consent?: CallAssistConsent;
  transcript?: string;
};

const SESSION_TTL_HOURS = 24;

const globalStore = globalThis as typeof globalThis & {
  __sunsetCallAssistSessions?: Map<string, CallAssistSessionRecord>;
};

const sessions = globalStore.__sunsetCallAssistSessions || new Map<string, CallAssistSessionRecord>();
globalStore.__sunsetCallAssistSessions = sessions;

function canPersistCallAssistSessions() {
  if (process.env.NODE_ENV === 'test' || process.env.VITEST) return false;
  return Boolean(process.env.MONGODB_URI);
}

function sessionExpiresAt() {
  return new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000);
}

function normalizeSession(doc: any): CallAssistSessionRecord {
  return {
    id: String(doc.id),
    leadId: doc.leadId ? String(doc.leadId) : undefined,
    customerPhone: doc.customerPhone ? String(doc.customerPhone) : undefined,
    agentPhone: doc.agentPhone ? String(doc.agentPhone) : undefined,
    status: doc.status || 'created',
    callSid: doc.callSid ? String(doc.callSid) : undefined,
    streamSid: doc.streamSid ? String(doc.streamSid) : undefined,
    streamName: doc.streamName ? String(doc.streamName) : undefined,
    streamUrl: doc.streamUrl ? String(doc.streamUrl) : undefined,
    bridgeUrl: doc.bridgeUrl ? String(doc.bridgeUrl) : undefined,
    context: doc.context || {},
    consent: doc.consent || {},
    transcript: doc.transcript || '',
    analysis: doc.analysis,
    summarySavedAt: doc.summarySavedAt instanceof Date ? doc.summarySavedAt.toISOString() : doc.summarySavedAt,
    lastError: doc.lastError ? String(doc.lastError) : undefined,
    createdAt: doc.createdAt instanceof Date ? doc.createdAt.toISOString() : String(doc.createdAt),
    updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : String(doc.updatedAt),
    endedAt: doc.endedAt instanceof Date ? doc.endedAt.toISOString() : doc.endedAt,
  };
}

async function persistSession(session: CallAssistSessionRecord) {
  if (!canPersistCallAssistSessions()) return;

  await connectDB();
  await CallAssistSessionModel.findOneAndUpdate(
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

export async function createCallAssistSession(input: CreateCallAssistSessionInput) {
  const now = new Date().toISOString();
  const consent = input.consent || {};
  const transcript = input.transcript || '';
  const analysis = analyzeCallAssist({
    transcript,
    consent,
    context: input.context || {},
  });
  const session: CallAssistSessionRecord = {
    id: crypto.randomUUID(),
    leadId: input.leadId,
    customerPhone: input.customerPhone,
    agentPhone: input.agentPhone,
    status: analysis.consent.ready ? 'created' : 'consent_pending',
    streamName: `call-assist-${crypto.randomUUID().slice(0, 12)}`,
    streamUrl: input.streamUrl,
    bridgeUrl: input.bridgeUrl,
    context: input.context || {},
    consent,
    transcript,
    analysis,
    createdAt: now,
    updatedAt: now,
  };

  sessions.set(session.id, session);
  await persistSession(session);
  return session;
}

export async function getCallAssistSession(id: string) {
  if (canPersistCallAssistSessions()) {
    await connectDB();
    const stored = await CallAssistSessionModel.findOne({ id }).lean();
    if (stored) {
      const session = normalizeSession(stored);
      sessions.set(session.id, session);
      return session;
    }
  }

  return sessions.get(id) || null;
}

export async function updateCallAssistSession(id: string, updates: Partial<CallAssistSessionRecord>) {
  const existing = await getCallAssistSession(id);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    context: updates.context || existing.context,
    consent: updates.consent || existing.consent,
    updatedAt: new Date().toISOString(),
  };

  sessions.set(id, updated);
  await persistSession(updated);
  return updated;
}

export async function appendCallAssistTranscript(id: string, fragment: string, source = 'manual') {
  const existing = await getCallAssistSession(id);
  if (!existing) return null;

  const rawFragment = String(fragment || '');
  const cleanFragment = source === 'media-stream-delta' ? rawFragment : rawFragment.trim();
  const separator = source === 'media-stream-delta' ? '' : existing.transcript ? '\n' : '';
  const transcript = cleanFragment ? `${existing.transcript}${separator}${cleanFragment}` : existing.transcript;
  const analysis = analyzeCallAssist({
    transcript,
    consent: existing.consent,
    context: existing.context,
  });

  return updateCallAssistSession(id, {
    transcript,
    analysis,
    status: existing.status === 'created' || existing.status === 'consent_pending' ? 'streaming' : existing.status,
    lastError: source === 'media-stream' || source === 'media-stream-delta' ? undefined : existing.lastError,
  });
}

export async function finalizeCallAssistSession(id: string) {
  const existing = await getCallAssistSession(id);
  if (!existing) return null;

  const analysis = analyzeCallAssist({
    transcript: existing.transcript,
    mode: 'post-call',
    consent: existing.consent,
    context: existing.context,
  });

  return updateCallAssistSession(id, {
    analysis,
    status: 'completed',
    endedAt: new Date().toISOString(),
  });
}

export async function saveCallAssistSummaryToLead(id: string) {
  const session = await getCallAssistSession(id);
  if (!session) return null;
  if (!session.leadId) {
    return updateCallAssistSession(id, {
      lastError: 'No leadId is attached to this call-assist session.',
    });
  }

  const finalized = session.status === 'completed' ? session : await finalizeCallAssistSession(id);
  if (!finalized?.analysis) return finalized;

  if (canPersistCallAssistSessions()) {
    await connectDB();
    await LeadModel.findByIdAndUpdate(finalized.leadId, {
      $set: {
        jamieNotes: finalized.analysis.summary,
        probability: finalized.analysis.intentScore,
        lastActivity: new Date(),
      },
      $addToSet: {
        tags: {
          $each: [
            'CALL-ASSIST',
            ...finalized.analysis.memoryPatch.objections.map((item) => item.toUpperCase().replace(/[^A-Z0-9]+/g, '-')),
          ],
        },
      },
    });
  }

  return updateCallAssistSession(id, {
    summarySavedAt: new Date().toISOString(),
  });
}

export function buildCallAssistPublicUrls({
  baseUrl,
  sessionId,
}: {
  baseUrl: string;
  sessionId: string;
}) {
  const normalized = baseUrl.replace(/\/$/, '');
  return {
    twimlUrl: `${normalized}/api/call-assist/twiml/${sessionId}`,
    callStatusUrl: `${normalized}/api/call-assist/call-status/${sessionId}`,
    streamStatusUrl: `${normalized}/api/call-assist/stream-status/${sessionId}`,
  };
}
