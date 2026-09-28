# Sunset Pulse operating platform — code-level implementation plan

Date: September 17, 2026. Owner: Taz. Intended implementer: Luna or the current coding agent, working sequentially without subagents unless requested.

Status: **proposed architecture and implementation instructions, not implemented or release-accepted**. This document was created from source inspection. No application code, migration, deployment, billing policy, or sending permission changes are authorized merely by this plan.

Vision: a business describes its work; people supply context and judgment; Jamie prepares and coordinates; the system durably remembers what must happen next. Multiple business applications share execution, permissions, collaboration, evidence, and operational controls without sharing private business data.

## 0. How to execute this plan

1. Read this document alongside [Praxis](PRAXIS_AGENT_WORKSPACE_PLAN.md), [Keller / Westlake](KELLER_WESTLAKE_PROPERTY_SPRINT_PLAN.md), and the [Docker runbook](../../../infra/local/README.md).
2. This document owns the **cross-application roadmap**. Existing plans continue to own their detailed feature contracts, acceptance evidence, and unfinished repairs. It does not replace email approval rules, S1–S10 scan privacy gates, or existing scheduler fencing.
3. Implement one numbered packet at a time. Resolve symbols and current line numbers before editing. Do not recreate an equivalent table, service, or repaired function merely because a future path appears below.
4. Instruction IDs such as `OP04.L03` are stable code-change anchors. They specify declaration/write order, not invented line numbers in files that do not exist yet. Record actual changed lines and commits in the ledger after implementation.
5. Paths are relative to `apps/pulse/` unless prefixed `repo:`. `(new)` means proposed; `(edit)` means an inspected existing integration point. Module names are deliberate proposed names, subject to collision checks in OP00.
6. Database names below use `platform_` to avoid confusing the existing `public.workflows`, `public.sprints`, browser agent sessions, and tenant site identities with new runtime concepts.
7. Migration suffixes below are reserved design labels. At implementation, allocate unique increasing timestamp prefixes after inspecting the then-current migration list. Never rewrite an applied migration.
8. Preserve current uncommitted work, particularly both plans, scan-store/model changes, upload/CSP configuration, and the partial scan job bridge. Do not reset or commit unrelated changes.
9. Build approved capabilities, not an arbitrary-code executor. A prompt, uploaded document, or app manifest cannot install code, change credentials, grant permissions, or authorize external effects.
10. No production writes, new paid providers, real customer messages, real interior-media processing, or automatic billing during implementation fixtures. Use disposable environments and synthetic data.

### Product defaults used to make the plan executable

- First vertical: real estate, using the existing single `keller-westlake` area and Monday 08:00 America/Chicago proposals. Scheduling infrastructure stays timezone-aware and app-neutral.
- Second vertical: **agency/client content approvals**, chosen to prove a different domain using the existing Vibe publishing boundary without first requiring a new vendor marketplace. Maintenance/dispatch follows as an extension, not the initial proof.
- Personal workspaces first; private team workspaces later. No implicit sharing of existing personal records with a newly created organization.
- Drafting and authorized read-only research may run under bounded grants; outbound messages, publication, spending, credential changes, and destructive actions require their own authority.
- Keep the current Next.js modular application. Isolate heavy execution in workers; do not start with a repository-wide microservice or framework rewrite.
- These are architecture defaults, not instructions to activate subscriptions, sending, or new integrations. External provider, retention, and commercial launch choices remain explicit release gates.

## 1. Source-backed starting point

| Area | Existing entry point / symbol | Reuse and limitation |
| --- | --- | --- |
| Authentication | `lib/core/routeAuth.ts`: `requireSignedInUser`, `isAuthResponse` | Shared signed-in guard; business membership still needs a separate authorization check |
| Tenant sites | `lib/tenancy/contracts.ts`, `resolveTenantContext.ts` | A tenant scope currently maps to site configuration, not a universal business workspace |
| Durable jobs | `lib/autonomous-workflows/durableScheduler.server.ts`: `processQueuedWorkflowJobs` | One claimed job at a time, maximum ten per invocation, lease/retry/deferral behavior; preserve SQL invariants |
| Registered workflows | `lib/autonomous-workflows/workflowRegistry.server.ts`: `WorkflowExecution`, `getWorkflowHandler` | Only `hotlist_email` and `sprint_planner` currently registered |
| Event producer | `lib/autonomous-workflows/schedulerEvents.server.ts`: `enqueueWorkflowEvent` | Versioned service-only event path, owner/event dedupe; currently restricts workflow keys |
| Worker invocation | `app/api/admin/automations/hotlist-email/worker/route.ts` | Cron-authenticated, 60-second route, upload cleanup before job work; not a general long-running compute service |
| Command preparation | `lib/command-center/commandRouter.ts`, `workerRoster.ts` | Routing, retrieval and structured/template outputs exist; persona names and scores are not executor availability or benchmark evidence |
| Jamie | `lib/ai/jamieTools.ts`, `jamieModelRouting.ts`, `knowledgeRetrieval.ts` | Reuse supported generation/retrieval adapters after checking their actual contracts; do not treat response formatting as a generation service |
| Property planning | `lib/property-sprints/planPropertySprint.server.ts`: `createPropertySprintProposal` | Existing shortlist-to-proposal transaction; preserve revisions, exclusions and unresolved facts |
| Collaboration | `lib/property-sprints/shortlist.server.ts`: `addPropertyNote` | You/Jamie notes exist; a note is not a verified fact or execution permission |
| Assignment completion | `supabase/migrations/20260915040000_atomic_assignment_completion.sql` | Existing atomic assignment/item/backlog completion; extend for worker evidence rather than bypassing it |
| Email | `lib/autonomous-workflows/hotlistEmailWorkflow.server.ts`: `insertRun`, `sendRun` | Reuse draft/audience/revision/delivery boundaries; sprint approval does not authorize sending |
| Content | `lib/cms/vibeWorkflow.ts`, `vibeService.ts` | Draft, review, immutable revision and separate site application; preserve exact revision approval |
| Scan bridge | `lib/scans/scanJobs.server.ts`, `scanJobReconciler.server.ts` | Partial uncommitted intent/reconciler implementation; not a enabled processor or generic production bridge |
| Reconstruction | `lib/scans/reconstruction.ts`: `reconstructionUnavailable` | Real processing remains unavailable until an actual adapter and evidence exist |
| Billing | `lib/billing/stripeWebhookLedger.ts`, `lib/profit/internalCostLedger.ts`, `billableOutcomeLedger.ts` | Existing commercial records; use adapters, not a competing invoice or payment ledger |
| Local-first | `lib/powersync/schema.ts`, `repo:infra/powersync/README.md` | Feature-gated subset of records; not universal offline operation or collaborative editing |
| Local infrastructure | `repo:infra/local/compose.yaml`, `repo:infra/local/README.md` | Local Mongo and disposable acceptance; not production worker hosting |

The repository contains additional scheduling/backend/packages sources. Root npm currently installs only `apps/pulse` as a workspace. Do not count every directory as an integrated, deployable application.

## 2. Architecture and non-negotiable boundaries

```text
Apps: real estate | client content approvals | later service-business apps
                              |
Server APIs: authenticated actor + workspace + validated domain input
                              |
Domain services ---- events/outbox ---- shared workflow coordinator
     |                                      |
authoritative records                 existing workflow_jobs
     |                                      |
artifacts/revisions <---- registered capabilities / specialized workers
     |                         |
review + human input      effect receipts + cost + traces
     |                         |
publication/delivery ---- business outcomes ---- next proposed work
```

The coordinator persists business workflow progress; the existing scheduler remains the only job claim/retry queue. New `platform_runs` and `platform_run_steps` are state records, not another independently leased queue. Human waits release the current scheduler job and resume through a new deduplicated event.

### Authority and ownership rules

- A user ID, workspace ID, tenant site ID, property ID, and scheduler job ID are distinct identifiers. Resolve mappings explicitly.
- PostgreSQL owns platform membership, workflow state, approvals, receipts and references. Existing domain services continue to own their entities; Mongo owns existing scan session state, private object storage owns media bytes, TAH/indexes are retrieval projections.
- Use domain-specific tables for properties, content briefs, bookings and orders. A generic `entity_ref` links records; it is not permission to replace them with an unvalidated JSON blob.
- Every referenced input/output must be proven to belong to the run workspace through its domain adapter. UUID syntax alone is not authorization.
- Exactly-once external delivery is not promised. Use at-least-once jobs, stable effect identity, provider idempotency where available, reconciliation, and explicit `unknown` states.
- Recheck authority and exact input revision at the point of effect. Approval granted yesterday does not override today's revoked membership, changed audience, cancellation, consent withdrawal, or spending limit.
- A generic approval row does not override email, CMS, contract or scan-specific requirements. Domain adapters enforce their existing policy too.
- General workflow dependencies are a bounded DAG initially. Reject cycles. Long-lived recurring work is a new occurrence, not an unbounded agent loop.

