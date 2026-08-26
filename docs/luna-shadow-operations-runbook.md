# Luna Shadow Operations Runbook

Reference: [`luna-outcome-revenue-plan-2026-08-24.md`](./luna-outcome-revenue-plan-2026-08-24.md)

## Start

1. Obtain written broker/counsel approval for the pricing model and retain the decision with the tenant launch record.
2. Open `/admin/profit` as an operator and confirm the tenant host is correct.
3. Seed the approved baseline window and handoff/appointment rates in the Conversion baseline form.
4. Confirm the active baseline is displayed after saving.

## Daily Review

1. Confirm the scheduled checkpoint completed for the tenant.
2. Review evidence days against `14` and inspect the named unknown metrics.
3. Resolve queue items marked `Review outcome`, `Add evidence`, or `Resolve dispute`.
4. Review margin, pipeline multiple, duplicate rate, dispute rate, and conversion deltas.
5. Keep missing measurements unknown; never replace them with zero.

## Bandwidth Check

Record these values once per day during shadow collection, using the same UTC window:

| Measure | Source | Acceptance signal |
| --- | --- | --- |
| Supabase egress | Supabase project usage dashboard | Declining or stable after KDS shutdown and read projections |
| Database query volume | Supabase query/performance view | No recurring KDS polling spike; public feed reads should show cache reuse |
| Public feed freshness | `/api/properties` and `/api/kepler/listings` response age | No more than 60 seconds stale during normal operation |
| Checkpoint completeness | `/admin/profit` | One tenant/date checkpoint, with unknowns named |

Record the date, UTC window, tenant, and observed values in the shadow evidence log. Do not re-enable KDS based on a single low-traffic sample. Require three consecutive clean daily observations and no unresolved checkpoint or reconciliation issue.

## Decision

- `continue_shadow`: fewer than 14 complete days, missing evidence, missing legal approval, or unresolved trust data.
- `revise_prices` / `revise_definitions`: observed economics fail targets but evidence is reproducible.
- `stop`: duplicate billing, tenant-boundary failure, irreproducible evidence, or unacceptable dispute/trust failure.
- `launch`: only after legal approval, 14 complete checkpoints, target economics, reconciliation, and controlled-cohort approval.

Stripe outcome submission remains disabled until the launch gate explicitly passes.
