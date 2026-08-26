import fs from 'fs';
import path from 'path';

export type NovuSubscriber =
  | string
  | {
      subscriberId: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      locale?: string;
      timezone?: string;
      data?: Record<string, unknown>;
    };

export type NovuTriggerInput = {
  workflowId: string;
  to: NovuSubscriber | NovuSubscriber[];
  payload?: Record<string, unknown>;
  overrides?: Record<string, unknown>;
  transactionId?: string;
  actor?: string | Record<string, unknown>;
  tenant?: string | Record<string, unknown>;
  context?: Record<string, unknown>;
  source?: 'lead_intelligence' | 'order_ops' | 'scheduling' | 'manual' | 'system';
};

export type NovuTriggerRecord = {
  id: string;
  createdAt: string;
  provider: 'novu';
  status: 'sent' | 'queued_local' | 'disabled' | 'failed';
  workflowId: string;
  source: NonNullable<NovuTriggerInput['source']>;
  transactionId: string | null;
  recipientCount: number;
  recipientRefs: string[];
  payloadKeys: string[];
  payloadFingerprint: string;
  diagnostics: {
    endpoint: string;
    ledgerPath: string;
    durationMs: number;
    responseStatus?: number;
    novuStatus?: string | null;
    acknowledged?: boolean | null;
    reason?: string;
  };
};

export type NovuNotificationSnapshot = {
  status: 'empty' | 'ready' | 'disabled';
  path: string;
  eventCount: number;
  workflowCounts: Record<string, number>;
  sourceCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  lastTriggeredAt: string | null;
  recent: NovuTriggerRecord[];
};

type NormalizedNovuTrigger = Omit<Required<NovuTriggerInput>, 'to'> & {
  to: NovuSubscriber[];
};

const DEFAULT_LEDGER_FILE = 'novu-events.jsonl';
const MAX_RECENT_EVENTS = 50;
const DEFAULT_NOVU_API_URL = 'https://api.novu.co';

export async function triggerNovuNotification(input: NovuTriggerInput): Promise<NovuTriggerRecord> {
  const startedAt = Date.now();
  const normalized = normalizeNovuTrigger(input);
  const endpoint = novuTriggerEndpoint();

  if (process.env.NOVU_NOTIFICATIONS_DISABLED === 'true') {
    const record = buildRecord({
      input: normalized,
      status: 'disabled',
      endpoint,
      startedAt,
      diagnostics: { reason: 'NOVU_NOTIFICATIONS_DISABLED=true' },
    });
    saveNovuTriggerRecord(record);
    return record;
  }

  const secretKey = process.env.NOVU_SECRET_KEY || process.env.NOVU_API_KEY;
  if (!secretKey) {
    const record = buildRecord({
      input: normalized,
      status: 'queued_local',
      endpoint,
      startedAt,
      diagnostics: { reason: 'Missing NOVU_SECRET_KEY or NOVU_API_KEY.' },
    });
    saveNovuTriggerRecord(record);
    return record;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `ApiKey ${secretKey}`,
        'Content-Type': 'application/json',
        ...(normalized.transactionId ? { 'idempotency-key': normalized.transactionId } : {}),
      },
      body: JSON.stringify(toNovuApiBody(normalized)),
    });

    const payload = await response.json().catch(() => null);
    const record = buildRecord({
      input: normalized,
      status: response.ok ? 'sent' : 'failed',
      endpoint,
      startedAt,
      diagnostics: {
        responseStatus: response.status,
        novuStatus: typeof payload?.status === 'string' ? payload.status : null,
        acknowledged: typeof payload?.acknowledged === 'boolean' ? payload.acknowledged : null,
        reason: response.ok ? undefined : summarizeNovuError(payload),
      },
    });
    saveNovuTriggerRecord(record);
    return record;
  } catch (error) {
    const record = buildRecord({
      input: normalized,
      status: 'failed',
      endpoint,
      startedAt,
      diagnostics: { reason: error instanceof Error ? error.message : 'Novu trigger failed.' },
    });
    saveNovuTriggerRecord(record);
    return record;
  }
}

