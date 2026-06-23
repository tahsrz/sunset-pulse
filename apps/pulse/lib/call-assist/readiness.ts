export type CallAssistReadinessItem = {
  id: string;
  label: string;
  ready: boolean;
  detail: string;
  requiredFor: 'real-call' | 'live-transcript' | 'save-back';
};

export type CallAssistReadiness = {
  canDryRun: boolean;
  canPlaceRealCall: boolean;
  canStreamAudio: boolean;
  canSaveBack: boolean;
  items: CallAssistReadinessItem[];
  runbook: string[];
};

function present(value: string | undefined) {
  return Boolean(value && !/placeholder/i.test(value));
}

function validHttpUrl(value: string | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value));
}

function validPublicCallbackUrl(value: string | undefined) {
  return Boolean(value && /^https:\/\//i.test(value));
}

function validWssUrl(value: string | undefined) {
  return Boolean(value && /^wss:\/\//i.test(value));
}

export function getCallAssistReadiness(): CallAssistReadiness {
  const publicBaseUrl = process.env.CALL_ASSIST_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_DOMAIN;
  const mediaStreamUrl = process.env.CALL_ASSIST_MEDIA_STREAM_WSS || process.env.NEXT_PUBLIC_CALL_ASSIST_MEDIA_STREAM_WSS;
  const appBaseUrl = process.env.CALL_ASSIST_APP_BASE_URL;
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM_NUMBER;

  const items: CallAssistReadinessItem[] = [
    {
      id: 'public-base-url',
      label: 'Public callback URL',
      ready: validPublicCallbackUrl(publicBaseUrl),
      detail: validPublicCallbackUrl(publicBaseUrl)
        ? 'Twilio can call back into the app.'
        : 'Set CALL_ASSIST_PUBLIC_BASE_URL or NEXT_PUBLIC_DOMAIN to a public https URL.',
      requiredFor: 'real-call',
    },
    {
      id: 'twilio-credentials',
      label: 'Twilio credentials',
      ready: present(twilioSid) && present(twilioToken) && present(twilioFrom),
      detail: present(twilioSid) && present(twilioToken) && present(twilioFrom)
        ? 'Outbound bridge calls are enabled.'
        : 'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER.',
      requiredFor: 'real-call',
    },
    {
      id: 'media-stream-wss',
      label: 'Media stream WSS',
      ready: validWssUrl(mediaStreamUrl),
      detail: validWssUrl(mediaStreamUrl)
        ? 'Twilio can stream call audio to the media worker.'
        : 'Set CALL_ASSIST_MEDIA_STREAM_WSS or NEXT_PUBLIC_CALL_ASSIST_MEDIA_STREAM_WSS to a wss URL.',
      requiredFor: 'live-transcript',
    },
    {
      id: 'openai-realtime',
      label: 'OpenAI realtime key',
      ready: present(process.env.OPENAI_API_KEY),
      detail: present(process.env.OPENAI_API_KEY)
        ? 'Realtime transcription can connect.'
        : 'Set OPENAI_API_KEY for live transcription.',
      requiredFor: 'live-transcript',
    },
    {
      id: 'worker-app-base',
      label: 'Worker app handoff',
      ready: validHttpUrl(appBaseUrl),
      detail: validHttpUrl(appBaseUrl)
        ? 'The media worker can post transcript fragments back to the app.'
        : 'Set CALL_ASSIST_APP_BASE_URL for the media worker transcript handoff.',
      requiredFor: 'live-transcript',
    },
    {
      id: 'lead-persistence',
      label: 'Lead persistence',
      ready: present(process.env.MONGODB_URI),
      detail: present(process.env.MONGODB_URI)
        ? 'Saved summaries can update lead records.'
        : 'Set MONGODB_URI to persist sessions and write summaries back to leads.',
      requiredFor: 'save-back',
    },
  ];

  const realCallItems = items.filter((item) => item.requiredFor === 'real-call');
  const streamItems = items.filter((item) => item.requiredFor === 'live-transcript');
  const saveBackItems = items.filter((item) => item.requiredFor === 'save-back');

  return {
    canDryRun: true,
    canPlaceRealCall: realCallItems.every((item) => item.ready),
    canStreamAudio: streamItems.every((item) => item.ready),
    canSaveBack: saveBackItems.every((item) => item.ready),
    items,
    runbook: [
      'Run the Next.js app with npm --prefix apps/pulse run dev.',
      'Run the media worker with npm --prefix apps/pulse run call-assist:media-worker.',
      'Expose both the app callback URL and media worker WSS URL before placing a real Twilio call.',
    ],
  };
}
