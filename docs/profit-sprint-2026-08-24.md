# Profit Sprint: Restructured Execution Plan

Sprint owner: Luna

Review owner: Codex

## Objective

Increase attributable profit from Jamie-generated real-estate opportunities.

```text
profit = attributable closed revenue - acquisition cost - delivery cost - operating cost
```

The current `/admin/profit` page and `/api/admin/profit/scorecard` are useful prototypes. They must not be used for spending or staffing decisions until Phase 0 is complete.

## Review Findings

### Blockers

1. The lead query filters to `source = jamie_public_guide`, so the displayed source comparison cannot compare acquisition channels.
2. Pipeline value reads `estimatedValue`, `leadValue`, or `pipelineValue`, but no production writer currently records those fields.
3. Model cost reads token and cost metadata that no current public-guide event writer records. Default zero rates can make unknown cost look like free usage.
4. The funnel mixes session counts, handoff events, lead records, and lead statuses without a shared cohort key. Stage percentages are therefore directional, not a true conversion funnel.
5. Notification reads and action opens are useful attention signals, but they are not equivalent to agent acknowledgment or customer contact.

### Useful Work To Keep

- Operator-only scorecard route and page.
- Durable notification delivery and read timestamps.
- Lead action-open telemetry.
- Rental zero-result qualification prompt.
- Pure analytics builder and focused unit-test structure.

## Phase 0: Make The Numbers Trustworthy

Complete before optimizing the dashboard.

### P0-001: Define one funnel identity

- Join conversation session, handoff event, lead, notification, agent action, appointment, and closed outcome with durable IDs.
- Document which stage owns each timestamp.
- Acceptance: one fixture can be traced end to end without matching by time or display text.

### P0-002: Separate metric scopes

- Jamie funnel: only `jamie_public_guide` leads.
- Channel comparison: all approved lead sources with the same qualification rules.
- Notification operations: only deliveries tied to leads in the selected cohort.
- Acceptance: every displayed denominator has a named cohort and date window.
- Implemented: Jamie conversion uses only `jamie_public_guide` leads, channel comparison uses all sources, and notification operations include only deliveries tied to leads created in the rolling window. Timestamp ownership is returned with the scorecard.

### P0-003: Create an authoritative value contract

- Add reviewed `estimated_pipeline_value`, `closed_revenue`, `currency`, and `value_source` fields or a dedicated opportunity-value ledger.
- Do not infer value from free-form metadata.
- Acceptance: unknown value renders as unknown, never `$0.00`.
- Implemented: additive opportunity-value columns, USD and source constraints, audited `set_value` updates, and scorecard reads from authoritative columns only.

### P0-004: Record real usage costs

- Persist provider, model, input tokens, output tokens, and cost for Jamie generations.
- Persist notification provider and per-delivery cost.
- Treat missing rates as `unknown`, not zero.
- Acceptance: a sampled conversation reconciles with provider usage within an agreed tolerance.
- Implemented: Jamie responses persist privacy-safe model usage, and successful Resend/Telnyx deliveries persist provider-specific point-in-time cost receipts. Missing rates remain visible as missing receipts.

### P0-005: Define acknowledgment

- `read`: inbox item was opened.
- `action_opened`: call, email, or SMS control was opened.
- `contacted`: agent recorded an outbound attempt.
- `responded`: customer replied or appointment was booked.
- Acceptance: the scorecard labels each state accurately and does not collapse them into one response metric.
- Implemented: durable contact-attempt and customer-response receipts, including appointment-booked provenance, are recorded separately from inbox reads and opened contact controls. Historical pipeline statuses are not treated as proof.

## Phase 1: Establish The Baseline

Start only after Phase 0 contracts are implemented.

### P1-001: Run a seven-day baseline

- Conversations
- High-intent conversations
- Consented handoffs
- Qualified leads
- Agent contacts
- Appointments
- Closed opportunities
- Revenue and total variable cost
- Implemented: the scorecard now returns and renders the first rolling seven-day baseline; live values remain governed by confidence and completeness states.

### P1-002: Audit failed conversations

- Review at least 20 recent commercial-intent conversations.
- Classify: retrieval, qualification, unsupported inventory, missing action, delivery, agent follow-through, or user decline.
- Rank failures by estimated lost opportunity, not raw count.
- Acceptance: top three leaks have evidence, owner, intervention, and expected metric movement.
- Implemented: the rolling scorecard audits up to 20 privacy-safe commercial failure lineages, ranks known opportunity value before count, and assigns evidence, owner, intervention, and expected metric movement without storing transcripts or inferring customer decline.

### P1-003: Add confidence states to the UI

- Verified: backed by authoritative joined data.
- Partial: some stages or costs are missing.
- Unknown: no trustworthy value exists.
- Acceptance: the operator can distinguish measured values from placeholders immediately.
- Implemented: every baseline metric is labeled verified, partial, or unknown; unavailable revenue and cost remain unknown instead of rendering as zero.

## Reformed Execution Queue

