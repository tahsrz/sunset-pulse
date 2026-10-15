import 'server-only';

import { NextResponse } from 'next/server';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { sellerPlanLeadSchema } from '@/lib/marketing/leadMagnetContract';
import { saveSellerPlanLead } from '@/lib/marketing/sellerLeadIntake.server';

export const dynamic = 'force-dynamic';
const MAX_BODY_BYTES = 12_000;
const ROOT_DOMAIN = (process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'sunsetpulse.app').replace(/^www\./, '').toLowerCase();

export async function POST(request: Request) {
  const rawHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
  const site = process.env.KELLER_WESTLAKE_AGENT_SITE?.trim().toLowerCase();
  if (!site || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(site)) {
    return response({ success: false, message: 'Seller requests are not configured yet. Please try again later.' }, 503);
  }
  if (!isAllowedRequestHost(rawHost, site)) {
    return response({ success: false, message: 'This request could not be accepted from this website.' }, 403);
  }
  const origin = request.headers.get('origin');
  if (origin && !sameOrigin(origin, rawHost)) {
    return response({ success: false, message: 'This request could not be accepted from this website.' }, 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return response({ success: false, message: 'A JSON request is required.' }, 415);
  }

  let bodyText: string;
  try {
    bodyText = await readSellerRequestBody(request);
  } catch (error) {
    if (error instanceof SellerBodyTooLargeError) {
      return response({ success: false, message: 'The request is too large.' }, 413);
    }
    return response({ success: false, message: 'Enter the form details and try again.' }, 400);
  }
  if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
    return response({ success: false, message: 'The request is too large.' }, 413);
  }
  const limited = await applyPublicApiRateLimit(request, 'seller-plan-request', 3, 60, { requireDistributed: true });
  if (limited) return limited;

  let raw: unknown;
  try {
    raw = JSON.parse(bodyText);
  } catch {
    return response({ success: false, message: 'Enter the form details and try again.' }, 400);
  }
  const parsed = sellerPlanLeadSchema.safeParse(raw);
  if (!parsed.success) {
    return response({ success: false, message: 'Check the form details and try again.' }, 400);
  }
  const input = parsed.data;
  // Bots that complete the visually hidden field receive no stored lead or side effect.
  if (input.company) return response({ success: true, accepted: true });

  const saved = await saveSellerPlanLead(input, site);
  if (saved.status === 'saved') return response({ success: true, accepted: true, duplicate: false }, 201);
  if (saved.status === 'replayed') return response({ success: true, accepted: true, duplicate: true });
  if (saved.status === 'conflict') {
    return response({ success: false, message: 'This request ID was already used for different details. Refresh the page and try again.' }, 409);
  }
  const message = saved.reason === 'configuration'
    ? 'Seller requests are not configured yet. Please try again later.'
    : 'The request could not be saved. Please try again later.';
  return response({ success: false, message }, 503);
}

class SellerBodyTooLargeError extends Error {}

async function readSellerRequestBody(request: Request) {
  const contentLength = request.headers.get('content-length')?.trim();
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    throw new SellerBodyTooLargeError();
  }
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw new SellerBodyTooLargeError();
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

function isAllowedRequestHost(rawHost: string | null, site: string) {
  const host = parseHost(rawHost, 'https:');
  if (!host) return false;
  if (host.hostname === 'localhost' || host.hostname === '127.0.0.1') return process.env.NODE_ENV !== 'production';
  return !host.port && (host.hostname === ROOT_DOMAIN || host.hostname === `www.${ROOT_DOMAIN}` || host.hostname === `${site}.${ROOT_DOMAIN}`);
}

function sameOrigin(origin: string, rawHost: string | null) {
  try {
    const parsed = new URL(origin);
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false;
    const requestHost = parseHost(rawHost, parsed.protocol);
    return Boolean(requestHost && parsed.origin === requestHost.origin);
  } catch {
    return false;
  }
}

function parseHost(value: string | null, protocol: string) {
  try {
    const firstHost = value?.trim().split(',')[0];
    if (!firstHost) return null;
    const url = new URL(`${protocol}//${firstHost}`);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return { hostname: url.hostname.toLowerCase(), port: url.port, origin: url.origin };
  } catch {
    return null;
  }
}

function response(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}
