import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { listVibeTaxonomyTerms } from '@/lib/cms/taxonomy';

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  return NextResponse.json({ terms: listVibeTaxonomyTerms() });
}
