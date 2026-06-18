import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { importHotsheetText } from '@/lib/data/hotsheetMls';
import { mlsService } from '@/lib/data/mls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await request.json().catch(() => ({}));
    if (body?.source === 'hotsheet') {
      const text = String(body?.text || '').trim();
      if (!text) {
        return errorResponse('Hotsheet text is required.', 400);
      }

      const result = await importHotsheetText(text, {
        source: 'operator',
        label: body?.label ? String(body.label).slice(0, 120) : undefined,
      });

      return successResponse({
        endpoint: '/api/admin/mls/sync',
        provider: 'hotsheet',
        run: result.run,
        parsedCount: result.listings.length,
      }, {}, result.run.status === 'failed' ? 207 : 200);
    }

    const params = sanitizeSyncParams(body?.params || {});
    const run = await mlsService.syncListings(params);

    return successResponse({
      endpoint: '/api/admin/mls/sync',
      provider: mlsService.getActiveProviderName(),
      run,
    }, {}, run.status === 'failed' ? 207 : 200);
  } catch (error: any) {
    return errorResponse('Failed to run MLS sync.', 500, error.message);
  }
}

function sanitizeSyncParams(params: Record<string, any>) {
  const allowed = new Set([
    'city',
    'state',
    'status',
    'page',
    'pageSize',
    '$limit',
    '$skip',
    '$filter',
  ]);

  return Object.entries(params).reduce<Record<string, any>>((safe, [key, value]) => {
    if (allowed.has(key) && value !== undefined && value !== null && value !== '') {
      safe[key] = value;
    }
    return safe;
  }, {});
}