export async function notifyHotLeadWithNovu(input: {
  lead: {
    name?: string;
    email?: string;
    phone?: string;
    budget?: number;
  };
  probability: number;
  leadCategory: string;
  topHook: string;
  propertyName?: string | null;
}) {
  return triggerNovuNotification({
    workflowId: getWorkflowId('NOVU_HOT_LEAD_WORKFLOW_ID', 'lead-hot-alert'),
    to: getOperatorSubscriber(),
    source: 'lead_intelligence',
    transactionId: hotLeadTransactionId(input.lead.email, input.probability),
    payload: hotLeadPayload(input),
  });
}

export function getNovuNotificationSnapshot(): NovuNotificationSnapshot {
  const filePath = novuLedgerPath();
  const relativePath = path.relative(process.cwd(), filePath);

  if (!fs.existsSync(filePath)) {
    return {
      status: process.env.NOVU_NOTIFICATIONS_DISABLED === 'true' ? 'disabled' : 'empty',
      path: relativePath,
      eventCount: 0,
      workflowCounts: {},
      sourceCounts: {},
      statusCounts: {},
      lastTriggeredAt: null,
      recent: [],
    };
  }

  const records = readNovuTriggerRecords(filePath);
  return {
    status: process.env.NOVU_NOTIFICATIONS_DISABLED === 'true' ? 'disabled' : 'ready',
    path: relativePath,
    eventCount: records.length,
    workflowCounts: countBy(records, (record) => record.workflowId),
    sourceCounts: countBy(records, (record) => record.source),
    statusCounts: countBy(records, (record) => record.status),
    lastTriggeredAt: records.at(-1)?.createdAt || null,
    recent: records.slice(-MAX_RECENT_EVENTS),
  };
}

export function novuLedgerPath() {
  return path.resolve(
    process.env.NOVU_LEDGER_PATH ||
      path.join(process.cwd(), 'cartridges', 'notifications', DEFAULT_LEDGER_FILE)
  );
}

export function novuTriggerEndpoint() {
  const base = (process.env.NOVU_API_URL || DEFAULT_NOVU_API_URL).replace(/\/+$/, '');
  return `${base}/v1/events/trigger`;
}

function normalizeNovuTrigger(input: NovuTriggerInput): NormalizedNovuTrigger {
  const workflowId = compact(input.workflowId || '', 120);
  if (!workflowId) throw new Error('Novu workflowId is required.');

  const recipients = Array.isArray(input.to) ? input.to : [input.to];
  if (!recipients.length || recipients.length > 100) {
    throw new Error('Novu notifications require between 1 and 100 recipients.');
  }

  return {
    workflowId,
    to: recipients.map(normalizeSubscriber),
    payload: sanitizePayload(input.payload || {}),
    overrides: sanitizePayload(input.overrides || {}),
    transactionId: input.transactionId ? compact(input.transactionId, 180) : '',
    actor: input.actor || '',
    tenant: input.tenant || '',
    context: sanitizePayload(input.context || {}),
    source: input.source || 'system',
  };
}

function toNovuApiBody(input: NormalizedNovuTrigger) {
  return {
    name: input.workflowId,
    to: input.to,
    payload: input.payload,
    ...(Object.keys(input.overrides).length ? { overrides: input.overrides } : {}),
    ...(input.transactionId ? { transactionId: input.transactionId } : {}),
    ...(input.actor ? { actor: input.actor } : {}),
    ...(input.tenant ? { tenant: input.tenant } : {}),
    ...(Object.keys(input.context).length ? { context: input.context } : {}),
  };
}

function buildRecord(input: {
  input: NormalizedNovuTrigger;
  status: NovuTriggerRecord['status'];
  endpoint: string;
  startedAt: number;
  diagnostics: Partial<NovuTriggerRecord['diagnostics']>;
}): NovuTriggerRecord {
  return {
    id: `novu_${hashId(`${input.input.workflowId}:${input.input.transactionId}:${Date.now()}`)}`,
    createdAt: new Date().toISOString(),
    provider: 'novu',
    status: input.status,
    workflowId: input.input.workflowId,
    source: input.input.source,
    transactionId: input.input.transactionId || null,
    recipientCount: input.input.to.length,
    recipientRefs: input.input.to.map(subscriberRef),
    payloadKeys: Object.keys(input.input.payload).sort(),
    payloadFingerprint: hashId(JSON.stringify(input.input.payload)),
    diagnostics: {
      endpoint: input.endpoint,
      ledgerPath: path.relative(process.cwd(), novuLedgerPath()),
      durationMs: Date.now() - input.startedAt,
      ...input.diagnostics,
    },
  };
}

