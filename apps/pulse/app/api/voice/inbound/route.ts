export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getTelnyxClient } from '@/lib/messaging/telnyxClient';

type TelnyxVoicePayload = {
  call_control_id?: string;
  call_leg_id?: string;
  call_session_id?: string;
  direction?: 'incoming' | 'outgoing';
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
  const client = getTelnyxClient();

  console.log('[TELNYX_VOICE_WEBHOOK_RECEIVED]:', {
    eventType,
    from: payload.from,
    to: payload.to,
    direction: payload.direction,
    callSessionId: payload.call_session_id,
  });

  try {
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
