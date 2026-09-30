import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { getTenantSite } from '@/lib/sites/siteData';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeCampaign, sellerPlanLeadSchema } from '@/lib/marketing/leadMagnetContract';

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

  const bodyText = await request.text();
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

  let tenant;
  try {
    tenant = await getTenantSite(site);
  } catch (error) {
    console.error('[SELLER_PLAN_SITE_LOOKUP]', error);
    return response({ success: false, message: 'The request could not be saved. Please try again later.' }, 503);
  }
  if (!tenant.isPublished || tenant.status !== 'active' || !tenant.agentId) {
    return response({ success: false, message: 'Seller requests are not configured yet. Please try again later.' }, 503);
  }

  const email = input.email.trim().toLowerCase();
  const message = [
    `Seller plan request; stated timing: ${input.timing}.`,
    input.propertyAddress ? `Property address: ${input.propertyAddress}.` : '',
    input.message ? `What would help: ${input.message}` : '',
  ].filter(Boolean).join('\n');
  const campaign = normalizeCampaign(input.campaign);
  const fingerprint = createHash('sha256').update(JSON.stringify({
    offerKey: input.offerKey,
    offerVersion: input.offerVersion,
    name: input.name.trim(),
    email,
    propertyAddress: input.propertyAddress || '',
    timing: input.timing,
    message: input.message || '',
    requestedContact: input.requestedContact,
    marketingOptIn: input.marketingOptIn,
    campaign: campaign || {},
  })).digest('hex');
  const idempotencyKey = createHash('sha256').update(`${tenant.agentId}:${site}:${input.submissionId}`).digest('hex');
  const submittedAt = new Date().toISOString();
  const metadata = {
    funnelId: randomUUID(),
    sellerPlan: {
      offerKey: input.offerKey,
      offerVersion: input.offerVersion,
      requestedContact: { granted: true, capturedAt: submittedAt },
      marketingOptIn: input.marketingOptIn ? { granted: true, capturedAt: submittedAt } : { granted: false },
      requestFingerprint: fingerprint,
    },
    ...(campaign ? { campaign } : {}),
  };

  try {
    const { error } = await supabaseAdmin.from('agent_site_leads').insert({
      agent_id: tenant.agentId,
      site,
      site_name: tenant.siteName,
      source: 'seller_plan',
      page_path: '/seller-plan',
      name: input.name.trim(),
      email,
      preferred_contact: 'email',
      message,
      metadata,
      funnel_id: metadata.funnelId,
      idempotency_key: idempotencyKey,
    });

    if (!error) return response({ success: true, accepted: true, duplicate: false }, 201);
    if (error.code === '23505') {
      const { data: existing, error: lookupError } = await supabaseAdmin
        .from('agent_site_leads')
        .select('metadata')
        .eq('agent_id', tenant.agentId)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.metadata?.sellerPlan?.requestFingerprint === fingerprint) {
        return response({ success: true, accepted: true, duplicate: true });
      }
      return response({ success: false, message: 'This request ID was already used for different details. Refresh the page and try again.' }, 409);
    }
    console.error('[SELLER_PLAN_LEAD_INSERT]', error.message);
    return response({ success: false, message: 'The request could not be saved. Please try again later.' }, 503);
  } catch (error) {
    console.error('[SELLER_PLAN_LEAD_SAVE]', error);
    return response({ success: false, message: 'The request could not be saved. Please try again later.' }, 503);
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
