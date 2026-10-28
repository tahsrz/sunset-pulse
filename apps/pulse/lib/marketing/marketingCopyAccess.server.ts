import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';

export async function requireMarketingCopyAccess(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) {
    access.headers.set('Cache-Control', 'private, no-store');
    return access;
  }
  const operatorEmail = (process.env.OPERATOR_EMAIL || process.env.AUTHORIZED_EMAIL || '').trim().toLowerCase();
  const emailAllowed = Boolean(operatorEmail && access.user?.email?.trim().toLowerCase() === operatorEmail);
  if (access.mode === 'local' || access.user?.role === 'admin' || access.user?.role === 'operator' || emailAllowed) return access;
  return NextResponse.json({ error: 'Site administrator access is required.' }, {
    status: 403, headers: { 'Cache-Control': 'private, no-store' },
  });
}
