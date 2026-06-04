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
  const session = await getSessionUser();
  const email = session?.user?.email || null;
  const role = session?.role || session?.user?.role || 'anonymous';
  const operatorEmail = process.env.OPERATOR_EMAIL || process.env.AUTHORIZED_EMAIL || process.env.NEXT_PUBLIC_OPERATOR_EMAIL;
  const roleAllowed = role === 'admin' || role === 'operator' || role === 'realtor';
  const emailAllowed = Boolean(operatorEmail && email && email.toLowerCase() === operatorEmail.toLowerCase());

  if (local) {
    return {
      allowed: true,
      mode: 'local',
      reason: 'Local operator access.',
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
  const hostname = host.split(':')[0].toLowerCase();
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1';
}
