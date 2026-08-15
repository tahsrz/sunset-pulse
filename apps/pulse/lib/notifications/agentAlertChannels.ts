import 'server-only';

import { hasTelnyxMessagingConfig, sendTelnyxSMS } from '@/lib/messaging/telnyxClient';

export type AgentAlertRecipient = {
  email?: string;
  phone?: string;
  smsEnabled: boolean;
};

export type AgentAlertChannelResult =
  | { status: 'sent'; provider: 'resend' | 'telnyx'; messageId: string | null }
  | { status: 'failed'; provider: 'resend' | 'telnyx'; reason: string }
  | { status: 'suppressed'; reason: string };

export async function dispatchAgentAlertNotification(input: {
  recipient: AgentAlertRecipient;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}): Promise<AgentAlertChannelResult> {
  if (input.recipient.email && process.env.RESEND_API_KEY) {
    return sendAgentAlertEmail(input);
  }

  if (
    input.recipient.smsEnabled
    && process.env.AGENT_ALERT_SMS_ENABLED === 'true'
    && input.recipient.phone
    && hasTelnyxMessagingConfig()
  ) {
    const result = await sendTelnyxSMS(input.recipient.phone, buildAgentAlertText(input.payload));
    return result.success
      ? { status: 'sent', provider: 'telnyx', messageId: result.messageId || null }
      : { status: 'failed', provider: 'telnyx', reason: result.error || result.reason || 'Telnyx delivery failed.' };
  }

  return {
    status: 'suppressed',
    reason: input.recipient.email
      ? 'RESEND_API_KEY is not configured; native inbox delivery remains available.'
      : 'No configured external agent-alert channel; native inbox delivery remains available.',
  };
}

async function sendAgentAlertEmail(input: {
  recipient: AgentAlertRecipient;
  idempotencyKey: string;
  payload: Record<string, unknown>;
}): Promise<AgentAlertChannelResult> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey,
      },
      body: JSON.stringify({
        from: process.env.AGENT_ALERT_FROM_EMAIL
          || process.env.RESEND_FROM_EMAIL
          || 'Sunset Pulse <no-reply@sunsetpulse.app>',
        to: [input.recipient.email],
        subject: buildAgentAlertSubject(input.payload),
        text: buildAgentAlertText(input.payload),
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        status: 'failed',
        provider: 'resend',
        reason: stringValue(payload?.message) || `Resend returned ${response.status}.`,
      };
    }
    return { status: 'sent', provider: 'resend', messageId: stringValue(payload?.id) || null };
  } catch (error) {
    return {
      status: 'failed',
      provider: 'resend',
      reason: error instanceof Error ? error.message : 'Resend delivery failed.',
    };
  }
}

function buildAgentAlertSubject(payload: Record<string, unknown>) {
  const leadName = stringValue(payload.leadName) || 'Lead';
  const kind = stringValue(payload.alertKind);
  return kind === 'tour_request'
    ? `Tour requested by ${leadName}`
    : `High-intent activity from ${leadName}`;
}

function buildAgentAlertText(payload: Record<string, unknown>) {
  const path = stringValue(payload.commandCenterPath) || '/admin/agent-leads';
  const actionUrl = path.startsWith('http') ? path : `${publicBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  return [
    buildAgentAlertSubject(payload),
    '',
    `Score: ${numberValue(payload.score) ?? 'Not available'}`,
    `Top signal: ${stringValue(payload.topReason) || 'High-intent activity'}`,
    `Listing: ${stringValue(payload.listingName) || stringValue(payload.listingId) || 'General inquiry'}`,
    `Signals in window: ${numberValue(payload.occurrences) ?? 1}`,
    stringValue(payload.recommendedAction) ? `Recommended action: ${stringValue(payload.recommendedAction)}` : null,
    '',
    `Open Sunset Pulse: ${actionUrl}`,
  ].filter((line): line is string => line !== null).join('\n');
}

function publicBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_DOMAIN
    || process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')
    || 'https://sunsetpulse.app'
  ).replace(/\/+$/, '');
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function numberValue(value: unknown) {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}