### Proposed shared directory boundary

```text
lib/platform/
  contracts/       # serializable Zod/TypeScript contracts only
  access/          # membership, grants, policy checks (server)
  events/          # validated producers, outbox dispatch and reconciliation
  workflows/       # immutable definitions, run/step transitions, scheduler bridge
  capabilities/    # trusted registry and executor adapters
  collaboration/  # questions, answers, comments, revision conflicts
  artifacts/      # immutable output versions, provenance and invalidation
  effects/        # external-effect identity, delivery/publication reconciliation
  operations/     # quotas, cost adapters, metrics and recovery
  apps/           # reviewed first-party package definitions and installs
```

Do not create empty folders or unused abstractions in the first PR. Create each module when its packet supplies a consumer and tests.

## 3. Database migration sequence and compatibility strategy

| Packet | Proposed migration suffix | Principal changes |
| --- | --- | --- |
| OP01 | `platform_workspaces.sql` | Workspaces, memberships, explicit site links, append-only audit records and RLS |
| OP02 | `platform_scope_backfill.sql` | Domain scope links and resumable personal-workspace mappings; no mass sharing |
| OP03 | `platform_events_outbox.sql` | Validated event ledger, transactional outbox and per-consumer receipts |
| OP04 | `platform_workflow_state.sql` | Versioned definitions, runs, steps, waiting and terminal transitions |
| OP05 | `platform_scheduler_bridge.sql` | Additive workspace/run-step metadata and registered platform tick/results; retain legacy jobs |
| OP06 | `platform_artifacts.sql` | Artifact versions, source/input references, invalidation and access policies |
| OP07 | `platform_human_input.sql` | Questions, immutable answers, assignment and answer/resume transaction |
| OP08 | `platform_approvals_grants.sql` | Exact-output approvals, limited autonomy grants, revocation |
| OP09 | `platform_effect_receipts.sql` | Durable effect intents, attempts, ambiguous outcome reconciliation |
| OP11 | `platform_property_execution.sql` | Assignment/run references, worker evidence and fenced domain completion |
| OP13 | `platform_apps_content.sql` | First-party app installs, content briefs and publication requests |
| OP14 | `platform_worker_controls.sql` | Fairness, quota reservations, worker routing and operational limits |
| OP15 | `platform_invitations.sql` | Expiring invitations, team collaboration and explicit resource sharing |
| OP16 | `platform_retention.sql` | Audited retention requests, tombstones and cleanup progress |

All mutations that cross platform tables occur in a transaction/RPC. For cross-store changes, use recorded intent + idempotent delivery + reconciliation, never a fictitious distributed transaction. Upgrade in expand/backfill/verify/cutover phases; destructive column removals require a later reviewed migration.

Every new private table requires explicit RLS, indexes on scoped access paths, composite workspace foreign keys where feasible, and denied anonymous access. A service-only table gets no accidental authenticated write policy. Each security-definer RPC fixes its search path, qualifies objects, revokes default PUBLIC execution, grants only intended roles and validates scope; broad service credentials are not a substitute for route-level actor authorization. API error mapping is consistent: 400 malformed input, 401 no session, 403 forbidden action, 404 absent/inaccessible private record where enumeration matters, 409 stale/conflicting revision, 429 quota, 503 unavailable capability, and sanitized 500 unexpected failure.

## 4. Ordered implementation packets

### OP00 — Inventory, boundaries and evidence before abstraction

Dependencies: none. Output: an honest executable baseline, not a code rewrite.

- **OP00.L01** `(new) docs/PLATFORM_BASELINE.md`: record commit, dirty paths, inspected symbols, actual npm workspaces, migration head, local/runtime versions and configured-but-not-proven integrations; do not copy secrets.
- **OP00.L02** Inspect existing `workflows`, `sprints`, assignments, tenant mappings, billing and organization tables in both SQL and Prisma. Document ownership and exact collisions before creating `platform_` tables.
- **OP00.L03** `(new) docs/PLATFORM_CAPABILITY_MATRIX.md`: give each capability `implemented`, `mock`, `unavailable`, or `acceptance_pending`; include input, effect, executor and evidence path. UI persona metadata must never mark it executable.
- **OP00.L04** Inventory current RPC overloads and grants from all forward migrations, not only the first table definition. Capture old-client compatibility cases for enqueue, claim, defer, complete and failure resolution.
- **OP00.L05** Record unfinished Praxis/Keller gates as dependencies. Fix correctness defects in reused boundaries before enabling the new path; unrelated scan processing cannot block property briefs.
- **OP00.L06** Add an evidence ledger row for each packet below. Distinguish `planned`, `code_present`, `local_verified`, `ci_verified`, and `pilot_accepted`.
- **OP00.L07** Run only checks appropriate to this baseline; record unavailable environments and exact exits. A docs-only planning run does not count as application validation.
- **OP00.L08** Keep application features unchanged in this packet. Review scope against the dirty worktree before the first implementation PR.

Exit: implementer can identify existing authoritative services and name the first unsupported boundary without guessing.

### OP01 — Workspace identity and server-enforced membership

Dependencies: OP00.

- **OP01.L01** `(new) lib/platform/contracts/identity.ts`: export UUID schemas and distinct `WorkspaceId`, `ActorId`, `SiteId` types; export `WorkspaceRole = owner | admin | member | reviewer | viewer` and an explicit capability-to-role policy. Type branding must not replace runtime checks.
- **OP01.L02** Create `platform_workspaces(id, kind, name, created_by, status, revision, created_at)` and `platform_memberships(workspace_id, user_id, role, status, revision)` with unique membership and a partial uniqueness rule for each user's active personal workspace.
- **OP01.L03** Create `platform_site_links(workspace_id, site_config_id, linked_by, revision)` only after confirming the authoritative site table/type. A site has one active business-workspace link; linking verifies existing owner authority.
- **OP01.L04** Add `platform_audit_events(id, workspace_id, actor_id, actor_kind, action, resource_type, resource_id, correlation_id, occurred_at, safe_metadata)`. Clients cannot mutate audit rows; never log credentials, complete messages or media payloads.
- **OP01.L05** Add non-recursive membership RLS helpers with fixed search paths and narrow grants. Ordinary users cannot add themselves as owners, enumerate foreign memberships, or select private tenant data through a helper function.
- **OP01.L06** `(new) lib/platform/access/workspaceAccess.server.ts`: call the existing authenticated-user service, fetch active membership, enforce action and resource workspace, then return a server-only `WorkspaceContext`. Do not trust body/query actor IDs.
- **OP01.L07** Add transactional `ensure_personal_workspace` and owner-safe membership mutations. Last-owner removal/demotion is prohibited; transfers require an explicit confirmed operation. Service-role functions still verify the authenticated actor established by the route.
- **OP01.L08** `(new) tests/unit/platform-access.test.ts` and `supabase/tests/platform_workspace_access.sql`: cover foreign UUIDs, role escalation, revoked membership, concurrent personal creation, last-owner races and site-link ownership.
- **OP01.L09** `(new) app/api/workspaces/route.ts`: GET returns only current memberships; POST validates name/kind, applies creation limits and invokes transactional creation. `(new) app/workspaces/page.tsx` supplies a real signed-in selector and create action; wire both into navigation only when usable.

Exit: two real test users cannot read or mutate each other's workspace through UI APIs, direct database access, or object references.

### OP02 — Adapt existing owners without copying their business data

Dependencies: OP01.

- **OP02.L01** `(new) lib/platform/access/domainScope.server.ts`: implement explicit resolvers for shortlist property, sprint, assignment, licensed workflow run, Vibe revision and scan. Each calls its authoritative domain service and returns a proven workspace reference.
- **OP02.L02** Backfill personal workspace mappings for eligible existing owners in bounded, resumable batches with a dry-run report and deterministic replay. Never infer organization membership from email domain or site hostname.
- **OP02.L03** Add nullable workspace columns or mapping tables where needed; retain existing `owner_id` behavior until corresponding reads and mutations are migrated. List unmapped and ambiguous records instead of inventing an owner.
- **OP02.L04** `(new) scripts/platform-scope-backfill.ts`: require an explicit environment target and opt-in write flag; default to aggregate dry-run counts. No automatic execution at server startup.
- **OP02.L05** Introduce workspace-aware overloads of domain services while keeping legacy owner-only functions safe for personal records. Never implement owner-only reads as an unscoped fallback when a workspace lookup fails.
- **OP02.L06** Verify counts, orphan references and cross-workspace associations before adding `NOT NULL` constraints. New rows use workspace context immediately once their writer is migrated.
- **OP02.L07** Document rollback as switching reads to the still-valid legacy personal path and disabling new admissions; do not erase mappings or newly created team data.
- **OP02.L08** Add migration fixtures for an owner with multiple sites, no site, archived records, two users with similar names, and an unresolved scan/listing mapping.

