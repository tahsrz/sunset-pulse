import { z } from 'zod';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import {
  PUBLIC_GUIDE_ACTION_IDS,
  PUBLIC_GUIDE_CLIENT_EVENT_NAMES,
} from '@/lib/ai/publicGuideContract';
import { schedulePublicGuideEvent } from '@/lib/ai/publicGuideTelemetry';
import { getFirstPartySiteFromHost } from '@/lib/sites/tenantRouting';
import {
  attachVisitorSessionCookie,
  getOrCreateVisitorSession,
} from '@/lib/intelligence/visitorSession';

export const dynamic = 'force-dynamic';

const eventSchema = z.object({
  actionId: z.enum(PUBLIC_GUIDE_ACTION_IDS).optional(),
  event: z.enum(PUBLIC_GUIDE_CLIENT_EVENT_NAMES),
  hasAgentContext: z.boolean().optional(),
  hasListingContext: z.boolean().optional(),
  sessionId: z.string().trim().min(8).max(160),
}).strict();

export async function POST(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (getFirstPartySiteFromHost(host) !== 'jamie') {
    return notFoundResponse('Jamie Public Guide Event');
  }
  const session = getOrCreateVisitorSession(request);

  const limitResponse = await applyPublicApiRateLimit(request, 'jamie-public-event', 30);
  if (limitResponse) return attachVisitorSessionCookie(request, limitResponse, session);

  let rawBody: unknown;
  try {
    const body = await request.text();
    if (body.length > 8_000) return attachVisitorSessionCookie(request, errorResponse('The request body is too large.', 413), session);
    rawBody = JSON.parse(body);
  } catch {
    return attachVisitorSessionCookie(request, errorResponse('A valid JSON request body is required.', 400), session);
  }

  const validation = eventSchema.safeParse(rawBody);
  if (!validation.success) {
    return attachVisitorSessionCookie(request, validationErrorResponse(validation.error.flatten()), session);
  }

  schedulePublicGuideEvent({
    ...validation.data,
    event: validation.data.event!,
    sessionId: session.id,
  });
  return attachVisitorSessionCookie(request, new Response(null, { status: 204 }), session);
}
