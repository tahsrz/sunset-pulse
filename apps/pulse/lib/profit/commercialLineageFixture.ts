import { z } from 'zod';

const identitySchema = z.object({
  funnelId: z.string().uuid(),
  leadId: z.string().uuid(),
  agentId: z.string().trim().min(1),
  site: z.string().trim().min(1),
}).strict();

export const commercialLineageFixtureSchema = z.object({
  session: z.object({ sessionHash: z.string().trim().min(16) }).strict(),
  handoff: identitySchema.extend({ event: z.literal('handoff_completed') }).strict(),
  lead: identitySchema.extend({ source: z.literal('jamie_public_guide') }).strict(),
  notification: identitySchema.extend({ deliveryStatus: z.enum(['sent', 'failed']) }).strict(),
  booking: identitySchema.extend({
    bookingId: z.string().uuid(),
    appointmentType: z.enum(['buyer_consultation', 'rental_consultation', 'property_tour', 'seller_consultation']),
    status: z.enum(['accepted', 'confirmed', 'completed']),
  }).strict(),
  signingPacket: identitySchema.extend({ packetId: z.string().trim().min(1), bookingId: z.string().uuid().nullable() }).strict(),
  outcome: identitySchema.extend({
    outcomeId: z.string().uuid(),
    leadId: z.string().uuid(),
    bookingId: z.string().uuid().nullable(),
    outcomeType: z.enum(['qualified_handoff', 'property_specific_handoff', 'buyer_consultation_booked', 'property_tour_booked', 'seller_consultation_booked']),
    billingStatus: z.enum(['shadow', 'pending', 'billable']),
  }).strict(),
  revenue: identitySchema.extend({ leadId: z.string().uuid(), currency: z.literal('USD'), amount: z.number().nonnegative() }).strict(),
}).strict();

export type CommercialLineageFixture = z.infer<typeof commercialLineageFixtureSchema>;

export function validateCommercialLineageFixture(input: CommercialLineageFixture) {
  const fixture = commercialLineageFixtureSchema.parse(input);
  const identity = fixture.lead;
  const downstream = [fixture.handoff, fixture.notification, fixture.booking, fixture.signingPacket, fixture.outcome, fixture.revenue];
  for (const record of downstream) {
    if (record.funnelId !== identity.funnelId || record.agentId !== identity.agentId || record.site !== identity.site) {
      throw new Error('Commercial lineage fixture contains a downstream identity mismatch.');
    }
  }
  if (fixture.handoff.leadId !== identity.leadId || fixture.notification.leadId !== identity.leadId) {
    throw new Error('Commercial lineage fixture contains a lead mismatch.');
  }
  if (fixture.signingPacket.bookingId && fixture.signingPacket.bookingId !== fixture.booking.bookingId) {
    throw new Error('Commercial lineage fixture contains a signing booking mismatch.');
  }
  if (fixture.outcome.leadId !== identity.leadId || fixture.outcome.bookingId !== fixture.booking.bookingId) {
    throw new Error('Commercial lineage fixture contains an outcome mismatch.');
  }
  if (fixture.revenue.leadId !== identity.leadId) {
    throw new Error('Commercial lineage fixture contains a revenue mismatch.');
  }
  return fixture;
}