Exit: existing personal workflows still function; no existing record becomes shared merely because workspace support exists.

### OP03 — Typed events and durable cross-system handoffs

Dependencies: OP02.

- **OP03.L01** `(new) lib/platform/contracts/events.ts`: define a strict versioned event envelope and per-event payload schemas; begin with `property.updated.v1`, `artifact.created.v1`, `human_input.answered.v1`, `approval.decided.v1`, `assignment.approved.v1` and `booking.changed.v1`.
- **OP03.L02** Envelope fields: event UUID, workspace UUID, event type/version, source, source-event key, actor provenance, resource reference, resource revision, occurred-at, correlation and causation IDs. Apply byte, nesting and string bounds before persistence.
- **OP03.L03** Create `platform_events` with unique `(workspace_id, source, source_event_key)` and canonical payload hash. Same key/same content returns the original; same key/different content conflicts. Use canonical JSON with explicit field boundaries, not ambiguous colon concatenation.
- **OP03.L04** Create `platform_outbox` dispatch rows and `platform_event_consumptions(event_id, consumer_key, consumer_version)` receipts. Persist a domain mutation and its event/outbox together when both live in PostgreSQL.
- **OP03.L05** `(new) lib/platform/events/eventStore.server.ts`: expose validated internal append/read operations. Browser callers cannot submit arbitrary event names, spoof system actors, or bypass the originating domain mutation.
- **OP03.L06** `(new) lib/platform/events/outboxDispatcher.server.ts`: bounded batches publish to the existing `enqueueWorkflowEvent` adapter, acknowledge only after a receipt, and reconcile ambiguous enqueue responses. Retry uses the same identity and payload.
- **OP03.L07** For Mongo scans, retain the existing conditional Mongo intent and reconcile into PostgreSQL; recheck approval/revision on dispatch and acknowledgement. Do not move scan session ownership into a generic event table.
- **OP03.L08** `(new) tests/integration/platform-outbox.test.ts`: crash after domain commit, after enqueue/before acknowledgement, duplicate concurrent dispatch, payload conflict, foreign source record, revoked authority and delivery reordering.

Exit: a committed business event is not lost when the process dies; replay does not create duplicate logical work.

### OP04 — Persist workflow definitions and business progress

Dependencies: OP03.

- **OP04.L01** `(new) lib/platform/contracts/workflow.ts`: define strict `WorkflowDefinition`, `StepDefinition`, `RunState`, `StepState` and `StepOutcome` schemas. Definitions are immutable, versioned trusted configuration; no executable user-supplied source code.
- **OP04.L02** Step kinds are `capability`, `human_input`, `approval`, and `condition`. Define dependency IDs, registered input mapping, output contract and bounded timeout/retry policy. Reject duplicate IDs, unknown dependencies, cycles and oversized graphs.
- **OP04.L03** Create `platform_workflow_definitions(key, version, definition_hash, definition, status)` with unique key/version and immutable enabled versions; code registry must recognize every enabled definition.
- **OP04.L04** Create `platform_runs(id, workspace_id, definition_key, definition_version, trigger_event_id, source_ref, status, revision, requested_by, created_at)` and unique occurrence identity per workspace/definition/trigger.
- **OP04.L05** Create `platform_run_steps(id, workspace_id, run_id, step_key, status, revision, input_hash, output_artifact_id, wait_ref, scheduler_job_id, generation)`. Enforce composite workspace/run references, bounded serialized inputs and unique `(run_id, step_key)`.
- **OP04.L06** `(new) lib/platform/workflows/transitions.ts`: pure transition rules; terminal states cannot revive; cancellation and supersession win over late completion; conditions are registered predicates, not `eval` expressions.
- **OP04.L07** `(new) lib/platform/workflows/runStore.server.ts`: transactional start, advance, wait and cancel RPC wrappers. Lock run before step consistently; return conflict on expected revision mismatch; write audit and ready-step outbox in the same transaction.
- **OP04.L08** Human waits persist a question/approval reference and release compute. Do not keep a server request alive or consume the scheduler's bounded polling budget while waiting days for a person.
- **OP04.L09** Version each execution generation. Replan after input changes by superseding affected pending work and creating new generations; keep old evidence readable rather than mutating a completed output.
- **OP04.L10** `(new) tests/unit/platform-workflow-transitions.test.ts` plus DB tests: parallel siblings, failed prerequisite, duplicate start, stale revision, cancellation race, unsupported definition version, and restart after every transition.

Exit: a synthetic workflow can persist, stop, resume after process restart, and reach one consistent terminal state without an AI provider.

### OP05 — Bridge workflow steps to the existing scheduler

Dependencies: OP04. Preserve all legacy scheduler behavior.

- **OP05.L01** `(new) lib/platform/workflows/schedulerBridge.server.ts`: create ready-step event identity from workspace/run/step/generation; enqueue a small pointer payload, never raw media or a full prompt.
- **OP05.L02** `(edit) lib/autonomous-workflows/schedulerEvents.server.ts`: replace the hard-coded key enum with a reviewed typed registry that still rejects unknown keys; register only `platform_step` version 1 when its handler is present.
- **OP05.L03** Forward-migrate the database contract registry and any workflow/result-type checks; add `platform_step` alongside existing keys. Audit all RPC definitions/overloads, result reads and UI discriminants before widening `WorkflowExecution`.
- **OP05.L04** Add nullable `workspace_id` and `platform_step_id` metadata to `workflow_jobs` with validated composite scope. Retain `user_id` as the legacy requesting principal, not the team's authorization policy. Personal mappings are explicit; old jobs remain readable.
- **OP05.L05** Add a narrow service-only platform enqueue RPC or validated overload that resolves the persisted step and workspace itself. Team event dedupe derives from step/generation, not whichever member happened to click Retry.
- **OP05.L06** `(new) lib/platform/workflows/stepHandler.server.ts`: reload run/step, authorize the original actor or current delegated grant, verify generation and input revisions, then execute exactly one bounded transition/capability.
- **OP05.L07** Complete waiting transitions using a durable `platform_step` result receipt for the step transition; business run stays waiting. Answer/approval events schedule a new generation. Do not represent a human wait as a completed business workflow.
- **OP05.L08** Add a fenced platform completion RPC that locks/validates the live scheduler lease and step generation, persists step/output references and scheduler result atomically when in PostgreSQL. A stale lease may not save an accepted step output before later failing receipt creation.
- **OP05.L09** `(edit) durableScheduler.server.ts`: introduce a configurable deadline/remaining-time budget and stop claiming early; preserve recovery, pause/cancel and failure semantics. Do not claim a batch that cannot finish within the route deadline.
- **OP05.L10** `(edit) workflowRegistry.server.ts`: add the handler and `platform_step` result union; retain existing result variants and clients. Preserve the 20-poll/24-hour deferred budget for actual external polling until a separately tested policy replaces it.
- **OP05.L11** Add DB acceptance for old/new jobs together, service-only enqueue, foreign workspace, live/expired lease, duplicate generation, pause/cancel and heartbeat timeout. Extend the disposable harness without selecting unrelated queued jobs.
- **OP05.L12** Keep existing cron URLs initially. Rename the hotlist-labelled cron route only in a separate compatibility change that guarantees there is one intended trigger configuration, not accidentally doubled dispatch.

Exit: one synthetic capability and one human-wait step run through the same scheduler as hotlist/sprints, with no second claim/retry system.

### OP06 — Immutable artifacts, sources and stale-output detection

Dependencies: OP04; connect completion through OP05.

