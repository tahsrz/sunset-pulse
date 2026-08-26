# Luna Plan: Outcome-Based Revenue

Owner: Luna  
Reviewer: Codex  
Status: Active planning and implementation reference

## Progress Snapshot (2026-08-25)

Estimated completion: **82% implemented; 18% remaining**. This is a weighted delivery estimate, not a billing or launch approval.

Remaining work is concentrated in observed operations: production call-site evidence, a real 14-day shadow window with all metrics populated, and controlled-cohort launch/reconciliation gates. The baseline seed/read workflow is complete. Stripe outcome submission remains disabled.

Execution dependency: retain the written legal approval artifact with the tenant launch record. Until the shadow evidence, pricing, reconciliation, and cohort gates pass, the correct system state is `continue_shadow`, not launch.

Operator handoff: [`luna-shadow-operations-runbook.md`](./luna-shadow-operations-runbook.md)

Latest actionables (2026-08-26):
- Reduce Supabase transfer before expanding outcome traffic: KDS is temporarily disabled, chat refreshes only while visible every 30 seconds, and high-volume lead, timeline, task, interaction, site-config, and listing reads now use bounded explicit projections.
- Measure the effect in Supabase before re-enabling KDS: compare daily egress, query volume, and public listing response size against the pre-change baseline.
- Listing mock verification now has a 15-second setup budget because its first module import can exceed Vitest's default 5 seconds; the focused listing and tenant-site suite is green (5/5). Before using it as a release gate, add a real response-size/egress measurement.
- The public properties endpoint still fetches up to 500 rows before applying page slicing. Treat replacing that with a count-plus-page query contract as the next controlled bandwidth optimization; do not lower the cap without preserving total-count semantics.
- Public properties and Kepler listing feeds now revalidate every 60 seconds, reducing repeated Supabase reads while preserving a bounded freshness window. Measure cache-hit behavior and listing freshness before tightening the 500-row prefetch contract.
- Commercial reliability checkpoint: booking contract, commercial lineage fixture, and public scheduling route tests pass (14/14). The remaining LUNA-201 action is authenticated end-to-end booking/signing route coverage with a real persisted fixture.
- Shadow economics checkpoint: checkpoint aggregation, checkpoint cron, shadow invoices, quality metrics, pricing decisions, economics scenarios, and launch gates pass (22/22). This validates the decision machinery; it does not replace the required 14 observed production checkpoints, approved baseline, or reconciliation evidence.
- Cost and billing-control checkpoint: internal cost events/ledger, billable outcome ledger, billing product configuration, spending controls, and meter-event gating pass (22/22). Stripe remains disabled until the observed shadow gates pass.
- Commercial funnel checkpoint: authenticated booking contracts, representation agreement behavior, public scheduling, commercial queues, and lead notification coverage pass (20/20). Remaining LUNA-201 work is live persisted route coverage across booking through signing, not the contract layer.
- Revenue regression checkpoint: outcome contracts, baseline routes, internal costs, billable ledger, pricing, shadow checkpoints/invoices/quality, billing controls, meter gating, and launch gates pass (67/67). This is implementation evidence only; production shadow duration and reconciliation remain open.
- Operations follow-through: the shadow runbook now defines a daily UTC bandwidth check covering Supabase egress, query volume, public-feed freshness, and checkpoint completeness. Re-enable KDS only after three consecutive clean observations with no reconciliation or checkpoint issues.
- Evidence capture: [`luna-shadow-evidence-log.md`](./luna-shadow-evidence-log.md) is now the canonical operator template for the 14-day shadow record and launch-gate checklist.
- Egress response: [`supabase-egress-reduction-plan-2026-08-26.md`](./supabase-egress-reduction-plan-2026-08-26.md) records the 8.61 GB overage response, feed caps, measurement order, and rollback rules.
- Historical usage: the egress plan now includes a separate August 23-24 backfill for the reported approximately 9 GB, requiring provider-side usage evidence before assigning source or daily totals.
- Keep the release state at `continue_shadow` until the 14-day evidence window, reconciliation, pricing, and controlled-cohort gates are complete.

