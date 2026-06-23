export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { buildCallAssistPublicUrls, createCallAssistSession, updateCallAssistSession } from '@/lib/call-assist/sessions';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { placeCallAssistBridgeCall } from '@/lib/twilio';

function isE164(value: unknown) {
  return typeof value === 'string' && /^\+[1-9]\d{7,14}$/.test(value);
}

function publicBaseUrlFrom(body: any, request: NextRequest) {
  const provided = typeof body.callbackBaseUrl === 'string' ? body.callbackBaseUrl : '';
  if (provided && /^https?:\/\//i.test(provided)) return provided;

  if (['localhost', '127.0.0.1', '::1'].includes(request.nextUrl.hostname)) {
    return request.nextUrl.origin;
  }

  const envUrl = process.env.CALL_ASSIST_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return envUrl;

  return request.nextUrl.origin;
}

function streamUrlFrom(body: any) {
  const provided = typeof body.streamUrl === 'string' ? body.streamUrl : '';
  if (provided) return provided;
  return process.env.CALL_ASSIST_MEDIA_STREAM_WSS || '';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const dryRun = body.dryRun !== false;
    const customerPhone = body.customerPhone || body.to;
    const agentPhone = body.agentPhone;

    if (!dryRun && !isE164(customerPhone)) {
      return errorResponse('customerPhone must be an E.164 phone number when placing a real call.', 400);
    }

    if (!dryRun && !isE164(agentPhone)) {
      return errorResponse('agentPhone must be an E.164 phone number when placing a real call.', 400);
    }

    const publicBaseUrl = publicBaseUrlFrom(body, request);
    const session = await createCallAssistSession({
      leadId: typeof body.leadId === 'string' ? body.leadId : undefined,
      customerPhone: typeof customerPhone === 'string' ? customerPhone : undefined,
      agentPhone: typeof agentPhone === 'string' ? agentPhone : undefined,
      streamUrl: streamUrlFrom(body),
      bridgeUrl: publicBaseUrl,
      context: typeof body.context === 'object' && body.context ? body.context : {},
      consent: typeof body.consent === 'object' && body.consent ? body.consent : {},
      transcript: typeof body.transcript === 'string' ? body.transcript : '',
    });
    const urls = buildCallAssistPublicUrls({
      baseUrl: publicBaseUrl,
      sessionId: session.id,
    });

    if (dryRun) {
      return successResponse({
        dryRun: true,
        session,
        urls,
        mediaStream: {
          configured: Boolean(session.streamUrl && /^wss:\/\//i.test(session.streamUrl)),
          url: session.streamUrl || null,
          note: 'Twilio requires a separate WebSocket-capable media endpoint for raw audio frames.',
        },
      });
    }

    const call = await placeCallAssistBridgeCall(customerPhone, urls.twimlUrl, urls.callStatusUrl);

    if (!call.success) {
      const failed = await updateCallAssistSession(session.id, {
        status: 'failed',
        lastError: call.error || call.reason || 'Failed to place call-assist bridge call.',
      });
      return errorResponse(failed?.lastError || 'Failed to place call-assist bridge call.', 502, { session: failed, call });
    }

    const updated = await updateCallAssistSession(session.id, {
      callSid: call.sid,
      status: 'consent_pending',
    });

    return successResponse({
      dryRun: false,
      session: updated,
      urls,
      call,
    });
  } catch (error: any) {
    console.error('[CALL_ASSIST_SESSION_CREATE_FAILURE]:', error);
    return errorResponse('Failed to create call-assist session.', 500, error.message);
  }
}
