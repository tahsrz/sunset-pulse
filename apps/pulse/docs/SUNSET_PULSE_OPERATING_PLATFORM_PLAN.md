# Sunset Pulse operating platform — three-phase implementation plan

Revised September 18, 2026 from Taz's five architecture changes. This is the active plan.
Implement sequentially, without subagents. Read this file and only the source files needed for the current action.
The [previous 18-packet specification](archive/SUNSET_PULSE_OPERATING_PLATFORM_PLAN_2026-09-18.md) is historical evidence, not a second implementation backlog.

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

### Current code sequence

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

- Finish workspace mapping/owner compatibility audit and authenticated session/RLS acceptance; add safe actor/domain scope adapters to new admissions.
- Wire a property assignment into a manifest-launched run only when its property and task revision are explicitly mapped.
- Implemented: bounded workspace/collection-bound cursor pages ordered by timestamp + ID; admin recovery requires restored requester authority; supersession creates a new pinned run and retains prior answers/actor attribution. Lists now return `{ items, nextCursor }`.
- Completed locally: real Supabase password/cookie browser sessions prove start, answer, cancel, cursor pages and foreign-user denial. The local runner leases only its own fixture jobs; normal claim contention is covered separately by disposable scheduler acceptance. Production and future inbox UI acceptance remain separate gates.
- Add richer question fields and conditional nodes only with matching schema/interpreter tests; unsupported graph versions fail explicitly.

## Phase 2 — Declarative Engine

Goal: real-estate readiness and client-content review are two data-defined apps using the same interpreter and tooling.

### Code sequence

1. `lib/platform/contracts/appManifest.ts`: parse JSON fields `schemaVersion`, `key`, `version`, `title`, `inputSchema`, `workflows`, `capabilities`, `artifactSchemas`, `settingsSchema`. Reject executable strings, unknown schema features and dynamic imports.
2. Add `platform_app_installs` holding pinned manifest JSON/hash, workspace settings, status and revision. A run copies its selected definition/version at admission; upgrading an install cannot rewrite active runs.
3. Store `real-estate-readiness.v1.json` and `client-content-review.v1.json` as reviewed import fixtures. Installation persists the validated JSON. New apps using supported fields/tools need no per-vertical TypeScript package.
4. Build one manifest form renderer supporting the documented JSON Schema subset, with field labels, descriptions and preserved drafts. Unsupported widgets/schemas return a useful validation error, not guessed controls.
5. Extend the generic run interpreter with `condition` and `capability` nodes. Conditions use a bounded declarative operator allowlist (`exists`, `equals`, `all`, `any`); input mappings use validated paths into run data. No expression evaluation or arbitrary code.
6. `lib/platform/capabilities/protocolGateway.server.ts`: one dispatch function `invoke({ connectionId, tool, schemaHash, arguments, operationId })`; protocol adapters for MCP `tools/list`/`tools/call` and OpenAPI `operationId`. Prefer the maintained SDK after checking the installed/runtime-compatible version.
7. Persist reviewed connector definitions and schema snapshots. Credentials are references to workspace secrets; a manifest cannot add a host, executable command, credential or permission. Missing connections and changed schemas block affected nodes visibly.
8. Validate tool input and output against pinned JSON Schema. Enforce timeouts, response size, server-side action policy and quota before execution. Model-supplied JSON and MCP annotations cannot grant new scope.
9. Classify tools as read, prepare or external effect under server policy. Internal domain operations may use thin shared handlers because existing SQL/CMS/email invariants still need enforcement; avoid a class hierarchy or wrapper per workflow step.
10. Persist exact output versions/provenance in existing domain stores and put references/hashes in run state. Run snapshots and generic answers do not silently update authoritative property facts.
11. For external effects, persist stable operation ID, payload/target hash, gate reference and receipt reference before submission. Use provider idempotency, or mark uncertain acceptance `unknown` and reconcile. Reuse email/CMS/billing ledgers; add a shared effect receipt store only for connectors that lack one.
12. Snapshot-based approval and effect gates share the checkpoint API, while the executor rechecks current authority, source revision, audience, consent, entitlement and budget immediately before acting.
13. Prove both manifests on deterministic connector fixtures first. Then enable explicitly configured providers with cost reservations and recorded outputs. Unsupported capabilities stay unavailable.
14. Property flow: existing shortlist → reviewed sprint assignment → question → sourced brief/draft → approval → separate email effect gate → authoritative delivery receipt.
15. Content flow: manifest input form → missing-information question → draft → approval → effect gate → exact Vibe revision/site application. No scheduler or inbox fork.
16. Persist app install/upgrade/uninstall audit; uninstall stops new admissions and leaves existing evidence intact.

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

Run only affected suites and the necessary database/build gates. Paths below are relative to `apps/pulse`.

- `npm run test:unit -- tests/unit/platform-run-contracts.test.ts tests/unit/platform-run-routes.test.ts tests/unit/platform-run-handler.test.ts tests/unit/scheduler-registry.test.ts tests/unit/scheduler-deferred-outcomes.test.ts`
- `npm run test:db:concurrency`: disposable Postgres, real scheduler + core migrations; new assertions live in `scripts/platform-run-acceptance.mjs`. No environment file or linked production database.
- `npm run build`: Next.js production/type gate.
- Local real-session check: `npm run test:platform:auth -- --stack <local-stack-id>`; reviewed missing local migrations require the explicit `--apply-local-migrations` flag. Full Storage/all-domain RLS, production and inbox UI checks remain separate release gates.
- New event admissions remain disabled until the matching worker version is deployed. Production migration/promotion and external operations are separate from local implementation.