## Objective

Launch measurable outcome billing without charging customers incorrectly or compromising lead conversion.

```text
monthly invoice =
active-site minimum
+ verified outcome charges
- included usage credit
- credits and reversals
```

Customer billing is based on verified commercial outcomes. Model tokens, notifications, search, signing, crawling, storage, and infrastructure remain internal cost measurements.

## Working Protocol

- Reference the relevant `LUNA-*` ticket in implementation notes, commits, tests, and reviews.
- Complete acceptance criteria before advancing a ticket.
- Never turn an AI classification directly into a financial charge.
- Keep unknown cost and incomplete evidence visible as unknown.
- Preserve financial history through compensating entries, never deletion.
- Do not activate Stripe outcome charges until shadow billing passes its release gate.

## Phase 0: Define The Economics

### LUNA-001: Establish outcome definitions

Status: Implemented on 2026-08-24; focused contract verification passes.

Define `qualified_handoff`, `property_specific_handoff`, `buyer_consultation_booked`, `property_tour_booked`, and `seller_consultation_booked`.

For each outcome, document required evidence, disqualifying conditions, attribution window, duplicate rules, supersession rules, proposed price, and refund conditions.

Acceptance: two engineers independently classify the same fixture funnels identically.

Implementation note: booked outcomes require an authoritative confirmed or completed booking. Jamie intent such as `schedule_tour` can qualify a property-specific handoff but cannot establish a booked outcome. The canonical contract is `apps/pulse/lib/profit/outcomeContract.ts`, with replayable fixtures in `apps/pulse/config/outcome-classification-fixtures.json`.

### LUNA-002: Define the pricing hypothesis

Status: Research hypothesis only; no price is approved for customer billing.

Starting experiment:

| Item | Price |
| --- | ---: |
| Active-site minimum | $49/month |
| Included outcome credit | $49/month |
| Qualified handoff | $8 |
| Property-specific handoff | $12 |
| Buyer consultation | $20 |
| Property tour | $35 |
| Seller consultation | $45 |

Only the highest outcome reached in one funnel is charged.

Acceptance: projected gross margin remains positive under low, normal, and heavy usage scenarios.

### LUNA-003: Broker and legal review

Status: Operator reports written broker/counsel approval obtained on 2026-08-25; retain the approval artifact with the tenant launch record before enabling any production billing configuration.

Review lead-generation fees, outcome definitions, referral-fee boundaries, representation-related billing, advertising disclosures, invoice evidence, and dispute handling.

Acceptance: written approval or a documented list of prohibited billing events.

Review packet: [`luna-003-broker-legal-review-packet.md`](./luna-003-broker-legal-review-packet.md)

Plan gate: Approval clears the legal review dependency for controlled shadow operations. Stripe outcome meters and customer charges remain blocked until the evidence, reconciliation, pricing, and cohort gates pass. If the approval contains scope restrictions, reform LUNA-002 and the launch cohort to match them.

## Phase 1: Build The Measurement Foundation

### LUNA-101: Preserve funnel identity

Status: Audited; incomplete pending booking, signing, and outcome-ledger remediation.

Require `funnel_id` across Jamie sessions, handoffs, leads, notifications, contact receipts, bookings, signing packets, billable outcomes, and revenue records.

Acceptance: one fixture traces the complete journey using IDs alone.

Audit: [`luna-101-funnel-identity-audit.md`](./luna-101-funnel-identity-audit.md)

Reformed privacy rule: anonymous pre-consent activity keeps a privacy-safe session hash. The durable `funnel_id` is created at accepted handoff and is required on downstream commercial records. Historical anonymous events may be joined through the canonical session hash without exposing the raw browser session.

### LUNA-102: Create the outcome ledger

Status: Ledger schema, pure entry builder, lineage-checked shadow persistence worker, and replayable end-to-end lineage fixture implemented; database-backed execution and Stripe submission remain gated.

