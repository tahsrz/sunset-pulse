import Stripe from 'stripe';
import connectDB from '@/lib/core/database';
import { supabaseAdmin } from '@/lib/supabase';
import { StripeWebhookEvent } from '@/models/StripeWebhookEvent';

type StripeWebhookEventStatus = 'processing' | 'succeeded' | 'failed';

type StripeWebhookClaimResult = {
  shouldProcess: boolean;
  reason?: 'duplicate_event';
  eventId: string;
  stores: string[];
};

export type StripeWebhookPayloadSnapshot = {
  objectType: string;
  objectId: string;
  customerId: string;
  subscriptionId: string;
  checkoutSessionId: string;
  invoiceId: string;
  paymentIntentId: string;
  paymentStatus: string;
  subscriptionStatus: string;
  mode: string;
  billingReason: string;
  collectionMethod: string;
  amountDue: number | null;
  amountPaid: number | null;
  currency: string;
  livemode: boolean;
  metadata: Record<string, string>;
  eventCreatedAt: string;
};

export type StripeWebhookLedgerEvent = {
  eventId: string;
  eventType: string;
  objectId: string;
  livemode: boolean;
  status: StripeWebhookEventStatus;
  receivedAt: string;
  completedAt: string;
  failedAt: string;
  errorMessage: string;
  duplicateCount: number;
  payloadSnapshot: StripeWebhookPayloadSnapshot | null;
  stores: string[];
};

const SAFE_METADATA_KEYS = new Set([
  'agentId',
  'orderId',
  'orderType',
  'productType',
  'siteId',
  'subscriptionTier',
  'userId',
]);

export async function listStripeWebhookEvents(input: {
  objectIds?: string[];
  limit?: number;
} = {}): Promise<StripeWebhookLedgerEvent[]> {
  const limit = Math.min(Math.max(input.limit || 25, 1), 100);
  const objectIds = Array.from(new Set((input.objectIds || []).map(normalizeEventId).filter(Boolean)));
  const events = new Map<string, StripeWebhookLedgerEvent>();

  for (const event of await listSupabaseEvents({ objectIds, limit })) {
    events.set(event.eventId, event);
  }

  for (const event of await listMongoEvents({ objectIds, limit })) {
    const existing = events.get(event.eventId);
    events.set(event.eventId, existing
      ? { ...existing, stores: Array.from(new Set([...existing.stores, ...event.stores])) }
      : event);
  }

  return Array.from(events.values())
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, limit);
}

export async function claimStripeWebhookEvent(event: Stripe.Event): Promise<StripeWebhookClaimResult> {
  const eventId = normalizeEventId(event.id);
  if (!eventId) {
    throw new Error('Stripe webhook event is missing an event id.');
  }

  const existing = await findExistingEvent(eventId);
  if (existing) {
    await recordDuplicateStripeWebhookEvent(eventId, existing.stores);
    return {
      shouldProcess: false,
      reason: 'duplicate_event',
      eventId,
      stores: existing.stores,
    };
  }

  const stores: string[] = [];
  const record = toLedgerRecord(event);
  const supabaseResult = await insertSupabaseEvent(record);
  if (supabaseResult === 'duplicate') {
    await recordDuplicateStripeWebhookEvent(eventId, ['supabase']);
    return { shouldProcess: false, reason: 'duplicate_event', eventId, stores: ['supabase'] };
  }
  if (supabaseResult === 'inserted') stores.push('supabase');

  const mongoResult = await insertMongoEvent(record);
  if (mongoResult === 'duplicate') {
    await recordDuplicateStripeWebhookEvent(eventId, ['mongo', ...stores]);
    return { shouldProcess: false, reason: 'duplicate_event', eventId, stores: ['mongo', ...stores] };
  }
  if (mongoResult === 'inserted') stores.push('mongo');

  if (stores.length === 0) {
    throw new Error('Stripe webhook ledger is unavailable.');
  }

  return {
    shouldProcess: true,
    eventId,
    stores,
  };
}

