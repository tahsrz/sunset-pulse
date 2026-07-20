import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from 'ai';
import { applyPublicApiRateLimit } from '@/lib/core/publicApiRateLimit';
import { errorResponse, notFoundResponse, validationErrorResponse } from '@/lib/core/apiResponse';
import { publicGuideRequestSchema, type PublicGuideUIMessage } from '@/lib/ai/publicGuideContract';
import { runPublicJamieGuide } from '@/lib/ai/publicGuide';
import { resolvePublicGuideContext } from '@/lib/ai/publicGuideContext';
import {
  classifyPublicGuideIntent,
  schedulePublicGuideEvent,
} from '@/lib/ai/publicGuideTelemetry';
import { getFirstPartySiteFromHost } from '@/lib/sites/tenantRouting';
import { getPublicRootOrigin } from '@/lib/sites/siteUrls';

export const dynamic = 'force-dynamic';
export const maxDuration = 45;

export async function POST(request: Request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  if (getFirstPartySiteFromHost(host) !== 'jamie') {
    return notFoundResponse('Jamie public guide');
  }

  const limitResponse = await applyPublicApiRateLimit(request, 'jamie-public-guide', 10);
  if (limitResponse) return limitResponse;

  let rawBody: unknown;
  try {
    const body = await request.text();
    if (body.length > 64_000) {
      return errorResponse('The request body is too large.', 413);
    }
    rawBody = JSON.parse(body);
  } catch {
    return errorResponse('A valid JSON request body is required.', 400);
  }

  const validation = publicGuideRequestSchema.safeParse(rawBody);
  if (!validation.success) {
    return validationErrorResponse(validation.error.flatten());
  }
  const userMessage = validation.data.messages
    .slice()
    .reverse()
    .find((message) => message.role === 'user')
    ?.parts.filter((part) => part.type === 'text').map((part) => part.text || '').join('\n') || '';
  const intentCategory = classifyPublicGuideIntent(userMessage);

  const stream = createUIMessageStream<PublicGuideUIMessage>({
    execute: async ({ writer }) => {
      const startedAt = Date.now();
      let resolvedContext = null;
      try {
        const protocol = request.headers.get('x-forwarded-proto') || new URL(request.url).protocol;
        const rootOrigin = getPublicRootOrigin({ requestHost: host, protocol });
        resolvedContext = await resolvePublicGuideContext(validation.data.context, {
          requestHost: host,
          protocol,
          rootOrigin,
        });
        const eventContext = {
          sessionId: validation.data.analyticsSessionId,
          hasAgentContext: Boolean(resolvedContext?.agent),
          hasListingContext: Boolean(resolvedContext?.listing),
          intentCategory,
        };
        schedulePublicGuideEvent({ event: 'question_asked', ...eventContext });
        const result = await runPublicJamieGuide(validation.data, { context: resolvedContext, rootOrigin });
        const textId = `jamie-guide-${crypto.randomUUID()}`;

        writer.write({ type: 'text-start', id: textId });
        writer.write({ type: 'text-delta', id: textId, delta: result.content });
        writer.write({ type: 'text-end', id: textId });

        if (result.usedListingData) {
          writer.write({
            type: 'data-listings',
            id: `jamie-listings-${crypto.randomUUID()}`,
            data: {
              properties: result.listings,
              disclaimer: result.content.split('\n\n').slice(-1)[0],
            },
          });
        }

        if (result.actions?.length) {
          writer.write({
            type: 'data-actions',
            id: `jamie-actions-${crypto.randomUUID()}`,
            data: { items: result.actions },
          });
        }

        writer.write({
          type: 'data-sources',
          id: `jamie-sources-${crypto.randomUUID()}`,
          data: { items: result.sources },
        });

        schedulePublicGuideEvent({
          event: 'guide_response',
          ...eventContext,
          durationMs: Date.now() - startedAt,
          outcome: result.outcome,
          usedListingData: result.usedListingData,
        });
        if (result.outcome === 'listing_search') {
          schedulePublicGuideEvent({ event: 'tool_used', ...eventContext, toolId: 'search_properties' });
        }
        if (result.actions.some((action) => action.id === 'contact_agent')) {
          schedulePublicGuideEvent({ event: 'handoff_offered', ...eventContext, actionId: 'contact_agent' });
        }
        if (result.outcome === 'listing_unverified' || result.outcome === 'safe_fallback') {
          schedulePublicGuideEvent({
            event: 'unanswered_question',
            ...eventContext,
            outcome: result.outcome,
          });
        }
      } catch (error) {
        console.error('[JAMIE_PUBLIC_GUIDE_ERROR]', error);
        const textId = `jamie-guide-error-${crypto.randomUUID()}`;
        writer.write({ type: 'text-start', id: textId });
        writer.write({
          type: 'text-delta',
          id: textId,
          delta: 'I cannot reach the public guide service right now. No listing details were returned. Please try again shortly.',
        });
        writer.write({ type: 'text-end', id: textId });
        schedulePublicGuideEvent({
          event: 'guide_error',
          sessionId: validation.data.analyticsSessionId,
          durationMs: Date.now() - startedAt,
          hasAgentContext: Boolean(resolvedContext?.agent),
          hasListingContext: Boolean(resolvedContext?.listing),
          intentCategory,
        });
      }
    },
  });

  return createUIMessageStreamResponse({
    stream,
    headers: {
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
    },
  });
}
