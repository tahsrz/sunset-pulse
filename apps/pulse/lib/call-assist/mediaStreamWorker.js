const DEFAULT_APP_BASE_URL = 'http://127.0.0.1:3001';
const DEFAULT_INPUT_RATE = 8000;
const DEFAULT_OUTPUT_RATE = 24000;

export function resolveSessionIdFromTwilioStart(startEvent = {}) {
  const custom = startEvent.start?.customParameters || {};
  return custom.sessionId || startEvent.sessionId || '';
}

export function buildRealtimeTranscriptionSession({
  language = 'en',
  delay = 'low',
  transcriptionModel = 'gpt-realtime-whisper',
} = {}) {
  return {
    type: 'session.update',
    session: {
      type: 'transcription',
      audio: {
        input: {
          format: {
            type: 'audio/pcm',
            rate: DEFAULT_OUTPUT_RATE,
          },
          transcription: {
            model: transcriptionModel,
            language,
            delay,
          },
          turn_detection: null,
        },
      },
    },
  };
}

export function twilioMediaToRealtimeAppend(mediaEvent = {}) {
  const payload = mediaEvent.media?.payload;
  if (!payload) return null;

  return {
    type: 'input_audio_buffer.append',
    audio: mulawBase64ToPcm16Base64(payload),
  };
}

export function realtimeTranscriptEventToFragment(event = {}) {
  if (event.type === 'conversation.item.input_audio_transcription.delta' && event.delta) {
    return {
      final: false,
      fragment: event.delta,
      itemId: event.item_id,
    };
  }

  if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
    return {
      final: true,
      fragment: event.transcript,
      itemId: event.item_id,
    };
  }

  return null;
}

export function buildTranscriptPostUrl(sessionId, appBaseUrl = DEFAULT_APP_BASE_URL) {
  const normalized = String(appBaseUrl || DEFAULT_APP_BASE_URL).replace(/\/$/, '');
  return `${normalized}/api/call-assist/transcript/${encodeURIComponent(sessionId)}`;
}

export function buildTranscriptPostBody({ fragment, itemId, final = false, source = undefined }) {
  return {
    fragment,
    source: source || (final ? 'media-stream' : 'media-stream-delta'),
    itemId,
    final,
  };
}

export function mulawBase64ToPcm16Base64(payload, {
  inputRate = DEFAULT_INPUT_RATE,
  outputRate = DEFAULT_OUTPUT_RATE,
} = {}) {
  const mulaw = Buffer.from(payload, 'base64');
  const ratio = Math.max(1, Math.round(outputRate / inputRate));
  const pcm = Buffer.alloc(mulaw.length * ratio * 2);
  let offset = 0;

  for (const sample of mulaw) {
    const decoded = decodeMulawSample(sample);
    for (let i = 0; i < ratio; i += 1) {
      pcm.writeInt16LE(decoded, offset);
      offset += 2;
    }
  }

  return pcm.toString('base64');
}

export function decodeMulawSample(sample) {
  const MULAW_BIAS = 0x84;
  const inverted = ~sample & 0xff;
  const sign = inverted & 0x80;
  const exponent = (inverted >> 4) & 0x07;
  const mantissa = inverted & 0x0f;
  let magnitude = ((mantissa << 3) + MULAW_BIAS) << exponent;
  magnitude -= MULAW_BIAS;
  return sign ? -magnitude : magnitude;
}
