export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { buildPublicGuideHandoffBrief } from '@/lib/ai/publicGuideHandoff';
import { publicGuideHandoffInputSchema } from '@/lib/ai/publicGuideHandoffContract';
import {
  hashPublicGuideSessionId,
  schedulePublicGuideEvent,
} from '@/lib/ai/publicGuideTelemetry';
import { applyApiRateLimit } from '@/lib/core/apiRateLimit';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { errorResponse, successResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { discoverListingById } from '@/lib/data/listingDiscovery';
import { supabaseAdmin } from '@/lib/supabase';
import { notifyAgentSiteLead } from '@/lib/sites/agentLeadNotification';
import { getTenantSite } from '@/lib/sites/siteData';
import { getFirstPartySiteFromHost, getTenantFromHost } from '@/lib/sites/tenantRouting';

const leadSchema = z.object({
  agentId: z.string().trim().min(1).max(80),
  site: z.string().trim().min(1).max(80),
  siteName: z.string().trim().max(160).optional(),
  source: z.string().trim().max(80).default('agent_site'),
  pagePath: z.string().trim().max(500).optional(),
  name: z.string().trim().min(2, 'Name is required').max(120),
  email: z.string().trim().email('Valid email is required').max(180),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  preferredContact: z.enum(['email', 'phone', 'either']).default('either'),
  message: z.string().trim().min(5, 'Message is required').max(2000),
  listing: z.object({
    id: z.string().trim().max(120).optional(),
    mlsId: z.string().trim().max(80).optional(),
    name: z.string().trim().max(240).optional(),
  }).optional(),
  guide: publicGuideHandoffInputSchema.optional(),
  consent: z.literal(true).optional(),
  company: z.string().max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const isJamieRequest = getFirstPartySiteFromHost(host) === 'jamie';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
    const body = await request.text();
    if (body.length > 32_000) return errorResponse('The request body is too large.', 413);

    let rawBody: unknown;
    try {
      rawBody = JSON.parse(body);
    } catch {
      return errorResponse('A valid JSON request body is required.', 400);
    }
    const validation = leadSchema.safeParse(rawBody);

    if (!validation.success) {
      return validationErrorResponse(validation.error.flatten().fieldErrors);
    }

    const input = validation.data;

    if (isJamieRequest && input.consent !== true) {
      return validationErrorResponse({ consent: ['Consent is required before Jamie can send an inquiry.'] });
    }
    if (isJamieRequest && !input.guide) {
      return validationErrorResponse({ guide: ['Jamie handoff context is required.'] });
    }
    if (!isJamieRequest && input.source === 'jamie_public_guide') {
      return validationErrorResponse({ source: ['Jamie guide inquiries must originate on the Jamie site.'] });
    }
    if (!isJamieRequest && input.guide) {
      return validationErrorResponse({ guide: ['Jamie guide context is only accepted on the Jamie site.'] });
    }

    // Honeypot: treat bots as a no-op success so the public form does not reveal the trap.
    if (input.company) {
      return successResponse({ accepted: true });
    }

    const tenantFromHost = getTenantFromHost(host);
    const requestedSite = tenantFromHost || input.site;

    if (isJamieRequest) {
      const rateLimitResponse = await applyPublicApiRateLimit(request, 'jamie-public-handoff', 5);
      if (rateLimitResponse) return rateLimitResponse;
    }

    const tenantSite = await getTenantSite(requestedSite);

    if (!tenantSite.isPublished) {
      return errorResponse('This agent site is not accepting inquiries yet.', 404);
    }

    const agentId = tenantSite.agentId;
    if (!isJamieRequest) {
      const rateLimitResponse = await applyApiRateLimit(`agent-site-lead:${agentId}:${ip}`, 5);
      if (rateLimitResponse) return rateLimitResponse;
    }

    const listing = isJamieRequest
      ? await resolveVerifiedJamieListing(input.listing)
      : input.listing;
    if (isJamieRequest && input.listing && !listing) {
      return validationErrorResponse({ listing: ['The listing is not available for a verified public handoff.'] });
    }

    const verifiedDiscussedListingIds = input.guide
      ? await resolveVerifiedJamieListingIds(input.guide.discussedListingIds, listing)
      : listing ? [listing.mlsId || listing.id].filter((id): id is string => Boolean(id)) : [];
    const guideBrief = input.guide
      ? await buildPublicGuideHandoffBrief({
          handoff: input.guide,
          verifiedListingIds: verifiedDiscussedListingIds,
        })
      : null;

    const source = isJamieRequest ? 'jamie_public_guide' : input.source;
    const siteName = isJamieRequest ? tenantSite.siteName : input.siteName || tenantSite.siteName;
    const leadEmail = input.email.toLowerCase();
    const pagePath = isJamieRequest ? getJamieSourcePagePath(request) : input.pagePath || null;
    const metadata = {
      tenantAgentName: tenantSite.agentProfile.displayName,
      tenantBrokerage: tenantSite.agentProfile.brokerageName,
      submittedAt: new Date().toISOString(),
      ...(isJamieRequest ? {
        publicGuideConsent: {
          granted: true,
          policyVersion: '2026-07-20',
          scope: 'agent_inquiry',
        },
        publicGuideContext: {
          listingVerified: Boolean(listing),
          tenantVerified: true,
          discussedListingCount: verifiedDiscussedListingIds.length,
          sessionIdHash: input.guide ? hashPublicGuideSessionId(input.guide.sessionId) : null,
          sourceHost: 'jamie',
          sourcePagePath: pagePath,
        },
        ...(guideBrief ? { publicGuideBrief: guideBrief } : {}),
      } : {}),
    };

    const { data, error } = await supabaseAdmin
      .from('agent_site_leads')
      .insert({
        agent_id: agentId,
        site: tenantSite.site,
        site_name: siteName,
        listing_id: listing?.id || null,
        listing_mls_id: listing?.mlsId || null,
        listing_name: listing?.name || null,
        source,
        page_path: pagePath,
        name: input.name,
        email: leadEmail,
        phone: input.phone || null,
        preferred_contact: input.preferredContact,
        message: input.message,
        metadata,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[AGENT_SITE_LEAD_INSERT_ERROR]', error);
      return errorResponse('Failed to save lead inquiry.', 500);
    }

    const notification = await notifyAgentSiteLead({
      leadId: data.id,
      site: tenantSite,
      inquiry: {
        name: input.name,
        email: leadEmail,
        phone: input.phone || null,
        preferredContact: input.preferredContact,
        message: input.message,
        source,
        pagePath,
        listing,
        guideBrief: guideBrief || undefined,
      },
    });

    if (notification.status !== 'sent') {
      console.warn('[AGENT_SITE_LEAD_NOTIFICATION]', notification.status, notification.reason);
    }

    if (input.guide) {
      schedulePublicGuideEvent({
        event: 'handoff_completed',
        actionId: 'contact_agent',
        sessionId: input.guide.sessionId,
        hasAgentContext: true,
        hasListingContext: Boolean(listing),
      });
    }

    await supabaseAdmin
      .from('agent_site_leads')
      .update({
        metadata: {
          ...metadata,
          notification: summarizeNotification(notification),
        },
      })
      .eq('id', data.id);

    return successResponse({
      accepted: true,
      id: data?.id,
      agentId,
      site: tenantSite.site,
      notification: notification.status,
    }, 201);
  } catch (error: any) {
    console.error('[AGENT_SITE_LEAD_ROUTE_ERROR]', error);
    return errorResponse('Failed to submit lead inquiry.', 500, error?.message);
  }
}

async function resolveVerifiedJamieListing(listing: z.infer<typeof leadSchema>['listing']) {
  if (!listing) return undefined;
  const requestedId = listing.id || listing.mlsId;
  if (!requestedId) return null;

  const verified = await discoverListingById(requestedId);
  if (!verified) return null;

  return {
    id: verified.id,
    mlsId: verified.mls_id || undefined,
    name: verified.name,
  };
}

async function resolveVerifiedJamieListingIds(
  listingIds: string[],
  entryListing?: { id?: string; mlsId?: string } | null,
) {
  const entryIds = entryListing
    ? [entryListing.id, entryListing.mlsId].filter((id): id is string => Boolean(id))
    : [];
  const candidates = Array.from(new Set(listingIds))
    .filter((id) => !entryIds.includes(id))
    .slice(0, 8);
  const verified = await Promise.all(candidates.map((id) => discoverListingById(id)));

  return Array.from(new Set([
    ...(entryListing ? [entryListing.mlsId || entryListing.id] : []),
    ...verified
      .flatMap((listing) => listing ? [listing.mls_id || listing.id] : []),
  ].filter((id): id is string => Boolean(id)))).slice(0, 8);
}

function getJamieSourcePagePath(request: Request) {
  const referer = request.headers.get('referer');
  if (!referer) return null;

  try {
    const source = new URL(referer);
    const requestHost = request.headers.get('x-forwarded-host') || request.headers.get('host');
    if (source.host !== requestHost) return null;
    return source.pathname.slice(0, 500);
  } catch {
    return null;
  }
}

function summarizeNotification(notification: Awaited<ReturnType<typeof notifyAgentSiteLead>>) {
  return {
    status: notification.status,
    provider: notification.status === 'sent' ? notification.provider : 'resend',
    id: notification.status === 'sent' ? notification.id : null,
    reason: notification.status === 'sent' ? undefined : notification.reason,
    recipientCount: notification.recipients.length,
    attemptedAt: new Date().toISOString(),
  };
}
