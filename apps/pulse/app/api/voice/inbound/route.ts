export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getTelnyxClient } from '@/lib/messaging/telnyxClient';
import { getRelaySession, updateRelaySession } from '@/lib/grill/relaySessions';
import connectDB from '@/lib/core/database';
import Order from '@/models/Order';

type TelnyxVoicePayload = {
  call_control_id?: string;
  call_leg_id?: string;
  call_session_id?: string;
  direction?: 'incoming' | 'outgoing';
  client_state?: string;
  digits?: string;
  status?: string;
  from?: string;
  to?: string;
};

type TelnyxVoiceWebhook = {
  data?: {
    id?: string;
    event_type?: string;
    occurred_at?: string;
    payload?: TelnyxVoicePayload;
  };
};

const defaultGreeting =
  'Thanks for calling Sunset Pulse. This voice line is connected. A team member will follow up shortly.';

type VoiceClientState = {
  source?: string;
  kind?: 'order-relay';
  eventId?: string;
  interactive?: boolean;
  relayId?: string;
  callScript?: string;
};

const headersToRecord = (headers: Headers) => {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
};

const commandIdFor = (event: TelnyxVoiceWebhook, action: string) => {
  const eventId = event.data?.id || event.data?.payload?.call_control_id || crypto.randomUUID();
  return `sunset-pulse-${action}-${eventId}`.slice(0, 128);
};

const clientStateFor = (event: TelnyxVoiceWebhook) =>
  Buffer.from(
    JSON.stringify({
      source: 'sunset-pulse-voice-inbound',
      eventId: event.data?.id,
    }),
  ).toString('base64');

function encodeClientState(state: VoiceClientState) {
  return Buffer.from(JSON.stringify(state)).toString('base64');
}

