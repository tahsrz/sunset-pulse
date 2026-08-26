import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';

export const commercialBookingInputSchema = z.object({
  leadId: z.string().uuid(),
  funnelId: z.string().uuid(),
  agentId: z.string().trim().min(1).max(120),
  site: z.string().trim().min(1).max(180),
  appointmentType: z.enum([
    'buyer_consultation',
    'rental_consultation',
    'property_tour',
    'seller_consultation',
  ]),
  listingId: z.string().trim().min(1).max(120).nullable().default(null),
  idempotencyKey: z.string().trim().min(16).max(180),
  title: z.string().trim().min(1).max(240),
  description: z.string().trim().max(2000).default(''),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  attendee: z.object({
    email: z.string().email().transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(160),
    phone: z.string().trim().max(40).default(''),
    timeZone: z.string().trim().min(1).max(80).default('America/Chicago'),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (Date.parse(value.endTime) <= Date.parse(value.startTime)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endTime'], message: 'End time must follow start time.' });
  }
  if (value.appointmentType === 'property_tour' && !value.listingId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['listingId'], message: 'A property tour requires a verified listing ID.' });
  }
});

export type CommercialBookingInput = z.infer<typeof commercialBookingInputSchema>;

type BookingRow = { id: string; uid: string; idempotency_key: string };

export async function createAuthoritativeCommercialBooking(inputValue: CommercialBookingInput) {
  const input = commercialBookingInputSchema.parse(inputValue);
  const lead = await readOwnedLead(input);

  const existing = await readBookingByIdempotencyKey(input.idempotencyKey);
  if (existing) {
    await ensureAttendee(existing.id, input);
    return { booking: existing, duplicate: true };
  }

  const uid = randomUUID();
  const { data, error } = await supabaseAdmin
    .from('scheduling_bookings')
    .insert({
      uid,
      idempotency_key: input.idempotencyKey,
      title: input.title,
      description: input.description,
      start_time: input.startTime,
      end_time: input.endTime,
      status: 'accepted',
      creation_source: 'webapp',
      funnel_id: lead.funnel_id,
      lead_id: lead.id,
      agent_id: lead.agent_id,
      site: lead.site,
      appointment_type: input.appointmentType,
      listing_id: input.listingId,
      metadata: { source: 'jamie_public_guide', projectionStatus: 'pending' },
    })
    .select('id, uid, idempotency_key')
    .single();

  if (error) {
    if (error.code === '23505') {
      const raced = await readBookingByIdempotencyKey(input.idempotencyKey);
      if (raced) {
        await ensureAttendee(raced.id, input);
        return { booking: raced, duplicate: true };
      }
    }
    throw new Error(`Unable to persist authoritative commercial booking: ${error.message}`);
  }

  const booking = data as BookingRow;
  await ensureAttendee(booking.id, input);

  return { booking, duplicate: false };
}

async function ensureAttendee(bookingId: string, input: CommercialBookingInput) {
  const { error } = await supabaseAdmin.from('scheduling_attendees').upsert({
    booking_id: bookingId,
    email: input.attendee.email,
    name: input.attendee.name,
    phone_number: input.attendee.phone,
    time_zone: input.attendee.timeZone,
  }, { onConflict: 'booking_id,email', ignoreDuplicates: true });
  if (error) throw new Error(`Unable to persist commercial booking attendee: ${error.message}`);
}

async function readOwnedLead(input: CommercialBookingInput) {
  const { data, error } = await supabaseAdmin
    .from('agent_site_leads')
    .select('id, funnel_id, agent_id, site')
    .eq('id', input.leadId)
    .eq('funnel_id', input.funnelId)
    .eq('agent_id', input.agentId)
    .eq('site', input.site)
    .maybeSingle();
  if (error) throw new Error(`Unable to verify commercial booking lineage: ${error.message}`);
  if (!data) throw new Error('Commercial booking lineage does not match an owned lead.');
  return data as { id: string; funnel_id: string; agent_id: string; site: string };
}

async function readBookingByIdempotencyKey(idempotencyKey: string) {
  const { data, error } = await supabaseAdmin
    .from('scheduling_bookings')
    .select('id, uid, idempotency_key')
    .eq('idempotency_key', idempotencyKey)
    .maybeSingle();
  if (error) throw new Error(`Unable to read commercial booking: ${error.message}`);
  return data as BookingRow | null;
}
