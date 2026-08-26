import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAuthResponse, requireOperatorRouteAccess } from '@/lib/core/routeAuth';
import { loadAgentNotifications, mutateAgentNotifications, resolveOperatorAgentId } from '@/lib/intelligence/agentNotificationStore';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  before: z.string().datetime().optional(),
  agentId: z.string().trim().min(2).max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict();

const mutationSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark_all_read'), agentId: z.string().trim().min(2).max(80).optional() }).strict(),
  z.object({ action: z.enum(['mark_read', 'archive']), notificationId: z.string().uuid(), agentId: z.string().trim().min(2).max(80).optional() }).strict(),
]);

export async function GET(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid inbox query.' }, { status: 400 });

  try {
    const agentId = await resolveOperatorAgentId(access, parsed.data.agentId);
    return NextResponse.json({ ok: true, ...(await loadAgentNotifications({ agentId, ...parsed.data })) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Inbox unavailable.' }, { status: 503 });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await requireOperatorRouteAccess(request);
  if (isAuthResponse(access)) return access;
  const parsed = mutationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid inbox action.' }, { status: 400 });

  try {
    const agentId = await resolveOperatorAgentId(access, parsed.data.agentId);
    await mutateAgentNotifications({ agentId, ...parsed.data });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : 'Inbox update failed.' }, { status: 503 });
  }
}
