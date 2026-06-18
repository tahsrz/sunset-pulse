import { isIP } from 'node:net';
import { getSessionUser } from '@/lib/core/getSessionUser';

export type OperatorAccess = {
  allowed: boolean;
  mode: 'local' | 'authenticated' | 'denied';
  reason: string;
  user: {
    id: string;
    email: string | null;
    role: string;
    name: string | null;
  } | null;
};

export async function getOperatorAccess(host: string | null): Promise<OperatorAccess> {
  const local = isLocalHost(host);

  if (local) {
    return {
      allowed: true,
      mode: 'local',
      reason: 'Local operator access.',
      user: null
    };
  }

  const session = await getSessionUser();
  const email = session?.user?.email || null;
  const role = session?.role || session?.user?.role || 'anonymous';
  const operatorEmail = process.env.OPERATOR_EMAIL || process.env.AUTHORIZED_EMAIL;
  const roleAllowed = role === 'admin' || role === 'operator' || role === 'realtor';
  const emailAllowed = Boolean(operatorEmail && email && email.toLowerCase() === operatorEmail.toLowerCase());

  if (roleAllowed || emailAllowed) {
    return {
      allowed: true,
      mode: 'authenticated',
      reason: roleAllowed ? `Authenticated ${role} operator.` : 'Authenticated operator email.',
      user: {
        id: session!.userId,
        email,
        role,
        name: session!.user.name || null
      }
    };
  }

  return {
    allowed: false,
    mode: 'denied',
    reason: 'Operator console requires local access or an authorized account.',
    user: session?.user
      ? {
          id: session.userId,
          email,
          role,
          name: session.user.name || null
        }
      : null
  };
}

export function isLocalHost(host: string | null) {
  if (!host) return false;

  if (process.env.NODE_ENV === 'production') {
    return false;
  }

  const hostname = normalizeHostName(host);

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  return isPrivateDevelopmentHost(hostname);
}

function normalizeHostName(host: string) {
  const trimmed = host.trim().toLowerCase();

  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']');
    return end >= 0 ? trimmed.slice(1, end) : trimmed;
  }

  if (isIP(trimmed)) {
    return trimmed;
  }

  try {
    return new URL(`http://${trimmed}`).hostname.toLowerCase();
  } catch {
    // Fall back to host:port handling for malformed values.
  }

  return trimmed.split(':')[0];
}

function isPrivateDevelopmentHost(hostname: string) {
  if (hostname === '0.0.0.0' || hostname.endsWith('.local')) {
    return true;
  }

  const ipVersion = isIP(hostname);

  if (ipVersion === 6) {
    return isPrivateDevelopmentIpv6(hostname);
  }

  if (ipVersion !== 4) {
    return false;
  }

  const parts = hostname.split('.').map((part) => Number(part));
  const [first, second] = parts;
  return first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 169 && second === 254);
}

function isPrivateDevelopmentIpv6(hostname: string) {
  const firstHextet = Number.parseInt(hostname.split(':')[0], 16);

  if (!Number.isFinite(firstHextet)) {
    return false;
  }

  return (firstHextet & 0xfe00) === 0xfc00 || (firstHextet & 0xffc0) === 0xfe80;
}
