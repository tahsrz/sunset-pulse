import 'server-only';

import { z } from 'zod';
import { buyerJourneySchema } from '@/lib/marketing/buyerJourneyContract';
import { supabaseAdmin } from '@/lib/supabase';
import { RealtorWorkspaceError, throwRealtorRpcError } from './access.server';

const buyerRequestSummary = z.object({
  id: z.string().guid(), site: z.string().min(1).max(63), createdAt: z.string().datetime({ offset: true }),
  name: z.string().min(2).max(120), email: z.string().email().max(180), journey: buyerJourneySchema,
  requestedContactAt: z.string().datetime({ offset: true }), marketingOptIn: z.boolean(),
}).strict();

export async function readOwnedBuyerRequests(actorId: string, requestId?: string) {
  const { data, error } = await supabaseAdmin.rpc('list_owned_guided_buyer_requests', {
    p_actor_id: actorId, p_request_id: requestId ?? null,
  });
  if (error) throwRealtorRpcError(error.code);
  const result = z.array(buyerRequestSummary).max(50).safeParse(data);
  if (!result.success) throw new RealtorWorkspaceError('FAILED');
  if (requestId && (result.data.length !== 1 || result.data[0].id.toLowerCase() !== requestId.toLowerCase())) {
    throw new RealtorWorkspaceError('NOT_FOUND');
  }
  return result.data;
}
