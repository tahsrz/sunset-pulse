import { NextRequest } from 'next/server';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { canReadScan, scanActorFromOperatorAccess } from '@/lib/scans/scanAccess.server';
import { readPropertyScanSessionForActor } from '@/lib/scans/propertyScanStore';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PREVIEW_TTL_SECONDS = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string; assetId: string }> },
) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;

  const { scanId, assetId } = await params;
  const actor = scanActorFromOperatorAccess(access);
  const session = await readPropertyScanSessionForActor(scanId, actor);
  if (!session || !canReadScan(session, actor)) return errorResponse('Private scan asset not found.', 404);

  const asset = session.assets.find((candidate) => candidate.assetId === assetId);
  if (!asset) return errorResponse('Private scan asset not found.', 404);
  if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true' || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse('Private media preview is not configured in this environment.', 503, { code: 'PRIVATE_MEDIA_PREVIEW_UNAVAILABLE' });
  }

  const { data, error } = await supabaseAdmin.storage.from('property-scans').createSignedUrl(asset.path, PREVIEW_TTL_SECONDS);
  if (error || !data?.signedUrl) return errorResponse('Unable to create a private media preview.', 502);

  const response = successResponse({ assetId: asset.assetId, mimeType: asset.mimeType, url: data.signedUrl, expiresIn: PREVIEW_TTL_SECONDS });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
