# LUNA-003 Broker and Legal Review Packet

Prepared: 2026-08-24  
Product: Sunset Pulse outcome-based revenue program  
Decision owners: Responsible broker and qualified Texas counsel

## Purpose

This packet requests a written decision about which Sunset Pulse billing events are lawful. It is a review aid, not legal advice. No customer may be charged for an outcome until the responsible broker and counsel approve the applicable event, contract, disclosures, payer, and billing entity in writing.

## Proposed Commercial Structure

Sunset Pulse would charge an active-site minimum with an equal included credit, then measure the highest verified outcome reached in a consumer funnel. Proposed research events are:

- `qualified_handoff`
- `property_specific_handoff`
- `buyer_consultation_booked`
- `property_tour_booked`
- `seller_consultation_booked`

The product does not currently propose commission sharing or charging consumers. These assumptions must be confirmed as part of review.

## Material Compliance Flags

### Texas compensated-referral risk

TREC Rule 535.20 states that referring a prospective buyer, seller, landlord, or tenant in connection with a proposed real-estate transaction is licensed activity when valuable consideration is expected. TREC also states that a license holder generally may not pay cash to an unlicensed person for referring a prospective lessee or buyer.

Review question: Does charging an agent or brokerage per qualified handoff, property-specific handoff, consultation, or tour constitute compensation for a referral or other licensed activity when performed by the proposed Sunset Pulse billing entity?

### Fee-sharing and entity-status risk

TREC Rule 535.147 limits sharing commissions or fees with an unlicensed person engaged in licensed activity. The reviewer must identify whether Sunset Pulse is acting solely as a neutral software vendor, as part of a licensed brokerage, or in another capacity, and whether the actual product behavior remains inside that classification.

Review question: Which legal entity contracts with the customer, receives payment, controls Jamie, and routes each lead? Record that entity's license and brokerage relationships.

### RESPA referral risk

RESPA Section 8 and Regulation X prohibit fees, kickbacks, or things of value under an agreement for referrals of settlement-service business involving federally related mortgage loans. CFPB guidance emphasizes that labels do not control; facts and implementation do.

Review question: Could any outcome payment directly or indirectly compensate Sunset Pulse for steering consumers toward a mortgage, title, inspection, brokerage, or other settlement-service provider?

### Texas buyer-agreement changes

TREC states that, beginning in 2026, a Texas license holder generally needs a written agreement before showing residential property to a prospective buyer. Required representation agreements include services, termination, exclusivity, representation status, compensation, and conspicuous negotiability language. Showing-only non-representation has separate restrictions.

Review question: At which point must the booking flow require an approved representation or non-representation agreement, and which appointment types may occur before execution?

## Required Written Decisions

For each proposed outcome, counsel and the responsible broker should mark one:

| Outcome | Approved | Approved with conditions | Prohibited | More facts needed |
| --- | --- | --- | --- | --- |
| Qualified handoff | [ ] | [ ] | [ ] | [ ] |
| Property-specific handoff | [ ] | [ ] | [ ] | [ ] |
| Buyer consultation booked | [ ] | [ ] | [ ] | [ ] |
| Property tour booked | [ ] | [ ] | [ ] | [ ] |
| Seller consultation booked | [ ] | [ ] | [ ] | [ ] |

For every approved or conditional outcome, specify:

1. Billing entity and required license status.
2. Permitted payer.
3. Required written customer agreement.
4. Required consumer and agent disclosures.
5. Permitted evidence and attribution window.
6. Prohibited product behavior.
7. Cancellation, refund, and dispute obligations.
8. Record-retention period.
9. Jurisdictions covered by the decision.

## Product Facts Counsel Must Confirm

- Sunset Pulse customer and billing entity.
- Responsible broker and sponsoring relationships.
- Whether Jamie merely presents neutral information or recommends a particular provider.
- Whether agents compete neutrally for leads or are selected by tenant/site ownership.
- Who owns and operates each branded site.
- Whether consumers pay Sunset Pulse or an agent.
- Whether any charge depends on a sale, lease, loan, title policy, inspection, or closing.
- Whether property tours are residential, commercial, rental, or mixed.
- Whether third-party settlement providers receive placement or preferential treatment.
- Whether an outcome can be reversed after cancellation or invalid contact evidence.

## Interim Engineering Rules

Until written approval exists:

- Outcome amounts are research hypotheses only.
- Do not create or activate Stripe outcome meters.
- Do not invoice or collect per-lead, per-appointment, per-tour, per-signature, or per-closing fees.
- Shadow classification may run without customer charges.
- Keep settlement-service recommendations neutral and unpaid.
- Do not describe the model as a referral fee in customer-facing material.
- Do not make representation signing automatic or a dark pattern.
- Preserve evidence required to reproduce every shadow outcome.

## Fallback Pricing Questions

If compensated outcomes are prohibited for the planned entity, ask counsel whether these alternatives are acceptable:

- Active-site platform fee with included operational capacity.
- Metered Jamie conversations or completed software workflows unrelated to transaction success.
- Prepaid software credits consumed by model, messaging, signing, or scheduling operations.
- Fixed implementation and support fees based on work performed rather than prospects referred.

The alternative metric must remain understandable to agents and must not disguise prohibited referral compensation.

## Authoritative Sources

- [TREC Rules and Laws, including Rules 535.20, 535.147, and 535.148](https://www.trec.texas.gov/agency-information/rules-and-laws/trec-rules)
- [TREC: cash payments for referrals from unlicensed persons](https://www.trec.texas.gov/can-license-holder-offer-or-pay-cash-unlicensed-person-referring-potential-lessee-or-buyer)
- [TREC: 2026 buyer and tenant representation changes](https://www.trec.texas.gov/node/2997)
- [TREC consumer information](https://www.trec.texas.gov/public/consumer-information)
- [CFPB RESPA Section 8 FAQs](https://www.consumerfinance.gov/compliance/compliance-resources/mortgage-resources/real-estate-settlement-procedures-act/real-estate-settlement-procedures-act-faqs/)
- [CFPB Regulation X, affiliated business arrangements](https://www.consumerfinance.gov/rules-policy/regulations/1024/15/)

## Approval Record

Responsible broker: ____________________  Date: __________  Decision: ____________________

Counsel: ______________________________  Date: __________  Decision: ____________________

Conditions and prohibited events:

______________________________________________________________________________

______________________________________________________________________________
