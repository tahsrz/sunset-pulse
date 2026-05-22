import { getSessionUser } from '@/lib/core/getSessionUser';

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
        'Cache-Control': 'no-store, max-age=0'
      }
    }
  );
}
