import { NextRequest } from 'next/server';
import { realtorPreferencesSchema } from '@/lib/realtor-workspace/contracts';
import { getPreferences, setupPersonalRealtorWorkspace } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export function GET(request: NextRequest) {
  return realtorApi(request, getPreferences);
}

export async function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const input = realtorPreferencesSchema.parse(await readRealtorBody(request));
    return setupPersonalRealtorWorkspace(actorId, input);
  }, true);
}