- **OP06.L01** `(new) lib/platform/contracts/artifact.ts`: define supported kinds, artifact/version UUIDs, workspace, producer run/step, content hash, input references, source references, created-at and schema version. Approval/publication are separate records, not a mutable content flag.
- **OP06.L02** Create `platform_artifacts` identities and immutable `platform_artifact_versions`; put bounded structured text in PostgreSQL and large/private bytes in existing authorized storage. Store object keys, never durable signed URLs.
- **OP06.L03** Create input/source edges with exact domain revision/hash, source locator, observation date and verification state. `supplied`, `confirmed`, `conflicting`, and `unknown` remain distinguishable.
- **OP06.L04** `(new) lib/platform/artifacts/artifactStore.server.ts`: persist validated output under `(step_id, generation, output_slot)` dedupe. Same identity/different bytes conflicts. Replays return the original artifact.
- **OP06.L05** `(new) lib/platform/artifacts/invalidation.server.ts`: consume changed-record events, mark dependency projections stale in bounded batches, and request replacement work. Do not overwrite approved artifacts or automatically publish replacements.
- **OP06.L06** `(new) app/api/workspaces/[workspaceId]/artifacts/[artifactId]/route.ts`: authorize through workspace plus domain adapter; resolve requested version; return private, no-store DTO or a short-lived authorized download capability.
- **OP06.L07** Record rejected/unaccepted worker outputs separately from accepted results if useful for diagnosis, with retention limits. A crashed worker's upload is not automatically the current artifact.
- **OP06.L08** Test changed property fact, duplicate generation, storage failure after metadata staging, guessed artifact ID, expired access, revoked reviewer and a stale artifact's publication denial.

Exit: every accepted output has identity and provenance; changing inputs makes affected work visibly stale without destroying history.

### OP07 — Human questions and answers are durable workflow steps

Dependencies: OP05, OP06.

- **OP07.L01** `(new) lib/platform/contracts/humanInput.ts`: define question types `text`, `number`, `date`, `choice`, `record_reference`, with typed constraints, purpose, source context, assignee, due-at, and expected question revision.
- **OP07.L02** Create `platform_questions` scoped to run/step/generation and immutable `platform_answers` with author identity, submission key, typed value, evidence references and timestamp. Bound field lengths and attachment references.
- **OP07.L03** `(new) lib/platform/collaboration/questionService.server.ts`: create/reuse one question per step generation. Accept answers only from authorized members or explicitly scoped reviewers; a client cannot label its answer as Jamie/system.
- **OP07.L04** Implement `answer_platform_question` transaction: check active membership and run state, lock run/step/question in fixed order, verify expected revisions, save answer, transition the step, and append the resume outbox record together.
- **OP07.L05** Domain facts do not change merely because a generic answer exists. Register an answer adapter that validates the target field, applies an authorized domain mutation/revision fence, and records `supplied` versus `confirmed` evidence.
- **OP07.L06** `(new) app/api/workspaces/[workspaceId]/questions/[questionId]/answers/route.ts`: authenticate, enforce body size and same-origin protections for cookie-authenticated writes, parse input, call service, return 409 with safe current revision on conflict.
- **OP07.L07** Support explicit “I don't know,” reassignment and cancellation. Unknown answers route to research or another question; they do not satisfy a requirement for confirmed evidence.
- **OP07.L08** Two answers racing: one accepted current answer; loser keeps client draft and receives a conflict. Edit/correction creates a new answer/version and invalidates downstream output rather than silently replacing accepted evidence.
- **OP07.L09** Test answer commit before dispatcher crash, duplicate browser submit, revocation, cancelled run, old question revision, unknown answer, and invalid domain fact.

Exit: Jamie asks a missing-fact question; the user answers later; work resumes exactly once with preserved attribution and no held server request.

### OP08 — Exact-output approval and bounded autonomy

Dependencies: OP06, OP07.

- **OP08.L01** `(new) lib/platform/contracts/approval.ts`: approval target includes workspace, action, exact artifact version/hash, audience snapshot/hash where applicable, domain input revisions, expiry and policy version.
- **OP08.L02** Create `platform_approval_requests` and immutable `platform_approval_decisions`; uniqueness prevents double decision of the same request revision. Reject decisions on superseded, cancelled or stale targets.
- **OP08.L03** Create `platform_autonomy_grants` with principal, capability/action allowlist, resource scope, bounded budget, recipient/destination limits, expiry, revision and revocation. Default is no external-effect authority.
- **OP08.L04** `(new) lib/platform/access/executionPolicy.server.ts`: return `allow`, `require_approval`, or `deny` with a stable reason. Recheck current membership/grant, domain policy, content freshness and quota both at dispatch and effect submission.
- **OP08.L05** Separate approval of a plan, acceptance of an artifact, approval of delivery, and approval of publication. UI displays the concrete consequence before confirmation; approvals cannot be inferred from chat sentiment or a task marked done.
- **OP08.L06** Bulk approval creates individually bound decisions for each displayed output and its audience; changed items are excluded with an explanation. “Send to all” means the reviewed eligible audience snapshot, never all contacts found at execution time.
- **OP08.L07** Generic autonomy cannot weaken existing licensed-email settings, consent/suppression checks, CMS review, or scan publication consent. Deny unsupported effect adapters even when a grant exists.
- **OP08.L08** Add concurrent decision/revocation tests, expired grants, changed message/audience, reviewer versus publisher roles, cross-workspace request, and queued work after membership removal.

Exit: authority is explicit, narrow and revocable; all changed-output cases require fresh review.

### OP09 — External effects, receipts and ambiguity handling

Dependencies: OP08.

- **OP09.L01** `(new) lib/platform/contracts/effect.ts`: define `EffectIntent`, `EffectAttempt`, `EffectReceipt` and states `prepared`, `submitting`, `confirmed`, `unknown`, `failed`, `cancelled`. Include stable operation identity and the exact approval/grant reference.
- **OP09.L02** Create `platform_effect_intents` unique by workspace/action/resource-version/destination identity; record payload hash, reserved budget, policy decision, provider key and correlation. Separate a deliberate resend from a retry through a new reviewed operation ID.
- **OP09.L03** `(new) lib/platform/effects/effectService.server.ts`: prepare intent transactionally, recheck authority immediately before submission, call only registered effect adapters, then record the provider receipt. Never hold a DB transaction open during an external network call.
- **OP09.L04** Persist idempotency identity before calling a provider. If a timeout occurs after submission, mark `unknown`; reconcile via provider lookup/webhook where available. If the provider cannot deduplicate or look up the attempt, require operator resolution rather than blind automatic retry.
- **OP09.L05** `(new) lib/platform/effects/emailAdapter.server.ts`: adapt existing `insertRun`, `sendRun` and delivery receipts. Do not introduce a second direct-email path or duplicate the authoritative delivery ledger; platform receipt references the existing one.
- **OP09.L06** `(new) lib/platform/effects/publicationAdapter.server.ts`: adapt Vibe's immutable revision and target-site application. Verify site/workspace mapping, current entitlements and exact approval; rollout or rollback is a separately audited domain action.
- **OP09.L07** Signed webhook callbacks verify raw signature, age, supported event and replay identity before mapping to workspace via the stored provider operation. Never trust a webhook-supplied workspace ID.
- **OP09.L08** Cancellation stops new submission; an in-flight accepted external action may be irreversible. Show this boundary honestly, reconcile actual outcome, and avoid claiming “cancelled” means “unsent.”
- **OP09.L09** Inject crashes before submission, after provider acceptance, before receipt persistence, and during replay. Assert no automatic duplicate send and no false confirmed result.

Exit: an uncertain provider response remains visible and recoverable without manufacturing success or sending twice.

### OP10 — Trusted capability registry and actual worker execution

Dependencies: OP05–OP09. Start with a deterministic fixture capability before model integration.

- **OP10.L01** `(new) lib/platform/capabilities/registry.server.ts`: map reviewed keys/versions to input/output validators, runtime class, required permissions, estimated limits, availability probe and executor. Keep this file server-only.
- **OP10.L02** `(new) lib/platform/contracts/capability.ts`: distinguish preparation, execution and external effects; expose a safe presentation DTO without credentials or executable functions. Unsupported registry entries display `unavailable`.
- **OP10.L03** `(new) lib/platform/capabilities/executionContext.server.ts`: supply authorized domain readers, artifact writer, budget reservation and cancellation signal; do not hand a model a service-role database client or unrestricted fetch tool.
- **OP10.L04** First implement `property.brief.prepare.v1` from validated facts, then `property.outreach.draft.v1`. Both save artifacts and cannot call delivery. Only expose `property.research.v1` when an authorized connector and provenance parser exist.
- **OP10.L05** Adapt the actual existing generation service after inspecting its provider/runtime contract. Allocate a generation ID before calling it; persist model/prompt version, input references, safe usage and cost, validated output and failure status. Reuse existing cost ledger adapters.
- **OP10.L05a** Before enabling any paid capability, implement the minimum OP14.L01 reservation contract and tests, or keep that capability disabled and use deterministic fixtures. OP14 later expands fairness/scale; it does not defer the first paid-call budget guard.
- **OP10.L06** Treat source documents/listing prose/retrieved pages as untrusted content. They cannot change system instructions, tool permissions, recipient sets, billing, or approval policy. Validate every model-proposed tool call server-side.
- **OP10.L07** Research connectors enforce authorized hosts/sources, redirects, private-network blocking, response size/type and timeout limits; retrieved URLs are not unrestricted network instructions. Connector credentials are workspace-scoped references resolved only server-side.
- **OP10.L08** `(edit) lib/command-center/workerRoster.ts` and presentation adapters: separate persona descriptions from actual supported execution capabilities. Keep existing command UX; show an assignment as completed only after its artifact/evidence transaction succeeds.
- **OP10.L09** Add tests for unavailable provider, malformed model output, malicious source instructions, missing citations, budget exhaustion, cancelled generation and changed property revision during execution.