function decodeClientState(value?: string): VoiceClientState {
  if (!value) return {};

  try {
    return JSON.parse(Buffer.from(value, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

async function persistOrderRelayStatus(session: any, updates: Record<string, any>) {
  if (!session?.orderId) return;

  await connectDB();
  await Order.findByIdAndUpdate(session.orderId, updates);
}

function telnyxVoice() {
  return process.env.TELNYX_VOICE || 'AWS.Polly.Joanna';
}

function orderGatherPrompt(callScript: string) {
  return [
    'Hi, this is Jamie, an automated order assistant calling in a pickup order.',
    callScript,
    'Press 2 to confirm the order. Press 3 to repeat the order.',
  ].join(' ');
}

async function runOrderRelayGather(callControlId: string, relayId: string, event: TelnyxVoiceWebhook) {
  const session = await getRelaySession(relayId);

  if (!session) {
    await getTelnyxClient().calls.actions.speak(callControlId, {
      command_id: commandIdFor(event, 'missing-relay'),
      payload: 'This order relay session is no longer available. Please contact the customer directly.',
      payload_type: 'text',
      voice: telnyxVoice(),
    });
    return { ok: false, action: 'missing_order_relay' };
  }

  await updateRelaySession(relayId, {
    attempts: session.attempts + 1,
    status: session.attempts > 0 ? 'repeat_requested' : 'pending',
  });
  await persistOrderRelayStatus(session, {
    'phoneRelay.status': session.attempts > 0 ? 'repeat_requested' : 'pending',
    'phoneRelay.attempts': session.attempts + 1,
    'phoneRelay.updatedAt': new Date(),
  });

  await getTelnyxClient().calls.actions.gatherUsingSpeak(callControlId, {
    command_id: commandIdFor(event, `gather-${session.attempts + 1}`),
    payload: orderGatherPrompt(session.callScript),
    payload_type: 'text',
    voice: telnyxVoice(),
    valid_digits: '23',
    maximum_digits: 1,
    minimum_digits: 1,
    maximum_tries: 1,
    timeout_millis: 8000,
    inter_digit_timeout_millis: 2000,
    client_state: encodeClientState({
      kind: 'order-relay',
      interactive: true,
      relayId,
      eventId: event.data?.id,
    }),
  });

  return { ok: true, action: 'order_relay_gathering' };
}

async function handleOrderRelayGatherEnded(callControlId: string, relayId: string, payload: TelnyxVoicePayload, event: TelnyxVoiceWebhook) {
  const session = await getRelaySession(relayId);
  if (!session) return { ok: false, action: 'missing_order_relay' };

  const digits = String(payload.digits || '');

  if (digits === '2') {
    await updateRelaySession(relayId, {
      status: 'confirmed',
      lastDigits: digits,
    });
    await persistOrderRelayStatus(session, {
      'phoneRelay.status': 'confirmed',
      'phoneRelay.lastDigits': digits,
      'phoneRelay.confirmedAt': new Date(),
      'phoneRelay.updatedAt': new Date(),
    });
    await getTelnyxClient().calls.actions.speak(callControlId, {
      command_id: commandIdFor(event, 'confirmed'),
      client_state: encodeClientState({
        kind: 'order-relay',
        interactive: true,
        relayId,
        eventId: event.data?.id,
      }),
      payload: 'Thank you. The order is confirmed for pickup. Goodbye.',
      payload_type: 'text',
      voice: telnyxVoice(),
    });
    return { ok: true, action: 'order_relay_confirmed' };
  }

  if (digits === '3' || payload.status === 'timeout') {
    await updateRelaySession(relayId, {
      status: digits === '3' ? 'repeat_requested' : 'no_input',
      lastDigits: digits,
    });
    await persistOrderRelayStatus(session, {
      'phoneRelay.status': digits === '3' ? 'repeat_requested' : 'no_input',
      'phoneRelay.lastDigits': digits,
      'phoneRelay.updatedAt': new Date(),
    });
    return runOrderRelayGather(callControlId, relayId, event);
  }

  await updateRelaySession(relayId, {
    status: 'needs_human',
    lastDigits: digits,
  });
  await persistOrderRelayStatus(session, {
    'phoneRelay.status': 'needs_human',
    'phoneRelay.lastDigits': digits,
    'phoneRelay.updatedAt': new Date(),
  });
  await getTelnyxClient().calls.actions.speak(callControlId, {
    command_id: commandIdFor(event, 'needs-human'),
    client_state: encodeClientState({
      kind: 'order-relay',
      interactive: true,
      relayId,
      eventId: event.data?.id,
    }),
    payload: 'We did not get a confirmation. A team member will follow up. Goodbye.',
    payload_type: 'text',
    voice: telnyxVoice(),
  });

  return { ok: true, action: 'order_relay_needs_human' };
}

async function handleOrderRelayHangup(relayId: string) {
  const session = await getRelaySession(relayId);
  if (!session || session.status === 'confirmed') return { ok: true, action: 'order_relay_hangup_ignored' };

  await updateRelaySession(relayId, {
    status: session.lastDigits ? 'needs_human' : 'no_input',
  });
  await persistOrderRelayStatus(session, {
    'phoneRelay.status': session.lastDigits ? 'needs_human' : 'no_input',
    'phoneRelay.updatedAt': new Date(),
  });

  return { ok: true, action: 'order_relay_hangup_recorded' };
}

async function parseTelnyxWebhook(req: NextRequest) {
  const body = await req.text();
  if (!body) {
    throw new Error('Empty Telnyx webhook body.');
  }

  const client = getTelnyxClient();

  if (process.env.TELNYX_PUBLIC_KEY) {
    return client.webhooks.unwrap<TelnyxVoiceWebhook>(body, {
      headers: headersToRecord(req.headers),
    });
  }

  console.warn('[TELNYX_VOICE_WEBHOOK_UNVERIFIED]: TELNYX_PUBLIC_KEY is not configured.');
  return client.webhooks.unsafeUnwrap<TelnyxVoiceWebhook>(body);
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    route: '/api/voice/inbound',
    provider: 'telnyx',
  });
}

export async function POST(req: NextRequest) {
  let event: TelnyxVoiceWebhook;

  try {
    event = await parseTelnyxWebhook(req);
  } catch (error: any) {
    console.error('[TELNYX_VOICE_WEBHOOK_REJECTED]:', error.message);
    return NextResponse.json({ ok: false, error: 'Invalid Telnyx webhook.' }, { status: 400 });
  }

  const eventType = event.data?.event_type;
  const payload = event.data?.payload || {};
  const callControlId = payload.call_control_id;
  const clientState = decodeClientState(payload.client_state);
  const client = getTelnyxClient();

  console.log('[TELNYX_VOICE_WEBHOOK_RECEIVED]:', {
    eventType,
    from: payload.from,
    to: payload.to,
    direction: payload.direction,
    callSessionId: payload.call_session_id,
  });

  try {
    if (clientState.kind === 'order-relay' && callControlId) {
      if (eventType === 'call.answered' && clientState.relayId) {
        const result = await runOrderRelayGather(callControlId, clientState.relayId, event);
        return NextResponse.json({ ...result, eventType });
      }

      if (eventType === 'call.gather.ended' && clientState.relayId) {
        const result = await handleOrderRelayGatherEnded(callControlId, clientState.relayId, payload, event);
        return NextResponse.json({ ...result, eventType });
      }

      if (eventType === 'call.hangup' && clientState.relayId) {
        const result = await handleOrderRelayHangup(clientState.relayId);
        return NextResponse.json({ ...result, eventType });
      }

      if (eventType === 'call.speak.ended') {
        await client.calls.actions.hangup(callControlId, {
          command_id: commandIdFor(event, 'order-relay-hangup'),
        });
        return NextResponse.json({ ok: true, action: 'order_relay_hung_up', eventType });
      }

      return NextResponse.json({ ok: true, action: 'order_relay_ignored', eventType });
    }

    if (eventType === 'call.initiated' && payload.direction === 'incoming' && callControlId) {
      await client.calls.actions.answer(callControlId, {
        command_id: commandIdFor(event, 'answer'),
        client_state: clientStateFor(event),
      });

      return NextResponse.json({ ok: true, action: 'answered', eventType });
    }

    if (eventType === 'call.answered' && callControlId) {
      await client.calls.actions.speak(callControlId, {
        command_id: commandIdFor(event, 'speak'),
        payload: process.env.TELNYX_INBOUND_GREETING || defaultGreeting,
        payload_type: 'text',
        voice: process.env.TELNYX_VOICE || 'AWS.Polly.Joanna',
      });

      return NextResponse.json({ ok: true, action: 'speaking', eventType });
    }

    if (
      eventType === 'call.speak.ended' &&
      callControlId &&
      process.env.TELNYX_HANGUP_AFTER_GREETING !== 'false'
    ) {
      await client.calls.actions.hangup(callControlId, {
        command_id: commandIdFor(event, 'hangup'),
      });

      return NextResponse.json({ ok: true, action: 'hung_up', eventType });
    }

    return NextResponse.json({ ok: true, action: 'ignored', eventType });
  } catch (error: any) {
    console.error('[TELNYX_VOICE_COMMAND_ERROR]:', {
      eventType,
      callControlId,
      message: error.message,
      status: error.statusCode,
    });

    return NextResponse.json({ ok: false, error: 'Telnyx voice command failed.' }, { status: 500 });
  }
}
