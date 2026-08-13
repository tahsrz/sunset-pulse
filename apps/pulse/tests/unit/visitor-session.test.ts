import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  attachVisitorSessionCookie,
  getOrCreateVisitorSession,
  VISITOR_SESSION_COOKIE,
} from '@/lib/intelligence/visitorSession';

describe('global visitor session', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('reuses a valid server-issued session cookie', () => {
    const id = '7be9d5ee-ab89-4ec9-9f85-4436ce2ca659';
    const request = new Request('https://jamie.sunsetpulse.app/api/jamie/guide', {
      headers: { cookie: `${VISITOR_SESSION_COOKIE}=${id}` },
    });

    const session = getOrCreateVisitorSession(request);

    expect(session.id).toBe(id);
    expect(session.isNew).toBe(false);
    expect(session.actorId).toMatch(/^public:[0-9a-f]{20}$/);
  });

  it('sets one secure HTTP-only cookie shared across Sunset Pulse subdomains', () => {
    const request = new Request('https://jamie.sunsetpulse.app/api/jamie/guide');
    const session = getOrCreateVisitorSession(request);
    const response = attachVisitorSessionCookie(request, new Response(null, { status: 204 }), session);
    const cookie = response.headers.get('set-cookie') || '';

    expect(session.isNew).toBe(true);
    expect(cookie).toContain(`${VISITOR_SESSION_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Domain=.sunsetpulse.app');
  });
});
