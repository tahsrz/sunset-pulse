import { z } from 'zod';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import {
  PUBLIC_GUIDE_ACTION_IDS,
  PUBLIC_GUIDE_CLIENT_EVENT_NAMES,
} from '@/lib/ai/publicGuideContract';
import { schedulePublicGuideEvent } from '@/lib/ai/publicGuideTelemetry';
import { getFirstPartySiteFromHost } from '@/lib/sites/tenantRouting';

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
    return notFoundResponse('Jamie public guide event');
  }

  const limitResponse = await applyPublicApiRateLimit(request, 'jamie-public-event', 30);
  if (limitResponse) return limitResponse;

  let rawBody: unknown;
  try {
    const body = await request.text();
    if (body.length > 8_000) return errorResponse('The request body is too large.', 413);
    rawBody = JSON.parse(body);
  } catch {
    return errorResponse('A valid JSON request body is required.', 400);
  }

  const validation = eventSchema.safeParse(rawBody);
  if (!validation.success) return validationErrorResponse(validation.error.flatten());

  schedulePublicGuideEvent({ ...validation.data, event: validation.data.event! });
  return new Response(null, { status: 204 });
}
