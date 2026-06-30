import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { importHotsheetText } from '@/lib/data/hotsheetMls';
import { mlsService } from '@/lib/data/mls';
import { acquireMlsSyncLease, releaseMlsSyncLease } from '@/lib/data/mlsSyncLease';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_REQUEST_BYTES = 600_000;
const MAX_HOTSHEET_CHARACTERS = 500_000;
const syncParamsSchema = z.object({
  city: z.string().trim().min(1).max(100).optional(),
  state: z.string().trim().regex(/^[A-Z]{2}$/i).transform((value) => value.toUpperCase()).optional(),
  status: z.enum(['Active', 'Unavailable', 'Pending', 'Closed', 'Sold']).optional(),
  page: z.coerce.number().int().min(1).max(10).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  '$limit': z.coerce.number().int().min(1).max(100).optional(),
  '$skip': z.coerce.number().int().min(0).max(500).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const leaseOwner = crypto.randomUUID();
  let leaseAcquired = false;
  try {
    const activeRun = mlsService.getSyncSnapshot().recentRuns.find((run) => (
      run.status === 'running' && Date.now() - Date.parse(run.updatedAt) < 30 * 60 * 1_000
    ));
    if (activeRun) {
      return errorResponse('An MLS synchronization is already running.', 409, { runId: activeRun.id });
    }

    leaseAcquired = await acquireMlsSyncLease(leaseOwner);
    if (!leaseAcquired) return errorResponse('An MLS synchronization is already running.', 409);

    const body = await readJsonBody(request, MAX_REQUEST_BYTES);
    if (body?.source === 'hotsheet') {
      const text = String(body?.text || '').trim();
      if (!text) {
        return errorResponse('Hotsheet text is required.', 400);
      }
      if (text.length > MAX_HOTSHEET_CHARACTERS) {
        return errorResponse('Hotsheet text exceeds the 500,000-character limit.', 413);
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

    const parsedParams = syncParamsSchema.safeParse(body?.params || {});
    if (!parsedParams.success) {
      return errorResponse('Invalid MLS synchronization parameters.', 400, parsedParams.error.flatten());
    }
    const params = parsedParams.data;
    const run = await mlsService.syncListings(params);

    return successResponse({
      endpoint: '/api/admin/mls/sync',
      provider: mlsService.getActiveProviderName(),
      run,
    }, {}, run.status === 'failed' ? 207 : 200);
  } catch (error: any) {
    const status = error instanceof RequestBodyError ? error.status : 500;
    return errorResponse(status === 500 ? 'Failed to run MLS sync.' : error.message, status, status === 500 ? error.message : null);
  } finally {
    if (leaseAcquired) await releaseMlsSyncLease(leaseOwner);
  }
}

class RequestBodyError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function readJsonBody(request: NextRequest, maxBytes: number) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > maxBytes) throw new RequestBodyError('Request body is too large.', 413);
  if (!request.body) return {};

  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      throw new RequestBodyError('Request body is too large.', 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new RequestBodyError('Request body must be valid JSON.', 400);
  }
}