async function listSupabaseEvents(input: { objectIds: string[]; limit: number }) {
  try {
    let query = supabaseAdmin
      .from('stripe_webhook_events')
      .select('event_id, event_type, object_id, livemode, status, received_at, completed_at, failed_at, error_message, duplicate_count, payload_snapshot')
      .order('received_at', { ascending: false })
      .limit(input.limit);

    if (input.objectIds.length) {
      query = query.in('object_id', input.objectIds);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_LIST]', error.message);
      return [];
    }

    return (data || []).map((row: any): StripeWebhookLedgerEvent => ({
      eventId: row.event_id || '',
      eventType: row.event_type || '',
      objectId: row.object_id || '',
      livemode: Boolean(row.livemode),
      status: normalizeLedgerStatus(row.status),
      receivedAt: normalizeIso(row.received_at),
      completedAt: normalizeIso(row.completed_at),
      failedAt: normalizeIso(row.failed_at),
      errorMessage: row.error_message || '',
      duplicateCount: Number(row.duplicate_count || 0),
      payloadSnapshot: normalizePayloadSnapshot(row.payload_snapshot),
      stores: ['supabase'],
    })).filter((event) => event.eventId);
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_LIST_FALLBACK]', error);
    return [];
  }
}

async function listMongoEvents(input: { objectIds: string[]; limit: number }) {
  try {
    await connectDB();
    const query = input.objectIds.length ? { objectId: { $in: input.objectIds } } : {};
    const rows = await StripeWebhookEvent
      .find(query)
      .sort({ receivedAt: -1 })
      .limit(input.limit)
      .lean();

    return rows.map((row: any): StripeWebhookLedgerEvent => ({
      eventId: row.eventId || '',
      eventType: row.eventType || '',
      objectId: row.objectId || '',
      livemode: Boolean(row.livemode),
      status: normalizeLedgerStatus(row.status),
      receivedAt: normalizeIso(row.receivedAt),
      completedAt: normalizeIso(row.completedAt),
      failedAt: normalizeIso(row.failedAt),
      errorMessage: row.errorMessage || '',
      duplicateCount: Number(row.duplicateCount || 0),
      payloadSnapshot: normalizePayloadSnapshot(row.payloadSnapshot),
      stores: ['mongo'],
    })).filter((event) => event.eventId);
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_MONGO_LIST_FALLBACK]', error);
    return [];
  }
}

export async function completeStripeWebhookEvent(eventId: string, stores: string[]) {
  await updateStripeWebhookEvent(eventId, stores, {
    status: 'succeeded',
    completedAt: new Date(),
    errorMessage: '',
  });
}

export async function failStripeWebhookEvent(eventId: string, stores: string[], error: unknown) {
  await updateStripeWebhookEvent(eventId, stores, {
    status: 'failed',
    failedAt: new Date(),
    errorMessage: getErrorMessage(error),
  });
}

async function findExistingEvent(eventId: string) {
  const stores: string[] = [];

  try {
    const { data, error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (data && !error) stores.push('supabase');
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_READ]', error);
  }

  try {
    await connectDB();
    const existing = await StripeWebhookEvent.findOne({ eventId }).select('eventId').lean();
    if (existing) stores.push('mongo');
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_MONGO_READ]', error);
  }

  return stores.length ? { stores } : null;
}

async function recordDuplicateStripeWebhookEvent(eventId: string, stores: string[]) {
  const updates = [];

  if (stores.includes('supabase')) {
    updates.push(incrementSupabaseDuplicateCount(eventId));
  }

  if (stores.includes('mongo')) {
    updates.push(incrementMongoDuplicateCount(eventId));
  }

  await Promise.all(updates);
}

async function incrementSupabaseDuplicateCount(eventId: string) {
  try {
    const { data, error: readError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .select('duplicate_count')
      .eq('event_id', eventId)
      .maybeSingle();

    if (readError) {
      console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_DUPLICATE_READ]', readError.message);
      return;
    }

    const current = Number(data?.duplicate_count || 0);
    const { error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .update({ duplicate_count: current + 1 })
      .eq('event_id', eventId);

    if (error) {
      console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_DUPLICATE_UPDATE]', error.message);
    }
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_DUPLICATE_FALLBACK]', error);
  }
}

