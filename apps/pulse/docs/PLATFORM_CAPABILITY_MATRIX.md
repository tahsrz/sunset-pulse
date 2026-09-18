# Sunset Pulse capability matrix

Updated: September 18, 2026. Labels describe source evidence, not marketing availability.
Phase references follow the active [three-phase operating platform plan](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md).

| Capability | Current state | Evidence / boundary | Platform phase |
| --- | --- | --- | --- |
| Signed-in user authentication | implemented | `lib/core/routeAuth.ts`; route-level session guard | Core |
| Personal/team platform workspace | local code + disposable migration accepted; full RLS pending | `platform_*` identity contract, migration, API and idempotent personal creation; full Supabase/authenticated isolation still open | Core |
| Existing-record personal scope report | dry-run code present; environment report blocked | `scripts/platform-scope-backfill.ts` reports profile/site/property mappings and refuses writes; last configured Supabase key was invalid | Core |
| Existing tenant-site scope | implemented with acceptance limits | `lib/tenancy`; site config and domain publication rules | Core scope adapters |
| Property shortlist and weekly sprint proposal | implemented locally; acceptance ongoing | `lib/property-sprints`, existing scheduler and Keller plan; manifest-run integration still pending | Core → Declarative Engine |
| Durable scheduled workflow jobs | implemented locally; CI/deployment evidence pending | Existing leases/retries/cancellation/deferral; new atomic platform result path tested in disposable Postgres | Core, reused queue |
| Generic platform workflow definitions | backend implemented locally; admission disabled | Versioned JSON graph/state in `platform_runs`; scalar checkpoint and complete nodes only; no capability/condition nodes yet | Core |
| Jamie retrieval/command preparation | implemented with domain-specific limits | Command router, TAH/retrieval and worker roster; shared protocol gateway still pending | Declarative Engine |
| General autonomous worker execution | unavailable | `platform_run` handler advances checkpoints/completion, not arbitrary tools or named agents | Declarative Engine |
| Human question and answer resume | backend implemented locally; UI pending | Unified checkpoint API, typed answers and atomic queue resume; concurrent replay and role/RLS fixtures pass | Core → Control Layer |
| Immutable cross-domain artifacts | partial/domain-specific | Vibe revisions and property artifacts exist; generic run state will reference authoritative outputs | Declarative Engine |
| Exact-output approval | checkpoint backend implemented; domain integration pending | Approval/effect-gate snapshots and role checks exist; email/Vibe retain their own execution boundaries | Core → Declarative Engine |
| External effect reconciliation | partial/domain-specific | Reuse existing email, Stripe and publication ledgers; new connectors need operation identity and uncertain-outcome recovery | Declarative Engine |
| Stored app manifests and MCP/OpenAPI dispatch | planned | No app-install store, schema form renderer or protocol gateway yet | Declarative Engine |
| Real property reconstruction | unavailable | `reconstructionUnavailable`; no selected processor | Praxis S8/S9 |
| Local-first sync | feature-gated partial | PowerSync is limited to selected listing/account tables | Control Layer, only after RLS gates |
| Docker development/acceptance | implemented | `infra/local`; Mongo/Postgres acceptance, not production workers | Core evidence / Control Layer operations |
| Production worker autoscaling | unavailable | Current cron/route worker has bounded invocation limits | Control Layer |
| Team invitations and external reviewers | unavailable | No platform-scoped invitation/grant model | Control Layer |
| Cross-workspace operational recovery | unavailable | Existing feature-specific observability only; run/checkpoint audit added locally | Control Layer |
| Second reusable business app | planned | Client-content JSON manifest will prove shared engine reuse | Declarative Engine |

An item remains unavailable until its registered code path, authorization boundary and relevant acceptance evidence exist. A UI card, a plan checkbox, a named agent, a passing unit test or a configured environment variable does not change that label.
