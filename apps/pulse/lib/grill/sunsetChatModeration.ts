import { NextRequest } from 'next/server';
import { errorResponse } from '@/lib/core/apiResponse';
import { getOperatorAccess, isLocalHost, type OperatorAccess } from '@/lib/core/operator_access';

export type SunsetChatModeratorAccess = OperatorAccess & {
  moderatorEmail: string | null;
};

export function getApprovedSunsetChatModeratorEmails() {
  return parseEmailList([
    process.env.SUNSET_CHAT_MODERATOR_EMAILS,
    process.env.SUNSET_CHAT_OWNER_EMAIL,
    process.env.OPERATOR_EMAIL,
    process.env.AUTHORIZED_EMAIL,
  ].filter(Boolean).join(','));
}

export async function getSunsetChatModeratorAccess(request: NextRequest): Promise<SunsetChatModeratorAccess> {
  const host = request.headers.get('host');
  const operatorAccess = await getOperatorAccess(host);
  const email = operatorAccess.user?.email?.toLowerCase() || null;
  const approvedEmails = getApprovedSunsetChatModeratorEmails();
  const approvedByEmail = Boolean(email && approvedEmails.includes(email));
  const approvedByRole = operatorAccess.user?.role === 'admin' || operatorAccess.user?.role === 'operator';

  if (approvedByEmail || approvedByRole) {
    return {
      ...operatorAccess,
      allowed: true,
      mode: 'authenticated',
      reason: approvedByEmail ? 'Approved Sunset Chat moderator email.' : 'Approved operator role.',
      moderatorEmail: email,
    };
  }

  if (isLocalHost(host) && operatorAccess.allowed) {
    return {
      ...operatorAccess,
      allowed: true,
      mode: 'local',
      reason: 'Local Sunset Chat moderation access.',
      moderatorEmail: email,
    };
  }

  return {
    ...operatorAccess,
    allowed: false,
    mode: 'denied',
    reason: 'Sunset Chat moderation requires an approved staff email.',
    moderatorEmail: email,
  };
}

export async function requireSunsetChatModeratorAccess(request: NextRequest): Promise<SunsetChatModeratorAccess | Response> {
  const access = await getSunsetChatModeratorAccess(request);
  if (access.allowed) return access;
  return errorResponse('Sunset Chat moderation requires an approved staff email.', 401);
}

function parseEmailList(value: string) {
  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.includes('@'));
}
