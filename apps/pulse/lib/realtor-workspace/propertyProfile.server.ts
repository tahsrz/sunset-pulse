import 'server-only';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { requirePersonalRealtorWorkspace, RealtorWorkspaceError, throwRealtorRpcError } from './access.server';
import { propertyProfileActionSchema, propertyProfileSchema, propertyProfileStateSchema } from './propertyProfileContract';

export function isPropertyProfileEnabled() {
  return process.env.SELLER_PROPERTY_PROFILE_ENABLED === 'true';
}

export async function accessPropertyProfile(actorId: string, leadId: string, input?: unknown) {
  if (!isPropertyProfileEnabled()) throw new RealtorWorkspaceError('NOT_FOUND');
  const lead = z.string().guid().parse(leadId);
  const action = input === undefined ? null : propertyProfileActionSchema.parse(input);
  await requirePersonalRealtorWorkspace(actorId);
  const { data, error } = await supabaseAdmin.rpc('seller_property_profile', { p_actor_id: actorId, p_lead_id: lead, p_input: action });
  if (error) throwRealtorRpcError(error.code);
  return propertyProfileStateSchema.parse(data);
}

export async function readSharedPropertyProfile(token: string) {
  if (!isPropertyProfileEnabled() || !z.string().uuid().safeParse(token).success) return null;
  const { data, error } = await supabaseAdmin.rpc('read_shared_property_profile', { p_token: token });
  if (error || !data) return null;
  const parsed = propertyProfileSchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}