Add an immutable `billable_outcomes` ledger containing tenant, agent, funnel, lead, and booking IDs; outcome type and version; occurrence time; proposed amount and currency; evidence snapshot; billing status; superseded outcome ID; Stripe meter event ID; and credit or dispute reason.

Acceptance: corrections use compensating entries and event replay cannot duplicate an outcome.

Implementation note: `billable_outcomes` protects identity and evidence columns with a database trigger. Credits and reversals are new entries, while billing status remains operationally reconcilable. No Stripe meter event is emitted by this work.

### LUNA-103: Separate internal costs

Status: Internal cost ledger, append-only mutation guard, idempotent persistence helper, provider-event adapter, persistence boundary, unknown-safe margin summary, notification delivery adoption, Jamie model usage adoption, signing-email cost adoption, crawler/infrastructure event emitters, and admin profit-console cost coverage implemented; provider call-site adoption and full margin reporting remain.

Record model tokens and cost, search/tool cost, email and SMS cost, signing cost, crawling cost, and allocated infrastructure cost per tenant.

Acceptance: missing cost remains unknown and never becomes `$0`.

## Phase 2: Complete The Appointment Funnel

### LUNA-201: Consolidate scheduling

Status: In progress. The authoritative Supabase commercial booking contract, lineage migration, idempotent writer, legacy projections, and consultation appointment types are implemented in the authenticated scheduling route. End-to-end route fixtures and Jamie booking actions remain.

Signing follow-up: representation packets now accept optional validated commercial context and verify lead and booking lineage before storage. Full authenticated route coverage remains before this dependency is complete.

Implementation note: the commercial context is stored as packet metadata and deliberately excluded from the legal document payload and hash, so operational attribution does not silently alter the customer-facing agreement.

Make Supabase `scheduling_bookings` authoritative. Cal.com becomes an external adapter, Mongo `TourRequest` becomes a compatibility projection, writes require an idempotency key, and bookings join to lead and funnel IDs.

### LUNA-202: Add Jamie booking actions

Status: Explicit consultation requests now receive typed buyer, rental, or seller booking actions and a public lead-to-authoritative-booking form with duplicate, lineage-mismatch, and browser-flow coverage; tour-ready and property-specific booking UI remains.

Offer booking after tour-ready intent, property-showing requests, consented zero-result agent searches, buyer or rental consultations, and seller consultations.

Record offered, opened, selected, submitted, confirmed, failed, cancelled, and completed events.

### LUNA-203: Update the agent console

Status: Implemented on 2026-08-25. Commercial queue read model, Supabase booking and billable-outcome wiring, agent-leads console counts, and detailed appointment-ready/hot-uncontacted cards now expose booking, funnel, outcome evidence, billing status, and explicit operator actions for review, evidence gaps, disputes, and voided outcomes.

Add hot-uncontacted and appointment-ready queues, funnel and listing context, contact receipts, appointment status, outcome status, and billing eligibility.

Acceptance: an agent can handle the lead without manually reconstructing context.

## Phase 3: Implement Deterministic Outcomes

### LUNA-301: Qualification evaluator

Status: Deterministic qualification evaluator implemented with explicit consent, contact, transaction, location/listing, timeline, next-step, budget, duplicate, and disqualifier gates; focused acceptance coverage added.

A qualified handoff requires explicit consent, a valid contact channel, transaction type, location or verified listing, timeline, requested next step, applicable budget or range, and no duplicate attribution.

The model may extract facts. Deterministic code decides billing eligibility.

### LUNA-302: Outcome progression

Status: Monotonic progression helper and ledger compensation builder implemented with explicit priority, downgrade protection, duplicate detection, supersession metadata, and replacement credit/charge entries; persistence orchestration remains.

Use monotonic progression:

```text
handoff -> property-specific handoff -> consultation or tour
```

When a higher-value outcome occurs, supersede the previous outcome, bill only the difference or replace the pending amount, preserve the audit trail, and never double-charge a funnel.

