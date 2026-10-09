import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { listGoals, listTodayOccurrences, readBusinessSummary, readSellerDailySummary } from '@/lib/realtor-workspace/store.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const { workspaceId, preferences } = await requirePersonalRealtorWorkspace(actorId);
    const year = Number(new Intl.DateTimeFormat('en-US', { timeZone: preferences.time_zone, year: 'numeric' }).format(new Date()));
    const [agenda, summary, goals, seller] = await Promise.allSettled([
      listTodayOccurrences(actorId, workspaceId, preferences.time_zone),
      readBusinessSummary(actorId, workspaceId, year),
      listGoals(actorId, workspaceId, year),
      readSellerDailySummary(actorId, workspaceId, preferences.time_zone),
    ]);
    return {
      year,
      timeZone: preferences.time_zone,
      preferences,
      agenda: agenda.status === 'fulfilled' ? { status: 'available', value: agenda.value } : { status: 'unavailable' },
      business: summary.status === 'fulfilled' ? { status: 'available', value: summary.value } : { status: 'unavailable' },
      goals: goals.status === 'fulfilled' ? { status: 'available', value: goals.value } : { status: 'unavailable' },
      seller: seller.status === 'fulfilled'
        ? { status: (seller.value as { status?: string })?.status === 'not_configured' ? 'not_configured' : 'available', value: seller.value }
        : { status: 'unavailable' },
      links: { shortlist: '/property-shortlist', sprints: '/sprints', workspaces: '/workspaces' },
    };
  });
}
