import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { savedSellerIdentitySchema } from './sellerConsultationContract';

export const SELLER_BOOKING_CAPABILITY_TTL_SECONDS = 15 * 60;
const MAX_TOKEN_LENGTH = 4096;

const claimsSchema = z.object({
  version: z.literal(1),
  purpose: z.literal('seller_consultation'),
  identity: savedSellerIdentitySchema,
  issuedAt: z.number().int().nonnegative(),
  expiresAt: z.number().int().positive(),
}).strict().superRefine((claims, context) => {
  if (claims.expiresAt <= claims.issuedAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'Capability expiry must follow issuance.' });
  } else if (claims.expiresAt - claims.issuedAt > SELLER_BOOKING_CAPABILITY_TTL_SECONDS) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['expiresAt'], message: 'Capability lifetime exceeds the configured limit.' });
  }
});

export type SellerBookingCapabilityClaims = z.infer<typeof claimsSchema>;

export function createSellerBookingCapability(
  identity: unknown,
  secret: string,
  now = Date.now(),
) {
  const key = requireSigningKey(secret);
  const issuedAt = Math.floor(now / 1000);
  const claims = claimsSchema.parse({
    version: 1,
    purpose: 'seller_consultation',
    identity: savedSellerIdentitySchema.parse(identity),
    issuedAt,
    expiresAt: issuedAt + SELLER_BOOKING_CAPABILITY_TTL_SECONDS,
  });
  const encodedClaims = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = sign(encodedClaims, key).toString('base64url');
  return {
    token: `${encodedClaims}.${signature}`,
    expiresAt: new Date(claims.expiresAt * 1000).toISOString(),
  };
}

/** Verifies only the signed claims; callers must also revalidate saved lead and tenant state. */
export function verifySellerBookingCapability(
  token: string,
  secret: string,
  now = Date.now(),
): SellerBookingCapabilityClaims | null {
  const key = requireSigningKey(secret);
  if (!token || token.length > MAX_TOKEN_LENGTH) return null;
  const [encodedClaims, encodedSignature, extra] = token.split('.');
  if (!encodedClaims || !encodedSignature || extra !== undefined) return null;
  if (!/^[A-Za-z0-9_-]+$/.test(encodedClaims) || !/^[A-Za-z0-9_-]+$/.test(encodedSignature)) return null;

  const suppliedSignature = Buffer.from(encodedSignature, 'base64url');
  const expectedSignature = sign(encodedClaims, key);
  if (suppliedSignature.length !== expectedSignature.length || !timingSafeEqual(suppliedSignature, expectedSignature)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encodedClaims, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  const parsed = claimsSchema.safeParse(payload);
  if (!parsed.success) return null;
  const nowSeconds = Math.floor(now / 1000);
  if (parsed.data.issuedAt > nowSeconds || parsed.data.expiresAt <= nowSeconds) return null;
  return parsed.data;
}

function requireSigningKey(secret: string) {
  if (typeof secret !== 'string' || Buffer.byteLength(secret, 'utf8') < 32) {
    throw new Error('Seller booking capability key must contain at least 32 bytes.');
  }
  return Buffer.from(secret, 'utf8');
}

function sign(encodedClaims: string, key: Buffer) {
  return createHmac('sha256', key).update(encodedClaims).digest();
}
