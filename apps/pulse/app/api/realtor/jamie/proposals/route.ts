import { NextRequest } from 'next/server';
import { z } from 'zod';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import {
  prepareFinancialProposal,
  prepareGoalProposal,
  preparePlannerProposal,
} from '@/lib/realtor-workspace/jamieProposals.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const proposalRequestSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('planner'), input: z.unknown() }).strict(),
  z.object({ kind: z.literal('financial'), input: z.unknown() }).strict(),
  z.object({ kind: z.literal('goal'), input: z.unknown() }).strict(),
]);

export async function POST(request: NextRequest) {
  return realtorApi(request, async (actorId) => {
    const requestBody = proposalRequestSchema.parse(await readRealtorBody(request));
    if (requestBody.kind === 'planner') return preparePlannerProposal(actorId, requestBody.input);
    if (requestBody.kind === 'financial') return prepareFinancialProposal(actorId, requestBody.input);
    return prepareGoalProposal(actorId, requestBody.input);
  }, true);
}
