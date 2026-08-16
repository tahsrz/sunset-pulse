import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getWikipediaProcessSnapshot } from '@/lib/core/wikipedia_process_monitor';
import { issueWikipediaCrawlerControl, readWikipediaHeartbeat } from '@/lib/core/wikipedia_heartbeat';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const [snapshot, heartbeat] = await Promise.all([
    Promise.resolve(getWikipediaProcessSnapshot()),
    readWikipediaHeartbeat(),
  ]);

  return successResponse({
    endpoint: '/api/atlas/processes',
    snapshot: { ...snapshot, remoteHeartbeat: heartbeat },
  });
}

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  try {
    const body = await request.json();
    if (body?.action !== 'resume') return errorResponse('Unsupported crawler action.', 400);
    return successResponse(await issueWikipediaCrawlerControl('resume'));
  } catch (error) {
    return errorResponse('Unable to issue crawler control.', 500, error instanceof Error ? error.message : null);
  }
}
