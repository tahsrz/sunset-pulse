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

export async function claimStripeWebhookEvent(event: Stripe.Event): Promise<StripeWebhookClaimResult> {
  const eventId = normalizeEventId(event.id);
  if (!eventId) {
    throw new Error('Stripe webhook event is missing an event id.');
  }

  const existing = await findExistingEvent(eventId);
  if (existing) {
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
    return { shouldProcess: false, reason: 'duplicate_event', eventId, stores: ['supabase'] };
  }
  if (supabaseResult === 'inserted') stores.push('supabase');

  const mongoResult = await insertMongoEvent(record);
  if (mongoResult === 'duplicate') {
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
  };
}

function normalizeEventId(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message.slice(0, 1000);
  if (typeof error === 'string') return error.slice(0, 1000);
  return 'Unknown Stripe webhook processing failure.';
}
