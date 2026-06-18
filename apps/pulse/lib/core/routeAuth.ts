import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess, type OperatorAccess } from '@/lib/core/operator_access';

export type AuthorizedOperator = OperatorAccess & { allowed: true };

export async function requireOperatorRouteAccess(request: NextRequest): Promise<AuthorizedOperator | Response> {
  const access = await getOperatorAccess(getRequestHost(request));

  if (!access.allowed) {
    return errorResponse(access.reason, 403);
  }

  return access as AuthorizedOperator;
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

export function isAuthResponse(value: AuthorizedOperator | Response): value is Response {
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
