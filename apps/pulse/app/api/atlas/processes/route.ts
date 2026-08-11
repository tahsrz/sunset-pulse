import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { getWikipediaProcessSnapshot } from '@/lib/core/wikipedia_process_monitor';
import { readWikipediaHeartbeat } from '@/lib/core/wikipedia_heartbeat';

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
