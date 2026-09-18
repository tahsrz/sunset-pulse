# Sunset Pulse capability matrix

Updated: September 18, 2026. Labels describe source evidence, not marketing availability.
Phase references follow the active [three-phase operating platform plan](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md).

| Capability | Current state | Evidence / boundary | Platform phase |
| --- | --- | --- | --- |
| Signed-in user authentication | implemented | `lib/core/routeAuth.ts`; route-level session guard | Core |
| Personal/team platform workspace | local real-auth APIs accepted; full domain isolation pending | Browser password sessions create workspaces and exercise run APIs; foreign users denied by API/JWT RLS. Legacy team-domain adapters still incomplete | Core |
| Existing-record personal scope report | dry-run code present; environment report blocked | `scripts/platform-scope-backfill.ts` reports profile/site/property mappings and refuses writes; last configured Supabase key was invalid | Core |
| Existing tenant-site scope | implemented with acceptance limits | `lib/tenancy`; site config and domain publication rules | Core scope adapters |
| Property shortlist and weekly sprint proposal | owner-compatible planning only; team adapter pending | Implicit scope transfers and archived mutations denied; legacy planners reject team/mixed mappings before reads/persistence. Manifest-run integration pending | Core → Declarative Engine |
| Durable scheduled workflow jobs | implemented locally; CI/deployment evidence pending | Existing leases/retries/cancellation/deferral; new atomic platform result path tested in disposable Postgres | Core, reused queue |
| Generic platform workflow definitions | backend implemented locally; admission disabled | Versioned JSON graph/state in `platform_runs`; scalar checkpoint and complete nodes only; no capability/condition nodes yet | Core |
| Jamie retrieval/command preparation | implemented with domain-specific limits | Command router, TAH/retrieval and worker roster; shared protocol gateway still pending | Declarative Engine |
| General autonomous worker execution | unavailable | `platform_run` handler advances checkpoints/completion, not arbitrary tools or named agents | Declarative Engine |
| Human question and answer resume | real-auth backend accepted locally; UI pending | Unified checkpoint API, typed answers, cursor pages and atomic queue resume. Browser cookie flow and real JWT isolation pass | Core → Control Layer |
| Blocked recovery and input supersession | implemented locally | Admin recovery requires restored requester authority; replacement runs preserve prior checkpoint evidence; concurrent attempts tested | Core |
| Immutable cross-domain artifacts | partial/domain-specific | Vibe revisions and property artifacts exist; generic run state will reference authoritative outputs | Declarative Engine |
| Exact-output approval | checkpoint backend implemented; domain integration pending | Approval/effect-gate snapshots and role checks exist; email/Vibe retain their own execution boundaries | Core → Declarative Engine |
| External effect reconciliation | partial/domain-specific | Reuse existing email, Stripe and publication ledgers; new connectors need operation identity and uncertain-outcome recovery | Declarative Engine |
| Stored app manifests | implemented locally, intake-only | Strict JSON contract, pinned/revision-checked install store and owner/admin API; two reviewed tool-free fixtures | Declarative Engine |
| MCP/OpenAPI dispatch and schema forms | planned | No protocol gateway, form renderer or provider execution; nonempty capabilities rejected | Declarative Engine |
| Real property reconstruction | unavailable | `reconstructionUnavailable`; no selected processor | Praxis S8/S9 |
| Local-first sync | feature-gated partial | PowerSync is limited to selected listing/account tables | Control Layer, only after RLS gates |
| Docker development/acceptance | implemented | `infra/local`; Mongo/Postgres acceptance, not production workers | Core evidence / Control Layer operations |
| Production worker autoscaling | unavailable | Current cron/route worker has bounded invocation limits | Control Layer |
| Team invitations and external reviewers | unavailable | No platform-scoped invitation/grant model | Control Layer |
| Cross-workspace operational recovery | unavailable | Existing feature-specific observability only; run/checkpoint audit added locally | Control Layer |
| Second reusable business app | intake fixture only | Client-content manifest persists under the same contract; resource-bound launch, approval/publication integrations still pending | Declarative Engine |

An item remains unavailable until its registered code path, authorization boundary and relevant acceptance evidence exist. A UI card, a plan checkbox, a named agent, a passing unit test or a configured environment variable does not change that label.