## Current ledger and next session

| Phase | Current state | Evidence / remaining gate |
| --- | --- | --- |
| Core Platform | JSON run/checkpoint backend plus pagination, recovery, supersession and scope fencing implemented. | Real-Postgres acceptance passes. Real-session/browser result recorded below; team-aware planner selection and domain assignment integration remain open. |
| Declarative Engine | Manifest contract, revision-checked install store/API and two reviewed intake fixtures implemented. | No protocol gateway, form renderer, capability/condition execution or external effects. Capabilities must be empty in this schema version. |
| Control Layer | Planned; existing audit reused by core | Unified inbox, quotas, operations and two-app pilot remain open. |

Prior evidence: September 17–18 focused workspace/property/sprint tests passed in separate runs (9 property/scope + 16 route/reader tests); production build and disposable scheduler replay passed. The older full-unit run had three timeout failures. These results concern the old scope adapters, not the new engine.

Next implementer reads this section, the current phase instructions and relevant code only. Do not load the archived 165-anchor plan by default. Keep both domain plans for their feature-specific requirements.

### Current slice evidence

September 18, 2026, local implementation evidence:

- The five focused suites listed above passed **30/30 tests**: graph contracts, workspace routes, atomic handler result and legacy scheduler compatibility.
- `npm run test:db:concurrency` passed every scheduler/workspace group and the new real-Postgres run/checkpoint acceptance. Assertions cover duplicate start, competing answers, exact replay, typed values, gate-specific roles, cancellation, revocation, audit attribution and authenticated-role read isolation (including archived workspaces).
- Resume admission failure leaves the checkpoint pending. Lease expiry while blocked on a run lock rolls back both checkpoint creation and the result receipt. The tests observe actual overlapping transactions/lock waits, not sequential stand-ins.
- The disposable Docker project and its temporary fixtures were removed by the runner. No production database or environment file was used by this acceptance run.
- `npm run build` passed compilation, type checking and production page generation (exit 0). It retained the existing nonfatal Kepler dynamic-server-usage warning. `git diff --check` passed; Git reported only line-ending normalization warnings.
- At the end of the initial Core slice, real-session Supabase/browser acceptance was still outstanding; the follow-up evidence below supersedes that status. Storage/all-domain RLS checks remain separate. The capability matrix and both domain-plan entry points reference this three-phase plan; the baseline remains historical.

### Follow-up slice — September 18

- `20260918030000_platform_scope_fencing.sql` adds active-workspace/member locks to seven scoped mutations and rejects implicit mapped-resource transfers. `domainScope.server.ts` honors an existing team mapping before personal-owner fallback and checks current membership.
- `20260918035000_platform_owner_planning_guard.sql` and `sprintPlanningScope.server.ts` reject team/mixed/unresolved scopes before owner-only planner reads and again at persistence. This closes unsafe admission, **not** the missing team-aware selector. Legacy manual owner-only mutation paths still need explicit workspace adapters before full team rollout.
- `pagination.ts` implements bounded keyset cursors. `20260918040000_platform_run_recovery.sql` adds revision-checked blocked recovery and whole-run supersession, admission-key serialization, preserved checkpoint evidence and audit. New endpoints: `runs/recover` and `runs/supersede`; no second inbox store.
- `appManifest.ts` accepts strict inert JSON: flat scalar object schemas, current checkpoint/complete graphs, input/settings/artifact schemas. Unknown hooks, imports, refs, graph features and nonempty capabilities fail validation. Strings are data and are never evaluated.
- `20260918050000_platform_app_installs.sql` stores manifest JSON/hash, settings, status and revision with scoped reads and service-only transactional writes. Same-version content changes and downgrades conflict; upgrades cannot modify existing run definitions. `apps/route.ts` exposes owner/admin installation.
- `real-estate-readiness.v1.json` and `client-content-review.v1.json` are reviewed **intake-only** fixtures with no tools. Their input schemas describe intended resource identifiers; installation does not bind those identifiers to runs or confer property/publication authority. Domain-aware launch remains a follow-up.
- Verification: **79/79 tests across 13 affected unit suites passed**; `npm run test:db:concurrency` passed all groups including concurrent recovery/supersession/install upgrades, manifest rejection, archived mutations and mapping transfer rollback. Initial production build passed; final rebuild after browser-discovered fixes is running. `git diff --check` passed.
- Real-session/browser acceptance passed on the existing **local** Supabase Auth/PostgREST stack with mock auth disabled: rendered login form → real password/cookie session → workspace creation → run/checkpoint/answer/completion → cancellation → cursor pages. A second real user is denied by both API and real-JWT RLS. `npm run test:platform:auth -- --stack xlyfhiafactxahhvikyv` completed successfully. Screenshots: ignored `.pulse-local/platform-auth-acceptance/login.png` and `runs.png`.
- Browser acceptance found and fixed two real issues: `VibeContext.tsx` inserted automation-only markup/theme changes that broke hydration; `http.server.ts` compared Origin against NextURL's normalized loopback host. Rendering now follows the same path for browsers and automation, and same-origin writes use the actual Host without trusting forwarded-host overrides. Both fixes have regression tests.
- Missing migrations were applied locally without resetting data. Cleanup confirmed zero temporary accounts/workspaces, the test server stopped, and `platform_run.enabled=false` restored. Applied local migrations remain. No production changes or provider execution.

Next slice: implement team-scoped planner selection/persistence and legacy mutation adapters; bind manifest-launched runs to exact authorized property/content revisions. Keep provider execution disabled until capability policy, effect receipts and cost controls exist. The future inbox consumes the existing checkpoint API.
