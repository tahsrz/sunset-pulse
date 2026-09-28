import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listGoals, listTodayOccurrences, readBusinessSummary } from '@/lib/realtor-workspace/store.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(actorId);
    const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: preferences.time_zone, year: 'numeric' }).format(new Date()));
    const [agenda, summary, goals] = await Promise.allSettled([
      listTodayOccurrences(actorId, workspaceId, preferences.time_zone),
      readBusinessSummary(actorId, workspaceId, year),
      listGoals(actorId, workspaceId, year),
    ]);
    return {
      year,
      timeZone: preferences.time_zone,
      preferences,
      agenda: agenda.status === 'fulfilled' ? { status: 'available', value: agenda.value } : { status: 'unavailable' },
      business: summary.status === 'fulfilled' ? { status: 'available', value: summary.value } : { status: 'unavailable' },
      goals: goals.status === 'fulfilled' ? { status: 'available', value: goals.value } : { status: 'unavailable' },
      links: { shortlist: '/property-shortlist', sprints: '/sprints', workspaces: '/workspaces' },
    };
  });
}
