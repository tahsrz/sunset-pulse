import { describe, expect, it } from 'vitest';
import {
  buildRealtimeTranscriptionSession,
  buildTranscriptPostBody,
  buildTranscriptPostUrl,
  mulawBase64ToPcm16Base64,
  realtimeTranscriptEventToFragment,
  resolveSessionIdFromTwilioStart,
  twilioMediaToRealtimeAppend,
} from '@/lib/call-assist/mediaStreamWorker';

describe('call assist media worker helpers', () => {
  it('extracts the session id from Twilio stream custom parameters', () => {
    expect(resolveSessionIdFromTwilioStart({
      event: 'start',
      start: {
        customParameters: {
          sessionId: 'call-session-123',
        },
      },
    })).toBe('call-session-123');
  });

  it('builds an OpenAI realtime transcription session update using documented PCM input', () => {
    const event = buildRealtimeTranscriptionSession({ delay: 'minimal' });

    expect(event).toMatchObject({
      type: 'session.update',
      session: {
        type: 'transcription',
        audio: {
          input: {
            format: {
              type: 'audio/pcm',
              rate: 24000,
            },
            transcription: {
              model: 'gpt-realtime-whisper',
              language: 'en',
              delay: 'minimal',
            },
            turn_detection: null,
          },
        },
      },
    });
  });

  it('converts Twilio 8 kHz mu-law payloads into 24 kHz PCM append events', () => {
    const twilioPayload = Buffer.from([0xff, 0x7f]).toString('base64');
    const append = twilioMediaToRealtimeAppend({
      event: 'media',
      media: {
        payload: twilioPayload,
      },
    });

    expect(append?.type).toBe('input_audio_buffer.append');
    expect(append?.audio).toBe(mulawBase64ToPcm16Base64(twilioPayload));

    const pcm = Buffer.from(append?.audio || '', 'base64');
    expect(pcm.length).toBe(12);
    expect(pcm.readInt16LE(0)).toBe(0);
    expect(pcm.readInt16LE(6)).toBe(0);
  });

  it('maps realtime transcript events into app transcript fragments', () => {
    expect(realtimeTranscriptEventToFragment({
      type: 'conversation.item.input_audio_transcription.delta',
      item_id: 'item_123',
      delta: 'Payment ',
    })).toEqual({
      final: false,
      fragment: 'Payment ',
      itemId: 'item_123',
    });

    expect(realtimeTranscriptEventToFragment({
      type: 'conversation.item.input_audio_transcription.completed',
      item_id: 'item_123',
      transcript: 'Payment feels high.',
    })).toEqual({
      final: true,
      fragment: 'Payment feels high.',
      itemId: 'item_123',
    });
  });

  it('builds the transcript POST target and body for the app handoff', () => {
    expect(buildTranscriptPostUrl('abc 123', 'https://pulse.example.com/')).toBe(
      'https://pulse.example.com/api/call-assist/transcript/abc%20123'
    );
    expect(buildTranscriptPostBody({
      fragment: 'I can tour tomorrow.',
      itemId: 'item_1',
      final: true,
    })).toEqual({
      fragment: 'I can tour tomorrow.',
      source: 'media-stream',
      itemId: 'item_1',
      final: true,
    });
  });
});