### LUNA-303: Credits and disputes

Status: Deterministic dispute-credit builder, lineage-checked persistence orchestration, and operator-only credit endpoint implemented for approved disqualifiers with original-outcome linkage, reason evidence, and idempotency; operator UI remains.

Automatically credit failed delivery, invalid contact information, duplicate leads, test traffic, fraud or abuse, agent-generated traffic, and qualifying appointment cancellations.

Acceptance: replaying events never creates additional charges.

## Phase 4: Shadow Billing

### LUNA-401: Generate invoices without charging

Status: Shadow invoice builder, database-backed tenant/period loader, admin profit-console preview, and scheduled checkpoint evidence collection implemented. Checkpoints now retain invoice counts, credit counts, evidence coverage, known cost counts, and explicit unknown metrics; the required 14-day observed shadow window remains.

Run shadow billing for at least two weeks. Show the account minimum, included credit, billable outcomes, evidence, credits, estimated invoice, and estimated value generated.

### LUNA-402: Validate economics

Status: Scenario evaluator implemented for low, normal, and heavy usage with gross-margin, duplicate, dispute, pipeline-multiple, and conversion metrics; two-week observed checkpoint data remains.

Track outcomes per tenant, cost per outcome, gross margin, estimated invoice, agent-perceived value, dispute and duplicate rates, appointment show rate, and pipeline value per billed dollar.

Targets:

- Gross margin at least 70%.
- Duplicate billing below 1%.
- Outcome dispute rate below 3%.
- Estimated pipeline value at least 5x billed dollars.
- No reduction in handoff or appointment conversion.

### LUNA-403: Pricing decision

Status: Implemented on 2026-08-25. Evidence-gated pricing decision evaluator, observed shadow-checkpoint aggregator, tenant/date-idempotent persistence, admin profit-console decision preview, daily checkpoint cron scheduled at 12:30 UTC, operator baseline-seeding form and route, conversion-delta wiring, and route-level authentication/persistence coverage are implemented. Duplicate and dispute rates read from the ledger. Tenant-scoped conversion baselines are persisted and compared with observed funnel rates during checkpoint creation. The decision remains `continue_shadow` until an approved baseline is seeded, 14 complete checkpoints exist, and all required metrics are observed.

Conversion wiring note: observed handoff and tour rates are derived from existing funnel stages. A tenant-scoped `shadow_conversion_baselines` persistence boundary stores approved baseline rates with measurement-window metadata, and checkpoint creation compares them through `calculateConversionDeltas`. A missing baseline keeps both deltas unknown.

Classify the experiment as `launch`, `revise_prices`, `revise_definitions`, `continue_shadow`, or `stop`. Evidence, not a calendar deadline, controls launch.

## Phase 5: Stripe Metered Billing

### LUNA-501: Configure products

Status: Typed billing product configuration and launch-gate evaluation implemented; no Stripe products or live meter submission are enabled.

Configure a recurring active-site minimum, monthly included credit, metered outcome price, credit adjustments, and customer spending-limit metadata. Continue using the existing Stripe webhook ledger and reconciliation controls.

### LUNA-502: Submit meter events

Status: Launch-gated Stripe meter-event payload builder implemented; no provider submission is enabled.

Submit only `billable` outcomes with stable idempotency, tenant ownership verification, persisted evidence, Stripe acknowledgment, retry-safe processing, and reconciliation.

### LUNA-503: Customer billing controls

Status: Pure spending-limit, graduated-alert, and pause evaluator, access-controlled read-only shadow invoice endpoint, profit-console invoice control, itemized outcome entries, seven-day operator dispute-credit form, and expiry guard implemented; customer UI and live provider enforcement remain disabled.

Provide monthly spending caps, pause-on-limit, alerts at 50%, 80%, and 100%, itemized outcome history, a seven-day dispute workflow, and downloadable invoices and credits.

## Phase 6: Controlled Launch

