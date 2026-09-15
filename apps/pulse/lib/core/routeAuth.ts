import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess, getVibeCmsAccess, type OperatorAccess } from '@/lib/core/operator_access';
import { createClient } from '@/utils/supabase/server';

export type AuthorizedOperator = OperatorAccess & { allowed: true };
export type AuthorizedUser = { allowed: true; user: { id: string; email?: string }; mode: 'user' };

export async function requireSignedInUser(request: NextRequest): Promise<AuthorizedUser | Response> {
  void request;
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return errorResponse('Sign-in is required.', 401);
  return { allowed: true, user: { id: user.id, email: user.email }, mode: 'user' };
}

export async function requireOperatorRouteAccess(request: NextRequest): Promise<AuthorizedOperator | Response> {
  const access = isVibeCmsRoute(request)
    ? await getVibeCmsAccess(getRequestHost(request))
    : await getOperatorAccess(getRequestHost(request));

  if (!access.allowed) {
    return errorResponse(access.reason, 403);
  }

  return access as AuthorizedOperator;
}

function isVibeCmsRoute(request: NextRequest) {
  const pathname = request.nextUrl?.pathname || new URL(request.url).pathname;
  return pathname === '/api/vibes' || pathname.startsWith('/api/vibes/');
}

function getRequestHost(request: NextRequest): string | null {
  const headerHost = getRequestHostFromHeaders(request.headers);
  if (headerHost) return headerHost;

  if (request.nextUrl?.host) return request.nextUrl.host;

  try {
    return new URL(request.url).host;
  } catch {
    return null;
  }
}

export function getRequestHostFromHeaders(requestHeaders: Pick<Headers, 'get'>): string | null {
  return requestHeaders.get('host');
}

export function isAuthResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export function operatorAuditUser(access: AuthorizedOperator) {
  return {
    userId: access.user?.id || access.mode,
    name: access.user?.name || access.reason,
    email: access.user?.email || null,
    role: access.user?.role || access.mode,
  };
}
