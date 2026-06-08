import { NextRequest } from 'next/server';
import { getOperatorAccess, isLocalHost, type OperatorAccess } from '@/lib/core/operator_access';
import { errorResponse } from '@/lib/core/apiResponse';

export type KdsAccess = OperatorAccess & {
  deviceId: string | null;
};

export async function requireKdsAccess(request: NextRequest): Promise<KdsAccess | Response> {
  const host = request.headers.get('host');
  const operatorAccess = await getOperatorAccess(host);
  const deviceId = request.headers.get('x-kds-device-id') || null;

  if (operatorAccess.allowed) {
    return {
      ...operatorAccess,
      deviceId,
    };
  }

  const configuredPin = process.env.KDS_PIN || process.env.NEXT_PUBLIC_KDS_PIN;
  const suppliedPin = request.headers.get('x-kds-pin') || '';

  if (configuredPin && suppliedPin && suppliedPin === configuredPin) {
    return {
      allowed: true,
      mode: 'authenticated',
      reason: 'KDS PIN accepted.',
      deviceId,
      user: {
        id: deviceId || 'kds-device',
        email: null,
        role: 'kds',
        name: deviceId || 'Kitchen display',
      },
    };
  }

  if (isLocalHost(host) && suppliedPin === '7397') {
    return {
      allowed: true,
      mode: 'local',
      reason: 'Local KDS PIN accepted.',
      deviceId,
      user: {
        id: deviceId || 'local-kds-device',
        email: null,
        role: 'kds',
        name: deviceId || 'Local kitchen display',
      },
    };
  }

  return errorResponse('KDS staff access required.', 401);
}

export function getRequestAuditContext(request: NextRequest, access: KdsAccess) {
  return {
    actorId: access.user?.id || null,
    actorRole: access.user?.role || access.mode,
    actorName: access.user?.name || null,
    deviceId: access.deviceId,
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null,
    userAgent: request.headers.get('user-agent') || null,
  };
}