Status: Controlled cohort launch gate implemented for internal, friendly-agent, three-agent, ten-agent, and general cohorts; launch remains blocked until the pricing decision, evidence duration, trust, and reconciliation gates pass.

Launch in order: internal tenant, one friendly agent, three-agent cohort, ten-agent cohort, then general availability.

Rollback on duplicate charges, tenant boundary failures, reconciliation gaps, excessive disputes, insufficient margin, conversion regression, or irreproducible outcome evidence.

## Luna Daily Protocol

1. Verify data completeness.
2. Inspect failed and duplicate outcomes.
3. Select the largest profit or trust risk.
4. State expected metric movement.
5. Ship one bounded change.
6. Test event lineage and tenant isolation.
7. Record `keep`, `revise`, or `revert`.
8. Update the shadow-billing scorecard.

## Shadow Operations Checklist

Until `LUNA-401` and `LUNA-402` are complete, the operator should:

1. Confirm the daily `/api/admin/profit/checkpoints/cron` run produced one tenant/date checkpoint.
2. Review invoice evidence coverage and credit counts in the profit console.
3. Investigate every `Add evidence`, `Resolve dispute`, or `Review outcome` queue item before the next checkpoint.
4. Record duplicate, dispute, handoff-conversion, and appointment-conversion measurements when their source records are available; leave them `unknown` rather than inferring zero.
5. Do not change `LUNA_LEGAL_APPROVED`, billing product configuration, or Stripe submission controls during shadow collection.

## Immediate Execution Queue

1. Complete: LUNA-001 outcome contracts and fixtures.
2. Legal decision reported complete: LUNA-003; preserve the written approval artifact and any scope restrictions.
3. Audited, remediation active: LUNA-101 funnel identity coverage.
4. Complete: designed and migrated the LUNA-102 outcome ledger contract, shadow persistence worker, and replayable lineage fixture.
5. In progress: LUNA-201 end-to-end authenticated booking and signing route coverage.
6. Complete: LUNA-301 deterministic qualification evaluator.
7. Complete: LUNA-302 progression and LUNA-303 reversals; continue persistence and replay verification.
8. In progress: LUNA-401 shadow billing operations; checkpoint collection is wired, and the 14-day observation window is still outstanding.
9. In progress: LUNA-402 economics validation; seed an approved tenant baseline through the profit console, collect 14 complete checkpoints, and verify all decision metrics before evaluating launch. The implementation gate is complete; the remaining work is observed evidence.
10. Blocked by shadow gates: connect Stripe only after the pricing decision, evidence duration, trust, and reconciliation pass.

## Operator-Dependent Next Actions

The remaining launch work cannot be completed from local code verification alone:

1. Attach the written legal approval artifact to the approved tenant launch record.
2. Seed the tenant conversion baseline in `/admin/profit`.
3. Run the scheduled checkpoint for 14 complete UTC days and append each result to [`luna-shadow-evidence-log.md`](./luna-shadow-evidence-log.md).
4. Record Supabase egress, query volume, and public-feed freshness during the same daily windows.
5. Reconcile shadow invoices, credits, disputes, duplicates, and known/unknown costs.
6. Decide `launch`, `revise_prices`, `revise_definitions`, `continue_shadow`, or `stop` from observed evidence. Keep Stripe disabled until that decision is `launch` and the controlled cohort is approved.

## Remaining Work Priority

1. **Approval record:** retain the written broker/counsel decision from `LUNA-003` and apply any scope restrictions to the pricing hypothesis and launch cohort.
2. **Evidence collection:** seed each approved tenant baseline, operate the scheduled checkpoint for 14 complete days, and resolve every named unknown metric.
3. **Commercial reliability:** finish authenticated booking/signing route coverage and remaining provider-cost call-site adoption.
4. **Controlled launch:** evaluate the evidence-gated pricing decision, reconcile shadow records, launch only the approved cohort, and keep Stripe submission disabled until every gate passes.

The first implementation deliverable is the LUNA-001 outcome contract and fixture suite, not a pricing page.
