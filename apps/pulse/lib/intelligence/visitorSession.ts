import 'server-only';

import { createHash, randomUUID } from 'node:crypto';

export const VISITOR_SESSION_COOKIE = 'sunset_visitor_session';
const VISITOR_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type VisitorSession = {
  actorId: string;
  id: string;
  isNew: boolean;
};

export function getOrCreateVisitorSession(request: Request): VisitorSession {
  const existing = readCookie(request.headers.get('cookie'), VISITOR_SESSION_COOKIE);
  const id = existing && SESSION_ID_PATTERN.test(existing) ? existing : randomUUID();
  return {
    actorId: `public:${hashVisitorSessionId(id)}`,
    id,
    isNew: id !== existing,
  };
}

export function attachVisitorSessionCookie(
  request: Request,
  response: Response,
  session: VisitorSession,
) {
  if (!session.isNew) return response;
  const host = (request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).hostname)
    .split(':')[0]
    .toLowerCase();
  const secure = isSecureRequest(request);
  const domain = host === 'sunsetpulse.app' || host.endsWith('.sunsetpulse.app')
    ? '; Domain=.sunsetpulse.app'
    : '';
  response.headers.append(
    'Set-Cookie',
    `${VISITOR_SESSION_COOKIE}=${session.id}; Path=/; Max-Age=${VISITOR_SESSION_MAX_AGE_SECONDS}; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}${domain}`,
  );
  return response;
}

export function hashVisitorSessionId(sessionId: string) {
  return createHash('sha256').update(sessionId).digest('hex').slice(0, 20);
}

function readCookie(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  for (const cookie of cookieHeader.split(';')) {
    const separator = cookie.indexOf('=');
    if (separator < 0) continue;
    const key = cookie.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(cookie.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function isSecureRequest(request: Request) {
  const forwardedProtocol = request.headers.get('x-forwarded-proto');
  if (forwardedProtocol) return forwardedProtocol.split(',')[0]?.trim() === 'https';
  return new URL(request.url).protocol === 'https:';
}
