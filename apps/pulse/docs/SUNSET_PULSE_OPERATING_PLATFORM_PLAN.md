# Sunset Pulse operating platform — three-phase implementation plan

Revised September 18, 2026 from Taz's five architecture changes. This is the active plan.
Implement sequentially, without subagents. Read this file and only the source files needed for the current action.
The [previous 18-packet specification](archive/SUNSET_PULSE_OPERATING_PLATFORM_PLAN_2026-09-18.md) is historical evidence, not a second implementation backlog.

Execution entry: [current ledger](#current-ledger-and-next-session) → [September 21–25 handoff](PLATFORM_WEEK_2026-09-21.md). The code sequences below describe the architecture; they are not all unfinished tasks. The requested `SUNSET_PULSE_OPERATING_PLATFORM_PLAN_2.md` does not exist in this checkout; this file is the canonical replacement, not a second plan to create.

Vision: people and Jamie organize business work together. Installed apps describe inputs, workflow graphs and required tools as data. One scheduler runs the work, waits for people, preserves evidence and reports outcomes.

## Architecture decisions

| Requested change | Implementation decision |
| --- | --- |
| JSONB state machines | Store the pinned versioned graph, definition hash, cursor, generation and bounded answers/results in one `platform_runs` row. Reuse `workflow_jobs`, `workflow_results` and `workflow_event_contracts`. No new events, outbox, consumer-receipt or run-step tables for same-Postgres transitions. |
| One checkpoint primitive | One `platform_checkpoints` table with `question`, `approval`, `effect_gate`, one response service/API and one future inbox card. Preserve type-specific response validation, roles and exact targets. |
| Declarative apps | Persist validated JSON manifests and installation settings. Zod validates the JSON format; Zod instances/functions are never stored. Real-estate and content workflows become JSON fixtures/manifests consumed by the same interpreter and form renderer. |
| MCP/OpenAPI capabilities | Use shared protocol clients and JSON Schema input/output contracts. Tools are identified by connection ID + tool/operation name + pinned schema hash. Keep credentials, entitlement checks, effect classification and host access in server policy. |
| Three macro phases | Core Platform → Declarative Engine → Control Layer. Track completed vertical slices and actual evidence, not 165 repeatedly loaded instruction anchors. |

An effect gate records a decision; it is not a delivery receipt. Reuse existing email/CMS/payment receipts and their exact-version checks. New connectors must persist operation identity and reconcile uncertain provider outcomes before replay. MCP defines tool schemas/calls, not Sunset Pulse authorization, transactionality or duplicate-delivery guarantees. Its annotations are not authoritative permission policy. See the [MCP tools specification](https://modelcontextprotocol.io/specification/2025-06-18/server/tools).

JSONB reduces schema and join overhead; it does not eliminate concurrency control. Serialize transitions on one run row, compare revisions/generations, fence worker writes with live leases, and bound graph/state size. Large artifacts remain in existing artifact/domain stores. Start with one active node per run; parallel branch execution is a later measured need.

Postgres run/checkpoint changes enqueue directly into the existing queue inside the same transaction. Mongo/storage handoffs still use their existing durable intents and reconciliation. Removing a Postgres outbox does not create a cross-database transaction.

## Existing foundation and known limits

- Reuse identity, memberships, audit and scope links from `20260917010000_platform_workspaces.sql` through `20260918010000_platform_sprint_schedule_backlog_scope.sql`.
- Reuse `requireSignedInUser`, `workspaceAccess.server.ts`, `durableScheduler.server.ts`, the event contract registry and fenced job completion.
- Preserve property truth, email review/recipient rules, Vibe exact revision review, scan privacy and existing billing ledgers.
- Workspaces and scope adapters have local unit/build and disposable Postgres evidence. Local Supabase browser/password-session acceptance now passes for workspace creation, run start/answer/cancel, cursor pages and foreign-user denial. This is not production or all-domain RLS acceptance; the earlier production dry-run failed with an invalid API key and performed no writes.
- Existing owner compatibility paths, team resource mapping, manual sprint edits/completion and schedule controls still need review. Schedule/backlog scope wrappers are code present, not proof of complete team isolation. Check mapping transfers, requester-versus-resource-owner selection, archived workspace denial and scheduler input selection before enabling team workflows.
- Existing scans are a separate partial bridge; real reconstruction remains unavailable.
- No production migration, backfill, deployment, outbound send or paid-provider activation is part of these local fixtures.

## Phase 1 — Core Platform

Goal: a validated JSON workflow persists, waits for a person, accepts one answer/decision, resumes after restart and reaches a terminal state through the existing scheduler.

### Implemented backend contract

The following backend sequence is implemented and tested locally. Do not rebuild it. Team-domain integration and end-user UI are separate remaining work.

1. `lib/platform/contracts/run.ts`: strict schema version 1 graph; keys/versions; unique node IDs; entry and next references; 1–64 nodes; reject missing/unreachable nodes and cycles.
2. Define `checkpoint` and `complete` nodes first. A question uses a supported JSON Schema scalar (`string`, bounded string enum, `number`, `boolean`). Approvals/effect gates pin action, resource ID/type, revision and content hash; audience hash where applicable. Rejection cancels the run.
3. `supabase/migrations/20260918020000_platform_json_runs_checkpoints.sql`: create only `platform_runs` and `platform_checkpoints`. Store graph/state JSONB, immutable answer attribution, request/submission keys and revisions. Composite checkpoint/run workspace FK prevents mismatched ownership. Index workspace inbox/status/time.
4. Restrict table writes to the security-definer operations; authenticated users get scoped read access only. Require active workspace and membership. Use a shared workspace/member lock before run/checkpoint mutation so revocation/archive cannot race an accepted transition.
5. `platform_start_run`: validate graph and requesting role; replay identical request key/content; reject changed content; insert run + generation-1 queue event + audit atomically.
6. `platform_tick_run`: load the persisted job, verify key/version/owner/workspace/generation and live lease; lock run; open its checkpoint or finish it; save `workflow_results` receipt and job completion in the same transaction. Expired leases roll back state and checkpoint writes.
7. Human waits complete the scheduler tick with the business run still `waiting`. They neither hold a connection nor consume polling/retry budgets while waiting for a person.
8. `platform_respond_checkpoint`: lock run then checkpoint; check checkpoint-specific role, pending state, expected revision and typed value. Preserve immutable response/submission key/actor. Advance JSON cursor/generation and enqueue the next event in the same transaction. Same submission replays; a different answer conflicts.
9. `platform_cancel_run`: revision-check cancellation and cancel pending checkpoints. Later ticks record a no-op receipt; they cannot reopen a terminal run. Revoked run requesters block future work.
10. `lib/platform/workflows/runStore.server.ts`: validated start/list/respond/cancel adapters; `runHandler.server.ts`: scheduler handler. Add a `committed` result variant so the scheduler does not write a second receipt after the atomic RPC.
11. `app/api/workspaces/[workspaceId]/runs/route.ts`: GET bounded runs, POST start, PATCH cancel. `checkpoints/route.ts`: GET pending checkpoints, POST typed response. Shared HTTP adapter enforces session, workspace, streamed body-size limit, same-origin browser writes, private/no-store responses and safe conflict errors.
12. Register `platform_run@1` in the existing database event contracts **disabled by default**. Deploy a compatible worker before enabling admissions; enable only in disposable tests during this slice.
13. Exercise duplicate starts, changed graphs, malformed/cyclic graphs, competing responses, wrong types, role denial/revocation, cancellation and stale leases using real disposable Postgres. Verify graph/API contracts and legacy scheduler behavior with focused tests.

First-version scope: scalar questions, approvals, effect gates and completion. No connector invocation, model call, domain fact mutation or external action is implied by a checkpoint response. The exact target snapshot must be revalidated by the future effect adapter at dispatch.

### Follow-on Core actions

- Next: finish workspace-aware planner input selection, then validate the new atomic persistence and legacy mutation compatibility; use W1–W2 in the [weekly handoff](PLATFORM_WEEK_2026-09-21.md). September 22 adds mapped read IDs, a legacy owner-fallback guard and a scoped manual proposal RPC; retain fail-closed team admission until Docker/SQL concurrency acceptance passes.
- Then: wire a property assignment into a manifest-launched run only when its property and task revision are explicitly mapped (W3).
- Implemented: bounded workspace/collection-bound cursor pages ordered by timestamp + ID; admin recovery requires restored requester authority; supersession creates a new pinned run and retains prior answers/actor attribution. Lists now return `{ items, nextCursor }`.
- Completed locally: real Supabase password/cookie browser sessions prove start, answer, cancel, cursor pages and foreign-user denial. The local runner leases only its own fixture jobs; normal claim contention is covered separately by disposable scheduler acceptance. Production and future inbox UI acceptance remain separate gates.
- Add richer question fields and conditional nodes only with matching schema/interpreter tests; unsupported graph versions fail explicitly.

## Phase 2 — Declarative Engine

Goal: real-estate readiness and client-content review are two data-defined apps using the same interpreter and tooling.

### Code sequence

Items 1–3 are implemented for inert intake-only manifests. Items 4–16 are not implied by installation; W3 adds authorized launch, and W4 may add the human-only form/inbox surface. Tool execution remains gated behind policy, receipts and cost controls.

September 22–23 safety slice: `lib/platform/contracts/capabilityPolicy.ts` defines bounded connection/tool/schema-hash metadata and immutable effect-receipt fields. `20260922110000_platform_capability_receipts.sql` persists revisioned, allowlisted read/prepare policies and append-only operation receipts with workspace/run linkage, hashes, terminal-resolution checks and service-only writes. `20260922120000_platform_capability_admission.sql` adds revisioned workspace quotas and an idempotent admission reservation that checks the pinned policy, operation identity and schema hashes before reserving step/cost budget. `connector.ts` plus `20260922130000_platform_connector_snapshots.sql` define HTTPS-only reviewed connector metadata and revisioned input/output schema snapshots using the bounded object-schema validator; no credentials or protocol calls are stored/executed. `capabilityAdmission.server.ts` resolves the reviewed connector and exact input snapshot, validates the payload, then consumes the existing reservation RPC without dispatching a provider. `protocolGateway.ts` defines bounded MCP/OpenAPI request/response envelopes; `protocolGateway.server.ts` can prepare a fixture request only after admission, while `invokeCapability` is explicitly disabled. The inert policy rejects external effects, duplicate capability identities, unallowlisted connections and executable fields; no provider is dispatched. `market-digest.v1.json` proves a third app can validate through the same manifest schema and scalar form contract without a vertical TypeScript package. The bounded condition contract is admitted end-to-end: TypeScript graph validation, forward SQL validation, deterministic `answers.*` evaluation, branch reachability checks, queued generation transitions and app-manifest admission all agree. Conditions remain non-executable predicates; MCP/OpenAPI dispatch and provider effects remain disabled.

1. `lib/platform/contracts/appManifest.ts`: parse JSON fields `schemaVersion`, `key`, `version`, `title`, `inputSchema`, `workflows`, `capabilities`, `artifactSchemas`, `settingsSchema`. Reject executable strings, unknown schema features and dynamic imports.
2. Add `platform_app_installs` holding pinned manifest JSON/hash, workspace settings, status and revision. A run copies its selected definition/version at admission; upgrading an install cannot rewrite active runs.
3. Store `real-estate-readiness.v1.json` and `client-content-review.v1.json` as reviewed import fixtures. Installation persists the validated JSON. New apps using supported fields/tools need no per-vertical TypeScript package.
4. Build one manifest form renderer supporting the documented JSON Schema subset, with field labels, descriptions and preserved drafts. Unsupported widgets/schemas return a useful validation error, not guessed controls.
5. `lib/platform/contracts/condition.ts` and `supabase/migrations/20260922100000_platform_condition_nodes.sql`: admit bounded `exists`, `equals`, `all` and `any` predicates with `answers.*` paths only; validate both branches, reject cycles/convergence/unreachable nodes, evaluate deterministically in the worker and enqueue exactly one next generation. Keep capability nodes and provider execution unavailable.
6. Add a policy admission service around `platform_capability_policies` and `platform_effect_receipts`; require a pinned read/prepare declaration, schema hashes, workspace connection allowlist and an operation identity before any future gateway call. Keep `lib/platform/capabilities/protocolGateway.server.ts` disabled until quota reservations and effect gates are complete.
7. `lib/platform/capabilities/protocolGateway.server.ts`: one dispatch function `invoke({ connectionId, tool, schemaHash, arguments, operationId })`; protocol adapters for MCP `tools/list`/`tools/call` and OpenAPI `operationId`. Prefer the maintained SDK after checking the installed/runtime-compatible version.
8. `lib/platform/contracts/connector.ts` and `supabase/migrations/20260922130000_platform_connector_snapshots.sql`: persist reviewed HTTPS connector definitions and immutable input/output schema snapshots. Credentials remain references to workspace secrets; a manifest cannot add a host, executable command, credential or permission. Missing connections and changed schemas block affected nodes visibly.
9. Validate tool input and output against pinned JSON Schema. Enforce timeouts, response size, server-side action policy and quota before execution. Model-supplied JSON and MCP annotations cannot grant new scope.
10. Classify tools as read, prepare or external effect under server policy. Internal domain operations may use thin shared handlers because existing SQL/CMS/email invariants still need enforcement; avoid a class hierarchy or wrapper per workflow step.
11. Persist exact output versions/provenance in existing domain stores and put references/hashes in run state. Run snapshots and generic answers do not silently update authoritative property facts.
12. For external effects, persist stable operation ID, payload/target hash, gate reference and receipt reference before submission. Use provider idempotency, or mark uncertain acceptance `unknown` and reconcile. Reuse email/CMS/billing ledgers; the shared effect receipt store now covers connector evidence.
13. Snapshot-based approval and effect gates share the checkpoint API, while the executor rechecks current authority, source revision, audience, consent, entitlement and budget immediately before acting.
14. Prove both manifests on deterministic connector fixtures first. Then enable explicitly configured providers with cost reservations and recorded outputs. Unsupported capabilities stay unavailable.
15. Property flow: existing shortlist → reviewed sprint assignment → question → sourced brief/draft → approval → separate email effect gate → authoritative delivery receipt.
16. Content flow: manifest input form → missing-information question → draft → approval → effect gate → exact Vibe revision/site application. No scheduler or inbox fork.
17. Persist app install/upgrade/uninstall audit; uninstall stops new admissions and leaves existing evidence intact.

Exit: adding a third app using existing capabilities is a new validated manifest plus settings, not another execution service. New vendor protocols or domain invariants can still require a shared adapter.

## Phase 3 — Control Layer

Goal: people operate the engine from one exception inbox, with observable cost, limits and recoverable failures.

### Code sequence

1. `components/platform/CheckpointCard.tsx`: one discriminated card for questions, approvals and effect gates. Show exact targets/consequences, role limits, validation errors and recoverable drafts. Bulk actions remain individually bound to displayed versions.
2. `app/workspaces/[workspaceId]/inbox/page.tsx`: one queue of pending checkpoints and blocked/stale/unknown runs. Cursor pagination, summary counts and bounded refresh; update route catalog and root README together.
3. Run details show graph progress, questions/decisions, output references and scheduler/effect receipts. Use safe metadata, never raw secrets or cross-workspace traces.
4. Connect Jamie to the same read/response/start services. Chat can propose actions; it does not create a second question/approval store or infer send permission.
5. Extend existing `platform_audit_events` for state transitions, submissions, policies and installs. Start/answer/cancel/worker audit exists in the core slice; do not postpone basic attribution to this phase.
6. Extend cost ledgers with reservations before the first paid call. Enforce workspace concurrency, per-run step/token/time budgets, provider quotas and cancellation in admission/claim/execution. Quotas are transactional, not UI counters.
7. Measure scheduler fairness and claim latency under mixed legacy/platform load. Add workload routing/deadline controls to the existing worker, not a second queue.
8. Add connector health/schema-change alerts, unknown-effect recovery, stale input replacement and manual retry that retains operation identity.
9. Add team invitations, scoped external reviewers, access revocation, retention and restore drills; shared checkpoint UI uses the same resource policies.
10. Pilot both apps with real permission and economic evidence: accepted outputs, response time, inquiries/bookings/publications, provider costs and support overhead. Pricing follows observed results and explicit business decisions.

Exit: two apps can be operated and recovered through one UI with measured costs and no private-data crossover.

## Verification and release

Use the exact commands and scope distinctions in the [September 18 verification record](PLATFORM_VERIFICATION_2026-09-18.md) and [Docker/Auth runbook](../../../infra/local/README.md). Add focused tests for each new slice; existing passes do not validate later changes.

New event admissions remain disabled until the matching worker version and release gates are satisfied. Production migrations, backfills, promotion, outbound sends and paid-provider activation require a separate explicit operational decision. No merge/deploy is authorized by this plan.

## Current ledger and next session

| Phase | Current state | Evidence / remaining gate |
| --- | --- | --- |
| Core Platform | JSON run/checkpoint backend, pagination, recovery, supersession, scope fencing and workspace-scoped planner persistence implemented locally. | Local real-Postgres and real Supabase/browser acceptance pass, including revoked/archived/foreign denial. Production admission remains disabled. |
| Declarative Engine | Manifest contract, revision-checked install API, three reviewed intake fixtures, server-authoritative app launch, bounded condition branching, revisioned capability policies and append-only effect-receipt storage implemented locally. | Resource revisions are pinned; Vibe/content authority remains unavailable. No gateway, capability execution or external effects; manifests still require empty capabilities. Quota reservations remain before activation. |
| Control Layer | Shared checkpoint inbox, ManifestForm, CheckpointCard and run details implemented locally with route inventory updates. | Local rendered browser acceptance and fresh PR CI pass. Quotas, connector operations, Jamie integration and a two-app operational pilot remain later gates. |

Baseline implementation: `3af65f44` on [PR #79](https://github.com/tahsrz/sunset-pulse/pull/79). Fresh CI at that head passed lint, test, scheduler-db, docker-acceptance, jamie-e2e and Vercel; Supabase Preview was skipped. Exact evidence, migration scope and remaining gaps live in the [dated record](PLATFORM_VERIFICATION_2026-09-18.md) and [weekly handoff](PLATFORM_WEEK_2026-09-21.md), not in repeated completion logs here.

**Completed safety slice:** deterministic MCP/OpenAPI fixture responses are validated against the pinned output snapshot, and effect-gate/checkpoint receipt transitions are proven without network calls. Keep real provider calls, credentials and production activation disabled.

**Next action: add connector health and response provenance** — record fixture response hashes/provenance against the pinned connector snapshot and surface schema drift as a blocked, recoverable run state. Keep real provider calls, credentials and production activation disabled until health/drift tests and operational review exist. Conditions are available only as bounded predicates over persisted answers; do not add executable expressions or treat a checkpoint as a delivery receipt. Dates are target work slots, not permission to bypass a failed prerequisite.

Read this ledger, the active W-section and relevant source only. Do not load the archived 165-anchor specification by default. The Praxis and Keller / Westlake plans retain feature constraints and historical evidence; their older "next" sections do not override this queue. Keep one `keller-westlake` area, preserve source uncertainty, and keep email/publication authority separate from sprint approval.