async function incrementMongoDuplicateCount(eventId: string) {
  try {
    await connectDB();
    await StripeWebhookEvent.updateOne({ eventId }, { $inc: { duplicateCount: 1 } });
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_MONGO_DUPLICATE_UPDATE]', error);
  }
}

async function insertSupabaseEvent(record: ReturnType<typeof toLedgerRecord>) {
  try {
    const { error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({
        event_id: record.eventId,
        event_type: record.eventType,
        object_id: record.objectId,
        livemode: record.livemode,
        status: 'processing',
        received_at: record.receivedAt.toISOString(),
        duplicate_count: 0,
        payload_snapshot: record.payloadSnapshot,
      });

    if (!error) return 'inserted';
    if (error.code === '23505') return 'duplicate';
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_INSERT]', error.message);
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_INSERT_FALLBACK]', error);
  }

  return 'failed';
}

async function insertMongoEvent(record: ReturnType<typeof toLedgerRecord>) {
  try {
    await connectDB();
    await StripeWebhookEvent.create({
      eventId: record.eventId,
      eventType: record.eventType,
      objectId: record.objectId,
      livemode: record.livemode,
      status: 'processing',
      receivedAt: record.receivedAt,
      duplicateCount: 0,
      payloadSnapshot: record.payloadSnapshot,
    });
    return 'inserted';
  } catch (error: any) {
    if (error?.code === 11000) return 'duplicate';
    console.warn('[STRIPE_WEBHOOK_LEDGER_MONGO_INSERT]', error);
  }

  return 'failed';
}

async function updateStripeWebhookEvent(
  eventId: string,
  stores: string[],
  update: {
    status: StripeWebhookEventStatus;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  },
) {
  const updates = [];

  if (stores.includes('supabase')) {
    updates.push(updateSupabaseEvent(eventId, update));
  }

  if (stores.includes('mongo')) {
    updates.push(updateMongoEvent(eventId, update));
  }

  await Promise.all(updates);
}

async function updateSupabaseEvent(
  eventId: string,
  update: {
    status: StripeWebhookEventStatus;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  },
) {
  try {
    const { error } = await supabaseAdmin
      .from('stripe_webhook_events')
      .update({
        status: update.status,
        completed_at: update.completedAt?.toISOString() || null,
        failed_at: update.failedAt?.toISOString() || null,
        error_message: update.errorMessage || '',
      })
      .eq('event_id', eventId);

    if (error) {
      console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_UPDATE]', error.message);
    }
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_SUPABASE_UPDATE_FALLBACK]', error);
  }
}

async function updateMongoEvent(
  eventId: string,
  update: {
    status: StripeWebhookEventStatus;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  },
) {
  try {
    await connectDB();
    await StripeWebhookEvent.updateOne({ eventId }, {
      status: update.status,
      completedAt: update.completedAt,
      failedAt: update.failedAt,
      errorMessage: update.errorMessage || '',
    });
  } catch (error) {
    console.warn('[STRIPE_WEBHOOK_LEDGER_MONGO_UPDATE]', error);
  }
}

function toLedgerRecord(event: Stripe.Event) {
  const object = event.data?.object as { id?: string } | undefined;

  return {
    eventId: normalizeEventId(event.id),
    eventType: event.type,
    objectId: typeof object?.id === 'string' ? object.id : '',
    livemode: Boolean(event.livemode),
    receivedAt: new Date(),
    payloadSnapshot: buildPayloadSnapshot(event),
  };
}

