import { getSessionUser } from '@/lib/core/getSessionUser';
import { cookies } from 'next/headers';
import {
  MOCK_SESSION_COOKIE,
  clearMockSession,
  mockSessionsEnabled
} from '@/lib/core/mockSessionStore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const sessionUser = await getSessionUser();

  return Response.json(
    {
      authenticated: Boolean(sessionUser?.userId),
      user: sessionUser?.user
        ? {
            id: sessionUser.userId,
            email: sessionUser.user.email,
            image: sessionUser.user.image,
            name: sessionUser.user.name,
            role: sessionUser.role
          }
        : null
    },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Vary': 'Cookie'
      }
    }
  );
}

export async function DELETE() {
  if (mockSessionsEnabled()) {
    const cookieStore = await cookies();
    const token = cookieStore.get(MOCK_SESSION_COOKIE)?.value;
    clearMockSession(token);
    cookieStore.set(MOCK_SESSION_COOKIE, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 0
    });
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'Vary': 'Cookie'
      }
    }
  );
}