Exit: an approved task produces a real saved deliverable with evidence; unavailable tools produce an honest blocked state, not simulated success.

### OP11 — First complete vertical: Keller / Westlake property operations

Dependencies: OP10; existing property/sprint SQL integrity prerequisites.

- **OP11.L01** `(new) lib/platform/apps/realEstate/definition.ts`: declare trusted workflow `property-readiness@1` using existing shortlist IDs and task kinds. Preserve one area and existing weekly scheduling defaults.
- **OP11.L02** `(edit) lib/property-sprints/planPropertySprint.server.ts`: keep `createPropertySprintProposal` and atomic proposal RPC; enrich approved item snapshots with supported capability, property revision, required inputs and artifact contract. Planning still produces a proposal, not permission to send.
- **OP11.L03** Bridge `approve_sprint_with_assignments` to append one `assignment.approved.v1` outbox event per supported assignment in the same transaction. Unsupported assignments remain visibly unassigned/blocked.
- **OP11.L04** `(new) lib/property-sprints/workers.server.ts`: resolve assignment to platform run through unique assignment/generation mapping; reuse capability execution, not a property-specific worker queue.
- **OP11.L05** Branch missing identity/facts into OP07 questions and authorized research. Preserve original-versus-current price, unresolved zoning, and proposed-bedroom-conversion distinctions from the Keller plan.
- **OP11.L06** Extend worker completion with assignment/input revision, lease/generation and artifact references. Reuse the sprint-first lock order and atomic item/backlog updates; keep manual completion explicitly attributed rather than pretending a user click is worker execution evidence.
- **OP11.L07** Draft buyer brief and optional audience-specific outreach from accepted facts. Present outputs for review; email is a separate OP08/OP09 action with automatic sending disabled for this workflow by default.
- **OP11.L08** Subscribe to authoritative inquiry and booking state through adapters; distinguish requested, booked, cancelled and completed. Weekly report counts real outcomes, unanswered questions and pending reviews, not agent activity as revenue.
- **OP11.L09** Add end-to-end fixtures for all four property branches, two owners, one missing-information pause, one changed-input invalidation, a blocked connector, an approved draft and a duplicate booking event.
- **OP11.L10** Update the Keller plan ledger with actual code/acceptance evidence; leave scan reconstruction on its independent gated track. No prerequisite that every property have a 3D artifact.

Exit: shortlist → proposed sprint → approval → question → answer → brief/draft → separate reviewed delivery → actual outcome, using one shared engine.

### OP12 — One collaborative workspace and exception inbox

Dependencies: OP07–OP11.

- **OP12.L01** `(new) app/workspaces/[workspaceId]/page.tsx`: authenticate/authorize on the server and render a bounded workspace summary; await Next.js 15 route params; do not fetch an internal HTTP API merely to call the same server service.
- **OP12.L02** `(new) app/workspaces/[workspaceId]/inbox/page.tsx` and `components/platform/WorkspaceInbox.tsx`: separate needs-input, needs-approval, failed/unknown, stale-output and ready-result views; use server-loaded serializable DTOs and a small interactive client component.
- **OP12.L03** `(new) components/platform/QuestionCard.tsx`: controlled fields, labels, due date, source context, preserved drafts, pending state, validation and explicit conflict resolution. Never clear an answer draft on failed save.
- **OP12.L04** `(new) components/platform/ApprovalCard.tsx`: show exact content version, intended action, audience count and exclusions, expiry and source limitations; disable approval if stale. Make bulk decisions reviewable item by item.
- **OP12.L05** `(new) app/workspaces/[workspaceId]/runs/[runId]/page.tsx`: show business progress, paused questions, artifacts, attempts, receipts and next permitted action. Do not expose tokens, raw prompts or private cross-workspace traces.
- **OP12.L06** `(new) lib/platform/collaboration/inbox.server.ts`: cursor pagination and aggregated counts; use indexed scoped queries, not an N+1 query per card. Bounded refresh, stop polling hidden tabs, and surface connection state honestly.
- **OP12.L07** Connect Jamie's existing conversation context to authorized records, questions and proposed actions; answering through chat calls the same validated service and requires confirmation where a correction has broader effects. Do not introduce a second chat store by default.
- **OP12.L08** `(edit) lib/navigation/routeCatalog.ts` and the marked route inventory in `repo:README.md` in the same PR. Dynamic routes need a real workspace selector; route catalog presence is not authorization.
- **OP12.L09** Add keyboard, screen-reader, empty/error/loading and stale-save tests, plus real-session browser owner/reviewer/foreign-user coverage. Mock operator access does not satisfy the permission gate.
- **OP12.L10** Add thin route handlers for inbox GET, run GET/cancel POST and approval-decision POST from section 6, calling the existing packet services. Cancellation includes expected run revision and stops new work without claiming in-flight effects were undone. Add route-level auth, schema/error and conflict tests for each handler.
- **OP12.L11** `(new) playwright.platform.config.ts` and `tests/e2e/platform-workspace.spec.ts`: use an isolated local Auth/Storage/database target and test-created users, with `E2E_OPERATOR_ACCESS`, `NEXT_PUBLIC_E2E_MODE`, `JAMIE_PUBLIC_GUIDE_E2E_FIXTURE` and `NEXT_PUBLIC_MOCK_MODE` absent/disabled. Current default `playwright.config.ts` enables bypass/mock flags; its run is a separate UI check, not platform authorization acceptance. Do not reuse an already-running bypass server.

Exit: a user can organize work with Jamie from one inbox, with recoverable edits and concrete consequences instead of opaque agent activity.

### OP13 — First-party app packages and second-vertical proof

Dependencies: OP12. Do not add arbitrary plugin loading.

- **OP13.L01** `(new) lib/platform/contracts/appManifest.ts`: validate app key/version, domain adapters, workflow versions, capability requirements, route identifiers, permissions, artifact schemas and settings schema. No secrets, source code, dynamic imports or arbitrary URLs in stored manifests.
- **OP13.L02** `(new) lib/platform/apps/registry.server.ts`: compile-time registry of reviewed `real_estate` and `client_content` packages. An installation chooses enabled configuration from known code; it does not execute uploaded code.
- **OP13.L03** Create `platform_app_installs(workspace_id, app_key, version, status, settings, revision)`. Install/upgrade validates prerequisites; missing connectors disable relevant actions rather than generating fake deliverables.
- **OP13.L04** `(new) lib/platform/apps/clientContent/contracts.ts` and `contentBriefs.server.ts`: domain-specific brief fields for objective, audience, channels, brand references, due date, source facts and revision. Do not reuse property tables with misleading field names.
- **OP13.L05** Define `client-content-review@1`: brief → missing-information question → copy preparation → client review → requested revision or approval → exact Vibe revision preparation → separate authorized site application.
- **OP13.L06** Implement the content capability using OP10, artifacts using OP06, questions using OP07, approval using OP08, publication using OP09. Do not fork scheduler, access, inbox or receipt code.
- **OP13.L07** Add `(new) app/workspaces/[workspaceId]/content/page.tsx` with brief creation and workflow launch; add catalog/README documentation and scope checks. Initially review uses explicitly authorized workspace users; scoped external reviewers arrive in OP15.
- **OP13.L08** Upgrade semantics: running workflows remain pinned to their immutable definition version; new runs use the upgraded install. Uninstall stops new runs and offers explicit cancellation/archive; it never silently deletes customer records.
- **OP13.L09** Acceptance: the same engine runs both apps in one workspace and each app in separate workspaces. No property-specific branching may appear in the core coordinator to make the second app work.
- **OP13.L10** Add content-brief creation and app-install route handlers listed in section 6; delegate to the domain/install services, enforce creation quotas and idempotent submission keys, and reject arbitrary manifest uploads. Add route catalog entries for all new concrete/dynamic screens in the same packet.

Exit: reusable platform claim is demonstrated by two distinct domain models and workflows, not by two skins over the same property feature.

### OP14 — Docker workers, throughput and cost controls

Dependencies: OP13; apply cost limits to new provider-enabled capabilities earlier through OP10.

