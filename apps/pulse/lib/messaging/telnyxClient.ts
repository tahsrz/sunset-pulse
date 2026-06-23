import 'server-only';
import Telnyx from 'telnyx';

interface PulseNotification {
  to: string;
  cartridgeVersion: string;
  recordCount: number;
}

type SendTelnyxSMSOptions = {
  from?: string;
  messagingProfileId?: string;
};

type TelnyxDispatchResult = {
  success: boolean;
  messageId?: string;
  mocked?: boolean;
  reason?: string;
  error?: string;
};

let telnyxClient: Telnyx | null = null;

export function getTelnyxClient() {
  if (!telnyxClient) {
    telnyxClient = new Telnyx({
      apiKey: process.env.TELNYX_API_KEY || '',
    });
  }

  return telnyxClient;
}

export function hasTelnyxMessagingConfig(options: SendTelnyxSMSOptions = {}) {
  const outboundNumber = options.from || process.env.TELNYX_FROM_NUMBER;
  const profileId = options.messagingProfileId || process.env.TELNYX_MESSAGING_PROFILE_ID;

  return Boolean(process.env.TELNYX_API_KEY && outboundNumber && profileId);
}

export async function sendTelnyxSMS(
  to: string,
  text: string,
  options: SendTelnyxSMSOptions = {},
): Promise<TelnyxDispatchResult> {
  const outboundNumber = options.from || process.env.TELNYX_FROM_NUMBER;
  const profileId = options.messagingProfileId || process.env.TELNYX_MESSAGING_PROFILE_ID;

  if (!process.env.TELNYX_API_KEY || !outboundNumber || !profileId) {
    console.warn(`[TELNYX_SMS_SKIPPED]: Missing Telnyx configuration. Destination: ${to}.`);
    return {
      success: false,
      reason: 'Missing Telnyx configuration environment variables.',
    };
  }

  try {
    const response = await getTelnyxClient().messages.send({
      from: outboundNumber,
      to,
      text,
      messaging_profile_id: profileId,
    });
    const messageId = response.data?.id;

    console.log(`[TELNYX_SMS_SENT]: Message ID: ${messageId || 'unknown'} to ${to}`);
    return { success: true, messageId };
  } catch (error: any) {
    console.error('[TELNYX_SMS_ERROR]:', {
      status: error.statusCode,
      message: error.message,
      raw: error.rawBody,
    });

    return { success: false, error: error.message };
  }
}

/**
 * Dispatches an automated Sunset Pulse sync alert to a client device via Telnyx.
 */
export async function dispatchPulseAlert({
  to,
  cartridgeVersion,
  recordCount,
}: PulseNotification): Promise<TelnyxDispatchResult> {
  if (!hasTelnyxMessagingConfig()) {
    throw new Error('Missing Telnyx configuration environment variables.');
  }

  const pulseMessage = `[Sunset Pulse] New local AI cartridge available.\nVersion: ${cartridgeVersion}\nRecords: ${recordCount}\nParsing strategy: Zero-Copy Memory Mapped. Syncing background assets...`;
  return sendTelnyxSMS(to, pulseMessage);
}
