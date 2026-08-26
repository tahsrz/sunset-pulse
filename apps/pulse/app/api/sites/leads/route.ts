export const dynamic = 'force-dynamic';

import { z } from 'zod';
import { createHash, randomUUID } from 'node:crypto';
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
import {
  buildPublicGuideLeadIntelligence,
  type PublicGuideBehaviorEvent,
} from '@/lib/sites/publicGuideLeadIntelligence';
import {
  attachVisitorSessionCookie,
  getOrCreateVisitorSession,
} from '@/lib/intelligence/visitorSession';

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
    const visitorSession = isJamieRequest ? getOrCreateVisitorSession(request) : null;
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

    const listing = await resolveVerifiedJamieListing(input.listing);
    if (input.listing && !listing) {
      return validationErrorResponse({ listing: ['The listing is not available for a verified public handoff.'] });
    }

    const guideHandoff = input.guide && visitorSession
      ? { ...input.guide, sessionId: visitorSession.id }
      : input.guide;
    const verifiedDiscussedListingIds = guideHandoff
      ? await resolveVerifiedJamieListingIds(guideHandoff.discussedListingIds, listing)
      : listing ? [listing.mlsId || listing.id].filter((id): id is string => Boolean(id)) : [];
    const guideBrief = guideHandoff
      ? await buildPublicGuideHandoffBrief({
          handoff: guideHandoff,
          verifiedListingIds: verifiedDiscussedListingIds,
        })
      : null;
    const guideBehaviorEvents = guideHandoff
      ? await loadPublicGuideSessionEvents(guideHandoff.sessionId)
      : [];
    const leadIntelligence = guideHandoff && guideBrief
      ? buildPublicGuideLeadIntelligence({
          brief: guideBrief,
          events: guideBehaviorEvents,
          handoff: guideHandoff,
          hasPhone: Boolean(input.phone),
          hasVerifiedListing: Boolean(listing),
          preferredContact: input.preferredContact,
        })
      : null;

    const source = isJamieRequest ? 'jamie_public_guide' : input.source;
    const siteName = tenantSite.siteName;
    const leadEmail = input.email.toLowerCase();
    const idempotencyKey = buildLeadIdempotencyKey(request, {
      agentId,
      email: leadEmail,
      message: input.message,
      listingId: listing?.id || listing?.mlsId || '',
    });
    const pagePath = isJamieRequest ? getJamieSourcePagePath(request) : input.pagePath || null;
    const funnelId = randomUUID();
    const metadata = {
      funnelId,
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
          sessionIdHash: guideHandoff ? hashPublicGuideSessionId(guideHandoff.sessionId) : null,
          sourceHost: 'jamie',
          sourcePagePath: pagePath,
        },
        ...(guideBrief ? { publicGuideBrief: guideBrief } : {}),
        ...(leadIntelligence ? { leadIntelligence } : {}),
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
        funnel_id: funnelId,
        idempotency_key: idempotencyKey,
      })
      .select('id, funnel_id')
      .single();

    if (error?.code === '23505') {
      const { data: existing } = await supabaseAdmin
        .from('agent_site_leads')
        .select('id, funnel_id')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();
      return successResponse({ accepted: true, duplicate: true, id: existing?.id || null, funnelId: existing?.funnel_id || null, agentId, site: tenantSite.site }, 200);
    }
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

    if (guideHandoff) {
      schedulePublicGuideEvent({
        event: 'handoff_completed',
        actionId: 'contact_agent',
        sessionId: guideHandoff.sessionId,
        hasAgentContext: true,
        hasListingContext: Boolean(listing),
        funnelId,
        targetId: data.id,
      });
    }

    const { error: metadataUpdateError } = await supabaseAdmin
      .from('agent_site_leads')
      .update({
        metadata: {
          ...metadata,
          notification: summarizeNotification(notification),
        },
      })
      .eq('id', data.id);
    if (metadataUpdateError) {
      console.error('[AGENT_SITE_LEAD_METADATA_UPDATE_ERROR]', metadataUpdateError);
    }

    const response = successResponse({
      accepted: true,
      id: data?.id,
      funnelId,
      agentId,
      site: tenantSite.site,
      notification: notification.status,
    }, 201);
    return visitorSession
      ? attachVisitorSessionCookie(request, response, visitorSession)
      : response;
  } catch (error: any) {
    console.error('[AGENT_SITE_LEAD_ROUTE_ERROR]', error);
    return errorResponse('Failed to submit lead inquiry.', 500, error?.message);
  }
}

async function loadPublicGuideSessionEvents(sessionId: string): Promise<PublicGuideBehaviorEvent[]> {
  try {
    const actorId = `public:${hashPublicGuideSessionId(sessionId)}`;
    const { data, error } = await supabaseAdmin
      .from('intelligence_events')
      .select('event_type, target_id, metadata, created_at')
      .eq('actor_id', actorId)
      .in('event_type', [
        'PUBLIC_GUIDE_GUIDE_OPENED',
        'PUBLIC_GUIDE_LISTING_OPENED',
        'PUBLIC_GUIDE_QUESTION_ASKED',
        'PUBLIC_GUIDE_TOOL_USED',
        'VISITOR_PROPERTIES_COMPARED',
        'VISITOR_PROPERTY_VIEWED',
      ])
      .order('created_at', { ascending: true })
      .limit(250);

    if (error) throw error;
    return (data || []) as PublicGuideBehaviorEvent[];
  } catch (error) {
    console.warn(
      '[PUBLIC_GUIDE_LEAD_INTELLIGENCE_EVENTS]',
      error instanceof Error ? error.message : 'Event history unavailable.',
    );
    return [];
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

function buildLeadIdempotencyKey(request: Request, input: {
  agentId: string;
  email: string;
  message: string;
  listingId: string;
}) {
  const explicit = request.headers.get('idempotency-key')?.trim().slice(0, 160);
  const bucket = Math.floor(Date.now() / (2 * 60 * 1000));
  const value = explicit
    ? `${input.agentId}|${explicit}`
    : `${input.agentId}|${input.email}|${input.listingId}|${input.message}|${bucket}`;
  return createHash('sha256').update(value).digest('hex');
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
