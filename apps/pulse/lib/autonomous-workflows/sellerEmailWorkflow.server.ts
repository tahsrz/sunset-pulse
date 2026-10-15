import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { sellerEmailConfigured } from '@/lib/realtor-workspace/sellerService.server';
import type { WorkflowExecution, WorkflowJob } from './workflowRegistry.server';

const preparedSchema = z.discriminatedUnion('send', [
  z.object({ send: z.literal(false), messageId: z.string().uuid(), status: z.string() }),
  z.object({ send: z.literal(true), messageId: z.string().uuid(), to: z.string().email(), replyTo: z.string().email(), from: z.string().min(1), subject: z.string(), body: z.string() }),
]);
export async function runSellerEmail(job: WorkflowJob): Promise<WorkflowExecution> {
  if (job.trigger_kind !== 'event' || job.payload_version !== 1) throw new Error('Invalid seller email event');
  z.object({ messageId: z.string().uuid() }).strict().parse(job.payload);
  if (!sellerEmailConfigured()) return { kind: 'defer', nextPollAt: new Date(Date.now() + 300_000).toISOString(), reason: 'seller_email_configuration' };
  const { data, error } = await supabaseAdmin.rpc('seller_email_prepare', {
    p_job_id: job.id, p_lease_token: job.lease_token, p_from: process.env.RESEND_FROM_EMAIL!.trim(),
  });
  if (error) throw new Error('Unable to prepare seller email');
  const message = preparedSchema.parse(data);
  if (!message.send) return { kind: 'committed', resultId: message.messageId, resultStatus: message.status };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST', signal: AbortSignal.timeout(15_000),
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': `seller-email:${message.messageId}` },
    body: JSON.stringify({ from: message.from, to: [message.to], reply_to: message.replyTo, subject: message.subject, text: message.body }),
  });
  // Do not log provider bodies (which can contain private message content).
  if (!response.ok) throw new Error(`Seller email provider returned ${response.status}`);
  const receipt = z.object({ id: z.string().min(1).max(200) }).parse(await response.json());
  const committed = await supabaseAdmin.rpc('seller_email_accept', { p_job_id: job.id, p_lease_token: job.lease_token, p_provider_id: receipt.id });
  if (committed.error) throw new Error('Unable to persist seller email receipt');
  return { kind: 'committed', resultId: message.messageId, resultStatus: 'accepted' };
}
