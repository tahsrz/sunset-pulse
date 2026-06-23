import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { mockAnswer, mockHangup, mockSpeak, mockUnsafeUnwrap, mockUnwrap } = vi.hoisted(() => ({
  mockAnswer: vi.fn().mockResolvedValue({ data: { result: 'ok' } }),
  mockHangup: vi.fn().mockResolvedValue({ data: { result: 'ok' } }),
  mockSpeak: vi.fn().mockResolvedValue({ data: { result: 'ok' } }),
  mockUnsafeUnwrap: vi.fn((body: string) => JSON.parse(body)),
  mockUnwrap: vi.fn(async (body: string) => JSON.parse(body)),
}));

vi.mock('@/lib/messaging/telnyxClient', () => ({
  getTelnyxClient: () => ({
    webhooks: {
      unsafeUnwrap: mockUnsafeUnwrap,
      unwrap: mockUnwrap,
    },
    calls: {
      actions: {
        answer: mockAnswer,
        speak: mockSpeak,
        hangup: mockHangup,
      },
    },
  }),
}));

import { GET, POST } from '@/app/api/voice/inbound/route';

function webhookRequest(eventType: string, payload: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/voice/inbound', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        id: `${eventType}-event-id`,
        event_type: eventType,
        payload: {
          call_control_id: 'call-control-123',
          call_session_id: 'call-session-123',
          direction: 'incoming',
          from: '+15551234567',
          to: '+15557654321',
          ...payload,
        },
      },
    }),
  });
}

describe('Telnyx voice inbound webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TELNYX_PUBLIC_KEY;
    delete process.env.TELNYX_INBOUND_GREETING;
    delete process.env.TELNYX_HANGUP_AFTER_GREETING;
  });

  it('returns health metadata', async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.route).toBe('/api/voice/inbound');
    expect(body.provider).toBe('telnyx');
  });

  it('answers inbound call.initiated events', async () => {
    const response = await POST(webhookRequest('call.initiated'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('answered');
    expect(mockAnswer).toHaveBeenCalledWith(
      'call-control-123',
      expect.objectContaining({
        command_id: expect.stringContaining('sunset-pulse-answer-'),
        client_state: expect.any(String),
      }),
    );
  });

  it('speaks the inbound greeting after the call is answered', async () => {
    process.env.TELNYX_INBOUND_GREETING = 'Sunset Pulse test greeting.';

    const response = await POST(webhookRequest('call.answered'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('speaking');
    expect(mockSpeak).toHaveBeenCalledWith(
      'call-control-123',
      expect.objectContaining({
        payload: 'Sunset Pulse test greeting.',
        payload_type: 'text',
        voice: 'AWS.Polly.Joanna',
      }),
    );
  });

  it('hangs up after the greeting playback ends by default', async () => {
    const response = await POST(webhookRequest('call.speak.ended'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.action).toBe('hung_up');
    expect(mockHangup).toHaveBeenCalledWith(
      'call-control-123',
      expect.objectContaining({
        command_id: expect.stringContaining('sunset-pulse-hangup-'),
      }),
    );
  });

  it('uses signature verification when TELNYX_PUBLIC_KEY is configured', async () => {
    process.env.TELNYX_PUBLIC_KEY = 'test-public-key';

    await POST(webhookRequest('call.initiated'));

    expect(mockUnwrap).toHaveBeenCalledTimes(1);
    expect(mockUnsafeUnwrap).not.toHaveBeenCalled();
  });
});
