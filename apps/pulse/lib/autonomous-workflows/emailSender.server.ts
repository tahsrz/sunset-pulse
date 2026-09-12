import 'server-only';

export type LicensedEmailSendResult = { id: string | null };

export class EmailProviderNotConfiguredError extends Error {}

export async function sendLicensedHotlistEmail({
  recipients,
  subject,
  body,
  replyTo,
  idempotencyKey,
}: {
  recipients: string[];
  subject: string;
  body: string;
  replyTo: string;
  idempotencyKey: string;
}): Promise<LicensedEmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new EmailProviderNotConfiguredError('Email provider is not configured. Set RESEND_API_KEY before sending.');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || 'Sunset Pulse <no-reply@sunsetpulse.app>',
      bcc: recipients,
      reply_to: replyTo,
      subject,
      text: body,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.message || 'The email provider rejected the workflow send.');
  return { id: payload?.id || null };
}
