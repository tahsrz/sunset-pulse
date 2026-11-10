import type { SellerCaseResult } from './sellerServiceContract';

export type SellerJourneyState = 'complete' | 'current' | 'upcoming' | 'unavailable';
export type SellerJourneyEvidence = 'recorded' | 'planned';

export type SellerJourneyStep = {
  key: string;
  label: string;
  state: SellerJourneyState;
  occurredAt: string | null;
  evidence: SellerJourneyEvidence | null;
  action: { label: string; href: string } | null;
};

const laterMilestones = [
  ['preparing', 'Prepare the property'],
  ['published', 'Listing published'],
  ['showing', 'Showings underway'],
  ['offer_received', 'Offer received'],
  ['under_contract', 'Under contract'],
  ['closed', 'Closing recorded'],
] as const;

/** A read-only presentation of saved seller case evidence. It never infers an outcome from a plan or draft. */
export function deriveSellerJourney(result: SellerCaseResult): SellerJourneyStep[] {
  const leadHref = `/seller-inbox?leadId=${encodeURIComponent(result.lead.id)}`;
  const caseHref = `/seller-cases/${encodeURIComponent(result.lead.id)}`;
  const booked = result.bookings
    .filter((booking) => booking.status === 'accepted' && booking.linked)
    .sort((a, b) => Date.parse(b.start_time) - Date.parse(a.start_time))[0];
  const firstMessage = [...result.messages]
    .sort((a, b) => Date.parse(a.occurred_at) - Date.parse(b.occurred_at))[0];
  const active = new Set(result.milestones);
  const milestoneRecords = new Map(result.milestoneRecords.map((record) => [record.milestone, record]));

  const definitions: Array<Omit<SellerJourneyStep, 'state'> & { done: boolean }> = [
    { key: 'request', label: 'Request received', done: true, occurredAt: null, evidence: 'recorded', action: null },
    { key: 'conversation', label: 'Conversation started', done: Boolean(firstMessage), occurredAt: firstMessage?.occurred_at ?? null, evidence: firstMessage ? 'recorded' : null, action: { label: firstMessage ? 'Review conversation' : 'Review request', href: leadHref } },
    { key: 'consultation-scheduled', label: 'Consultation scheduled', done: Boolean(booked), occurredAt: booked?.start_time ?? null, evidence: booked ? 'planned' : null, action: { label: booked ? 'Open appointment' : 'Discuss a time', href: booked ? '/planner' : leadHref } },
    { key: 'consultation-held', label: 'Consultation held', done: active.has('consultation_held'), occurredAt: milestoneRecords.get('consultation_held')?.occurredOn ?? null, evidence: active.has('consultation_held') ? 'recorded' : null, action: { label: 'Record consultation', href: `${caseHref}#case-milestones` } },
    { key: 'agreement', label: 'Listing agreement verified', done: active.has('listing_agreement_verified'), occurredAt: milestoneRecords.get('listing_agreement_verified')?.occurredOn ?? null, evidence: active.has('listing_agreement_verified') ? 'recorded' : null, action: { label: 'Verify agreement', href: `${caseHref}#case-milestones` } },
    ...laterMilestones.map(([milestone, label]) => ({
      key: milestone,
      label,
      done: active.has(milestone),
      occurredAt: milestoneRecords.get(milestone)?.occurredOn ?? null,
      evidence: active.has(milestone) ? 'recorded' as const : null,
      action: milestone === 'closed'
        ? { label: 'Record actual closing', href: leadHref }
        : { label: `Record ${label.toLowerCase()}`, href: `${caseHref}#case-milestones` },
    })),
  ];

  // Anchor the next action after the latest verified stage. A missing older
  // record must not send someone backwards after later work is already saved.
  const latestCompleteIndex = definitions.reduce((latest, step, index) => step.done ? index : latest, -1);
  const currentIndex = latestCompleteIndex < definitions.length - 1 ? latestCompleteIndex + 1 : -1;
  return definitions.map((step, index) => ({
    key: step.key,
    label: step.label,
    state: step.done ? 'complete' : index === currentIndex ? 'current' : index < currentIndex ? 'unavailable' : 'upcoming',
    occurredAt: step.occurredAt,
    evidence: step.evidence,
    action: index === currentIndex ? step.action : null,
  }));
}
