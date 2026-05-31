import crypto from 'node:crypto';

const MAX_SKEW_MS = 5 * 60 * 1000;

export type SignatureVerificationResult =
  | { ok: true; timestamp: number; digest: string }
  | { ok: false; status: number; message: string };

const timingSafeEqual = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

export const sha256Digest = (body: string) => crypto.createHash('sha256').update(body).digest('hex');

export const signVerifonePayload = (body: string, timestamp: string | number, secret: string) =>
  crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

export const verifyVerifoneSignature = (
  body: string,
  headers: Headers,
  secret = process.env.VERIFONE_WEBHOOK_SECRET
): SignatureVerificationResult => {
  if (!secret) {
    return { ok: false, status: 500, message: 'VERIFONE_WEBHOOK_SECRET is not configured.' };
  }

  const signature = headers.get('x-pulse-signature');
  const timestampHeader = headers.get('x-timestamp');

  if (!signature || !timestampHeader) {
    return { ok: false, status: 401, message: 'Missing Verifone webhook signature headers.' };
  }

  const timestamp = Number(timestampHeader);
  if (!Number.isFinite(timestamp)) {
    return { ok: false, status: 401, message: 'Invalid Verifone webhook timestamp.' };
  }

  const timestampMs = timestamp < 10_000_000_000 ? timestamp * 1000 : timestamp;
  if (Math.abs(Date.now() - timestampMs) > MAX_SKEW_MS) {
    return { ok: false, status: 401, message: 'Expired Verifone webhook timestamp.' };
  }

  const expected = signVerifonePayload(body, timestampHeader, secret);
  if (!timingSafeEqual(signature, expected)) {
    return { ok: false, status: 401, message: 'Invalid Verifone webhook signature.' };
  }

  return { ok: true, timestamp: timestampMs, digest: sha256Digest(body) };
};
