import { NextRequest } from 'next/server';
import { occurrenceActionSchema } from '@/lib/realtor-workspace/contracts';
import { requirePersonalRealtorWorkspace } from '@/lib/realtor-workspace/access.server';
import { applyOccurrenceAction, recordExpense } from '@/lib/realtor-workspace/store.server';
import { realtorApi, readRealtorBody } from '@/lib/realtor-workspace/http.server';
import { RealtorWorkspaceError } from '@/lib/realtor-workspace/access.server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Context = { params: Promise<{ occurrenceId: string }> };
export async function PATCH(request: NextRequest, context: Context) {
  return realtorApi(request, async (actorId) => {
    const { occurrenceId } = await context.params;
    const input = occurrenceActionSchema.parse(await readRealtorBody(request));
    const { workspaceId } = await requirePersonalRealtorWorkspace(actorId);
    if (input.action === 'record_payment') {
      return recordExpense(actorId, workspaceId, {
        amountCents: input.paidAmountCents, paidDate: input.paidDate, category: 'broker_dues',
        payee: '', note: '', occurrenceId, requestKey: input.requestKey,
        expectedOccurrenceRevision: input.expectedRevision,
      });
    }
    if (input.action === 'complete' && input.completionDetails && Object.keys(input.completionDetails).some((key) => key !== 'weeklyReview')) {
      throw new RealtorWorkspaceError('INVALID');
    }
    return applyOccurrenceAction(actorId, workspaceId, occurrenceId, input);
  }, true);
}
