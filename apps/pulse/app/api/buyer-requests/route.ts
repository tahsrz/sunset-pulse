import 'server-only';

import { NextResponse } from 'next/server';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { readBoundedJson, RequestBodyError } from '@/lib/core/readBoundedJson';
import { getGuidedBuyerIntakeSite } from '@/lib/marketing/buyerGuidedIntake.server';
import { buyerRequestSchema } from '@/lib/marketing/buyerJourneyContract';
import { saveBuyerRequest } from '@/lib/marketing/buyerJourneyIntake.server';
import { normalizeRootDomain } from '@/lib/sites/siteUrls';

export const dynamic = 'force-dynamic';
const reply = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

function isAllowedOrigin(request: Request, site: string) {
  const origin = request.headers.get('origin');
  if (!origin || request.headers.get('sec-fetch-site') === 'cross-site') return false;
  try {
    const parsed = new URL(origin);
    const host = request.headers.get('host') ?? new URL(request.url).host;
    if (parsed.origin !== origin || parsed.host !== host.toLowerCase()) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return process.env.NODE_ENV !== 'production' && (parsed.protocol === 'http:' || parsed.protocol === 'https:');
    }
    const root = normalizeRootDomain(process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_ROOT_DOMAIN);
    return parsed.protocol === 'https:' && !parsed.port && [root, `www.${root}`, `${site}.${root}`].includes(parsed.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const site = getGuidedBuyerIntakeSite();
  if (!site) return reply({ success: false, message: 'Buyer requests are unavailable.' }, 503);
  if (!isAllowedOrigin(request, site)) return reply({ success: false, message: 'Same-origin request required.' }, 403);
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return reply({ success: false, message: 'A JSON request is required.' }, 415);
  }

  let raw: unknown;
  try {
    raw = await readBoundedJson(request, 12_000);
  } catch (error) {
    return reply({ success: false, message: 'Check the form details and try again.' }, error instanceof RequestBodyError ? error.status : 400);
  }
  const limited = await applyPublicApiRateLimit(request, 'guided-buyer-request', 3, 60, { requireDistributed: true });
  if (limited) {
    limited.headers.set('Cache-Control', 'no-store');
    return limited;
  }

  const parsed = buyerRequestSchema.safeParse(raw);
  if (!parsed.success) return reply({ success: false, message: 'Check the form details and try again.' }, 400);
  if (parsed.data.company) return reply({ success: true, accepted: true });

  const result = await saveBuyerRequest(parsed.data, site);
  if (result === 'saved') return reply({ success: true, accepted: true, duplicate: false }, 201);
  if (result === 'replayed') return reply({ success: true, accepted: true, duplicate: true });
  if (result === 'conflict') return reply({ success: false, message: 'This request ID was already used for different details.' }, 409);
  return reply({ success: false, message: 'Buyer requests are unavailable. Please try again later.' }, 503);
}
