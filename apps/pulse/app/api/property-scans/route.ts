import { NextRequest } from 'next/server';
import { isAuthResponse, requireSignedInUser } from '@/lib/core/routeAuth';
import { errorResponse, successResponse } from '@/lib/core/apiResponse';
import { propertyScanRequestSchema } from '@/lib/scans/propertyScanContract';
import { createPropertyScanSession, listPropertyScanSessions } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;
  const sessions = await listPropertyScanSessions(access.user.id);
  return successResponse({ endpoint: '/api/property-scans', sessions });
}

export async function POST(request: NextRequest) {
  const access = await requireSignedInUser(request);
  if (isAuthResponse(access)) return access;

  try {
    const body = await request.json();
    const parsed = propertyScanRequestSchema.safeParse(body);
    if (!parsed.success) return errorResponse('A property address and both capture consent acknowledgements are required.', 400, parsed.error.flatten());

    const session = await createPropertyScanSession(parsed.data, access.user.id);
    return successResponse({
      endpoint: '/api/property-scans',
      session,
      next: 'Upload room photos or video to the private capture session, then wait for agent review before publishing.',
    }, {}, 201);
  } catch {
    return errorResponse('Unable to create the private property scan session.', 500);
  }
}

