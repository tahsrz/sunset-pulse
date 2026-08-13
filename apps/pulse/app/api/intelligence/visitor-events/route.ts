import { z } from 'zod';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { errorResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { discoverListingById } from '@/lib/data/listingDiscovery';
import {
  attachVisitorSessionCookie,
  getOrCreateVisitorSession,
} from '@/lib/intelligence/visitorSession';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const visitorEventSchema = z.discriminatedUnion('event', [
  z.object({
    event: z.literal('property_viewed'),
    propertyId: z.string().trim().min(1).max(120),
  }).strict(),
  z.object({
    event: z.literal('properties_compared'),
    propertyIds: z.array(z.string().trim().min(1).max(120)).min(2).max(8),
  }).strict(),
]);

export async function POST(request: Request) {
  const session = getOrCreateVisitorSession(request);
  const limitResponse = await applyPublicApiRateLimit(request, 'visitor-intelligence-event', 60);
  if (limitResponse) return attachVisitorSessionCookie(request, limitResponse, session);

  let rawBody: unknown;
  try {
    const body = await request.text();
    if (body.length > 8_000) return attachVisitorSessionCookie(request, errorResponse('The request body is too large.', 413), session);
    rawBody = JSON.parse(body);
  } catch {
    return attachVisitorSessionCookie(request, errorResponse('A valid JSON request body is required.', 400), session);
  }

  const parsed = visitorEventSchema.safeParse(rawBody);
  if (!parsed.success) {
    return attachVisitorSessionCookie(request, validationErrorResponse(parsed.error.flatten()), session);
  }

  const verifiedListings = await verifyListings(
    parsed.data.event === 'property_viewed' ? [parsed.data.propertyId] : parsed.data.propertyIds,
  );
  const minimumListingCount = parsed.data.event === 'property_viewed' ? 1 : 2;
  if (verifiedListings.length < minimumListingCount) {
    return attachVisitorSessionCookie(request, errorResponse('The event does not include enough verified properties.', 404), session);
  }

  const eventType = parsed.data.event === 'property_viewed'
    ? 'VISITOR_PROPERTY_VIEWED'
    : 'VISITOR_PROPERTIES_COMPARED';
  const targetId = verifiedListings[0].mlsId || verifiedListings[0].id;
  const { error } = await supabaseAdmin.rpc('log_intelligence_event', {
    p_type: eventType,
    p_description: parsed.data.event === 'property_viewed'
      ? 'Visitor viewed a verified property.'
      : 'Visitor compared verified properties.',
    p_actor_id: session.actorId,
    p_actor_name: 'Sunset_Pulse_Visitor',
    p_target_id: targetId,
    p_metadata: {
      propertyIds: verifiedListings.map((listing) => listing.mlsId || listing.id),
      propertyCount: verifiedListings.length,
      sessionVersion: 1,
    },
    p_severity: 'INFO',
  });
  if (error) {
    console.warn('[VISITOR_INTELLIGENCE_EVENT]', error.message);
    return attachVisitorSessionCookie(request, errorResponse('The behavior event could not be recorded.', 503), session);
  }

  return attachVisitorSessionCookie(request, new Response(null, { status: 204 }), session);
}

async function verifyListings(propertyIds: string[]) {
  const uniqueIds = Array.from(new Set(propertyIds));
  const listings = await Promise.all(uniqueIds.map((id) => discoverListingById(id)));
  const verified = listings.flatMap((listing) => listing ? [{
    id: listing.id,
    mlsId: listing.mls_id || null,
  }] : []);
  return Array.from(new Map(
    verified.map((listing) => [listing.mlsId || listing.id, listing]),
  ).values());
}
