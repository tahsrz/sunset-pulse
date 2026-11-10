import 'server-only';
import { supabaseAdmin } from '@/lib/supabase';
import { createSellerBookingCapability } from './sellerBookingCapability.server';
import { savedSellerIdentitySchema, sellerAvailabilityRequestSchema, sellerAvailabilityResultSchema, sellerReservationRequestSchema, sellerReservationResultSchema, type SavedSellerIdentity, type SellerBookingOffer } from './sellerConsultationContract';
import type { SellerConsultationAuthority } from './sellerConsultation.server';

export class SellerConsultationAccessError extends Error {}
const accessFailure = (code?: string) => code === '42501' || code === 'P0002';

const internalAuthority: SellerConsultationAuthority = {
  async listSlots(value) {
    const input = sellerAvailabilityRequestSchema.parse(value);
    try {
      const { data, error } = await supabaseAdmin.rpc('seller_consultation_availability', { p_identity: input.identity, p_from: input.from, p_to: input.to }).abortSignal(AbortSignal.timeout(5000));
      if (error && accessFailure(error.code)) throw new SellerConsultationAccessError();
      if (error) return { status: 'unavailable', reason: 'provider_unavailable' };
      return sellerAvailabilityResultSchema.parse(data);
    } catch (error) {
      if (error instanceof SellerConsultationAccessError) throw error;
      return { status: 'unavailable', reason: 'provider_unavailable' };
    }
  },
  async reserve(value) {
    const input = sellerReservationRequestSchema.parse(value);
    try {
      const { data, error } = await supabaseAdmin.rpc('seller_consultation_reserve', { p_identity: input.identity, p_slot_id: input.slotId, p_request_id: input.requestId }).abortSignal(AbortSignal.timeout(12000));
      if (error && accessFailure(error.code)) throw new SellerConsultationAccessError();
      if (error && ['23P01','23505','PT409','22023','22003','22007'].includes(error.code || '')) return { status: 'conflict' };
      if (error) return { status: 'uncertain' };
      const parsed = sellerReservationResultSchema.safeParse(data);
      return parsed.success ? parsed.data : { status: 'uncertain' };
    } catch (error) {
      if (error instanceof SellerConsultationAccessError) throw error;
      // The transaction might have committed before the response was lost.
      return { status: 'uncertain' };
    }
  },
};

export async function resolveSellerConsultationAuthority(value: SavedSellerIdentity) {
  const identity = savedSellerIdentitySchema.parse(value);
  try {
    const { data, error } = await supabaseAdmin.from('seller_consultation_settings').select('id,enabled')
      .eq('agent_id',identity.agentId).eq('site',identity.site).abortSignal(AbortSignal.timeout(3000)).maybeSingle();
    return !error && data ? internalAuthority : null;
  } catch { return null; }
}

/** Issue only with a newly saved intake, never an anonymous lead-ID refresh. */
export async function createSellerBookingOffer(identity: SavedSellerIdentity): Promise<SellerBookingOffer | null> {
  const secret = process.env.SELLER_BOOKING_CAPABILITY_SECRET || '';
  if (Buffer.byteLength(secret,'utf8') < 32) return null;
  try {
    const authority = await resolveSellerConsultationAuthority(identity);
    if (!authority) return null;
    const from = new Date();
    const availability = await authority.listSlots({ identity, from: from.toISOString(), to: new Date(from.getTime()+14*86400000).toISOString(), timeZone: 'UTC' });
    if (availability.status !== 'available') return null;
    return createSellerBookingCapability(identity,secret);
  } catch { return null; } // Saving the inquiry must not depend on booking availability.
}