Reformed after the trustworthy baseline, failure audit, and rental qualification work landed.

1. Complete: close zero-result conversion with an explicit consented agent-search action; do not build saved search until persistence exists.
2. Complete: measure hot-alert delivery and authoritative contact latency against separate service targets.
3. Complete: escalate delivered hot leads only when no contact receipt exists after the operating-hours threshold.
4. Complete: promote commercial inventory-truth fixtures to a regression gate.
5. Active: collect one complete baseline week; readiness now requires seven distinct privacy-safe daily checkpoints in the rolling window, while the scorecard makes qualified-lead, closed-revenue, identity, and attributable-cost coverage explicit enough for a go/no-go decision.
6. Conditional: begin model-cost and channel-spend optimization only after the baseline readiness check passes.

Profit rationale: improve handoff and agent follow-through before reducing model cost, because premature cost optimization can lower conversion while revenue attribution is still sparse.

## Phase 2: Improve Lead Conversion

### P2-001: Complete high-intent qualification

- Capture location, property type, budget, timeline, bedrooms/bathrooms, contact consent, and preferred next step.
- Ask only for missing fields.
- Acceptance: commercial conversations end in a qualified handoff, a useful search refinement, or an explicit decline.
- Implemented: zero-result rental searches ask for at most two actually missing criteria, while compact handoff briefs retain explicit transaction type, location, budget, beds/baths, lease term, timeline, consent, and preferred next step without storing transcripts.

### P2-002: Improve zero-result outcomes

- Keep the new rental refinement prompt.
- Add consented agent handoff when agent context exists.
- Add saved-search support only after the backend can actually persist it.
- Acceptance: Jamie never claims a search, alert, or contact action occurred unless a tool confirms it.
- Implemented: verified zero-result searches retain search refinement, add a first-class consented agent-search action when agent context exists, and do not claim contact or saved-search persistence before submission confirmation.

### P2-003: Protect inventory truth

- Run the commercial retrieval fixtures on every change.
- Acceptance: zero fabricated or unrelated listing answers; verified inventory carries provenance.
- Implemented: `npm run test:inventory-truth` runs the commercial supervisor, canonical listing, public projection, and tenant-isolation fixture contracts as a named blocking CI step. The focused commercial fixture rejects invented facts, unrelated inventory, private fields, and provenance-free results.

## Phase 3: Improve Response Speed

### P3-001: Measure delivery and contact separately

- Target: 90% of hot alerts delivered within 60 seconds.
- Target: 80% of hot leads contacted within 10 minutes during configured operating hours.
- Exclude suppressed deliveries from successful delivery counts and report them separately.
- Implemented: sent deliveries are measured against the 60-second target, and delivered hot leads are measured against authoritative contact receipts at 10 minutes. Contact coverage is explicitly all-hours until operating-hour configuration is available.

### P3-002: Escalate genuinely unattended leads

- Escalate when a delivered hot lead has no recorded contact attempt after the threshold.
- Do not escalate based solely on unread state when another channel recorded contact.
- Acceptance: escalation tests cover retries, duplicate events, after-hours behavior, and resolved leads.
- Implemented: delivered hot leads are evaluated against configurable operating hours, authoritative contact receipts and resolved states suppress escalation, and a separately claimed ledger provides duplicate-safe dispatch with bounded retries.

## Phase 4: Optimize Margin

Begin after at least one trustworthy baseline week.

- Readiness gate implemented: margin experiments remain blocked until seven daily checkpoints, 10 qualified leads, 3 closed leads, and at least 95% identity, closed-revenue, model-cost, and notification-cost coverage all pass.

- Compare conversion, revenue, and cost by source.
- Reduce spending on sources with poor qualified and closed conversion.
- Cache stable answers and route low-complexity work to lower-cost models only when quality remains inside the fixture threshold.
- Acceptance: cost per qualified lead improves by 10% without reducing appointment or closed conversion.

## Luna Daily Protocol

1. Verify yesterday's data completeness before interpreting movement.
2. Select the largest attributable profit leak.
3. State the baseline, intervention, expected movement, owner, and rollback condition.
4. Ship one bounded change.
5. Verify customer flow, event lineage, and displayed metric.
6. Record the result as keep, revise, or revert.

## Immediate Order Of Work

1. Fix the scorecard cohort and source-query contradiction.
2. Add the authoritative value contract and production writer.
3. Add model and notification cost telemetry with unknown-state handling.
4. Join handoff, lead, notification, action, and appointment IDs.
5. Relabel the current UI to distinguish read, action opened, contacted, and responded.
6. Run the first trustworthy seven-day baseline.
7. Only then prioritize conversion experiments.

## Sprint Exit Gate

The sprint passes when:

- one lead can be traced end to end;
- source, value, cost, and response metrics have authoritative writers;
- missing data displays as unknown;
- the dashboard contains no mixed-cohort conversion percentages;
- focused analytics, route-auth, and commercial rental tests pass;
- at least one measured intervention improves a profit-linked metric without a safety or delivery regression.