function normalizeEventId(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildPayloadSnapshot(event: Stripe.Event): StripeWebhookPayloadSnapshot {
  const object = toPlainObject(event.data?.object);
  const objectId = stripeId(object.id);
  const objectType = stripeText(object.object);
  const invoiceId = objectType === 'invoice' ? objectId : stripeId(object.invoice);
  const checkoutSessionId = objectType === 'checkout.session' ? objectId : stripeId(object.checkout_session);
  const subscriptionId = firstNonEmpty([
    objectType === 'subscription' ? objectId : '',
    stripeId(object.subscription),
    stripeId(toPlainObject(object.parent).subscription_details?.subscription),
  ]);

  return normalizePayloadSnapshot({
    objectType,
    objectId,
    customerId: stripeId(object.customer),
    subscriptionId,
    checkoutSessionId,
    invoiceId,
    paymentIntentId: stripeId(object.payment_intent),
    paymentStatus: stripeText(object.payment_status),
    subscriptionStatus: stripeText(object.status),
    mode: stripeText(object.mode),
    billingReason: stripeText(object.billing_reason),
    collectionMethod: stripeText(object.collection_method),
    amountDue: stripeNumber(object.amount_due),
    amountPaid: stripeNumber(object.amount_paid),
    currency: stripeText(object.currency).toLowerCase(),
    livemode: Boolean(event.livemode),
    metadata: sanitizeMetadata(object.metadata),
    eventCreatedAt: normalizeStripeCreatedAt(event.created),
  })!;
}

function normalizePayloadSnapshot(value: unknown): StripeWebhookPayloadSnapshot | null {
  if (!value || typeof value !== 'object') return null;
  const snapshot = value as Record<string, unknown>;

  return {
    objectType: stripeText(snapshot.objectType),
    objectId: stripeText(snapshot.objectId),
    customerId: stripeText(snapshot.customerId),
    subscriptionId: stripeText(snapshot.subscriptionId),
    checkoutSessionId: stripeText(snapshot.checkoutSessionId),
    invoiceId: stripeText(snapshot.invoiceId),
    paymentIntentId: stripeText(snapshot.paymentIntentId),
    paymentStatus: stripeText(snapshot.paymentStatus),
    subscriptionStatus: stripeText(snapshot.subscriptionStatus),
    mode: stripeText(snapshot.mode),
    billingReason: stripeText(snapshot.billingReason),
    collectionMethod: stripeText(snapshot.collectionMethod),
    amountDue: stripeNumber(snapshot.amountDue),
    amountPaid: stripeNumber(snapshot.amountPaid),
    currency: stripeText(snapshot.currency).toLowerCase(),
    livemode: Boolean(snapshot.livemode),
    metadata: sanitizeMetadata(snapshot.metadata),
    eventCreatedAt: normalizeIso(snapshot.eventCreatedAt),
  };
}

function sanitizeMetadata(value: unknown) {
  if (!value || typeof value !== 'object') return {};
  const metadata = value as Record<string, unknown>;
  const safe: Record<string, string> = {};

  for (const key of SAFE_METADATA_KEYS) {
    const raw = metadata[key];
    if (typeof raw !== 'string') continue;
    const trimmed = raw.trim();
    if (trimmed) safe[key] = trimmed.slice(0, 120);
  }

  return safe;
}

function toPlainObject(value: unknown): Record<string, any> {
  return value && typeof value === 'object' ? value as Record<string, any> : {};
}

function stripeId(value: unknown) {
  if (typeof value === 'string') return value.trim().slice(0, 120);
  if (value && typeof value === 'object') return stripeId((value as { id?: unknown }).id);
  return '';
}

function stripeText(value: unknown) {
  return typeof value === 'string' ? value.trim().slice(0, 120) : '';
}

function stripeNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function firstNonEmpty(values: string[]) {
  return values.find(Boolean) || '';
}

function normalizeStripeCreatedAt(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '';
  return new Date(value * 1000).toISOString();
}

function normalizeLedgerStatus(value: unknown): StripeWebhookEventStatus {
  if (value === 'processing' || value === 'succeeded' || value === 'failed') return value;
  return 'processing';
}

function normalizeIso(value: unknown) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isFinite(date.getTime()) ? date.toISOString() : '';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  if (typeof error === 'string') return error.slice(0, 1000);
  return 'Unknown Stripe webhook processing failure.';
}