function saveNovuTriggerRecord(record: NovuTriggerRecord) {
  if (process.env.NOVU_LEDGER_DISABLED === 'true') return;
  const filePath = novuLedgerPath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf8');
}

function readNovuTriggerRecords(filePath: string): NovuTriggerRecord[] {
  return fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as NovuTriggerRecord;
      } catch {
        return null;
      }
    })
    .filter((record): record is NovuTriggerRecord => Boolean(record?.id && record?.provider === 'novu'));
}

function normalizeSubscriber(subscriber: NovuSubscriber): NovuSubscriber {
  if (typeof subscriber === 'string') return compact(subscriber, 160);
  const subscriberId = compact(subscriber.subscriberId || '', 160);
  if (!subscriberId) throw new Error('Novu subscriberId is required for object recipients.');

  return {
    subscriberId,
    firstName: subscriber.firstName ? compact(subscriber.firstName, 120) : undefined,
    lastName: subscriber.lastName ? compact(subscriber.lastName, 120) : undefined,
    email: subscriber.email ? compact(subscriber.email, 240) : undefined,
    phone: subscriber.phone ? compact(subscriber.phone, 40) : undefined,
    locale: subscriber.locale ? compact(subscriber.locale, 24) : undefined,
    timezone: subscriber.timezone ? compact(subscriber.timezone, 80) : undefined,
    data: subscriber.data ? sanitizePayload(subscriber.data) : undefined,
  };
}

function subscriberRef(subscriber: NovuSubscriber) {
  return typeof subscriber === 'string' ? subscriber : subscriber.subscriberId;
}

function sanitizePayload(payload: Record<string, unknown>) {
  return Object.entries(payload).reduce<Record<string, unknown>>((safe, [key, value]) => {
    const safeKey = compact(key, 80);
    if (!safeKey || value === undefined) return safe;
    safe[safeKey] = sanitizeValue(value);
    return safe;
  }, {});
}

function sanitizeValue(value: unknown): unknown {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return compact(value, 1200);
  if (Array.isArray(value)) return value.slice(0, 50).map(sanitizeValue);
  if (typeof value === 'object') return sanitizePayload(value as Record<string, unknown>);
  return String(value);
}

function getOperatorSubscriber(): NovuSubscriber {
  return {
    subscriberId: process.env.NOVU_OPERATOR_SUBSCRIBER_ID || 'sunset-operator',
    email: process.env.NOVU_OPERATOR_EMAIL || process.env.ADMIN_EMAIL,
    phone: process.env.NOVU_OPERATOR_PHONE || process.env.ADMIN_PHONE_NUMBER,
    firstName: process.env.NOVU_OPERATOR_FIRST_NAME || 'Sunset',
    lastName: process.env.NOVU_OPERATOR_LAST_NAME || 'Operator',
  };
}

function hotLeadPayload(input: Parameters<typeof notifyHotLeadWithNovu>[0]) {
  return {
    leadName: input.lead.name || 'Unknown lead',
    leadEmail: input.lead.email || null,
    leadPhone: input.lead.phone || null,
    probability: input.probability,
    leadCategory: input.leadCategory,
    budget: input.lead.budget || null,
    propertyName: input.propertyName || null,
    topHook: input.topHook,
    commandCenterPath: '/command-center',
  };
}

function hotLeadTransactionId(email: string | undefined, probability: number) {
  const day = new Date().toISOString().slice(0, 10);
  return `hot-lead:${hashId(`${email || 'unknown'}:${probability}:${day}`)}`;
}

function getWorkflowId(envKey: string, fallback: string) {
  return process.env[envKey] || fallback;
}

function summarizeNovuError(payload: unknown) {
  if (!payload || typeof payload !== 'object') return 'Novu request failed.';
  const error = (payload as { error?: unknown; message?: unknown }).error;
  if (Array.isArray(error)) return compact(error.join('; '), 600);
  if (typeof error === 'string') return compact(error, 600);
  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' ? compact(message, 600) : 'Novu request failed.';
}

function countBy<T>(items: T[], keyForItem: (item: T) => string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const key = keyForItem(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function compact(value: string, limit: number) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim();
  return cleaned.length > limit ? `${cleaned.slice(0, limit - 3)}...` : cleaned;
}

function hashId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  return (hash >>> 0).toString(36);
}
