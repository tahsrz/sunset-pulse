import { NextRequest } from 'next/server';
import { isAuthResponse, operatorAuditUser, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { successResponse } from '@/lib/core/apiResponse';
import { listAllPropertyScanSessions } from '@/lib/scans/propertyScanStore';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const sessions = await listAllPropertyScanSessions();
  return successResponse({ endpoint: '/api/admin/property-scans', reviewer: operatorAuditUser(access), sessions });
}

