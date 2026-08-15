import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchAgentAlertNotification } from '@/lib/notifications/agentAlertChannels';

vi.mock('server-only', () => ({}));

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.AGENT_ALERT_SMS_ENABLED;
});

describe('agent alert channels', () => {
  it('sends an idempotent direct Resend email as the primary external channel', async () => {
    process.env.RESEND_API_KEY = 'resend-test-key';
    process.env.RESEND_FROM_EMAIL = 'Pulse <alerts@example.com>';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      JSON.stringify({ id: 'email-123' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    ));

    const result = await dispatchAgentAlertNotification({
      recipient: { email: 'agent@example.com', phone: '+12145550100', smsEnabled: true },
      idempotencyKey: 'agent-alert:test',
      payload: {
        alertKind: 'tour_request',
        leadName: 'Jamie Buyer',
        score: 92,
        topReason: 'Requested a tour',
        commandCenterPath: '/admin/agent-leads?leadId=123',
      },
    });

    expect(result).toEqual({ status: 'sent', provider: 'resend', messageId: 'email-123' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ 'Idempotency-Key': 'agent-alert:test' }),
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      from: 'Pulse <alerts@example.com>',
      to: ['agent@example.com'],
      subject: 'Tour requested by Jamie Buyer',
    });
    expect(body.text).toContain('Requested a tour');
  });

  it('suppresses external delivery when no provider is configured', async () => {
    const result = await dispatchAgentAlertNotification({
      recipient: { email: 'agent@example.com', phone: '+12145550100', smsEnabled: false },
      idempotencyKey: 'agent-alert:test',
      payload: {},
    });

    expect(result).toMatchObject({ status: 'suppressed' });
  });
});
