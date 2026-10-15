import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { RealtorWorkspaceError, requirePersonalRealtorWorkspace, throwRealtorRpcError } from './access.server';
import { sellerCaseResultSchema, sellerPublicationSchema, sellerServiceActionSchema } from './sellerServiceContract';
import { sellerPrioritiesSchema } from './sellerOverviewContract';

export function sellerEmailConfigured() {
  return process.env.SELLER_EMAIL_SEND_ENABLED === 'true' && Boolean(process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim());
}
export async function readSellerCase(actorId: string, leadId: string) {
  z.string().uuid().parse(leadId);
  await requirePersonalRealtorWorkspace(actorId);
  const { data, error } = await supabaseAdmin.rpc('seller_case_read', { p_actor_id: actorId, p_lead_id: leadId });
  if (error) throwRealtorRpcError(error.code);
  return { ...sellerCaseResultSchema.parse(data), emailEnabled: sellerEmailConfigured(),emailFrom:process.env.RESEND_FROM_EMAIL?.trim() || null };
}
export async function actOnSellerCase(actorId: string, input: unknown) {
  const action = sellerServiceActionSchema.parse(input);
  await requirePersonalRealtorWorkspace(actorId);
  if (action.action === 'send_email' && !sellerEmailConfigured()) throw new RealtorWorkspaceError('FORBIDDEN');
  const { data, error } = await supabaseAdmin.rpc('seller_case_action', { p_actor_id: actorId, p_input: action.action==='send_email'?{...action,fromAddress:process.env.RESEND_FROM_EMAIL!.trim()}:action });
  if (error) throwRealtorRpcError(error.code);
  return data;
}
export async function readClientProgress(actorId: string) {
  const { data, error } = await supabaseAdmin.rpc('seller_client_progress', { p_actor_id: actorId });
  if (error) throwRealtorRpcError(error.code);
  return z.array(z.object({ leadId: z.string().uuid(), publication: sellerPublicationSchema, publishedAt: z.string() }).strict()).parse(data);
}
export async function readSellerPriorities(actorId:string){
  const {data,error}=await supabaseAdmin.rpc('seller_service_priorities',{p_actor_id:actorId});
  if(error)throwRealtorRpcError(error.code);
  return sellerPrioritiesSchema.parse(data);
}
