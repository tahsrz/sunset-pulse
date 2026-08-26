import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuthoritativeCommercialBooking } from '@/lib/scheduling/commercialBooking';
import { supabaseAdmin } from '@/lib/supabase';

const inputSchema = z.object({
  leadId: z.string().uuid(), funnelId: z.string().uuid(), site: z.string().trim().min(1),
  appointmentType: z.enum(['buyer_consultation', 'rental_consultation', 'seller_consultation']),
  startTime: z.string().datetime(), endTime: z.string().datetime(),
  attendee: z.object({ email: z.string().email(), name: z.string().trim().min(1), phone: z.string().trim().default(''), timeZone: z.string().default('America/Chicago') }).strict(),
}).strict();

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid consultation booking request.' }, { status: 400 });
  const input = parsed.data;
  const { data: lead, error } = await supabaseAdmin.from('agent_site_leads').select('id, funnel_id, agent_id, site').eq('id', input.leadId).eq('funnel_id', input.funnelId).eq('site', input.site).maybeSingle();
  if (error || !lead) return NextResponse.json({ ok: false, error: 'Booking lineage could not be verified.' }, { status: 400 });
  try {
    const result = await createAuthoritativeCommercialBooking({ ...input, agentId: lead.agent_id, idempotencyKey: `public-consultation:${input.leadId}:${input.startTime}:${input.appointmentType}`, listingId: null, title: `${input.appointmentType.replaceAll('_', ' ')} via Jamie`, description: 'Public consultation request via Jamie.' });
    return NextResponse.json({ ok: true, bookingId: result.booking.id, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch (cause) {
    return NextResponse.json({ ok: false, error: cause instanceof Error ? cause.message : 'Unable to create consultation booking.' }, { status: 500 });
  }
}
