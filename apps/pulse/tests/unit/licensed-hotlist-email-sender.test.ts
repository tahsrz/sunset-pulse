import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailProviderNotConfiguredError, sendLicensedHotlistEmail } from '@/lib/autonomous-workflows/emailSender.server';

vi.mock('server-only', () => ({}));

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
});

afterEach(() => {
  process.env = { ...originalEnv };
  vi.restoreAllMocks();
});

describe('licensed hot-list email sender', () => {
  it('fails closed when Resend is not configured', async () => {
    await expect(sendLicensedHotlistEmail({
      recipients: ['buyer@example.com'], subject: 'Subject', body: 'Body', replyTo: 'agent@example.com', idempotencyKey: 'run-1',
    })).rejects.toBeInstanceOf(EmailProviderNotConfiguredError);
  });

  it('uses BCC and forwards the workflow idempotency key', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ id: 'email-1' }),
    } as any);

    const result = await sendLicensedHotlistEmail({
      recipients: ['one@example.com', 'two@example.com'], subject: 'Subject', body: 'Body', replyTo: 'agent@example.com', idempotencyKey: 'run-1',
    });

    expect(result).toEqual({ id: 'email-1' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer resend-key', 'Idempotency-Key': 'run-1' }),
    }));
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ bcc: ['one@example.com', 'two@example.com'], reply_to: 'agent@example.com' });
    expect(body.to).toBeUndefined();
  });
});
