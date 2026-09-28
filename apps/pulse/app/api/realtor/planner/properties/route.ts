import { NextRequest } from 'next/server';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { realtorApi } from '@/lib/realtor-workspace/http.server';
import { listShortlistEntries } from '@/lib/property-sprints/shortlist.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    await requirePersonalRealtorWorkspace(actorId);
    const entries = await listShortlistEntries(actorId);
    return {
      properties: entries.map((entry) => ({
        id: entry.id,
        label: [entry.address || entry.mlsId || 'Shortlist property', [entry.city, entry.state].filter(Boolean).join(', ')].filter(Boolean).join(' · '),
        propertyKind: entry.propertyKind,
        status: entry.status,
      })),
    };
  });
}
