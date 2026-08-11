import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isCrawlerHeartbeatValid, saveWikipediaHeartbeat } from '@/lib/core/wikipedia_heartbeat';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  if (!isCrawlerHeartbeatValid(request.headers.get('x-crawler-token'))) {
    return errorResponse('Invalid crawler heartbeat token.', 401);
  }

  try {
    const body = await request.json();
    const crawlerId = String(body?.crawlerId || '').trim().slice(0, 80);
    const status = String(body?.status || 'unknown').trim().slice(0, 40);
    if (!crawlerId || !status || !body?.state || typeof body.state !== 'object') {
      return errorResponse('Invalid crawler heartbeat payload.', 400);
    }

    await saveWikipediaHeartbeat({
      crawlerId,
      status,
      payload: {
        batchId: body.batchId || null,
        articleCount: Number(body.articleCount || 0),
        failureCount: Number(body.failureCount || 0),
        state: body.state,
      },
    });

    return successResponse({ ok: true, crawlerId });
  } catch (error: any) {
    return errorResponse('Failed to persist crawler heartbeat.', 500, error.message);
  }
}
