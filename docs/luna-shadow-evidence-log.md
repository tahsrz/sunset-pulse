# Luna Shadow Evidence Log

Reference: [`luna-outcome-revenue-plan-2026-08-24.md`](./luna-outcome-revenue-plan-2026-08-24.md)  
Runbook: [`luna-shadow-operations-runbook.md`](./luna-shadow-operations-runbook.md)

Use one row per tenant and UTC operating day. Record observed values only; use `unknown` when a source is unavailable.

| Day | Tenant | UTC window | Egress | Query volume | Feed age | Checkpoint ID | Evidence days | Unknown metrics | Reconciliation | Decision | Operator |
| --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- | --- | --- | --- |
| 2026-08-__ |  | 00:00-23:59 | unknown | unknown | unknown |  | 0 |  | pending | continue_shadow |  |

## Daily Review Notes

- KDS state: disabled until three consecutive clean bandwidth observations.
- Stripe outcome submission: disabled until the launch gate passes.
- Legal approval artifact: retain its location with the tenant launch record.
- Queue items reviewed: `Review outcome`, `Add evidence`, `Resolve dispute`.
- Follow-up owner and due date:

## Gate Summary

- [ ] Approved tenant baseline seeded.
- [ ] 14 complete checkpoints collected.
- [ ] Required metrics observed or explicitly explained.
- [ ] Duplicate and dispute rates within target.
- [ ] Gross margin and pipeline multiple meet the approved hypothesis.
- [ ] Reconciliation completed.
- [ ] Controlled cohort approved.
