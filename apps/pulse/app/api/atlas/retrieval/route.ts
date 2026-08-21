import { NextRequest } from 'next/server';
import { z } from 'zod';
import { retrieveKnowledge } from '@/lib/ai/knowledgeRetrieval';
import { evaluateRetrievalFixture, listRetrievalEvaluationFixtures } from '@/lib/ai/retrievalEvaluation';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const requestSchema = z.object({
  query: z.string().trim().min(2).max(500).optional(),
  fixtureId: z.string().trim().min(1).max(100).optional(),
}).strict().refine((value) => Boolean(value.query || value.fixtureId), 'A query or fixture is required.');

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  return successResponse({ fixtures: listRetrievalEvaluationFixtures() });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return errorResponse('Invalid retrieval inspection request.', 400, parsed.error.flatten());
    const fixture = parsed.data.fixtureId
      ? listRetrievalEvaluationFixtures().find((item) => item.id === parsed.data.fixtureId)
      : undefined;
    if (parsed.data.fixtureId && !fixture) return errorResponse('Unknown retrieval fixture.', 404);
    const query = parsed.data.query || fixture!.question;
    const context = await retrieveKnowledge(query);
    return successResponse({
      query,
      trace: context.trace,
      evidence: context.evidence,
      crawlerStatus: context.crawlerStatus,
      fallbackRequired: context.evidence.length === 0,
      evaluation: fixture ? evaluateRetrievalFixture(fixture, context) : null,
    });
  } catch (error) {
    return errorResponse('Retrieval inspection failed.', 500, error instanceof Error ? error.message : null);
  }
}
