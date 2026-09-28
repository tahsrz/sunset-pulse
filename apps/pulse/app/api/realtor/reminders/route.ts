import { NextRequest } from 'next/server';
import { z } from 'zod';
import { reminderActionSchema } from '@/lib/realtor-workspace/contracts';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listVisibleReminders, updateReminder } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const limit = z.coerce.number().int().min(1).max(20).default(5).parse(request.nextUrl.searchParams.get('limit') || undefined);
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return listVisibleReminders(actorId, workspaceId, limit);
  });
}

export async function PATCH(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const body = await readRealtorBody(request);
    const reminderId = z.string().uuid().parse((body as { reminderId?: unknown })?.reminderId);
    const { reminderId: _reminderId, ...action } = body as Record<string, unknown>;
    const input = reminderActionSchema.parse(action);
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    return updateReminder(actorId, workspaceId, reminderId, input);
  }, true);
}