- **OP14.L01** `(new) lib/platform/operations/limits.server.ts`: per-workspace queue admission, concurrent-run, model-token, byte and monetary limits. Reserve estimated cost atomically before a paid action; reconcile actual cost and release unused reservation exactly once.
- **OP14.L02** Add worker classes `short_io`, `browser`, and `media`; register only provisioned classes. Persist class on scheduler jobs; existing jobs default to the legacy short-I/O path.
- **OP14.L03** Evolve the existing claim RPC with per-workspace fairness and atomic concurrency reservations; define one lock order across quota/run/job rows. Preserve `SKIP LOCKED`, lease fencing, cancellation and legacy API compatibility under multiple consumers.
- **OP14.L04** `(new) workers/platform-runner/main.ts`: poll only eligible jobs, respect shutdown signals, stop claiming on drain, renew leases through a fenced RPC when allowed, propagate cancellation, and return accepted results through the same coordinator/receipt path.
- **OP14.L05** `(new) workers/platform-runner/Dockerfile`: locked dependency install, non-root runtime, minimal writable temporary directory, no baked credentials and no Docker socket mount. Separate CLI-compatible runner modules from Next.js `server-only`/request-context imports; prove the built container starts without a web request.
- **OP14.L06** `(new) repo:infra/workers/compose.yaml`: opt-in local synthetic worker profile with healthcheck, resource limits and explicit disposable services. Keep `infra/local` development data intact; do not bind production credentials or ports by default.
- **OP14.L07** Start with trusted short-I/O handlers. Browser/media workers receive minimum scoped credentials and restricted egress; untrusted user code is outside this plan. Docker packaging alone is not an adequate arbitrary-code sandbox.
- **OP14.L08** Keep web routes as short admission/read/control operations. Move expensive reconciliation out of the current 60-second cron critical path; do not duplicate its cleanup consumer or starve regular jobs.
- **OP14.L09** Adapt existing internal-cost/profit ledgers through `(new) lib/platform/operations/costAdapter.server.ts`; distinguish estimated, reserved, actual and unknown cost. Do not charge customers or reinterpret existing billable outcomes during infrastructure work.
- **OP14.L10** `(new) scripts/platform-load-acceptance.ts`: synthetic tests for 1,000 workspaces × 20 ready transitions/day and a 1,000-transition burst. Label these workload targets, not validated capacity. Measure queue age, p50/p95/p99 completion, fair share, retries, DB locks, memory and per-completed-output cost.
- **OP14.L11** Test worker death, expired heartbeat, budget race, noisy neighbor, provider throttling, stalled cleanup and recovery. Choose production worker hosting only after measured workload and explicit approval of operational cost.

Exit: repeatable container execution and measured throughput, with a noisy tenant unable to consume everyone's capacity or exceed its spending authority.

### OP15 — Team collaboration and scoped external reviewers

Dependencies: OP13; require limits before broad onboarding.

- **OP15.L01** `(new) lib/platform/access/invitations.server.ts`: hashed, single-use, expiring invitation tokens; accepted identity must match the intended verified account unless the owner explicitly replaces the invitation.
- **OP15.L02** Invite acceptance establishes the specified membership only. External reviewers instead receive resource-specific grants and cannot enumerate workspace records, contacts or unrelated artifacts.
- **OP15.L03** Implement explicit personal-to-team share/transfer actions in each domain adapter; show affected artifacts and permissions, lock revisions and audit the operation. Existing personal data is never bulk-shared by team creation.
- **OP15.L04** Questions/comments support assignee changes, mentions and activity history with membership checks. Jamie/system authorship is server-assigned; quoted documents cannot impersonate a team member.
- **OP15.L05** Revocation invalidates new signed-link issuance, queued authority and future reviewer actions; document that already issued URLs expire on their configured TTL and cannot promise instantaneous recall of downloaded files.
- **OP15.L06** For concurrent text editing, start with revision conflicts and comment threads, not silent last-write-wins. Only introduce real-time document merging after a dedicated conflict/permission design.
- **OP15.L07** Extend PowerSync only for a chosen safe record subset after RLS/sync filtering tests. Approvals, sending, publication and grant changes stay online-authoritative; offline notes queue as proposals for server validation.
- **OP15.L08** Test invitation replay, expired token, wrong account, reviewer link enumeration, removal during a running task and a queued offline edit submitted after membership revocation.

Exit: multiple people collaborate safely without turning tenant isolation into merely a UI convention.

### OP16 — Retention, observability and operator recovery

Dependencies: OP14, OP15.

- **OP16.L01** `(new) lib/platform/operations/metrics.server.ts`: emit run/step state age, oldest ready job, blocked-question age, ambiguous effects, stale artifacts, retry counts and cost; reuse existing tracing hooks with redacted metadata.
- **OP16.L02** Correlate workspace/run/step/job/artifact/effect IDs. Restrict operator diagnostics; an ordinary workspace admin does not gain global operator access.
- **OP16.L03** `(new) app/admin/platform-operations/page.tsx`: bounded cross-workspace operational aggregates and explicit authorized drill-down; safe retries create audited attempts, not hand-edited status flags.
- **OP16.L04** Implement reconciliation jobs for orphaned intents, submitted effects without receipts, missing artifacts, stalled projections and released/dead worker reservations. Use indexed bounded scans with cursor progress.
- **OP16.L05** Add retention configuration per artifact/data class and provider, blocked from activation until owner choices are recorded. Deletion starts an audited tombstone workflow that removes bytes, provider copies and projections with retry receipts.
- **OP16.L06** Backup/restore drills use disposable fixtures; verify authoritative records, object references, definition versions and pending jobs together. Restore must not automatically replay old external sends.
- **OP16.L07** Alerts group actionable failures by cause; no message per successful tick. Include a recovery link and distinguish customer action, operator action and temporary provider failure.
- **OP16.L08** Add an incident runbook for disable-new-admissions, pause safe workflows, reconcile in-flight effects, drain workers, restore and cautiously resume. App rollback must tolerate additive database schema and pinned old definitions.

Exit: failures can be explained and repaired without reading private payloads or manipulating production rows ad hoc.

### OP17 — Controlled pilot, outcome measurement and further applications

Dependencies: OP16; no global launch by default.

- **OP17.L01** `(new) lib/platform/apps/availability.server.ts`: server-enforced pilot allowlist/installation checks; UI hiding is not a security boundary. Enable only accepted capability versions and configured integrations.
- **OP17.L02** Start with synthetic end-to-end users, then one explicitly approved owner workspace. Keep customer-facing sends/publication disabled until a deliberate exact-content approval and environment check.
- **OP17.L03** Measure time from request to useful reviewed artifact, owner review time, unresolved-question duration, accepted output rate, actual completed bookings and total cost. Agent counts and task counts are not business success.
- **OP17.L04** Add `(new) docs/PLATFORM_PILOT_EVIDENCE.md`: migration head, deployed build, tested actors, workflow IDs, privacy checks, failures, known unavailable capabilities and rollback observation. Redact customer content.
- **OP17.L05** Pricing experiments remain shadow calculations until the owner chooses a model and verifies actual delivery economics. Reuse current subscription/outcome billing, entitlements and refund/disqualification rules through reviewed adapters.
- **OP17.L06** Extend to property maintenance only after defining work orders, vendor scope, estimates, spending approval, dispatch and completion evidence. Reuse the coordinator unchanged; domain adapters hold industry rules.
- **OP17.L07** Other later packages: research monitoring, home-service quoting, restaurant exception handling, onboarding/training. Each must supply domain schema, trusted capabilities, authority boundaries and acceptance evidence before install becomes available.
- **OP17.L08** General marketplace, user-authored workflow designer, arbitrary-code agents, universal offline collaboration and real-time game infrastructure are separate future projects, not hidden completion requirements for this release.

Exit: two accepted application packages deliver useful work to a controlled pilot with measured cost and safe recovery.

## 5. Contract sketches — declaration order, not drop-in production code

These sketches fix the design vocabulary. Add strict Zod validation, domain ownership checks, bounded data and server/database enforcement in the packets above. TypeScript alone does not enforce authorization. Identifiers below are strings for illustration; actual code uses the OP01 UUID schemas/types.

### 5.1 Serializable resource and event contracts

```ts
export type EntityRef = Readonly<{
  workspaceId: string;
  kind: 'property' | 'content_brief' | 'assignment' | 'booking' | 'artifact';
  id: string;
  revision: number;
}>;

export type PlatformEvent<TPayload> = Readonly<{
  id: string;
  workspaceId: string;
  type: string;                 // narrowed by the registered schema
  version: number;
  source: string;               // assigned by authenticated producer
  sourceEventKey: string;       // stable across retry
  actorId: string | null;
  actorKind: 'user' | 'service';
  resource: EntityRef;
  occurredAt: string;
  correlationId: string;
  causationId: string | null;
  payload: TPayload;
}>;
```

