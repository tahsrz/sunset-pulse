import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
/** Svix raw-byte signature format: https://docs.svix.com/receiving/verifying-payloads/how-manual */
export function verifySellerEmailSignature(body: string, headers: Headers, secret: string, now = Date.now()) {
  const id = headers.get('svix-id') || '';
  const stamp = headers.get('svix-timestamp') || '';
  const signatures = headers.get('svix-signature') || '';
  if (!secret.startsWith('whsec_') || !id || id.length > 200 || !/^\d+$/.test(stamp) || Math.abs(now / 1000 - Number(stamp)) > 300) return false;
  const key = Buffer.from(secret.slice(6), 'base64');
  if (key.length < 16) return false;
  const expected = createHmac('sha256', key).update(`${id}.${stamp}.${body}`).digest();
  return signatures.split(' ').some((item) => {
    const [version, value] = item.split(',');
    if (version !== 'v1' || !value) return false;
    const signature = Buffer.from(value, 'base64');
    return signature.length === expected.length && timingSafeEqual(expected, signature);
  });
}
