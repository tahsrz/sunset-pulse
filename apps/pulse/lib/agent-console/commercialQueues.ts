export type CommercialQueueLead = { id: string; status: string | null; contact_attempted_at: string | null; funnel_id: string | null; responded_at: string | null };
export type CommercialQueueBooking = { lead_id: string; status: string; appointment_type: string; start_time: string };
export type CommercialQueueOutcome = { outcome_type: string; billing_status: string; amount_usd: number; evidence: Record<string, unknown> | null };

export function outcomeActionLabel(outcome: CommercialQueueOutcome | null, bookingStatus: string) {
  if (!outcome) return bookingStatus === 'confirmed' || bookingStatus === 'completed' ? 'Review outcome' : 'Not eligible';
  if (outcome.billing_status === 'disputed') return 'Resolve dispute';
  if (outcome.billing_status === 'voided') return 'Voided';
  if (!Object.keys(outcome.evidence || {}).length) return 'Add evidence';
  return `${outcome.billing_status} · outcome recorded`;
}

export function summarizeOutcomeEvidence(outcome: CommercialQueueOutcome | null, bookingStatus: string) {
  if (outcome) {
    return {
      detail: `${outcome.outcome_type.replaceAll('_', ' ')} · $${outcome.amount_usd} · ${Object.keys(outcome.evidence || {}).length} evidence fields`,
      eligibility: outcomeActionLabel(outcome, bookingStatus),
    };
  }
  return {
    detail: null,
    eligibility: bookingStatus === 'confirmed' || bookingStatus === 'completed' ? 'Review outcome' : 'Not eligible',
  };
}

export function buildCommercialQueues(leads: CommercialQueueLead[], bookings: CommercialQueueBooking[]) {
  const bookingByLead = new Map(bookings.map((booking) => [booking.lead_id, booking]));
  const appointmentReady = leads.filter((lead) => { const booking = bookingByLead.get(lead.id); return booking && ['accepted', 'confirmed', 'completed'].includes(booking.status); }).map((lead) => ({ lead, booking: bookingByLead.get(lead.id)! }));
  const hotUncontacted = leads.filter((lead) => lead.status !== 'archived' && !lead.contact_attempted_at && (lead.responded_at || lead.funnel_id));
  return { appointmentReady, hotUncontacted };
}