### 5.2 Step outcomes and deterministic state advancement

```ts
export type StepOutcome =
  | { kind: 'completed'; artifactVersionIds: string[] }
  | { kind: 'needs_input'; questionId: string }
  | { kind: 'needs_approval'; approvalRequestId: string }
  | { kind: 'external_pending'; operationId: string; nextPollAt: string }
  | { kind: 'blocked'; code: string; safeMessage: string }
  | { kind: 'failed'; retryable: boolean; code: string; safeMessage: string };

export type StepState =
  | 'pending' | 'ready' | 'running' | 'waiting_input' | 'waiting_approval'
  | 'waiting_external' | 'blocked' | 'completed' | 'failed'
  | 'cancelled' | 'superseded';

export type StepExecutionToken = Readonly<{
  jobId: string;
  leaseToken: string;
  runId: string;
  stepId: string;
  generation: number;
  expectedRevision: number;
}>;
```

`blocked` means a visible missing capability/constraint, not automatic permission to keep retrying forever. A human can supply missing information or an operator can resolve availability, producing a new validated event. `external_pending` uses bounded scheduler deferral; human waiting does not.

### 5.3 Capability execution context

```ts
export interface CapabilityContext {
  readonly workspaceId: string;
  readonly requestedBy: string;
  readonly execution: StepExecutionToken;
  readonly signal: AbortSignal;
  readAuthorizedEntity(ref: EntityRef): Promise<unknown>;
  saveArtifact(input: ValidatedArtifactInput): Promise<{ versionId: string }>;
  reserveCost(input: CostReservationInput): Promise<{ reservationId: string }>;
}

export interface Capability<TInput, TOutput> {
  key: string;
  version: number;
  workerClass: 'short_io' | 'browser' | 'media';
  inputSchema: RuntimeSchema<TInput>;
  outputSchema: RuntimeSchema<TOutput>;
  requiredActions: readonly string[];
  availability(context: AvailabilityContext): Promise<Availability>;
  execute(context: CapabilityContext, input: TInput): Promise<TOutput>;
}
```

`ValidatedArtifactInput`, `CostReservationInput`, `RuntimeSchema`, `AvailabilityContext` and `Availability` are declarations to implement in OP06/OP10/OP14, not existing imports. Use the installed validation library's actual types. Effectful capabilities must use OP09; there is deliberately no unrestricted `sendEmail`, `executeSQL`, or `fetchAnything` on this context.

### 5.4 Policy decisions and exact-target authorization

```ts
export type ActionTarget = Readonly<{
  workspaceId: string;
  action: string;
  artifactVersionId: string;
  artifactHash: string;
  audienceHash: string | null;
  domainRevision: number;
}>;

export type ExecutionDecision =
  | { kind: 'allow'; authorityId: string; policyVersion: number }
  | { kind: 'require_approval'; reason: string }
  | { kind: 'deny'; reason: string };
```

Build audience hashes from canonical normalized eligible recipients and channels. Recheck suppressions immediately before sending. Suppressed recipients are removed and recorded; new recipients or material message changes require fresh authority. Do not treat a display count as an audience snapshot.

### 5.5 Transactional question-answer flow

```text
answer_platform_question(actor, workspace, question, expected_revision, key, value)
  01 validate current membership and question-specific authority
  02 discover run/step IDs without accepting client-supplied ownership
  03 lock run, step, question in fixed order
  04 recheck membership/grant revocation using the shared authority protocol
  05 reject cancelled/superseded run or mismatched generation/revision
  06 replay same submission key only if content hash matches
  07 validate typed answer and authorized domain-field mapping
  08 write immutable answer and any same-database domain revision
  09 advance step state and generation once
  10 append event + ready-step outbox + audit in this transaction
  11 commit and return answer ID plus authoritative current state
```

If the domain update lives in Mongo/storage, line 08 records a durable intent and the workflow waits for a confirmed domain receipt; it must not proceed as though the answer was already applied. Define the authority-lock protocol in SQL so grant revocation and acceptance cannot both incorrectly win the same race.

## 6. API and UI map

All proposed APIs use authenticated workspace context, bounded payloads, private/no-store responses, safe errors and explicit revision handling. UUIDs in URLs are not access capabilities. No public generic job-enqueue endpoint.

| Proposed endpoint | Purpose | Write authority |
| --- | --- | --- |
| `GET /api/workspaces` | List current user's memberships/workspaces | Authenticated read |
| `POST /api/workspaces` | Explicit personal/team creation | Authenticated actor, creation limits |
| `GET /api/workspaces/[workspaceId]/inbox` | Cursor-paginated exceptions/questions/reviews | Active membership; filtered resource grants |
| `GET /api/workspaces/[workspaceId]/runs/[runId]` | Run progress and safe evidence | Run workspace + resource access |
| `POST /api/workspaces/[workspaceId]/runs/[runId]/cancel` | Stop future work; reconcile effects | Authorized cancellation action, expected revision |
| `POST /api/workspaces/[workspaceId]/questions/[questionId]/answers` | Persist answer and resume intent | Question-specific authority, expected revision |
| `POST /api/workspaces/[workspaceId]/approvals/[approvalId]/decisions` | Exact approve/reject decision | Exact-target approver capability |
| `GET /api/workspaces/[workspaceId]/artifacts/[artifactId]` | Authorized artifact version/preview | Resource scope; private object access |
| `POST /api/workspaces/[workspaceId]/content/briefs` | Create a content-domain record | Content editor capability |
| `POST /api/workspaces/[workspaceId]/apps` | Install a reviewed first-party package | Workspace owner/admin; trusted registry only |

Use Route Handlers where the existing API pattern is shared by UI/connectors; thin Server Actions may call the same services for UI-only mutations. Do not duplicate policy in both. Follow the installed Next.js 15 conventions; no framework upgrade is part of this plan. Keep server credentials and executable registries outside client bundles. Dynamic page params are awaited; errors preserve client drafts.

## 7. Migration and release mechanics

1. Each PR includes code, forward migration if needed, focused tests, relevant route inventory changes and a ledger update. Never check a packet complete from code presence alone.
2. Database-first additive changes must be safe with the currently deployed app. New event contracts start disabled until the deployed worker understands them; enable only after compatibility checks.
3. New code reads old rows through explicit compatibility adapters. Missing required workspace mapping fails visibly; no unscoped fallback or invented default team.
4. Backfill bounded batches; verify ownership/foreign keys; then switch new admission behind a server-enforced configuration gate. Old in-flight jobs retain their handler/definition version.
5. Rollback first disables new admissions, drains or safely pauses work, reconciles unknown external effects, and restores the prior app while keeping additive schema. Do not delete receipts to make a retry look new.
6. Production migration, promotion, real-data cleanup, external sends and paid-provider activation require explicit release authority. PR creation/merge/deployment are separate from local implementation status.
7. Job payloads and event schemas are versioned independently from code deployments. Unsupported versions are blocked/dead-lettered with a safe reason rather than coerced into a newer shape.

## 8. Acceptance matrix and commands

| Boundary | Required fault / adversarial cases | Evidence |
| --- | --- | --- |
| Workspace authorization | Foreign records, role escalation, removed member, leaked UUID | Real authenticated API + database/RLS tests |
| Event/outbox | Concurrent duplicates, changed payload, crash before acknowledgement | Disposable PostgreSQL + Mongo bridge where applicable |
| Scheduler | Live/expired token, cancellation, pause, legacy jobs, fair claims | Existing harness extended; actual overlapping transactions |
| Human collaboration | Two answers, stale form, revoked reviewer, old generation | Unit, DB and authenticated browser |
| Artifacts | Changed input, guessed private object, rejected output, stale publication | Store integration and actual private storage |
| External effects | Provider accepts then timeout, duplicate callback, unknown result | Fake adapter fault injection plus explicitly approved provider sandbox |
| AI execution | Bad structured output, injected instructions, missing connector, cost ceiling | Deterministic fixtures and limited approved provider check |
| Second app | No real-estate branches in coordinator; shared services actually used | Both app flows through the same running scheduler |
| Operations | Worker kill, quota race, restore, retention retry | Disposable Docker acceptance and runbook drill |

Run focused suites from `apps/pulse`, then the existing relevant gates. Commands below are current entry points, not claims that they passed during planning:

```powershell
# Repository root: isolated services only; inspect runbook first.
npm run docker:test

# apps/pulse working directory:
npm run test:unit -- tests/unit/platform-access.test.ts
npm run test:unit -- tests/unit/app-route-catalog.test.ts
npm run test:unit
npm run lint
npm run build
npm run test:db
npm run test:e2e -- --config=playwright.platform.config.ts tests/e2e/platform-workspace.spec.ts
```

The platform test files and dedicated Playwright config in these commands are future deliverables. Configure that project's test directory as `tests/e2e`, explicitly disable all bypass/mock flags, and verify the launched server environment. Run migration replay in an explicitly disposable/local target; do not assume a linked CLI points at a safe database. Full database replay, Docker subsets, mocked UI and signed-in browser tests establish different evidence.

## 9. Milestones, dependency order and initial sprint

| Milestone | Packets | User-visible result |
| --- | --- | --- |
| M0: trustworthy scope | OP00–OP02 | Existing personal data has a safe workspace mapping |
| M1: durable collaboration | OP03–OP07 | A synthetic run pauses for a question and resumes after restart |
| M2: useful real-estate work | OP08–OP11 | Actual briefs/drafts, exact review, controlled effects and outcomes |
| M3: reusable product | OP12–OP13 | One exception inbox and a second domain app on the same engine |
| M4: operational service | OP14–OP16 | Measured workers, teams, quotas, retention and recovery |
| M5: pilot evidence | OP17 | Two accepted packages with observed usefulness and economics |

This is a multi-sprint roadmap, not a five-hour implementation promise. Parallel-looking domains still depend on completed safety boundaries; do not enable incomplete effects to make a demo appear finished.

### First five-hour implementation session — bounded target

1. **Hour 1:** OP00 inventory and collision/ownership map. Inspect migrations and existing integrations; select one synthetic fixture flow. Preserve dirty work.
2. **Hours 2–3:** OP01 contracts, workspace/membership migration and access service; implement personal workspace creation and its permission tests. If equivalent organization primitives exist, adapt them and document the decision.
3. **Hour 4:** OP02 dry-run scope mapping and legacy compatibility fixtures. No production backfill and no team sharing.
4. **Hour 5:** Focused checks, disposable migration/RLS test if available, diff review and evidence update. Record exact unfinished instructions; do not mark OP01/OP02 accepted if their gates did not run.

Next session begins with remaining identity gates, then OP03. Do not spend the first session adding all empty future modules or polishing the scan demo.

### First ten concrete code actionables

1. Inspect authoritative identity/site/sprint schemas and write `PLATFORM_BASELINE.md`.
2. Write the actual-vs-unavailable capability inventory.
3. Add strict platform identity/action contracts with tests.
4. Add additive workspace/membership/site-link/audit schema.
5. Implement narrow RLS helpers and mutation grants.
6. Implement atomic `ensure_personal_workspace` with concurrent replay coverage.
7. Implement `workspaceAccess.server.ts` using the existing sign-in guard.
8. Add foreign-user, revocation and last-owner race tests.
9. Add a dry-run-only-by-default personal scope mapping script and fixtures.
10. Update both existing plans with the new evidence and next uncompleted instruction; open a scoped PR only when requested/authorized by the active implementation task.

## 10. Completion ledger and decision gates

Initial planning baseline: **0 of 18 OP packets implemented under this roadmap**. Existing reusable code is not zero progress on the product, but no new cross-platform packet is accepted from this document. Do not convert packet counts into an effort or production-readiness percentage.

| Packet | Status | Commit / changed symbols | Acceptance evidence | Next gate |
| --- | --- | --- | --- | --- |
| OP00 | Code present; verification pending | `docs/PLATFORM_BASELINE.md`, `docs/PLATFORM_CAPABILITY_MATRIX.md` | Source inspection, route-catalog 4/4 and document checks; full baseline replay pending | Review schema collisions and migration head |
| OP01 | Local code + disposable migration acceptance | `supabase/migrations/20260917010000_platform_workspaces.sql`, identity/access contracts, `/api/workspaces` | Focused platform tests 5/5; production build passed; disposable scheduler DB replay passed with idempotent personal creation plus existing scheduler groups | Full Supabase/RLS replay, authenticated owner/foreign-user route checks |
| OP02 | Workspace-aware property and sprint reads, proposal persistence, approval, schedules and backlog mutations present; remaining sprint mutation migration next | `supabase/migrations/20260917020000_platform_scope_links.sql`, `supabase/migrations/20260917030000_platform_property_scope_mutations.sql`, `supabase/migrations/20260917040000_platform_sprint_scope.sql`, `supabase/migrations/20260918010000_platform_sprint_schedule_backlog_scope.sql`, `lib/platform/access/domainScope.server.ts`, `lib/property-sprints/shortlist.server.ts`, `lib/property-sprints/sprintWorkspace.server.ts`, `app/api/property-shortlist/route.ts`, `app/api/sprints/route.ts`, `scripts/platform-scope-backfill.ts` | Focused workspace/property/sprint suite 25/25; disposable Postgres replay passed workspace-gated schedule creation, backlog add/update/remove revision fencing, schedule/backlog scope links, sprint approval, assignment scope mapping, atomic property create/update, stale-revision rejection, mapped/unmapped scope-link fixtures, privilege assertions and all scheduler groups; production build passed with the existing nonfatal Kepler dynamic-usage warning; live Supabase dry-run remains blocked by invalid configured API key and performed no writes | Run authenticated Supabase/RLS replay; migrate manual sprint creation, sprint item edits/removal, assignment completion and schedule controls through the same explicit workspace boundary |
| OP03 | Planned | — | — | Crash/replay/outbox |
| OP04 | Planned | — | — | Persistent transitions |
| OP05 | Planned | — | — | Shared scheduler compatibility |
| OP06 | Planned | — | — | Provenance and stale outputs |
| OP07 | Planned | — | — | Human answer/resume |
| OP08 | Planned | — | — | Exact approval and revocation |
| OP09 | Planned | — | — | Ambiguous effects and reconciliation |
| OP10 | Planned | — | — | Actual validated outputs |
| OP11 | Planned | — | — | Complete real-estate flow |
| OP12 | Planned | — | — | Authenticated collaboration UI |
| OP13 | Planned | — | — | Second app without core fork |
| OP14 | Planned | — | — | Measured load/cost and worker recovery |
| OP15 | Planned | — | — | Team/reviewer scope |
| OP16 | Planned | — | — | Retention and restore drill |
| OP17 | Planned | — | — | Controlled pilot evidence |

Decisions needed later, not blockers to the first packets: approved research sources and credential ownership; provider/worker hosting and budget; per-data-class retention; licensed/business review policy; team invite expectations; pilot tenants; actual pricing. Store decisions with owner/date and affected packet; do not invent consent, contract terms or costs.

Verification update (September 18): document structure check found 18 packets and 165 unique instruction IDs. The focused identity suite passed 5/5; the focused route-catalog suite passed 4/4; the initial OP02 scope suite passed 6/6, the pre-RPC shortlist/resolver/mutation suite passed 11/11, the atomic scope/mutation suite passed 9/9, the workspace/property/sprint suite passed 21/21, and the current workspace schedule/backlog suite passed 25/25; `git diff --check` passed; production builds passed with the existing nonfatal Kepler dynamic-usage warning; disposable scheduler/Postgres acceptance now replays the property-sprint foundation, revision-checked schedule function, worker-aware sprint schema and all platform migrations, passing workspace-gated schedule creation, backlog add/update/remove revision fencing, schedule/backlog scope links, sprint approval, assignment scope mapping, atomic property create/update, stale-revision rejection, idempotent personal-workspace creation, mapped/unmapped scope-link fixtures, privilege assertions and all existing scheduler groups. The full unit run completed 284 files / 1,134 tests with 1,131 passing and three existing timeout failures in `abidan-tah`, `agent-console-shell`, and `pulse-remote-hydration`. The read-only live OP02 dry-run reached Supabase but returned `Invalid API key` and performed no writes. The new write path requires an explicit `--target`, `--write`, and production confirmation flag; it is not invoked by server startup. Property, sprint, assignment, schedule, backlog and licensed-run resolvers now reject foreign owners and ambiguous/missing personal mappings; workspace-aware property reads, creates, updates and archives require explicit mapped links or transactionally create an actor-owned linked row; scheduler-created property sprints are transactionally mapped to the owner’s personal workspace; workspace reads have no owner-only fallback; workspace approval requires active membership and creates assignment scope links; workspace schedule and backlog mutations require active membership, explicit links and revision fences. Vibe and scan resolvers remain explicit `UNSUPPORTED` gates until their authoritative stores are adapted. No full authenticated RLS replay, platform browser flow, backfill, worker deployment or production migration was run. The Next.js architecture guidance informed server/client separation, awaited route params and thin service-backed API boundaries; this plan does not require a framework upgrade.

The definition of success is not “all pages exist.” It is that two different apps can reliably collect context, wait for people, execute supported work, preserve evidence, respect authority, recover from failures and report useful outcomes through the same engine.

