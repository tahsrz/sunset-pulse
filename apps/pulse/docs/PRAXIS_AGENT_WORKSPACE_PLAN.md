# Praxis Agent Workspace — Implementation Plan

Status: implementation in progress. The September 16 review below supersedes earlier completion claims and execution priorities, including section 13.7. Docker acceptance now runs in disposable Postgres/Mongo containers; the S6 deferral core passes isolated acceptance, and S5 now has atomic reservation, signed-capability issuance, finalize-time byte/signature/hash validation, bounded object cleanup, and Scan Studio direct-upload progress/retry/cancel locally. Full Supabase/auth/storage acceptance and direct signed-upload browser acceptance remain open. Property capture remains private intake/review, with no real reconstruction processor enabled.
Owner: Taz. Intended executor: Luna. Start with the September 16 review and renewed five-hour plan, then follow the referenced S1–S10 specifications.
Source inspection: original September 11; refreshed September 15, 2026 for scheduler repair entry points, recent product changes, and the complete property-scan path.
Scope: replace the Command Center interface with a microphone-driven, multi-agent workspace while reusing the existing command execution backend; integrate consented property capture as a bounded client of that shared foundation.

Execution guide: start with [the September 16 review](#september-16-review-and-renewed-five-hour-plan), then use section 13's detailed S1–S10 requirements where still applicable. Existing-file symbols are edit anchors; re-resolve line numbers before editing. Earlier evidence is historical and does not establish acceptance of later changes.

## September 16 review and renewed five-hour plan

Reviewed Luna's uncommitted sprint UI/API, command-to-backlog, reviewer assignments, scan-store changes, event-job migration/helper, database test harness and both plans. Preserve this work; no reset, remote migration or deployment is part of this review. The shared scheduler remains the execution foundation for weekly property planning and future one-off work.

### Findings and repairs

| Finding | Change / disposition |
| --- | --- |
| Concurrency harness selected any running Supabase database and its global claim RPC could consume unrelated queued jobs. Parallel launches did not prove overlapping transactions. | Replaced with a generated Compose project running disposable Postgres 17. Replay actual scheduler migrations with minimal external prerequisites. Observe A holding a row lock while B claims; observe B waiting on A's uncommitted duplicate insert. Never select an existing Supabase container. |
| Optional event time became a new timestamp on every retry, conflicting with the SQL identity check. | `schedulerEvents.server.ts` passes null for omitted time. Forward migration `20260916030000_scheduler_live_lease_and_event_replay.sql` chooses time only on first insertion; explicit changed timestamps and changed payloads still conflict. |
| Expired matching tokens could complete/fail work before recovery cleared them. | Same forward migration checks non-null `lease_until > clock_timestamp()` in completion, direct failure and retry resolution. Wall time is checked after acquiring row locks. |
| Mongo upload marked revoked artifacts stale; rejected scans retained current artifacts; serialized status trusted stored flags. | `propertyScanStore.ts` updates only current refs, preserves revoked refs, invalidates on rejection and suppresses current status for mismatched/unapproved inputs. Real Mongo fixtures cover these paths. |
| Command backlog dedupe checked before insertion; the unique-index loser returned 500. | `/api/sprints` handles SQLSTATE 23505 by reading the existing owner/source record and returning `reused`. |
| A sprint draft used the newest prop revision after refresh, allowing stale form contents to pass the revision fence. | `SprintCard` retains the revision captured when Edit opened. A conflict preserves the draft for explicit reconciliation. |
| The prior ledger called S6 locally closed and the E2E bypass run authenticated acceptance. | Reopened S6 deferral, pause/cancel race and permissions evidence. Prior 2/2 browser checks used test operator access, not a real signed-in owner/reviewer flow. |
| The scheduler had no durable outcome for “poll later”; reusing execution retries would consume the failure budget and could let paused/cancelled work return. | Added `20260916040000_scheduler_deferred_outcomes.sql`, a fenced `defer_workflow_job` RPC, a bounded 20-poll/24-hour budget, deferred status, and dispatcher union handling. Deferred claims preserve execution attempts; schedule gating and cancellation remain authoritative. |
| S5 had buffered uploads but no atomic reservation for concurrent devices or retry-safe finalize. | Added bounded reservation state to `PropertyScanSession`, `scanUpload.server.ts`, owner-scoped reserve/abort/finalize/reconcile operations, deterministic upload paths, signed capability issuance, and real Mongo tests for the two-active-upload quota, idempotency, finalize replay, abort and expiry. Finalize now reads the private object, checks reserved size/MIME, validates the media signature, records SHA-256 content provenance, and removes/aborts rejected objects. The worker performs bounded expired-object cleanup; real Supabase storage/auth acceptance remains open. |

### Docker delivered

`infra/local/compose.yaml` provides persistent local-development Mongo on loopback port 27018, disposable Mongo acceptance with a random loopback port, and disposable scheduler Postgres with no host port. `npm run docker:up`, `docker:status`, `docker:down`, and `docker:test` run from the repository root. Development shutdown preserves its named volume. Test cleanup removes only the UUID-named test project. Supabase still owns Auth/Storage/Postgres for the application; OpenResync retains its existing Compose stack. See [Docker runbook](../../../infra/local/README.md).

`docker-acceptance` in `.github/workflows/ci.yml` runs both suites. The isolated scheduler suite uses minimal auth/legacy table prerequisites and selected real migrations; it is not a substitute for full Supabase replay, application auth or storage policy tests.

### Evidence and limits

- Local `npm run docker:test`: nine scheduler acceptance groups passed (including paused deferred polls) and 9 real Mongo integration tests passed. Scheduler evidence includes concurrent claims, duplicate-insert contention, omitted-time replay, owner separation, changed-payload/time rejection, expired-token rejection before recovery, live completion receipt, denied browser enqueue, deferred polling without execution-attempt consumption, cancellation fencing, and terminal poll budget. The deferred-outcome migration also reapplied successfully in the isolated fixture.
- Earlier Luna evidence: 44 pgTAP assertions, 38 focused unit tests, production build and 2 browser boundary checks passed before this review. The old parallel harness result is superseded, not counted as proof of overlap. The browser run used E2E operator bypass.
- Current review: production build passes after the deferred scheduler and upload-integrity changes; the full unit suite passes 282 files / 1,122 tests, scheduler Docker acceptance passes 9 groups, and Mongo acceptance passes 9 tests. Focused integrity/versioning/scheduler checks pass 8/8. Full Supabase replay of the new forward migrations, real signed-in browser/storage acceptance, remote CI, media decoding and publication remain unverified. Nothing in the local harness proves email delivery or agent execution.
- `tsc --noEmit --incremental false` exposed existing test fixture/type errors outside this slice (Jamie guide, billing env fixtures, commercial lineage, lead criteria and weekly dispatch). The new integration fixture's explicit lean type was repaired; do not count the full repository typecheck as green or conceal unrelated errors.
- Runtime review also found the existing `handle_new_user` trigger omits required profile email during local fixture creation. Treat real signup as a separate release check; scheduler stubs deliberately cannot verify it.

### Next five hours: exact edit order

Budgets total five hours. Stop a packet at its stated evidence boundary and carry unfinished work forward explicitly. This timebox advances usable property planning and private uploads; it does not promise reconstruction or unattended email delivery.

| Time | Files / symbols to edit in order | Required result |
| --- | --- | --- |
| Complete: 0:00–0:50 | `workflowRegistry.server.ts`, `20260916040000_scheduler_deferred_outcomes.sql`, `durableScheduler.server.ts`, and `scheduler-concurrency-acceptance.mjs`. | Deferred work has a durable union outcome, fenced RPC, 20-poll/24-hour budget, no execution-attempt consumption, schedule pause/cancel fencing, and isolated Docker evidence. Full Supabase replay and real signed-in acceptance remain open gates. |
| Complete locally: 0:50–2:50 | `PropertyScanSession.ts`, `propertyScanContract.ts`, `propertyScanVersioning.ts`, `propertyScanStore.ts`, `propertyScanUploadIntegrity.ts`, `lib/scans/scanUpload.server.ts`, `/api/property-scans/[scanId]/uploads`, `/complete`, and the worker route. | Reservation core enforces max 24 assets, 300 MiB/session, 75 MiB/file and two active uploads; lost finalize responses replay the finalized record; signed capability uses an exact private path; finalize checks object metadata and actual bytes, records SHA-256, rejects bad signatures, and deletes/aborts failed objects; bounded expired cleanup is wired into the existing scheduler worker. Docker Mongo covers contention and expiry. |
| Next integration gate: 2:50–3:35 | `20260916050000_property_scan_storage_policy.sql`, Supabase Storage/Auth fixture, and the existing worker acceptance path. | Replay the private bucket migration in a fresh Supabase stack; prove anonymous/foreign read-write-list denial, signed upload/finalize success, changed-object rejection and cleanup retry. Do not call S5 production-accepted from mock or Mongo evidence alone. |
| Complete locally: 3:35–4:20 | `app/scan-studio/page.tsx`: direct signed upload progress through XHR, per-file retry/cancel/finalize outcomes, and session-revision refresh after each verified file. | A user can recover a failed upload without reselecting every file; real owner/reviewer browser fixtures and Supabase identity evidence remain separate gates. |
| Complete locally: 4:20–5:00 | Run affected unit/build/Docker checks; update this ledger and Keller/Westlake handoff with exact evidence. Fresh Supabase replay, storage policy checks and authenticated browser evidence remain the next integration packet. | Reviewable local code and an honest release status. CI must run on the eventual PR revision; local passes are not CI evidence. |

### Subsequent feature packets

1. **Keller / Westlake execution:** preserve one area, weekly Monday 08:00 America/Chicago proposals and separate send approval. Complete rich assignment snapshots (description, property/source revision, dependencies, selected worker) and supported research/draft worker execution. A roster entry alone is not an executor. Outputs need stored evidence and owner review before completion.
2. **S7 outbox:** only after S5/S6, persist Mongo enqueue intent keyed by scan/revision/hash/processor, reconcile to the existing Postgres event RPC, and reconcile results with UUID artifacts. Test both crash windows before enabling reconstruction requests.
3. **Docker worker/browser profiles:** add a processor container only after selecting an actual engine and defining input/output, CPU/GPU and cost requirements. Add a containerized browser runner after build-time/runtime E2E configuration is reproducible. Reuse the new disposable-project wrapper.
4. **Optional development helpers:** add a local mail sink only with a supported transport adapter and acceptance that app mail reaches it. Existing Supabase mail UI is auth mail, not evidence that hotlist delivery is captured. Retain the existing OpenResync stack and add its doctor output to a future consolidated health command.

### Current handoff

Final review checks: production build passes; full unit tests pass 282 files / 1,122 tests, including the new upload-integrity tests; focused integrity/versioning/scheduler checks pass 8/8; scheduler Docker acceptance passed 9 groups; Mongo acceptance passed 9 tests. The full TypeScript check still fails in existing test fixtures outside this slice. Development Mongo is healthy on `127.0.0.1:27018`; application environment files were not changed. Acceptance cleanup explicitly enables the Compose acceptance profile and checks that the generated project's containers are gone; review fixtures were removed without touching development volumes or Supabase. No commit, push, deployment or remote migration was performed.

Next action: run the next integration gate: replay the private-storage migration in a fresh Supabase stack, add real owner/reviewer identities, and prove signed upload/finalize, foreign/anonymous denial, changed-object rejection and cleanup retry in the browser. The direct-upload progress/retry UI is now implemented locally; S7's approved-scan outbox bridge starts only after this real storage/auth gate. S7 bridge, real auth/storage acceptance, and worker execution remain unimplemented. The previous percentage estimates were not tied to weighted tasks and should not be repeated as measured completion. No subagents are needed for these packets.

## Historical scheduler/proposal sprint notes

These notes preserve the earlier scheduler/proposal review. They are not the active execution timebox; use the September 16 review above. They remain useful for the known migration, owner-access, atomic-proposal and scheduler-foundation findings.

Historical objective: close scheduler/proposal correctness gaps while keeping the scheduler reusable. Do not treat this section as authorization to create a scan-specific scheduler, connect an unverified processor, publish interior media, or bypass email approval.

| Elapsed | Budget | Exact code action | Exit evidence |
| --- | ---: | --- | --- |
| 00:00–00:30 | 30 min | Baseline `git status`, branch/log, `vitest.config.ts`, current scheduler DB migration list, and scan route/store callers. Confirm no new migration or deployment is being assumed. | Baseline recorded; focused commands and missing environment dependencies listed |
| 00:30–01:30 | 60 min | Add disposable-Mongo or repository-approved database tests for `appendPropertyScanAssets` and `updatePropertyScanReview`: two writes with one `expectedRevision`, duplicate asset IDs, approve/upload race, two-reviewer race, reject-after-ready, and consent/manifest invalidation. | Exactly one fenced mutation wins; the loser gets a typed conflict; no current approval/artifact survives a manifest change |
| 01:30–02:15 | 45 min | Audit `serialize`, admin detail, media-preview and reconstruct reads against `approvedManifestRevision`/hash. Add stale-artifact fixtures and deep-link tests; keep old synthetic records visible only as labeled compatibility history. | Stale/revoked output is never exposed as current; foreign or revoked actors receive no scan detail or signed URL |
| 02:15–03:00 | 45 min | Run authenticated browser checks for Scan Studio resume, review acknowledgement, private media preview, denied access and an expired/deep-linked scan URL. If browser or storage credentials are unavailable, record the exact blocked checks and leave rollout disabled. | Browser evidence or a named blocker; no screenshot is treated as database/storage acceptance |
| 03:00–04:15 | 75 min | Prepare the shared scheduler boundary only: inspect `durableScheduler.server.ts`, `workflowRegistry.server.ts`, scheduler SQL and existing sprint/email tests; document the event-job contract, lease-expiry fence, UUID result requirement and owner/payload validation. Do not enqueue scan jobs yet. | One scheduler extension design with migration/test targets; existing recurrence and email approval behavior preserved |
| 04:15–05:00 | 45 min | Run the focused scan suite, scheduler regressions, build and `git diff --check`; update both ledgers with exact counts, blockers, changed paths and next packet. | Reproducible evidence; no PR/push/deploy unless separately authorized |

Dependencies: S5 direct/private upload remains after L4 acceptance; S6 scheduler implementation may begin only from the documented shared contract and existing DB acceptance. S7 cannot enqueue reconstruction work until S5 and S6 pass. A blocked integration check does not turn into a mock acceptance claim.

### Implementation baseline, not completion claims

- Reviewed checkout: `f41fa1ea` on `codex/cms-vertical-slice-followup`. Existing uncommitted changes add `/sprints`, redirect the admin entry, open `/api/scheduler` to authenticated owners, update navigation/README, and add route tests. Preserve and finish these changes rather than recreating them. The page itself currently has no server-side auth gate; API authentication does not prove page access behavior.
- [CI run 34895507828](https://github.com/tahsrz/sunset-pulse/actions/runs/34895507828): lint, test and Jamie E2E passed on the committed revision. `scheduler-db` failed during migration startup; its acceptance-test step was skipped. These results do not cover the uncommitted access slice or establish a passing deployment.
- Confirmed blocker: `20260403_workflow_init.sql:17` creates legacy `public.sprints` with `workflow_id` and `total_duration_hours`, without `owner_id`. `20260912060000_scheduled_sprints.sql:3` uses `CREATE TABLE IF NOT EXISTS`, then its owner/status index fails with SQLSTATE 42703. CLI installation now succeeds; repeating the CLI fix will not repair this schema collision.
- The scheduler has a registry, timezone policy, atomic dispatch RPC, lease tokens and terminal/retry RPCs. The 31-assertion pgTAP suite is primarily serial; it does not prove real concurrent sessions, rollback under injected failure, or complete tenant isolation.
- `SprintsWorkspace` reads saved mode but never submits it, while `create_schedule` defaults to `property_shortlist`. Saving a manual schedule can therefore change its mode. Failed `post()` calls resolve normally and callers clear drafts; pause/cancel ignore HTTP failures; next-run formatting uses an unsaved timezone.
- Both planner services persist headers/items separately. Property planning returns an existing header immediately, even if a prior item insert failed. The manual planner can append items to an existing proposal on retry. Neither is a complete atomic, immutable occurrence snapshot.
- Shortlist intake, author-labelled user/Jamie notes and deterministic task generation exist. The manual property-plan endpoint creates backlog entries, not a sprint or executed Jamie research. `SprintCard` does not display the assignment records returned by the API. Creating assignments is not proof that workers ran or produced artifacts.

### Time budget and order

| Elapsed time | Budget | Deliverable | Exit evidence |
| --- | ---: | --- | --- |
| 00:00–01:00 | 60 min | Restore migration compatibility and reach scheduler DB tests | Clean migration replay plus legacy-row preservation fixture, or exact remaining blocker |
| 01:00–02:15 | 75 min | Finish owner-accessible, reliable schedule editing | Saved mode/timezone survive reload; failed requests preserve edits; foreign-owner operations rejected |
| 02:15–03:45 | 90 min | Persist a complete scheduled proposal atomically | Retry returns the same unchanged proposal; failed item write rolls everything back |
| 03:45–04:15 | 30 min | Make the collaborative planning result understandable | Notes/context, task descriptions and assignment state visible; no implied worker execution |
| 04:15–05:00 | 45 min | Targeted verification, regression checks and handoff | Exact completed checks, reviewed diff and next-sprint carryover |

The budgets include implementation and focused checks; the final 45 minutes are reserved for integration/regression and contingency. At each boundary record complete/partial/blocked. Do not spend the entire sprint polling CI. If database setup remains blocked at minute 60, continue the UI/API work against controlled fixtures, but keep DB-dependent changes unaccepted and unattended execution disabled. If a safe transaction implementation exceeds its timebox, carry it over intact rather than shipping a partial write path as fixed. No subagents.

### 1. Database compatibility — first 60 minutes

1. Inspect `20260403_workflow_init.sql` (`sprints`, `tasks`, `initialize_workflow`) and `20260912060000_scheduled_sprints.sql` before choosing constraints. Trace later sprint foreign keys/RPCs and existing legacy callers. Preserve IDs, workflow/task relationships and legacy rows; never invent ownership for historical data.
2. In the September scheduled-sprints migration, add explicit compatibility DDL before the first index/policy that uses new columns. Reconcile all required columns, defaults and constraints, not only `owner_id`. Prefer additive coexistence: legacy workflow rows may retain unknown ownership, while owner-scoped scheduled rows must satisfy the scheduled contract. Do not globally impose a new NOT NULL/status constraint that breaks `initialize_workflow`.
3. Provide an idempotent forward repair for databases that already recorded the September migration. A forward migration alone cannot fix clean replay because replay fails before reaching it. Document why the historical bootstrap correction and forward repair are both present; do not drop/recreate `sprints`, reset production, or rewrite applied migration history.
4. Add a legacy-schema upgrade fixture containing an existing workflow/sprint/task; assert preserved IDs/links and a successful new scheduled proposal insert. Test `initialize_workflow` compatibility and ownership isolation, including legacy null-owner rows remaining inaccessible through owner APIs.
5. Replay the full migration chain on disposable PostgreSQL and run `npm run test:db` from `apps/pulse`. Fix surfaced scheduler SQL errors within the timebox. Keep the official CLI setup; pin its verified version for reproducibility rather than using `latest` indefinitely. Do not bypass old migrations to make a misleading green job.

Exit: clean replay and upgrade compatibility pass, or record the exact failing migration/statement. Package A remains open until concurrency and permission acceptance is complete.

### 2. Owner access and reliable schedule editing — next 75 minutes

1. `app/sprints/page.tsx`, `app/admin/sprints/page.tsx`, middleware and `lib/navigation/routeCatalog.ts`: finish the existing access slice using the application's signed-in page pattern. Verify the legacy admin URL's middleware behavior before claiming it redirects for ordinary users. Keep API authorization independent of page navigation.
2. `app/api/scheduler/route.ts`, GET schedule projection: return the saved local hour/minute/weekday, planning mode and schedule revision alongside the existing fields. Use this shared response as the editor's source of truth; do not maintain competing schedule representations in two endpoints.
3. `app/api/sprints/route.ts`, `requestSchema` and `create_schedule`: reuse `normalizeScheduleSpec`/the shared policy schema. Default new generic sprints to weekly Monday 08:00 America/Chicago and manual backlog; require an explicit property-mode selection for Keller / Westlake. Preserve existing mode on updates that omit it. Separate saving from enabling so editing a paused schedule does not silently resume it.
4. Replace unrestricted schedule upsert with an owner-scoped, revision-checked save transaction. Lock the schedule, compare expected revision for updates, validate/advance its next occurrence and increment revision atomically. Concurrent dispatch must not advance an obsolete schedule specification. Return a conflict rather than overwriting another tab's changes; keep workflow settings separate from generic recurrence fields.
5. `app/admin/sprints/SprintsWorkspace.tsx`, state/load/post/toggle/cancel: add explicit planning-mode control and labelled cadence/day inputs; retain saved state separately from the editable draft. Render next occurrence using the saved timezone, handling invalid draft values without crashing. Make mutation helpers return success or throw; clear inputs only on success. Check every HTTP response, disable duplicate mutations, and preserve dirty fields on background refresh.
6. `app/api/sprints/route.ts`, GET and backlog update: surface failed child queries instead of treating errors as empty data. Preserve omitted description/estimate fields; allow explicit null only when the user clears an estimate. Add an explicit refresh action without discarding unsaved work.
7. Extend `tests/unit/scheduler-route.test.ts` and add sprint-route/editor coverage for signed-out GET/POST, two distinct owners, foreign schedule/job IDs, mode preservation, paused saves, stale revision conflicts, invalid timezone and failed draft retention. Browser checks must use ordinary-user sessions; mock assertions alone are not RLS evidence.

Exit: an ordinary owner can save, reload, pause and resume the intended schedule without mode changes or lost edits. New schedule defaults do not migrate existing user settings.

### 3. Atomic scheduled proposals — next 90 minutes

1. Add a forward migration defining one service-only proposal-persistence RPC. Inputs include owner, scheduler job ID, lease token, occurrence, selected task snapshots and exclusions. Lock/validate the job's owner, workflow, running status and live lease before writing. Use the established job-lock order to avoid deadlocks with cancellation/completion.
2. In that transaction, reuse an existing completed proposal snapshot for the same job; otherwise insert property backlog additions (when needed), the sprint and all items together. Enforce source-job uniqueness and matching owner/property/backlog references. Persist selection/exclusion metadata so an empty proposal can be distinguished from a failed partial write. No catch-and-ignore of errors based on the word "duplicate".
3. `lib/autonomous-workflows/sprintPlannerWorkflow.server.ts`, `runSprintPlannerWorkflow`: replace its separate header/item writes with the RPC-backed service. Never append newly selected work to a proposal on retry. Construct the title from `job.scheduled_for`, not the worker's current clock.
4. `lib/property-sprints/planPropertySprint.server.ts`, `createPropertySprintProposal`: keep fact/note gathering and pure planning outside the transaction, then persist through the same boundary. Pass lease context from `workflowRegistry.server.ts`/the handler. Recheck material property revisions in the transaction; changed facts require rebuilding, not accepting stale inputs. Preserve author-labelled note context as source material, not worker instructions.
5. `lib/autonomous-workflows/sprintSelection.ts`, `selectSprintBacklog`: select in priority/created-at/ID order; stop at maxItems while accumulating effort only for selected items. Define unknown-estimate exclusions explicitly. Revalidate active task links under the persistence transaction so concurrent occurrences cannot select the same active work; completed tasks remain excluded, cancelled work requires deliberate reopening. Keep compatibility for existing callers and add focused fixtures.
6. Add DB assertions for repeated same-job calls, concurrent same-job attempts, forced item-insert rollback, stale/cancelled lease rejection and cross-owner payloads. Retry after failure must create exactly one complete proposal with unchanged item snapshots. Distinguish these tests from existing successful-path receipt tests.

Exit: both scheduled modes use the same atomic persistence boundary. The manual `/api/property-shortlist/plan` action remains clearly labelled as backlog generation; it must not be presented as completed sprint execution. Approval/edit races and worker execution remain separate follow-on work.

### 4. Collaborative planning visibility — next 30 minutes

1. `app/property-shortlist/PropertyShortlistWorkspace.tsx`: retain the single Keller / Westlake area and existing note history. Clarify that adding a question supplies context; clicking the planning action generates proposed backlog tasks, not verified answers. Preserve note drafts on failed requests and show created-task counts and returned exclusion reasons.
2. `SprintsWorkspace.tsx` and `SprintCard.tsx`: show task descriptions, property reference/revision when present, and assignment worker/status from the existing API response. Use explicit "unassigned", "awaiting review" or "blocked" states where supported; do not label an assignment as a running agent without execution evidence. Link back to the shortlist for missing input.
3. Keep owner and Jamie notes visibly attributed. Do not add a second chat system, synthesize Jamie replies without a worker result, overwrite verified facts from notes, or conflate collaboration with granting another user access.
4. Use fixture examples for all four shortlisted properties, preserving unresolved identities, the land zoning discrepancy and original-versus-current price distinction. No live property import, real email or automatic schedule enablement is part of this engineering sprint.

Exit: the owner can tell what context was saved, what tasks were proposed, what still needs information and whether any assignment actually ran.

### 5. Verification and handoff — final 45 minutes

1. Run focused route/editor/selection/proposal tests as their slices finish. At handoff run `npm run test:unit`, `npm run lint` and `npm run build` from `apps/pulse`, plus `npm run test:db` against the disposable stack. Check available script names before execution. Record exact exits/counts; unavailable or unfinished checks stay unverified. The earlier build process is no longer recoverable in the current session, so it is not fresh build evidence.
2. Browser-check ordinary-user entry, save/reload, mode selection, failed mutation retention, note-to-backlog visibility and assignment display. Use two isolated user fixtures to test denied access, not a real contact list. Keep real delivery disabled throughout.
3. Review the complete diff, including the access changes present before this planning update. Update this ledger and PR #79's scope when handing off implementation; do not claim a passing deployment without its result. Record remaining migration/CI blockers and carryover in priority order.

Definition of done: all completed slices have evidence and no partial-write or access regression is hidden by an optimistic UI. The target is a trustworthy planning proposal flow, not a declaration that the entire autonomous platform is production-ready.

### Explicit carryover after these five hours

1. Finish Package A concurrent pause/claim and cancel/complete tests, actual retry-delay assertions, live-lease fencing review, and authenticated-role RLS tests. Passing the current serial suite alone does not close A.
2. Finish Package C approval/edit locking, required revision/replay semantics and transactional assignment/item/backlog completion before expanding unattended execution. Assignment visibility in this sprint does not repair those transitions.
3. Then implement bounded research/draft workers, durable artifacts, stale-property output rejection and the owner review queue. Use available evidence/connectors; unsupported research remains visibly blocked.
4. Keep email review-first. Defer auto-send, send-to-all, uncertain-receipt reconciliation work and new provider connections until Package D's separate safety acceptance. Sprint approval never authorizes sending.
5. Defer showing reminders, GitHub/CRM backlog adapters, inquiry attribution and monetization features. They remain on the roadmap, but adding scheduler clients before the foundation is accepted is not this sprint's objective.

Planning update only: this section records inspected implementation and specifies future changes; its checklists are not completion claims. It supersedes earlier execution-order wording for the next 300 minutes, not the roadmap's safety requirements.

### Implementation log — September 14, 2026, sprint start

- Extended `supabase/tests/database/scheduler.sql` with pgTAP coverage for schedule RPC existence/privileges, new schedule creation, paused-state-preserving revision updates and stale-write rejection. The local database suite remains unverified because Docker Desktop's Linux engine is unavailable; CI is the authoritative disposable-DB run.
- Routed `Generate property plan` through the workspace mutation guard so it cannot be double-submitted while pending, reports failed responses consistently, and refreshes without replacing an unsaved schedule draft. Sprint route regression tests and lint pass.
- Reused `scheduleSpecSchema` in `/api/sprints` for the sprint-specific daily/weekly schedule contract, keeping timezone and local-time validation aligned with the shared scheduler policy. Route tests and lint pass.
- Hardened `/api/sprints` GET with parallel owner-scoped reads that surface any child-query error instead of returning a partial workspace as healthy. Added regression coverage for the fail-closed response; route tests and lint pass.
- Added explicit schedule refresh behavior in `SprintsWorkspace.tsx`: saved scheduler state can refresh while unsaved cadence/mode/time edits remain in the editor, including an initial-load race. The next-run label uses the saved timezone. Focused tests remain green and `npm run lint` passes with only the existing hook-dependency warnings.
- Added `save_sprint_planner_schedule(...)` in `20260915050000_revision_checked_sprint_schedule.sql`, routed `/api/sprints` schedule writes through the owner-scoped revision check, and preserved paused state on edits. The workspace now submits the saved revision and receives a conflict instead of overwriting a concurrent edit; route coverage includes RPC payload, stale revision and invalid timezone cases. Disposable DB replay and browser verification remain open.
- Added additive compatibility columns to `20260912060000_scheduled_sprints.sql` before scheduled indexes, plus `20260914080000_repair_scheduled_sprint_compatibility.sql` for databases that already crossed the original migration. This is not database acceptance: the repair still needs a disposable PostgreSQL replay and an upgrade fixture.
- Updated `SprintsWorkspace.tsx` to persist the selected `planningMode`, label schedule controls, check scheduler mutation responses, prevent duplicate scheduler actions while pending, and clear the backlog title only after a successful add. The page-level auth gate, revision-checked schedule save, and browser verification remain open.
- Focused verification passed: `node --no-warnings ../../node_modules/vitest/vitest.mjs run tests/unit/scheduler-route.test.ts tests/unit/app-route-catalog.test.ts` — 2 files, 7 tests. A fresh production build was started but remained in Next optimization without output and was interrupted; no build pass is claimed. CI run 34895507828 still fails before DB acceptance at the original `sprints(owner_id, ...)` index statement.
- Extended `lib/autonomous-workflows/sprintSelection.ts` with stable priority/created-at/ID/title ordering and `selectSprintBacklogReport`, which returns selected work, used minutes and explicit capacity/unknown-estimate/max-item exclusions while preserving the existing selected-array wrapper. Focused verification: `node --no-warnings ../../node_modules/vitest/vitest.mjs run tests/unit/sprint-selection.test.ts tests/unit/property-sprint-builder.test.ts tests/unit/scheduler-route.test.ts` — 3 files, 8 tests passed.
- Replaced the route's separate assignment/item/backlog completion writes with `complete_sprint_assignment(...)`, which locks in sprint-first order, rejects cancelled work and propagates completion atomically. Focused verification: `node --no-warnings ../../node_modules/vitest/vitest.mjs run tests/unit/scheduler-route.test.ts tests/unit/app-route-catalog.test.ts tests/unit/sprint-selection.test.ts` — 3 files, 10 tests passed. CI validation is pending for commit `6a6b3a0e`.

## 1. Product contract

The user spawns agents. While microphone capture and an agent's automatic listening are enabled, that agent receives the shared finalized speech and decides whether to ignore it, wait for more context, or submit a query. Selecting a panel does not determine which agents can hear the conversation.

Every agent also has a visible editable submission field and a **Submit now** button. Manual submission sends that exact visible text to that agent, bypassing the relevance decision, but not execution limits or existing API checks.

This is not a collection of independent microphone sessions, a compulsory chat-prompt interface, or an autonomous platform rebuild.

Required end state:

- One microphone capture owner and one shared transcript.
- Several explicitly spawned agent sessions, each mapped to an existing worker.
- Independent per-agent listening decisions and results.
- A manual button that works with typed text even without microphone support.
- Existing command progress, deliverables, sources, supervisor review, and actions remain available.
- The new interface replaces the default UI at `/command-center`.
- Existing navigation paths remain searchable through the shared route catalog.
- No changes to the public homepage, production data, deployment settings, permissions, or unrelated CMS features.

“Praxis” is the working design name. It need not rename the public product or URL.

## 2. Verified starting points

Line numbers are inspection anchors, not permanent patch offsets. Find the named symbol again before editing.

| Existing source | Relevant anchor | Consequence |
| --- | --- | --- |
| [Command Center page](../app/command-center/page.tsx) | Lines 1–12, `CommandCenterPage` | Currently mounts `AgentSelectionArena`; this is the eventual replacement boundary. Keep the page a server component and the interactive workspace a client component. |
| [Audio provider](../context/JamieAudioContext.tsx) | Lines 7–57, audio types/context; line 104, `JamieAudioProvider` | Shared provider already owns recognition and microphone lifecycle. Extend it rather than creating recognition per agent. |
| Same audio provider | Line 194, `recognition.onresult` | Final speech enters a private 30-second segment buffer; “pull that up” queues a query with a two-second review delay. Caption text also contains status messages, so it is not a reliable transcript event feed. |
| Same audio provider | Lines 276–323, pending timer, TTS events, context value | Preserve speech-output suppression and cleanup; prevent queued submissions surviving stop/mode changes. |
| [Jamie chat](../components/JamieChat.tsx) | Line 56, `chatApiRoute`; lines 456–461, submitted wake-query effect | The microphone currently feeds Jamie chat through `sendChatMessage`, not the command endpoint. Its single consumed query slot cannot be used as a broadcast queue. |
| [Command arena](../components/command-center/AgentSelectionArena.tsx) | Line 597, `runCommand`; line 634, POST request | Already submits selected worker, command, relay format, and supervisor settings to `/api/commands`. Reuse this contract. |
| Same command arena | `requestSupervisorReview`, `processSupervisorReviews`, `CommandActionPanel`, `buildCommandTraceExport` | Replacement must retain working review, output, action, and evidence features—not just the query form. |
| [Agent run hook](../components/agent-console/useAgentConsoleRun.ts) | `runAgentJob` | Second existing command client; currently owns only one run/result. Do not use a shared global `running` boolean for all new agents. |
| [Stream reader](../components/agent-console/agentConsoleCommandStream.ts) | `readCommandStream`, `parseServerSentEvent` | Reuse progress/result/error parsing, with focused fixes if extraction exposes framing or cancellation gaps. |
| [Command endpoint](../app/api/commands/route.ts) | Lines 22–33, `CommandRequestSchema`; `streamCommandResponse` | Accepts command, selectedWorkerId, relayMode, supervisor, and optional lead/listing/neighborhood IDs. It has no agent-session/history contract. |
| [Worker roster](../lib/command-center/workerRoster.ts) | `intelligenceWorkers` | Existing roles include listing-summary, buyer-intent, follow-up-writer, comp-analysis, neighborhood-explainer, agent-voice, and others. Do not invent unsupported worker IDs. |
| [Intent classifier](../lib/command-center/intentClassifier.ts) | `classifyCommandIntent` | Existing deterministic routing can help with initial relevance rules. Its confidence is a heuristic, not a calibrated probability. Forced worker selection must not be used as proof of relevance. |
| [App layout](../app/layout.tsx) | Lines 231–250, provider composition | Provider already wraps the normal application. Account for mock-mode layouts without nesting another microphone provider. |
| [Route directory](../components/command-center/CommandRouteDirectory.tsx) | Shared route catalog consumer | Keep this as the secondary navigation surface. Do not create a competing list of hard-coded paths. |

### Backend reuse, stated precisely

Reuse `POST /api/commands` for actual work. Keep its request shape and SSE/JSON behavior stable.

Agent IDs and per-agent run IDs can initially live in client state. Build a bounded command string from the assignment, recent relevant transcript, and that agent's own context. Do not send undocumented `agentId` or `history` fields and assume the server stores them.

The backend currently uses shared knowledge/query-memory facilities. Separate UI histories are not private backend memory isolation. Do not claim otherwise.

Semantic “should I act?” decisions need a small decision adapter; they are not already provided by microphone capture. A thin assessment endpoint is allowed if needed, but it must not execute the full command merely to decide whether to execute it.

## 3. Screen design

Desktop arrangement:

```text
Agent Workspace           [Mic off/on] [Pause automation] [Spawn agent]
----------------------------------------------------------------------
Agent rail        Shared conversation           Selected agent
                  Final transcript segments     Assignment and role
Listing summary   Interim caption, separate     Listening/activity state
Listening
                  Editable submission draft     Submitted query
Follow-up writer  [Use recent speech]           Progress
Working           [Submit now → agent name]     Result / Sources / Details
----------------------------------------------------------------------
Needs attention / Completed work              [Browse app paths]
```

Design rules:

1. A calm work surface, readable text, restrained status color. No animation-heavy replacement of the current arena.
2. Agent rail selection changes the visible panel and manual recipient only; all enabled spawned agents still evaluate eligible speech.
3. Each agent owns its own manual draft. Automatic runs never overwrite drafts.
4. “Use recent speech” explicitly copies finalized transcript into a draft. Untouched drafts may follow new finalized speech; once edited, they freeze until the user explicitly refreshes.
5. In manual mode, show the exact outgoing text and agent name. Do not silently submit interim speech.
6. Keep a concise activity entry for every auto submission: trigger excerpt, reason, time, and resulting run.
7. Ignore/wait decisions stay in expandable activity details, not notification popups.
8. Results are visual by default. Optional read-aloud uses the existing TTS events.
9. Mobile has Agents / Conversation / Work tabs. Keep microphone state and pause controls visible; no horizontal page overflow.
10. No agents on first visit. Show **Spawn your first agent** and explain what microphone access enables.
11. Unknown backend stage durations remain unknown. Do not invent percent-complete bars.

## 4. State and defaults

Create small serializable contracts under `lib/agent-workspace/`, with browser resources held in hooks/provider refs.

Suggested types:

- `TranscriptSegment`: sessionId, sequence, id, text, capturedAt, final.
- `AgentSession`: id, workerId, label, assignment, autoListenEnabled, spawnedAtSequence, draftText, draftDirty, transcriptCursor.
- `AgentRun`: id, agentId, triggerId, source (manual/automatic), submittedText, state, progress, response, error, startedAt, finishedAt.
- `AttentionDecision`: agentId, transcriptWindowId, action (ignore/wait/submit), reason, relevantSegmentIds.
- `WorkspaceState`: agentsById, agentOrder, selectedAgentId, runsById, transcript, automationPaused.

Listening state and execution state are separate. An agent may finish a run while automatic listening is paused.

Proposed first-release defaults, kept together in `workspacePolicy.ts` and covered by tests:

| Limit | Initial value / behavior |
| --- | --- |
| Spawned agents | 3; explain the limit rather than silently failing |
| Concurrent commands | 2 globally, 1 per agent |
| Automatic queue | 1 coalesced candidate per agent, not one job per sentence |
| Transcript relevance window | 30 seconds; keep stable segment IDs |
| Decision debounce | 1.5 seconds after new finalized speech; never assess interim tokens |
| Automatic command cooldown | 20 seconds per agent |
| Command budget | At most 4 automatic starts/minute and 20/hour per workspace |
| Semantic assessment budget | At most 6 requests/minute; batch all eligible agents in one assessment |
| Idle behavior | No model request or database polling without new eligible transcript |
| Persistence | Agent settings only; raw transcript/results in memory for this slice |
| Reload/navigation | No promise of continued background execution or restored live jobs |

These are conservative starting settings, not measured optimums. Manual clicks bypass relevance/cooldown but respect concurrency and duplicate protection. Show a busy message rather than building an unlimited manual queue.

Newly spawned/resumed agents hear new segments, not the entire previous conversation replayed automatically. The user can explicitly use prior transcript through manual submission.

## 5. Canonical implementation packages

Complete packages in order. Each package must leave its acceptance tests passing. Do not skip from a static mockup to route replacement.

### P0 — Freeze current behavior and map retained features

Files: existing audio tests, command route/stream tests, arena, and this plan.

Tasks:

1. Record the request body and progress/result/error event shapes from both command clients.
2. List the arena's output formats, source views, trace export, handoff/refinement, supervisor controls, and action handlers.
3. Identify which output subcomponents can be extracted without changing behavior.
4. Add missing characterization tests for the behavior being extracted; do not refactor unrelated chat or API flows.
5. Confirm the normal and mock layout provider boundaries.

Done when: a feature parity checklist exists in this document and every retained feature has an identified destination. No user-facing route changes yet.

P0 feature parity checklist (captured during implementation)

- [x] Command payload contract: `POST /api/commands` sends `command`, `selectedWorkerId`, optional `relayMode`, optional `supervisor`, and optional `context` IDs. The workspace preserves these keys and does not add agent/history fields.
- [x] Command events: stream clients consume `progress`, `result`, and `error` SSE events; JSON responses are accepted when no stream body is present. The workspace uses the shared stream reader.
- [x] Output formats: briefing, slideshow, puppetshow, field-board, and script remain backend relay modes. The workspace renders the deliverable, actions, sources, and trace summary; the legacy arena remains the retained parity reference.
- [x] Retained feature destinations: route directory stays shared; supervisor review, listing review/handoff, refinements, trace export, and action-item handlers remain in `AgentSelectionArena.tsx` until the dedicated P6 extraction; workspace results do not auto-execute action items.
- [x] Provider boundaries: `app/layout.tsx` still composes one `JamieAudioProvider`; normal, tenant, and minimal-chrome layout branches are unchanged. Workspace ownership is a lease on that provider, not a second recognition instance.
- [x] Legacy compatibility: `JamieChat` consumes the legacy submitted wake-query slot only outside workspace ownership; `/agent` and the original arena implementation are not removed.

### P1 — Shared finalized transcript, single capture owner

Modify `context/JamieAudioContext.tsx`, `components/JamieChat.tsx`, and the audio state/lifecycle tests.

Tasks:

1. Expose a bounded finalized-segment feed with stable session/sequence IDs. Keep interim caption separate from submission content.
2. Deduplicate recognition results by recognition generation/result index. Do not deduplicate speech solely by text, since people may intentionally repeat a sentence.
3. Add explicit submission ownership: legacy Jamie wake mode versus workspace mode. Workspace ownership suspends legacy wake-query generation/consumption; it does not create another microphone.
4. Preserve the legacy “pull that up” behavior outside the workspace.
5. On mode change, stop, permission loss, TTS pause, or workspace release, invalidate pending automatic submissions and assessment timers. Late events must check generation/ownership before dispatch.
6. Make microphone controls update the existing preference and provider consistently so a settings effect cannot immediately restart a stopped microphone.
7. Acquire/release workspace ownership on mount/unmount. Ownership and microphone permission remain separate: opening the workspace must not start capture automatically.
8. Maintain TTS suppression. Clear interim speech at the boundary and reject stale finalized callbacks from an earlier capture generation.
9. Display denied/unavailable states with a working typed-input fallback.

Done when: one recognition instance feeds several subscribers; no duplicated Jamie submission; stop prevents delayed submissions; existing legacy wake tests still pass.

### P2 — Agent sessions and manual submission

Create:

- `lib/agent-workspace/types.ts`
- `lib/agent-workspace/workspaceReducer.ts`
- `lib/agent-workspace/workspacePolicy.ts`
- `lib/agent-workspace/buildAgentCommand.ts`
- `components/agent-workspace/useAgentWorkspace.ts`
- `components/agent-workspace/useAgentCommandRun.ts`

Tasks:

1. Spawn independent sessions from the actual worker roster. Initially surface listing-summary, buyer-intent, and follow-up-writer; make remaining supported roles discoverable.
2. Give each instance a UUID, including two instances of the same worker.
3. Keep state updates keyed by agentId AND runId. Switching panels must not reroute a response.
4. Implement `submitToAgent({agentId, text, source, triggerId})` as the only entry to command dispatch.
5. Send the existing payload: command, selectedWorkerId, relayMode, supervisor, and only supported record context.
6. Reuse `readCommandStream` and existing response types. Handle non-OK and non-SSE JSON responses explicitly.
7. Build bounded context from this agent's assignment/history and relevant speech. Reserve room for the user's text within the endpoint's 20,000-character limit. Show a validation error for oversized manual text rather than silently trimming it.
8. Add per-run AbortController and stale-result rejection. Aborting client fetch does not guarantee server computation stops; label this honestly.
9. Keep raw speech out of new persistence/analytics. Existing backend logging behavior is unchanged and must not be described as local-only.
10. Keep conversation history in client state; no new database table or per-agent daemon.

Done when: two agents can submit and receive isolated results, manual text works with the microphone off, and a failed run cannot overwrite another agent's progress.

### P3 — Attention decisions and automatic scheduling

Create:

- `lib/agent-workspace/attentionPolicy.ts`
- `lib/agent-workspace/submissionScheduler.ts`
- `components/agent-workspace/useAgentAttention.ts`

Tasks:

1. Evaluate only finalized speech newer than each agent's cursor and within its active listening session.
2. Gate locally for new content, pause state, cooldown, duplicate trigger, and budgets before any semantic assessment.
3. Implement ignore/wait/submit decisions with a deterministic adapter for development and fixtures. This is rules-based relevance, not an LLM reasoning claim.
4. Use existing intent signals without forcing a worker before classification. Uncertain fragments should wait; generic fallback routing must not make every agent fire.
5. Add the semantic adapter described in P4 before claiming semantic autonomous listening complete.
6. Coalesce new transcript while an agent is busy; reassess the newest eligible window once capacity exists. Do not replay a backlog of stale utterances.
7. Reserve a submission key synchronously before network work: agentId + transcript window/trigger identity + normalized submitted text.
8. Manual submission of the same current speech claims the pending automatic trigger for that agent. If automation already started it, focus that run instead of submitting again.
9. New edited text is a deliberate new request, subject to capacity. Other agents may process the same speech for different assignments.
10. If a queued decision returns after pause, removal, recipient reassignment, microphone stop, or a manual claim, discard it.
11. Count started requests against the budget, including failures; do not retry uncertain POST executions automatically.
12. Implement Pause automation, per-agent pause, and microphone-off behavior. All cancel queued automatic starts; running jobs retain visible state.

Done when: realistic transcripts cause relevant agents to act and unrelated agents to stay quiet, without bursts, duplicate races, or restart loops.

### P4 — Bounded semantic attention adapter

This is the only planned new backend surface, if no existing side-effect-free assessor fits.

Proposed files:

- `lib/agent-workspace/attentionDecisionSchema.ts` — shared validation contracts.
- `lib/agent-workspace/assessAgentAttention.server.ts` — server-only adapter.
- `app/api/commands/attention/route.ts` — bounded assessment only.

Tasks:

1. Accept eligible agent roles/assignments, transcript segment IDs/text, and a window ID. Limit agents, text length, and response size.
2. Return one validated ignore/wait/submit decision per supplied agent with short reasoning and relevant segment IDs.
3. The assessor must not call `runCommandCenterCommand`, retrieve full atlases, write command memory, use tools, or execute application actions.
4. Compose the actual submitted command from selected original transcript segments client-side. Do not allow the assessor to silently invent facts or arbitrary commands.
5. Reuse an existing configured model/provider integration where suitable; inspect installed SDK documentation before implementing calls. No provider migration or new agent framework is required.
6. Preserve the applicable command access pattern for the new endpoint; this is not a permission redesign.
7. Time out assessment and return a visible fallback mode. On missing configuration/malformed output, use conservative rules-based decisions or wait; manual submission remains available.
8. Bound actual assessment calls server-side as well as client-side using existing available request-limit conventions. Do not introduce a database polling loop.
9. Surface whether attention is semantic or rules-based. Show request counts; report token/cost data only if actually available.

Done when: mocked semantic output is validated, unknown agent/segment IDs are rejected, and a real configured-provider smoke test demonstrates assessment without triggering command execution itself. Record an unavailable provider as unverified rather than quietly claiming completion.

### P5 — Build the replacement workspace UI

Create components under `components/agent-workspace/`:

- `AgentWorkspace.tsx`: layout and coordinator.
- `AgentRail.tsx`: selection, states, pause, remove.
- `SpawnAgentDialog.tsx`: role, label, assignment, automatic-listening toggle.
- `WorkspaceMicControls.tsx`: shared microphone state and pause automation.
- `SharedTranscript.tsx`: bounded final transcript plus separate interim caption.
- `AgentComposer.tsx`: per-agent editable draft, use recent speech, Submit now.
- `AgentActivity.tsx`: triggers, waiting/budget reasons, errors, retry.
- `AgentResults.tsx`: reuse extracted result/action/evidence views.

Tasks:

1. Implement the desktop and mobile arrangements from section 3.
2. Use separate list selection and listening controls; do not couple selectedAgentId to transcript fan-out.
3. Preserve scroll position when reading old transcript/results; offer “Jump to latest.”
4. Keep pending manual edits on agent switch and automatic completion.
5. Ask before discarding a nonempty draft on agent removal. Explain the treatment of any in-flight run.
6. Provide keyboard-accessible dialogs/tabs/buttons, clear focus restoration, and restrained live announcements.
7. Add empty, busy, paused, denied, unsupported, assessment-unavailable, error, and budget-exhausted states.
8. Include `CommandRouteDirectory` rather than reimplementing the 113-path catalog.
9. Store optional agent configuration using a versioned, account-scoped preference key; default auto listening off after reload. Do not restore stale running states.

Done when: the complete screen works with mocked audio and real existing command transport; every essential control has a test.

### P6 — Output parity and route cutover

Modify `app/command-center/page.tsx` only after P1–P5 acceptance criteria pass.

Tasks:

1. Extract reusable arena output/rendering functions structurally into shared components as needed. Keep tests covering their contracts.
2. Preserve briefing, slideshow, puppetshow, field-board, script, copy/export, sources, trace inspection, refinements, and worker handoff where currently implemented.
3. Retain supervisor review and existing action handlers as explicit per-run operations. Do not automatically execute action buttons merely because a command was automatically submitted.
4. Mount `AgentWorkspace` as the default Command Center UI; update metadata.
5. During local development a query-controlled legacy view may help comparison. Do not add an extra route or permanently maintain two divergent command systems.
6. Keep `/agent` working with its current preferences and starter jobs. Link it to the replacement workspace; migrating that screen is a separate decision.
7. Update the route catalog's description, not its URL. Preserve route count/README inventory unless actual source routes change.
8. Remove obsolete arena code only after parity is demonstrated and imports are checked.

Done when: `/command-center` defaults to the new workspace, old links still work, and existing non-workspace Jamie/Agent Console behavior remains intact.

### P7 — Verification and documentation

Add focused suites:

- `tests/unit/agent-workspace-state.test.ts`
- `tests/unit/agent-workspace-attention.test.ts`
- `tests/unit/agent-workspace-scheduler.test.ts`
- `tests/unit/agent-workspace-command.test.tsx`
- `tests/unit/agent-workspace-ui.test.tsx`
- `tests/unit/command-attention-route.test.ts`
- `tests/agent-workspace.spec.ts`

Extend rather than replace the existing audio, command contract, stream, route inventory, and Agent Console tests.

Critical scenarios:

1. Two spawned agents hear the same finalized sentence; only the relevant one submits.
2. A later sentence completes an initially incomplete thought.
3. Selecting another agent panel does not change listening subscriptions.
4. Manual click and automatic decision race produces one execution for that agent/trigger.
5. Two instances of one worker keep independent drafts, histories, and responses.
6. A result arrives out of order or after agent removal; no wrong-panel update.
7. Pause, stop, unmount, permission denial, and TTS block delayed submissions.
8. Recognition restart/repeated callbacks do not replay old work.
9. Busy agents coalesce new context; budgets are visible and cannot grow an unbounded queue.
10. Malformed/empty/failed responses and partial stream chunks produce recoverable errors.
11. Legacy wake behavior outside the workspace and `/agent` still function.
12. All retained output formats and explicit action workflows remain reachable.
13. Desktop and 390px mobile layouts have usable controls, no overflow, and keyboard access.
14. Real-browser microphone verification is recorded separately from mocked transcript tests.

Documentation changes at completion:

- Link this plan near the top of the root README; describe the feature as planned until cutover.
- At cutover update Command Center instructions and microphone limitations.
- Document that live listening stops when the workspace is closed and client abort may not cancel server work.
- Record observed provider/browser behavior and test results; do not claim production verification from local fixtures.
- Keep PR/CI status checking and deployment work outside this implementation plan.

## 6. Acceptance walkthrough for Taz

1. Open Command Center: no microphone starts unexpectedly.
2. Spawn Listing Summary and Follow-Up Writer; see two distinct panels.
3. Enable the microphone and both agents' automatic listening.
4. Speak a listing description. Relevant work appears with the triggering words and reason; unrelated agents remain quiet.
5. Say you need a follow-up message. Follow-Up Writer responds using the available conversation context without inventing a recipient or sending anything.
6. Edit the visible text and click Submit now. Confirm that agent receives your exact edits and incoming speech does not overwrite them.
7. Pause one agent; keep speaking. Only enabled agents consider new speech.
8. Pause automation; manually submit text successfully.
9. Turn the microphone off while a decision is pending. No new automatic command starts afterward.
10. Inspect results, sources, formats, supervisor controls, and Browse app paths.
11. Reload: no automatic microphone restart and no false “still working” job.
12. Repeat on mobile and verify typed fallback when speech recognition is unavailable.

## 7. Sequence, estimates, and completion accounting

Working estimate, not a deadline:

| Package | Effort |
| --- | --- |
| P0 contracts/parity map | 1–2 hours |
| P1 transcript ownership | 3–5 hours |
| P2 sessions/manual execution | 3–5 hours |
| P3 scheduler/relevance | 3–5 hours |
| P4 semantic adapter | 2–4 hours |
| P5 workspace UI | 4–6 hours |
| P6 parity/cutover | 3–5 hours |
| P7 verification/docs | 3–5 hours |
| Total | 22–37 hours |

First useful milestone: P0–P2, with manual per-agent execution and the shared transcript.
Autonomous-listening milestone: P3–P4.
Replacement milestone: P5–P7 with retained features verified.

### September 11 review and revised execution order

The initial baseline overstated safety and parity. Review found late assessments could submit after stop/TTS, batched agents shared the first agent's window, client abort immediately released backend capacity, retries rebuilt changed context, mobile navigation could strand the user, and the workspace listing panel omitted editable copy/intake/canonical workflows. These are functional regressions, not polish tasks.

Corrective implementation in this review:

| Area | Implemented behavior | Evidence / remaining boundary |
| --- | --- | --- |
| P0 contracts | `lib/command-center/commandTypes.ts` holds the full arena response and a compatible sparse console projection. Workspace retains rich diagnostics without double casts. | Legacy transport still needs migration to the shared, validated reader. |
| P1 capture | Workspace route suppresses persisted legacy listening before child effects; permission completion is epoch-checked; recognition restarts have distinct callback attempts. | Fake recognition tests cover dedup/restart/late media. Real-device microphone walkthrough remains. |
| P2/P3 runs | Immutable request snapshots; synchronous reserved slots; execution-time capture check; original retry options; only submitted transcript advances its cursor. Cancel/uncertain delivery holds capacity for five minutes. | The hold is a conservative client policy, not proof the backend stopped. No automatic retry. Manual speech-trigger claim integration remains. |
| P3/P4 attention | Abort obsolete requests; recheck capture/TTS/pause/agent/window/epoch; validate both sides; batch separate per-agent segment IDs; deterministic prefilter; bounded windows; wait on access/budget/malformed-response failures. | Semantic availability is explicitly displayed. No live provider smoke performed. |
| P4 endpoint | Existing operator access and shared request limiter run before assessment. Paid semantic requests require distributed limiting even in development. Provider timeout aborts; SDK retries disabled; no fabricated usage. | Configuration or rate-limiter failure cannot enable unlimited paid calls. No production flags changed. |
| P5 UI | Persistent Agents/Conversation/Work navigation at mobile; rail plus switchable content at tablet; historical result selection, removed-agent history, run-keyed output state, keyboard dialog focus. | Browser checks must cover 1440, 900, and 390px; automated checks do not replace real microphone verification. |
| P6 listing | Original `ListingReviewPanel`, editable `ListingCopyPackage`, and `CanonicalListingHandoff` structurally extracted; both arena and workspace consume them. Helpers live in `listingReviewHelpers.ts`. | Tests cover remarks/features, edited-copy save, optimistic version, readiness blockers, conflict preservation. Existing intake/command deep links remain in the classic surface. |
| P6 actions/review | Visible copy-ready output restored; clipboard starts before action-memory requests; command actions populate a draft only; configured supervisor queues/processes review bound to run + backend command ID. | Source/diagnostic views still need structural consolidation; full trace-export and TensorZero feedback parity remain. |

Revised order: safety/race fixes → shared contracts and actual listing extraction → focused regression tests → responsive browser walkthrough → remaining structural source/diagnostic/transport and feedback parity. Do not add further reduced copies. Keep `?legacy=1` and classic intake/command deep links until parity is demonstrated. Do not mark P0–P7 complete or change the root README to “complete” based on compilation alone.

Verification for this review: 60 tests across the focused workspace/result suites passed, including ten asynchronous-boundary tests. The full relevant focused command below passed 57 tests across 14 suites before the final three parity assertions were added; the parity suite then passed independently. Production build passed after the shared contract extraction. Browser verification passed at 1440px, 900px, and 390px with mocked SSE responses and zero microphone requests; the existing shared-shell React #418 hydration warning was reproduced on `/`, `/command-center`, and `/command-center?legacy=1` and is explicitly tolerated only by the workspace spec. Standalone TypeScript checking still reports existing repository test errors; it is not a clean global pass. A live provider/microphone smoke test remains unavailable in this session.

Earlier baseline handoff record (historical; superseded by the audit above):

1. Changed `JamieAudioContext.tsx`, `JamieChat.tsx`, the shared stream reader, the command-center page/catalog, new `lib/agent-workspace/*`, new `components/agent-workspace/*`, the bounded attention route, and focused unit/browser specs.
2. Implemented: one shared finalized transcript feed, workspace ownership lease, legacy wake suppression in workspace mode, independent spawnable agent sessions, per-agent drafts/runs, bounded manual/automatic command dispatch, rules-based attention, concurrency/cooldown/budget guards, retry/cancel visibility, mobile-aware UI, and versioned account-scoped role preferences.
3. Focused verification passed: 34 unit tests across audio, stream, state, attention, scheduler, command, route, catalog, and UI suites; `npm run lint` passed with two pre-existing warnings; production build completed successfully (the existing `/api/kepler/listings` static-generation diagnostic remained non-fatal).
4. Compatibility notes: semantic attention is implemented behind explicit provider configuration but has not been smoke-tested against a live configured provider in this session; automatic attention displays rules-based mode when unavailable. Client aborts are labeled as unable to guarantee server cancellation. Full arena action/review extraction is still open.
5. Next package: P6 continuation, extracting canonical listing handoff, supervisor review queue state, trace export, and remaining per-run action/refinement handlers before removing the legacy comparison surface.

Deferred deliberately: always-on server agents, cross-device live sessions, scheduling/cron, separate agent databases, raw audio storage, arbitrary plugin installation, new model-provider architecture, redesigning `/agent`, and autonomous production mutations.

Next executable action: complete the remaining P6 extraction and per-run action parity, then run the P7 browser/documentation walkthrough. Do not remove the legacy comparison surface until parity is demonstrated.

## 8. Line-anchored implementation instructions

This section expands P0–P7 into edit operations. It takes precedence over a less-specific instruction earlier in the plan. Existing source anchors were checked on September 11, 2026. New-file lists specify declaration/statement order, not fabricated source line numbers.

Before each edit, search for the symbol and inspect the surrounding code. Do not apply an old numeric range blindly. These are target contracts, not a completion checklist; section 7 distinguishes installed behavior from remaining work.

### 8.1 P0 — Extract the full command contracts before writing the new run hook

**Existing file: `components/command-center/AgentSelectionArena.tsx`**

| Current lines / symbol | Exact edit operation | Preserve |
| --- | --- | --- |
| 37, `RelayMode` | Move the union into new `lib/command-center/clientContracts.ts`; export it and import it back using `import type`. | All five existing relay values. |
| 39–325, `CommandResponse`, `WorkflowTrace`, `CommandProgressEvent` | Move the complete declarations into that same type-only module. Bring their type dependencies with them. | Every optional field, trace branch, listing fact, source, action item, and deliverable field. Do not substitute the smaller Agent Console response type. |
| 326–327, trace-derived aliases | Export only aliases needed by extracted output components; keep other arena-local aliases local. | Derivation from the complete response contract. |
| 1087–1158, `safeJson`, `readCommandStream`, parser/progress helpers | Replace duplicated transport helpers with imports from the shared client transport described below, once both clients pass contract tests. | Existing SSE event names and progress upsert semantics. |
| Imports at top | Import types from the type-only contracts module. | Do not import the filesystem-backed command router into a client component. |

**Existing file: `components/agent-console/agentConsoleConfig.ts`, lines 10 and 27–60**

1. Keep `StarterJob`, preferences, examples, and starter-job data unchanged.
2. Keep compatibility for existing Agent Console fixtures that intentionally provide only its smaller response shape.
3. Introduce a named `AgentConsoleResponse` for that projection, retaining a compatibility export if existing consumers need it.
4. Do not force minimal Agent Console test fixtures to pretend they contain full arena traces.
5. Let the shared stream transport decode an unknown result, then use caller-specific validation/narrowing for the full workspace result versus the smaller console projection.
6. Never resolve the mismatch with `as any` or by deleting richer fields.

**Proposed file: `lib/command-center/commandClient.ts`**

Declaration order:

1. Import browser-safe result/progress types.
2. Define `CommandClientError` with status and a safe display message.
3. Define a small `readErrorBody(response)` helper that tolerates empty or non-JSON error bodies.
4. Export `submitCommand(input, {signal, onProgress})`.
5. Inside it, POST to `/api/commands`, request SSE, and pass `signal`.
6. Check `response.ok` before selecting a response parser.
7. Branch on Content-Type: SSE uses the shared stream reader; JSON uses guarded JSON parsing.
8. Validate the fields that the caller needs before rendering: command ID, worker identity, result/deliverable, and relevant trace structure.
9. Throw a recoverable error for empty JSON, malformed result, SSE error, or a stream ending without a result.
10. Return data; do not mutate React state, select an agent, save history, or trigger another command here.

**Existing file: `components/agent-console/agentConsoleCommandStream.ts`, `readCommandStream`**

- Extract shared parsing into `lib/command-center/commandStream.ts`; keep a compatibility wrapper/re-export for existing imports.
- Keep incremental TextDecoder use; support both LF and CRLF frame separators across chunk boundaries.
- Flush decoder and process a final buffered event at EOF even without a trailing blank line.
- Surface malformed result/error frames rather than silently returning a previous unrelated payload.
- Release the reader lock in `finally`; cancel the reader when abandoning the stream.
- Add an optional abort path without claiming that stopping the client cancels server execution.
- Test this extraction before changing the page component.

**P0 evidence:** snapshot the outgoing payload keys and existing rendered output features. Do not change `app/api/commands/route.ts` or `commandRouter.ts` for this extraction.

### 8.2 P1 — Extend `JamieAudioContext.tsx` in source order

| Current anchor | Code change |
| --- | --- |
| Line 3, React imports | Add only hooks needed by the new implementation. Keep recognition objects, MediaStream, timers, and lease tokens in refs, not serialized state. |
| Line 8, private `TranscriptSegment` | Retain compatibility with `recentTranscript` and its existing fixtures. Define an exported finalized-event type separately or accept the old helper input shape. Do not break all fixtures merely to add session IDs. |
| Lines 12–25, state/actions | Add `finalizedSegments`, `transcriptSessionId`, `latestSequence`, `submissionOwner`, and `submissionEpoch`. Add actions for appended final speech, pruning, ownership changes, and pending-submission invalidation. |
| Lines 47–52, context interface | Expose finalized segments, stable lease acquire/release methods, and explicit workspace microphone methods. Keep start/stop/cancel/consume available to legacy callers. |
| Lines 54–56, constants | Retain the current 30-second legacy wake window and two-second review delay. Put workspace scheduling defaults in its own policy module; do not change legacy timing globally. |
| Lines 59–64, initial state | Initialize an empty feed, sequence zero, no lease, no pending query. Generate IDs in event/effect initialization, not module load or rendering. |
| Lines 66–84, reducer | Append final events immutably, deduplicate event IDs, prune bounded history, and clear pending/submitted legacy queries on ownership invalidation. Keep ordinary status updates distinct from query clearing. |
| Lines 87–94, `recentTranscript` | Keep wake-phrase removal for legacy query assembly. Do not apply it to the raw shared transcript; users should see what was recognized. |
| Lines 104–118, provider refs | Add workspace lease token, explicit workspace capture-enabled ref, per-recognition-start epoch, seen-result keys, monotonic transcript sequence, and submission epoch refs. |
| Line 120, preference synchronization | Replace unconditional preference-to-enabled mirroring with an effective-capture policy: workspace mode uses explicit workspace intent; legacy mode uses its existing preference. |
| Lines 122–126, `refreshCaption` | Keep display-caption updates separate from immutable final events. A caption such as “Search cancelled” must never become agent input. |
| Lines 128–144, `beginRecognition` | Check effective capture intent and current lifecycle generation before restarting. Track a new recognition-run epoch whenever recognition starts; result indexes may restart after onend/start. |
| Lines 146–157, `stop` | Invalidate submission epoch, clear pending legacy query/feed-dispatch timers, stop recognition, release tracks, reset interim speech, and mark capture off. Do not erase already displayed agent results. |
| Lines 159–192, `start` | Snapshot lifecycle generation before awaiting permission. After permission resolves, release tracks if that request is stale, ownership changed, or effective capture was disabled. |
| Line 194, `onresult` guard | Reject callbacks from obsolete recognition objects/runs, disposed provider, disabled capture, and active TTS suppression. |
| Lines 201–204, interim branch | Update caption only. Do not append to the finalized feed, assess relevance, or call a query endpoint. |
| Lines 206–208, final append | Build a unique key from recognition object/run epoch plus result index; skip a duplicate callback. Assign monotonic sequence and a stable event ID, then append to both the legacy buffer and shared final feed as appropriate. |
| Lines 209–217, wake detection | Enter this branch only when submission owner is legacy Jamie. Workspace mode leaves “pull that up” as ordinary transcript content, without queuing a second Jamie request. |
| Lines 269–273, preference effect | Use effective capture intent. A saved legacy preference must not start microphone capture while the workspace is requesting explicit control. |
| Lines 275–280, pending query timer | Capture owner, epoch, and query ID when scheduling. Check all three again inside the callback. Clear the timeout on invalidation and TTS start. |
| Lines 282–289, pruning interval | Prune final events as well as the legacy buffer, preserving monotonic sequence. No model call or database query belongs in this timer. |
| Lines 291–315, TTS lifecycle | Invalidate pending automatic decisions and clear interim text when speech starts. Preserve the existing one-microphone-lease behavior. Do not increment the recognition-object generation unless replacing that object and its callbacks. |
| Lines 317–323, context value | Publish stable callbacks and finalized data. One agent must never consume/remove a segment before other agents see it. |

**Submission ownership contract:**

- `acquireWorkspace(ownerToken)` claims submission ownership, clears any old wake submission, and returns an idempotent release function.
- Release affects ownership only if its token still matches; a Strict Mode cleanup or old component cannot release a newer lease.
- Add route-aware suppression for `/command-center` before the provider's auto-start effect runs. A child mount effect alone is too late to guarantee no initial auto-start.
- A workspace route without an active lease stays capture-disabled. Explicit workspace Start enables it.
- Do not add a second `JamieAudioProvider` inside the workspace.
- On leaving the route, stop workspace-owned capture and queued automation. Restore legacy availability, but do not submit speech buffered during the workspace session.
- If the browser cannot identify whether a final result spans a TTS boundary, discard that ambiguous segment rather than feeding generated speech back into commands. Record any conservative suppression behavior in microphone verification.

### 8.3 P1 — Coordinate legacy Jamie and settings without a global rewrite

**`components/JamieChat.tsx`:**

1. At the `useJamieAudio()` call near line 114, read submission ownership.
2. Near line 445, guard wake auto-start logic when workspace ownership/route suppression is active.
3. Near lines 456–461, return early from the submitted-query effect unless owner is legacy Jamie; retain query ID consumption for that legacy path.
4. Near lines 607–645, label workspace-owned capture as “Microphone managed by Agent Workspace”; do not show controls that restart legacy wake submission concurrently.
5. Keep typed Jamie messages, chat endpoints, existing response rendering, and non-workspace wake behavior unchanged.
6. Do not forward workspace transcripts through `sendChatMessage`; workspace agents call the existing command endpoint through their own submission function.

**`context/ThemeProvider.tsx`:**

- Lines 95–96 already expose wake preference and setter; line 183 defaults false, line 225 restores saved state, and lines 323–326 persist it.
- Keep that preference compatible for legacy Jamie.
- Do not persist the workspace's “currently recording” state through this setter.
- Put workspace capture intent in the audio provider's session refs/state instead. Optional saved agent configuration must restore listening disabled.
- This refines P1's earlier preference instruction: synchronization means respecting separate legacy preference and explicit workspace intent, not turning one persisted boolean into two competing owners.

### 8.4 P2 — New domain files, declaration by declaration

**`lib/agent-workspace/types.ts`:**

1. Import full browser-safe command contracts with `import type`.
2. Declare `SubmissionSource = 'manual' | 'automatic'`.
3. Declare run states: queued, running, complete, failed, cancelled. Keep “listening” outside this union.
4. Declare finalized transcript identity with session ID and sequence.
5. Declare `AgentSession` fields from section 4 plus `relayMode`, `supervisorEnabled`, `assignmentRevision`, and optional supported record context.
6. Add `draftSourceSegmentIds`, `draftRevision`, and `lastSubmittedSegmentIds` so manual/automatic races can be reconciled.
7. Declare `AgentRun` with immutable assignment/worker/input snapshots and backend `commandId` separate from local `id`.
8. Declare `AttentionDecision` with agent ID, assignment revision, window ID, decision, reason, and referenced segment IDs.
9. Declare `SubmitAgentInput` and a discriminated result: started, already-running, busy, invalid, or paused.
10. Declare reducer actions as a discriminated union. Each run-related action includes both agent ID and run ID.
11. Do not put fetch, timers, localStorage, or model imports in this file.

**`lib/agent-workspace/workspacePolicy.ts`:**

1. Export one frozen object containing every numeric default from section 4.
2. Add named input limits: assignment 1,000 characters, manual command maximum 20,000, automatic candidate maximum 12,000, final-feed maximum 200 segments.
3. Add history caps: 20 run summaries per agent and 10 retained full results across the workspace. Eviction removes only terminal runs, never pending/running work.
4. Add a documented display-retention rule; a 30-second relevance window need not erase the currently viewed transcript instantly, but both display and relevance buffers must be bounded.
5. Inject time into logic under test rather than reading Date.now throughout helpers.

**`lib/agent-workspace/workspaceReducer.ts`:**

1. Export `initialWorkspaceState`; create no IDs inside it.
2. Implement SPAWN: validate supported role/capacity, append session, select it.
3. Implement SELECT: change selection only.
4. Implement UPDATE_DRAFT: update only that agent, set dirty, increment draftRevision.
5. Implement USE_TRANSCRIPT: explicit replacement with selected final text and source segment IDs.
6. Implement APPEND_TRANSCRIPT: update untouched drafts only; preserve edited drafts.
7. Implement SET_LISTENING: change eligibility and move cursor on resume so stale speech is not replayed.
8. Implement UPDATE_ASSIGNMENT: increment assignmentRevision and invalidate queued decisions for the previous revision.
9. Implement RUN_STARTED/PROGRESS/RESULT/ERROR/CANCELLED with ID and state guards; ignore late events for deleted/terminal runs.
10. Implement REMOVE_AGENT after UI confirmation; discard its queued candidates and select a remaining agent deterministically.
11. Implement global pause without turning successful results into paused jobs.
12. Export pure selectors for selected agent, active runs, capacity, and attention count.

**`lib/agent-workspace/buildAgentCommand.ts`:**

1. Accept the immutable agent snapshot, visible submission text, relevant final segments, and bounded own-agent history.
2. Keep original submission text intact as a labeled block; omit duplicate transcript context already present in that text.
3. Add assignment and selected record context only when actually available.
4. Add earlier own-agent context only within remaining capacity.
5. Trim oldest optional history first, then optional supporting transcript; never silently truncate the user's visible text.
6. If mandatory assignment plus text exceed the endpoint limit, return a structured length error.
7. Return the existing API fields only; worker ID comes from the frozen agent snapshot.
8. Keep automatic and manual builds identical except for their selected text/context and local provenance.
9. No runtime import of `commandRouter.ts` into the client bundle.

### 8.5 P2/P3 — Exact submission and scheduler order

**`lib/agent-workspace/submissionScheduler.ts`:**

Implement a small scheduler whose mutable reservations live synchronously outside React render state. React state reflects reservations; it must not be the only lock.

For `tryReserve(input)`, execute in this order:

1. Resolve the agent; reject missing/removed agents.
2. Check assignmentRevision and workspace submission epoch.
3. Normalize text for equality checks, preserving the original text for execution.
4. Reject empty text or invalid lengths.
5. Find an existing run/reservation for the same agent and claimed trigger. Return its run ID instead of starting another.
6. For an automatic request, check capture active, auto listening enabled, no TTS, global automation active, cursor freshness, cooldown, and budgets.
7. For either source, check global and per-agent capacity.
8. Reserve agent/run/trigger IDs synchronously before the first await.
9. Charge automatic start counters once execution actually starts, not for an ignored or merely queued candidate.
10. Return the immutable reservation.

Other methods:

- `claimManualTrigger`: cancels a not-yet-started automatic reservation for matching source segments and supersedes a pending assessment. If the same execution already started, select it instead.
- `completeRun`: releases active capacity only for the matching reservation.
- `coalesceCandidate`: replaces the agent's one queued automatic candidate with the newest eligible snapshot.
- `invalidateEpoch`: clears decisions/candidates without pretending in-flight backend work vanished.
- `removeAgent`: drops only that agent's pending work.
- `getBudgetState`: returns counts and reset time for UI explanations.

Do not count a client-cancelled running request as freed backend capacity immediately: keep a conservative slot/cooldown until normal completion is observed or a documented execution timeout expires. Otherwise repeated cancel/spawn actions bypass the concurrency budget.

**`components/agent-workspace/useAgentCommandRun.ts`:**

1. Begin with `'use client'`.
2. Accept scheduler/store callbacks; never close over selectedAgentId as the recipient.
3. Keep AbortControllers in a Map keyed by run ID.
4. In submit, build the request snapshot, reserve, allocate controller, dispatch RUN_STARTED, then invoke shared commandClient.
5. In onProgress, dispatch against the captured agent/run IDs.
6. On response, validate reservation/generation and dispatch result with the backend commandId.
7. On error, distinguish user abort from transport/server failure; preserve submitted text for manual retry.
8. In finally, remove controller and settle reservation according to cancellation policy.
9. On unmount, abort local transports and invalidate epochs. Do not POST retries automatically.
10. Return submit/cancel/retry functions. Retry is an explicit new attempt, with a new run ID and duplicate-risk disclosure after an uncertain network failure.

### 8.6 P3/P4 — Exact attention processing order

**`lib/agent-workspace/attentionPolicy.ts`:**

1. Export `getEligibleWindow(agent, segments, now)`.
2. Reject segments predating the agent's spawn/resume boundary or outside the relevance window.
3. Include enough retained context to complete a waiting thought, but require at least one new segment after the last evaluated cursor.
4. Build a stable window ID from session, agent assignment revision, and ordered segment IDs—not wall-clock render time.
5. Export deterministic `assessWithRules` returning ignore/wait/submit plus reason.
6. Never call `classifyCommandIntent(text, agent.workerId)` to test relevance: that forces the answer. Classify without selection, then compare detected intent to the role's supported triggers.
7. Use a small explicit role-to-intent map for the first supported roles. Unsupported/ambiguous mappings wait rather than firing on generic fallback.
8. Mark deterministic results as rules-based in activity data.
9. Export a final eligibility recheck for use immediately before scheduling execution.

**`components/agent-workspace/useAgentAttention.ts`:**

1. Subscribe to final-segment sequence, agent eligibility/revisions, capture state, and global pause—not caption updates.
2. Debounce only when eligible new final content exists.
3. Snapshot an assessment ID, workspace epoch, eligible agent revisions, and segment IDs.
4. Batch all eligible agents into one assessment; do not make one model call per agent.
5. Abort obsolete assessments when newer speech replaces them; charge requests already sent against the assessment budget.
6. Validate returned IDs/window/revisions before applying any decision.
7. Record ignore/wait silently in expandable details.
8. For submit, assemble text from the returned original segment IDs in their original order; pass it to the shared submit function.
9. Recheck epoch, active capture, assignment, manual claims, and budget immediately before submission.
10. On error, use the documented conservative rules adapter or show waiting; never execute a full command as a fallback assessment.
11. Pause/stop/TTS/unmount clear timers and invalidate asynchronous completions.

**`lib/agent-workspace/attentionDecisionSchema.ts`:**

Declare request schemas before response schemas. Validate maximum 3 agents, unique agent IDs, assignment length, transcript total length, unique segment IDs, known decision enum, and bounded reasons. Then add cross-field validation:

- Every decision references an input agent and the same assignment revision.
- Exactly one decision exists for each assessed agent.
- Every referenced segment belongs to the submitted window.
- Submit requires at least one relevant segment; ignore/wait cannot carry executable text.
- No output command/tool/action field is accepted.

**`app/api/commands/attention/route.ts`:**

Statement order in POST:

1. Parse JSON safely.
2. Validate bounded request schema; return 400 for invalid input.
3. Apply the existing appropriate access/request-limit convention for this endpoint; do not change access for other routes.
4. If required configuration or distributed budget support is unavailable, return an explicit unavailable decision mode rather than silently making unlimited provider calls.
5. Invoke the server-only assessor with a bounded timeout and no tools.
6. Validate response and input/output ID correspondence.
7. Return decisions, assessment ID, and available usage fields only.
8. Catch timeout/provider/validation failures with a safe recoverable response.
9. Do not import command execution, site mutation, or Supabase content repositories.

**`lib/agent-workspace/assessAgentAttention.server.ts`:**

1. Mark the module server-only.
2. Accept a provider-independent validated input and injectable assessment function for tests.
3. Explain ignore/wait/submit and quote transcript as observed conversation, not executable instructions.
4. Ask for structured decisions only; no chain-of-thought or tool use.
5. Bind a currently configured provider using inspected installed SDK APIs. This plan does not prescribe an unverified SDK method or model name.
6. Parse and validate the returned decision object.
7. Return usage only when actually supplied by the provider.
8. Do not make an installation or provider migration part of this task.

### 8.7 P5 — UI files, exact render and event order

| New file | Implement from top to bottom |
| --- | --- |
| `useAgentWorkspace.ts` | Initialize reducer → create stable scheduler → acquire audio lease → expose state/selectors → compose run and attention hooks → invalidate on removal/unmount → return explicit callbacks. Ensure hooks share one scheduler instance. |
| `AgentWorkspace.tsx` | Client directive → imports → controller hook → selected-agent derivation → workspace header → agent rail → transcript/composer → selected result panel → attention/completed footer → shared route directory. Keep selected-agent state above conditional mobile panels. |
| `AgentRail.tsx` | Props → empty state → list of separate selection buttons → independent listening toggles → activity labels → pause/remove controls. Do not nest buttons inside buttons. |
| `SpawnAgentDialog.tsx` | Role selector populated from roster → label → optional assignment → listening toggle → validation → Spawn action. On submit allocate session ID and capture current transcript cursor; never request microphone permission here. |
| `WorkspaceMicControls.tsx` | Visible status label → explicit Start/Stop → global automation pause → unsupported/denied guidance. Start is the only workspace control that requests capture. Stop also invalidates pending automatic submissions. |
| `SharedTranscript.tsx` | Bounded final list keyed by segment ID → separately styled interim caption → jump-to-latest control → selection/use-speech action. Do not use recognition captions as stored transcript. |
| `AgentComposer.tsx` | Recipient label → controlled textarea → dirty/speech-source note → Use recent speech → Submit now button → validation/busy message. Use form onSubmit for mouse and keyboard; snapshot agent ID/text before awaiting. |
| `AgentActivity.tsx` | Current run state → short trigger/reason → queue/cooldown/budget reason → previous terminal runs → expandable ignore/wait details. No independent polling timer per row. |
| `AgentResults.tsx` | Resolve selected run → empty/error/loading case → shared AnswerPanel → output formats → SourcesAndTrace → review/refinement/action controls. Bind handlers to that run's backend commandId, never “the latest result.” |
| `workspacePreferences.ts` | Versioned schema → guarded parse → account-scoped load/save of agent role/label/assignment only → force capture/listening off when restoring → discard invalid versions. In anonymous mode keep settings in memory unless an explicit anonymous-storage policy is chosen. |

Concrete composer behavior:

- Untouched draft follows finalized speech only while that agent is eligible.
- Manual typing increments draftRevision and locks the draft against transcript replacement.
- After Submit now succeeds, retain the exact submitted text until the user clears/replaces it; show the associated run.
- Automatic runs do not clear the manual draft.
- Text from a removed/changed selected panel must not be submitted to a newly selected agent by a stale event handler.
- When an agent is busy, disable Submit now with “This agent is working”; do not discard a typed draft.
- Allow explicit retry of a completed identical request; deduplication protects in-flight/current-trigger races, not a permanent ban on repeated text.

Suggested layout mechanics, scoped to new components:

- Desktop grid: 220px rail, flexible conversation column, flexible work column; each content column uses min-width zero.
- Below 1100px, show the rail plus switchable Conversation/Work content.
- Below 768px, use Agents/Conversation/Work tabs.
- Keep controller hooks mounted above tabs so switching tabs does not stop listening or reset runs.
- Respect reduced motion, visible focus, textarea labels, and dialog focus return.
- Do not alter global styles, root typography, or homepage colors for this workspace.

### 8.8 P6 — Preserve outputs before replacing the page

Extract from `AgentSelectionArena.tsx` in these groups, retaining original props initially:

| Current anchor | Proposed destination |
| --- | --- |
| 1160, `AnswerPanel`; 1241, `CommandProgressRail`; 1269, `RoutingCorrectionPanel` | `components/command-center/results/CommandAnswer.tsx` |
| 1400, `SourcesAndTrace`; 1529, `TraceChip` | `components/command-center/results/CommandSources.tsx` |
| 1538, `DeliverableFrames`; 1554, `RelayPlanPanel` | `components/command-center/results/CommandDeliverables.tsx` |
| 1579, `CommandPostPanel`; 1672, `TahNotePanel` | `components/command-center/results/CommandDetails.tsx` |
| 1733, `ListingReviewPanel`; 1880, `ListingCopyPackage`; 2014, `CanonicalListingHandoff` | `components/command-center/results/CommandListingReview.tsx` |
| 2169–2251, listing transformation helpers | `lib/command-center/listingReviewHelpers.ts` |
| 2322, `buildCommandTraceExport`; 2357 onward, timing/status formatting | `lib/command-center/commandTracePresentation.ts` |

Move small presentation dependencies such as Disclosure/DetailBlock with their actual users, or to a shared result UI module if several files need them. Do not leave a circular import back into AgentSelectionArena.

Handler migration:

1. Inspect `handleActionItem` around line 706 and move its behavior into a per-run controller without changing endpoints/payloads.
2. Bind copy status, action state, review state, and refinement draft to run IDs.
3. Preserve `requestSupervisorReview` at line 782 and `processSupervisorReviews` at line 825. In particular, preserve configured supervisor behavior; do not silently remove automatic review currently tied to the supervisor toggle.
4. Automatic query submission does not imply automatic action-item execution.
5. Preserve rerun/handoff near lines 766–779 with explicit user selection and correctly snapshotted command input.
6. First make the legacy arena use the extracted views. Then make the new workspace use them. Do not delete the original view until both consumers render the expected results.

Cutover exact changes:

- `app/command-center/page.tsx` line 1: replace the arena import with the new workspace import.
- Lines 4–5: update title/description to describe the agent workspace while retaining Sunset Pulse branding.
- Line 9–10, page return: render the client workspace; do not make the page itself a microphone client.
- `lib/navigation/routeCatalog.ts` line 33: retain `/command-center`; update its label/description only if the final UI name changes.
- `app/agent/page.tsx`: no replacement. Preserve its existing workflow.
- `app/layout.tsx`: preserve provider composition; only add route-aware capture support if the provider itself cannot handle it. Do not rewrite layout branches.
- Root README: update the planned-feature sentence to implemented only after P6/P7 are actually complete.
- No changes to `app/page.tsx`, production environment flags, migrations, cron definitions, or existing command request schema.

### 8.9 P7 — Test additions matched to each edit

| Test file | Add these explicit assertions |
| --- | --- |
| Existing `jamie-audio-state.test.ts` | Legacy recentTranscript fixtures still pass; ownership invalidation clears pending/submitted query; display status never enters final feed; pruning does not reset sequence. |
| Existing `jamie-audio-lifecycle.test.tsx` | Extend FakeSpeechRecognition with typed emit helpers for interim/final/repeated result callbacks; two subscribers receive one event each; only one microphone lease exists; saved legacy true does not auto-start workspace capture; release tokens are idempotent; stop during pending getUserMedia releases late tracks. |
| Same lifecycle suite | TTS cancels pending dispatch; old callbacks cannot restart or submit after teardown; recognition restart indexes do not collide with earlier session indexes; workspace speech does not become a Jamie wake submission. |
| New state suite | Two same-role agents have distinct IDs/drafts/results; selection does not change listening; stale result ignored; removal preserves other sessions; restored agents are not marked running/listening. |
| New scheduler suite | Use fake time: 20-second cooldown, 4/minute and 20/hour starts, 2-global/1-agent concurrency, one coalesced queued candidate; manual/automatic same-trigger race sends once; cancel does not instantly bypass capacity. |
| New attention suite | Interim-only input never assesses; generic chatter ignored; incomplete thought waits; new context completes it; forced-worker classification not used as relevance; paused/removed/reassigned agents ignore late semantic responses. |
| New command suite | Assert exact existing endpoint/payload keys; correct worker for each run; out-of-order responses stay isolated; JSON/SSE/empty-body errors; edited manual text remains intact. |
| Existing stream suite | Add LF/CRLF chunk splits, UTF-8 boundary, EOF without delimiter, no-result stream, explicit error event, and reader cleanup. Use both rich arena and smaller console result fixtures. |
| New attention route suite | Invalid JSON/oversize/unknown segment/duplicate agent rejected; timeout/configuration failure recoverable; assessor called once per batch; command executor never called; request budget enforced. |
| New UI suite | Spawn modal keyboard flow, no microphone request from spawn, per-agent Submit now destination, dirty draft preservation, unsupported mic fallback, separate selected/listening states, accessible status/control labels. |
| New browser spec | Seed mocked final events through a test-only fixture enabled only in the existing test environment; verify agent panels/queries/outputs at desktop and 390px. Do not expose an unauthenticated production transcript injection API. |
| Existing route/console suites | Preserve route inventory and legacy Agent Console behavior after shared helper extraction. |

Run each package's focused tests before starting the next package. A final relevant command set from the repository root is:

```powershell
npm run test:unit -- tests/unit/jamie-audio-state.test.ts tests/unit/jamie-audio-lifecycle.test.tsx
npm run test:unit -- tests/unit/agent-workspace-state.test.ts tests/unit/agent-workspace-attention.test.ts tests/unit/agent-workspace-scheduler.test.ts
npm run test:unit -- tests/unit/agent-workspace-command.test.tsx tests/unit/agent-workspace-ui.test.tsx tests/unit/command-attention-route.test.ts
npm run test:unit -- tests/unit/agent-console-command-stream.test.ts tests/unit/command-route-contract.test.ts tests/unit/app-route-catalog.test.ts
npm run lint --workspace=apps/pulse
npm run test:e2e --workspace=apps/pulse -- tests/agent-workspace.spec.ts
git diff --check
```

New test filenames above are planned; they must exist before invoking those commands. Run TypeScript checking from `apps/pulse` and record pre-existing failures separately. Do not delete tests to make the implementation look complete.

### 8.10 Handoff discipline

At the end of each package, record:

1. Files actually changed and which anchors moved.
2. Implemented behavior versus remaining planned behavior.
3. Focused test command and result.
4. Any deliberate compatibility shim or unresolved browser/provider limitation.
5. The next package and its first concrete edit.

This addendum does not authorize implementation beyond the agreed scope. Start with P0 contract extraction/characterization, then P1 microphone ownership; do not begin with a global UI rewrite.

## 9. P8 — Licensed autonomous communication workflows

September 12 review added the first bounded “anonymous function” vertical slice requested for Sunset Pulse: the operator can turn the verified Tour Hot List into an email for the existing contact list. The system uses the operator’s licensed identity as an attribution/disclosure profile, but that identity does not grant the software authority to make transaction decisions.

### Implemented in PR #79

- `app/admin/hot-list/HotlistEmailWorkflow.tsx` adds the operator panel beside the existing MLS hot-list manager.
- `components/agent-workspace/AgentEmailDraft.tsx` detects email-oriented completed worker runs, shows the exact agent-written subject/body for editing, snapshots the originating run, and exposes **Send to all eligible** only after draft save and explicit confirmation.
- `lib/autonomous-workflows/hotlistEmail.ts` validates licensed identity, requires explicit email consent, removes do-not-contact/opt-out records, filters to active MLS listings, caps recipients, and creates a deterministic draft.
- `lib/autonomous-workflows/emailSender.server.ts` sends through the existing Resend integration using BCC and a provider idempotency key.
- `app/api/admin/automations/hotlist-email/route.ts` persists profile/run state, requires operator access, supports preview/run/explicit approved send, records provider receipts, and prevents duplicate snapshots.
- `app/api/admin/automations/hotlist-email/cron/route.ts` runs only for profiles with both `enabled` and `auto_send` explicitly set. The hourly Vercel cron is protected by `CRON_SECRET`.
- `supabase/migrations/20260912010000_licensed_hotlist_workflow.sql` adds per-operator settings and auditable workflow runs with server-side RLS boundaries.
- `tests/unit/licensed-hotlist-workflow.test.ts` covers MLS/activity filtering, consent/opt-out filtering, recipient caps, and required profile/list availability.
- The same workflow builder now covers spawned-agent email drafts, with unit coverage for edited copy and deterministic audience snapshots.

### Safety contract

1. The first-run default is disabled and draft-only. A signed-in operator must enter agent name, brokerage, license number, jurisdiction, service area, reply-to email, and disclosure text.
2. A contact is eligible only when `metadata.email_marketing_consent === true` or `metadata.emailConsent === "subscribed"`. Missing consent is excluded, not inferred.
3. `do_not_contact`, `email_opt_out`, and `emailOptOut` records are excluded. Sends use BCC so contacts cannot see one another.
4. Manual sends require an explicit confirmation. Scheduled sends require the saved `enabled + auto_send` opt-in and reuse a deterministic idempotency key; unchanged snapshots are not resent.
5. The workflow may communicate verified listing facts only. It does not make offers, negotiate, sign/submits contracts, publish MLS changes, represent a client without authorization, or move money. Those functions require separate, transaction-specific human approval and responsible-broker/legal review.
6. The current scheduler is hourly and bounded to 25 operator profiles per invocation. A missing `RESEND_API_KEY`, missing migration, invalid profile, unavailable hot list, or empty eligible audience fails closed.

### Next P8 functions

Use the same profile, consent, audit, idempotency, and approval contracts for additional low-risk functions: buyer/seller follow-up drafts, showing reminders, and market-update digests. Do not add autonomous offer submission, negotiation, signature, MLS publication, escrow/funds movement, or representation commitments without a separately reviewed transaction-control package.

## 10. Shared scheduler foundation and scheduled sprints

September 12 implementation extends the plan with reusable durable scheduling. Email and sprint planning are workflow clients; neither owns scheduling behavior.

### Implemented foundation

- `workflow_schedules` stores owner, workflow key, cadence, timezone, enabled state, and next execution.
- `workflow_jobs` stores durable occurrences, leases, attempts, result references, and failure state.
- `workflow_results` provides a generic result pointer for email runs and sprints.
- Database claim/recovery functions use row locks, `SKIP LOCKED`, leases, and a three-attempt limit.
- `/api/scheduler` provides owner-scoped inspection, pause, resume, and cancellation.
- Email and sprint interfaces expose schedule state and recent jobs.

### Scheduled sprint MVP

- `sprint_backlog_items` stores owner-scoped open work.
- A `sprint_planner` job selects up to ten open items into a proposed sprint.
- `/api/sprints` supports schedule creation, backlog intake, sprint creation, and approval.
- `/admin/sprints` supports backlog entry, schedule enable/pause/resume, proposed sprint review, item removal, and approval.
- Planning creates proposed work only; approval is required before execution or assignment.

### Foundation acceptance criteria

1. Every workflow uses the same scheduler claim, lease, retry, pause, resume, cancel, and result contracts.
2. Concurrent workers cannot claim one job twice.
3. Expired leases recover, and attempts stop at three with an explicit failure.
4. Schedule cadence is interpreted in the stored timezone, including daylight-saving transitions.
5. Workflow-specific data remains owner-scoped and cannot be read or controlled through another owner’s identifier.
6. Email delivery batches and sprint proposals remain separate result types under the shared job model.

Next implementation package: add shared scheduler authorization/state-transition tests, then replace fixed schedule advancement with timezone-aware cadence calculation.

## 11. Accepted product defaults and executable implementation sequence

These defaults were accepted for inclusion in the plan. This section supersedes conflicting defaults and completion claims in sections 9–10. It describes remaining implementation, not verified production behavior. Line anchors below were inspected in the current checkout; find the named symbol again after each edit. New-file instructions specify declaration order rather than invented line numbers.

### Product decisions

1. Default sprint planning is weekly, Monday at 08:00 in the user's selected timezone. Daily planning remains available. Resolve the user's saved timezone first, browser timezone second, and show an explicit fallback if neither is available.
2. Approving a sprint automatically creates persistent agent assignments for its selected items. Assignment creation does not itself authorize sending messages or other external actions. Unmapped work remains visibly unassigned until a supported worker is selected.
3. Manually entered work is the first backlog source. Pulse commands now feed the same owner-scoped backlog through an explicit Add to backlog action with command provenance and deduplication. GitHub and CRM imports follow after ownership, selection, and completion tracking pass verification.
4. Scheduled email requires review by default. Users may explicitly enable auto-send for an individual workflow with a defined audience and send limit. Record the policy version used for each automatic send; changing policy does not retroactively authorize an old draft.
5. Showing reminders are the next workflow after scheduler and sprint acceptance checks pass. They consume authoritative bookings and reuse the scheduler's ownership, cancellation, retry, and delivery contracts.

### Package A — Repair and verify the shared foundation first

1. In `lib/autonomous-workflows/durableScheduler.server.ts:9`, extend the schedule projection to include `time_zone`, `local_hour`, `local_minute`, and the new `local_weekday`. The current projection omits the timezone/time fields even though line 20 reads them.
2. In `lib/autonomous-workflows/schedulerPolicy.ts:14`, replace positional schedule arguments with a validated schedule specification: cadence, timezone, local hour/minute, and weekday (ISO Monday=1 through Sunday=7). Add `nextOccurrenceAfter(now, spec)` for initial scheduling and resume. Hourly means elapsed hours; daily/weekly mean local calendar time. Apply local time in UTC too; the current early UTC return bypasses overrides.
3. Replace `toUtcIso` in that policy module with a calendar conversion that explicitly handles nonexistent and repeated local times. Policy: shift a nonexistent time forward by the DST gap; select the earlier occurrence of a repeated time. Test both transitions and non-hour offsets. First execution must be strictly after the supplied clock instant, with seconds/milliseconds zeroed for calendar schedules.
4. In `app/api/sprints/route.ts:28`, change schedule ownership filtering from `owner_id` to `user_id`; return local hour/minute/weekday and handle schedule-query errors. At line 42, replace `next_run_at: new Date().toISOString()` with the calculated first occurrence. Updating unrelated settings must preserve the next occurrence and pause state.
5. Add a forward migration after the current latest migration; do not keep editing potentially applied migrations. Add weekday validation, a schedule revision, a per-claim lease token, and retry timing. Enable RLS on `workflow_results`. Revoke public/anonymous/authenticated execution of service-only SECURITY DEFINER functions and grant only service-role execution. Validate RPC limits and lease durations.
6. Replace dispatcher writes at `durableScheduler.server.ts:14` with one transaction/RPC that locks the schedule, verifies enabled state and revision, inserts the unique occurrence, and advances next execution. Return actual inserted counts. After downtime, coalesce missed recurring planning into one occurrence and advance to the next future time; do not flood users with old sprints.
7. Replace worker terminal writes at `durableScheduler.server.ts:55` and in its catch block with lease-token-checked RPCs. Completion and generic result insertion must commit together. Cancellation must prevent stale workers overwriting cancelled status. Document that cancellation cannot undo already performed external actions. Claim only as much work as fits the worker deadline; renew leases or claim jobs individually.
8. Pause prevents new dispatch and new claims for that schedule; already running work may finish unless cancelled. Recovery invalidates the old lease token. Retry failures with bounded backoff up to the configured attempt limit; exhausted jobs become terminal. Add a workflow registry and move email/sprint handlers into separate services so the shared scheduler no longer imports an API route.

Acceptance: database-backed tests prove duplicate dispatch, concurrent claims, expired lease fencing, pause/claim races, cancellation/completion races, retry exhaustion, RPC permissions, and atomic result persistence. Existing policy helper tests alone do not establish these guarantees.

### Package B — Weekly sprint defaults usable by ordinary signed-in users

1. In `app/api/sprints/route.ts:10`, default cadence to weekly and add `localWeekday` default 1. Validate timezone through the shared schedule schema. Use the same schema for email scheduling and scheduler inspection responses.
2. Replace the operator-only access gate at `app/api/sprints/route.ts:20` and its POST counterpart with the repository's verified signed-in user access mechanism. Apply the corresponding owner-only mechanism to `/api/scheduler`. Resolve identity on the server, never from a submitted owner ID. Keep the real-estate admin route's existing access boundary.
3. At `app/admin/sprints/SprintsWorkspace.tsx:19`, load schedules from the shared scheduler response, check both HTTP statuses, and initialize the editor from saved values. At line 24, replace the hard-coded schedule payload with a labelled form for cadence, weekday, timezone, hour and minute. Show next execution in the saved timezone and preserve edits on request failure.
4. Format the entire workspace JSX before further UI edits. Integrate `SprintCard.tsx`, passing items filtered by sprint ID plus approve/remove callbacks. Preserve scheduling, job cancellation, backlog editing, estimates, and item display. Disable duplicate mutations while pending; show actionable errors and allow refresh.
5. Expose the workspace through a normal signed-in route and the shared route catalog, retaining the admin URL as a compatibility route if needed. Verify two ordinary users can each create and inspect their own schedules without seeing each other's records.

Acceptance: a new user can save Monday 08:00 weekly planning, reload the same values, switch to daily, pause/resume, and see the correct next occurrence. Schedule creation does not immediately generate a sprint.

### Package C — Real backlog selection and atomic assignment creation

1. Extend the forward migration with backlog provenance (`source_type`, `source_id`), a sprint-item backlink to its backlog record, sprint revision, and a unique non-null `source_job_id` on sprints. Add persistent `agent_assignments` with owner, sprint item, supported worker ID, instructions, status, and timestamps; enforce one assignment per sprint item and matching ownership through constraints/RPC checks.
2. Replace the sprint handler currently at `durableScheduler.server.ts:44` with a service accepting owner, job ID, and occurrence time. Reuse an existing proposal for the same job. Persist proposal and selected items atomically. Include backlog IDs in the query and snapshot, exclude work already assigned to active sprints, and use stable priority/created-at/ID ordering.
3. Extend `lib/autonomous-workflows/sprintSelection.ts` with distinct `maxItems` and optional `capacityMinutes`. An item count is not an effort budget. Define how unknown estimates count, return exclusions with reasons, and retain manually entered text without inventing tasks.
4. Replace approval at `app/api/sprints/route.ts:46` with one transactional RPC: lock owner-scoped proposed sprint, verify expected revision, approve non-cancelled items, insert unique assignments, link assignments back to items, and record approval identity/time. Repeat approval returns the same assignments. Concurrent edit/removal must lock the same sprint and increment its revision.
5. Implemented backlog update preservation for description and estimates: the API only changes description when it is explicitly supplied, and the workspace now edits title, description and estimate together. Proposed sprint items now have a forward migration, owner/revision-fenced RPC, supported-worker validation and edit controls; approved sprints remain immutable.
6. Add assignment status/worker visibility to `SprintCard`. Approval creates assignments automatically; unsupported worker mappings produce a visible unassigned state. Define completion updates that mark linked backlog work done so it is not repeatedly selected.
7. Implemented the explicit Add to backlog action on Pulse command results. It posts through the signed-in sprint backlog service with `source_type = pulse_command`, the source command ID, bounded result context and owner/source deduplication. GitHub and CRM remain later adapters to that service.

Acceptance: approve twice yields one assignment per selected item; cancelled items create none; another user's IDs fail; edit-versus-approve races cannot change approved content; a crashed planner retry creates one proposal; completed backlog work is not selected again.

### Package D — Email approval default and bounded auto-send

1. Keep manual review as the initial setting. Add workflow-specific audience definition, send cap, policy version and explicit auto-send opt-in metadata. Display the actual audience and limit before saving opt-in. A user's sprint approval must never authorize an email send.
2. Extract `runHotlistEmailForUser` and `sendRun` from `app/api/admin/automations/hotlist-email/route.ts` into server services before registry integration. The scheduled handler currently passes `confirmAutoSend: false`; implement the saved automatic policy deliberately, recording that policy separately from manual approval attribution.
3. At `route.ts:321`, require expected revision and audience hash for manual approval and include them in the atomic claim. Bind automatic approval to the generated content, audience and current policy version. Scope contact retrieval at line 267 to an authorized owner/audience and paginate it; shared unassigned leads are not automatically owned contacts.
4. At `route.ts:350`, stop upserting an existing batch back to `pending`: this currently destroys the sent status before the skip check. Insert missing batches without overwriting existing receipts, claim pending/eligible failed batches atomically, and preserve the original payload and provider key on retry.
5. Distinguish provider acceptance, delivery failure and uncertain receipt outcomes. Reconcile uncertain outcomes before retrying. Recheck eligibility immediately before each batch. Return refreshed batch state after send/retry and show it in the UI. Separate a total audience cap from provider batch size.

Acceptance: default schedules only draft; explicit policy permits only its configured audience/cap; changing policy invalidates stale automatic authorization; successful batches survive partial failure/retry without resending; consent changes block affected deliveries. Use a fake provider for integration tests.

### Package E — Showing reminders as the next scheduler client

1. Inspect `lib/scheduling/commercialBooking.ts` and the current booking create/update/cancel paths. Use authoritative `scheduling_bookings` ownership, status and time; retain references rather than copying an unrelated staff scheduling model.
2. Add a `showing_reminder` handler in the registry and one-shot job support in the shared scheduler. Add booking ID/version, reminder offset and recipient reference to its validated payload. Use a unique occurrence key derived from booking/version/offset/recipient.
3. On booking creation or reschedule, atomically record reminder work through an outbox or equivalent transaction. Cancel obsolete queued occurrences when the booking changes; before delivery re-read booking version/status/time so an old worker cannot send a superseded reminder.
4. Reuse delivery records, receipts, ownership and messaging approval policy. Display reminder state and failures beside the booking. Booking cancellation stops future reminders; it does not claim to retract already sent messages.

Acceptance: create, reschedule, cancel and duplicate-event tests prove exactly one current reminder occurrence; reminders for obsolete bookings never send; retries retain delivery identity; users only see their own reminders.

### Execution and evidence ledger

- [ ] A: shared foundation repaired and verified against PostgreSQL.
- [ ] B: weekly Monday 08:00 defaults and normal-user access verified in UI/API.
- [ ] C: backlog provenance, review, assignments and completion verified end to end.
- [ ] D: manual/default and explicit automatic email policies verified with fake delivery.
- [ ] E: showing reminders implemented after A–D acceptance.

### Verification recorded September 12, 2026

Focused command: `npm run test:unit -- tests/unit/scheduler-policy.test.ts tests/unit/scheduler-transitions.test.ts tests/unit/sprint-selection.test.ts tests/unit/licensed-hotlist-workflow.test.ts tests/unit/licensed-hotlist-cron.test.ts tests/unit/licensed-hotlist-email-sender.test.ts tests/unit/licensed-hotlist-delivery.test.ts` — 7 files and 22 tests passed. These are unit/helper and mocked workflow checks. Package A remains unchecked because PostgreSQL RPC permissions, concurrent claims, lease fencing, and browser behavior still require integration verification.

Local database check: `supabase status` could not inspect the local stack because Docker Desktop's Linux engine is unavailable. No migration was applied or marked verified in this session; run the database acceptance suite after Docker/Supabase is available.
Security migration prepared: `20260912110000_scheduler_security.sql` enables RLS for `workflow_results` and restricts scheduler SECURITY DEFINER RPC execution to `service_role`. It remains unverified against PostgreSQL until the local stack is available.

### Verification recorded September 14, 2026 — Package A policy slice

- `lib/autonomous-workflows/schedulerPolicy.ts` now exposes a validated `scheduleSpecSchema`/`normalizeScheduleSpec` boundary, calculates first occurrences with `nextOccurrenceAfter`, and resolves daily/weekly recurrences by local calendar time. Nonexistent local times move forward by the detected timezone gap; repeated local times select the earlier UTC occurrence. Hourly schedules remain elapsed-hour calculations.
- `lib/autonomous-workflows/durableScheduler.server.ts` now constructs one normalized schedule specification before advancing due occurrences. The existing positional `advanceSchedule` overload remains as a compatibility shim for older callers/tests while the durable scheduler uses the object form.
- `tests/unit/scheduler-policy.test.ts` added coverage for object-form specs, DST gap/repeated-time behavior, Asia/Kathmandu's non-hour offset, strict calendar timestamp precision, and invalid schedule fields.
- `npx vitest run tests/unit/scheduler-policy.test.ts` — 1 file and 14 tests passed.
- `npm run test:unit` — 261 files and 1,050 tests passed. Existing test stderr includes expected mocked-provider/fallback diagnostics; no test failed.
- `npm run build` — production build passed type checking and completed successfully. Next still emitted the existing dynamic-server-usage warning while collecting `/api/kepler/listings`; it did not fail the build.
- Added forward migration `supabase/migrations/20260914040000_scheduler_retry_policy.sql` after the latest property migration. It is additive/idempotent, validates ISO weekdays, backfills and constrains schedule revisions, adds `workflow_jobs.retry_at`, issues a fresh lease token on every claim, applies one- and five-minute bounded recovery backoff, validates claim limits (1–100) and lease durations (30–900 seconds), and reasserts result RLS plus service-role-only scheduler RPC execution.
- Added forward migration `supabase/migrations/20260914050000_atomic_scheduler_dispatch.sql` with `dispatch_due_workflow_schedule(...)`. It locks the schedule, checks enabled state plus the expected cursor/revision, inserts the unique current occurrence, advances the revision in the same transaction, and returns the actual inserted count. `durableScheduler.server.ts` no longer writes jobs before the RPC; missed daily/weekly occurrences coalesce to the next local-calendar execution, while hourly occurrences preserve their original elapsed-hour phase.
- `npx vitest run tests/unit/scheduler-policy.test.ts tests/unit/scheduler-transitions.test.ts` — 2 files and 17 tests passed after the A6 wiring.
- `npm run build` — production build passed type checking and completed successfully. The existing dynamic-server-usage warning for `/api/kepler/listings` remains non-fatal.
- Added forward migration `supabase/migrations/20260914060000_scheduler_terminal_fencing.sql` with lease-token-checked completion, failure, and owner-scoped cancellation RPCs. Completion writes the generic `workflow_results` pointer and terminal job receipt in one transaction; cancellation clears the lease token and records that an already accepted provider action cannot be retracted.
- `durableScheduler.server.ts` now claims one job per RPC call, routes completion/failure through the fenced RPCs, treats a lost lease as stale instead of overwriting the receipt, and caps sequential work per invocation so a function deadline leaves at most one active lease to recover.
- `/api/scheduler` now cancels through `cancel_workflow_job` instead of a direct status update, closing the cancellation/completion race.
- `npx vitest run tests/unit/scheduler-policy.test.ts tests/unit/scheduler-transitions.test.ts` — 2 files and 17 tests passed after the A7 wiring.
- `npm run test:unit` — 261 files and 1,050 tests passed after the A7 route/worker changes. Existing mocked-provider and fallback diagnostics remain non-fatal.
- `npm run build` — production build passed type checking and completed successfully. The existing dynamic-server-usage warning for `/api/kepler/listings` remains non-fatal.
- Extracted `runHotlistEmailForUser`, its server-only persistence/delivery helpers, and the scheduled sprint planner into `lib/autonomous-workflows/hotlistEmailWorkflow.server.ts` and `lib/autonomous-workflows/sprintPlannerWorkflow.server.ts`. `workflowRegistry.server.ts` now maps workflow keys to handlers, and `durableScheduler.server.ts` no longer imports an API route or embeds workflow-specific execution logic.
- Added forward migration `supabase/migrations/20260914070000_scheduler_registry_retry_pause.sql`. It redefines claims to join an enabled, owner/key-matching schedule, so paused schedules retain queued work without accepting new claims. It adds fenced `resolve_workflow_failure(...)`, which requeues attempts 1–2 with one- and five-minute backoff and marks attempt 3 terminal.
- Added `supabase/tests/database/scheduler.sql`, a 31-assertion pgTAP acceptance suite covering scheduler function presence and RPC privileges, duplicate dispatch fencing, pause/resume claim behavior, retry backoff/exhaustion, recovery token invalidation, cancellation fencing, and atomic result persistence. It is intended to run with `supabase test db` once the local stack is available.
- Added the `test:db` package script and a `scheduler-db` CI job that installs Supabase through `supabase/setup-cli@v1`, starts only the database containers, runs `npm run test:db`, and stops the stack even after failure. The first CI attempt exposed that the npm wrapper had only installed its Windows optional binary from the cross-platform lockfile; the job now uses the official Linux CLI setup action. A local `supabase test db` attempt still returns `LegacyDbConnectError` because the Docker-backed Postgres container is not running in this workspace.
- Uncommitted access slice: replaced `/api/scheduler`'s operator-only gate with `requireSignedInUser` and server-derived `access.user.id`, added the `/sprints` page shell, and changed `/admin/sprints` into a compatibility redirect. The route catalog lists `/sprints` as account-scoped, but the page's server auth gate and legacy middleware behavior remain to be completed/verified. Mocked route tests assert owner identity on reads/mutations and GET auth denial; they do not prove two-user isolation or browser access.
- `npm run build` — production build passed after the A8 extraction and migration. The existing `/api/kepler/listings` dynamic-server-usage warning remains non-fatal.
- Package A remains unchecked: the new pgTAP suite is not yet executed, browser verification is outstanding, and true concurrent-session claims still need a local integration run. The forward migrations are prepared but Supabase/Docker was not available, so they were not applied or marked verified.

## 12. Planning-stage research report — September 14, 2026

Property-specific planning extension: [Keller / Westlake property sprint implementation plan](KELLER_WESTLAKE_PROPERTY_SPRINT_PLAN.md). This maps the four shared-shortlist properties to ordered schema, service, scheduler, worker, review-interface and inquiry-tracking changes. It is a proposed implementation plan, not a completion claim.

### What was implemented

The planning stage converted the original autonomous-agent idea into two bounded workflow clients sharing one scheduler: scheduled sprint planning and licensed hotlist email. The scheduler now has persisted schedules and jobs, owner scoping, pause/resume/cancel transitions, lease tokens, bounded retries, first-occurrence calculation, timezone-aware daily/weekly recurrence, weekday selection, and provider delivery records. Sprint planning now supports a manual backlog, provenance fields, deterministic selection, separate item and effort limits, duplicate prevention, revision-aware approval, persistent assignments, and completion propagation to linked backlog work. Email now supports review-first drafts, consent/opt-out checks, owner-scoped audiences, batching, receipt preservation, explicit auto-send policy metadata, and provider acceptance states.

### Product decisions captured for research

- Weekly Monday at 08:00 in the selected timezone is the sprint default; daily remains available.
- Sprint approval creates durable assignments but never authorizes external communication.
- Manual backlog entry is the first source; Pulse commands now use the same owner-scoped backlog service with deduplication, while GitHub and CRM remain later adapters.
- Email is review-first; automatic sending requires explicit workflow opt-in, audience scope, and a cap.
- Showing reminders are the next scheduler client after scheduler, sprint, and email acceptance checks.

### Evidence and limitations

The work is split across small commits and has been pushed to `codex/cms-vertical-slice-followup`; the latest commit at report time is `23c39220`. Focused helper/workflow checks reached 15 passing tests, including recurrence, selection, transitions, and delivery behavior. These checks do not prove PostgreSQL transaction behavior, RPC permissions, concurrent claims, browser access for ordinary users, or real provider reconciliation. Supabase/Docker was unavailable, so migrations remain prepared but unapplied and the execution ledger stays unchecked.

### Research questions before declaring the foundation stable

1. Can PostgreSQL integration tests prove duplicate-dispatch prevention, lease fencing, pause/claim races, retry exhaustion, and atomic result persistence?
2. Can two ordinary users create, reload, pause, and inspect only their own schedules through the shared route?
3. Does repeated sprint approval produce exactly one assignment per selected item under concurrent requests?
4. Does a fake email provider demonstrate safe partial failure, uncertain receipts, consent changes, and policy-version invalidation?
5. Which authoritative booking events and reminder offsets should the showing-reminder client consume?

Long-term package order remains A through E. For the immediate work, follow the five-hour sprint at the top of this document without spawning subagents; bounded UI work may proceed while database acceptance is blocked, but unattended rollout may not. Update this ledger with exact commands, completed results, migration status and remaining limitations. A running typecheck is not a passed check; a helper test is not a database or browser integration test. Before updating PR #79, review the complete diff, finish checks required for the implemented scope, and rewrite the PR description to match the verified scope. Do not mark the scheduler stable solely because tables, endpoints or UI controls exist.

## 13. September 15 review and revised execution plan

### 13.1 Baseline, scope, and working agreement

Reviewed local HEAD: `50aa53b2`, branch `codex/cms-vertical-slice-followup`, initially clean. This review covers the three scan commits end to end, scheduler/proposal repair entry points, and the adjacent contracts/Grill/Abidan changes. It is not a fresh audit of every historical roadmap item or proof of current production behavior. Paths below are relative to `apps/pulse`; line numbers refer to this HEAD, and named declarations remain the authoritative edit anchors.

The product direction remains one Keller / Westlake shortlist, collaborative owner/Jamie planning, weekly-by-default sprints, and separate approval for outbound communication. Capture adds evidence to a property; it must not invent rooms, measurements, property identity, or permission to publish. Wi-Fi is the upload transport in this implementation: there is no network-sensing scanner, router access, or native depth capture here.

No subagents for implementation. Work in reviewable branch changes; inspect the actual open PR before assuming it is still #79. Required checks and review precede merge and the normal main-branch deployment. Do not promote a branch directly to production, apply live migrations, publish interiors, enable auto-send, or buy a reconstruction service as an incidental implementation step. The earlier direct-production workflow is not the release process to repeat.

### 13.2 Work completed in code versus acceptance still owed

| Slice / commit evidence | What is present in the checkout | What this does not establish |
| --- | --- | --- |
| Scheduler repairs: `3dfb762b`, `24514c35`, `0afd0d72` | Compatibility repair migration, CI database-startup change, qualified dispatch conflict target | Latest `scheduler-db` outcome, clean migration replay, or a production migration result |
| Atomic proposals: `60f91bb7`, `60393813` | `sprintPlannerWorkflow.server.ts:37,53` calls `persist_scheduled_sprint_proposal`; `planPropertySprint.server.ts:16` calls `persist_property_sprint_proposal`; forward SQL checks job leases | Concurrent retry/rollback acceptance, every property-revision race, or successful worker execution |
| Review/completion: `35d173f0`, `6a6b3a0e`, `cf3b2743`, `a303c461` | Revision-checked approval/removal SQL; `complete_sprint_assignment` RPC; assignment state displayed by the sprint UI | Exactly-once real agent work, sourced research, or permission to send an email |
| Schedule editing: `724139ed` through `dc0ec06f` | Owner schedule-save RPC, shared input validation, dirty-draft preservation, read-error handling and route coverage; `/sprints` now has a server sign-in redirect | Browser/two-owner/DB integration acceptance. The save button still says “Enable planning” for a paused schedule even though the RPC preserves pause; correct that copy |
| Contract previews: `21c80b1d` | Per-form page, preview API and catalogue links, with a focused route test | Every upstream form PDF loading, current form validity, or execution/signing support |
| Grill: `cc6f2d83` | Public menu GET returns available items; unavailable-item reads and mutations retain operator checks; route tests added | Current deployed uptime or real menu data availability |
| Abidan: `60cd8360`, `de0a290e`, `672a4ea8` | Portrait iteration followed by procedural 3D character models; active orbit view uses the character viewer | Scanned geometry, independent artist-authored model assets, or a fresh visual/performance pass on every character |
| Scan intake: `c0570396` | `/scan-studio`, signed-in create/list/upload APIs, owner-scoped Mongo sessions, two required capture acknowledgements, private-bucket migration, two contract tests | Working first-start camera preview, video recording, LiDAR acquisition, private end-to-end upload, or applied storage migration |
| Scan review: `da7be00b` | Operator queue, review status/note/actor/time and approve/reject API | Viewing media before approval, narrowly scoped reviewer access, immutable review history, or revision-safe approval |
| Scan preview: `50aa53b2` | Reconstruction-shaped metadata plus a Three.js room-shell demo and one helper test | Actual reconstruction, a durable worker job, real room counts, a mesh artifact, or listing-ready output |

The last three commits are useful scaffolding, but “approved scan reconstruction” overstates the implemented capability. `buildManifestPreview` uses only the number of uploaded assets; it does not read their content. The nested Mongo `reconstruction` field is persisted metadata, not a scheduler queue. Existing generic rooms must not be presented as that home's layout. Preserve the implementation history, but correct these claims in UI, tests, docs, and the PR description.

Fresh review evidence on September 15:

- `npm run test:unit -- tests/unit/property-scan-contract.test.ts tests/unit/property-scan-reconstruction.test.ts` from `apps/pulse`: **2 files / 3 tests passed**. The initial sandbox attempt failed before test execution because esbuild could not load the configuration; the approved retry outside that restriction exited 0. These tests currently validate consent/schema defaults and the synthetic room-count formula only.
- Prior-session build/helper successes are historical evidence, not a new full build result. No full build, browser capture, Mongo concurrency test, Supabase migration replay, live PR inspection, or deployment verification was performed for this documentation review.
- The private bucket migration exists; whether it has been applied is unverified. A private bucket flag alone is not evidence that all existing storage policies deny unrelated users.
- This planning update changes documentation only. No runtime defect below is claimed fixed by adding it to the plan.

### 13.3 Concrete review findings and repair order

| ID / priority | Existing line or declaration | Observed behavior and required correction |
| --- | --- | --- |
| R1 / P1 | `lib/scans/reconstruction.ts:16,24`; `components/scans/PropertyScanPreview.tsx:6,16` | `ceil(assetCount / 3)` becomes a room count and repeated boxes become the home preview. Remove this from real scan completion; retain only a clearly isolated synthetic demo, if useful |
| R2 / P1 | `lib/core/operator_access.ts`, `roleAllowed`; `propertyScanStore.ts:48`; admin GET/PATCH routes | The general gate permits `realtor`, and the scan queue reads all owners. Add scan-specific reviewer authorization and owner/assignment-scoped queries before exposing interior media. This is not proof of an actual unauthorized read in production |
| R3 / P1 | `app/scan-studio/page.tsx:63–65,127` | The first camera start assigns `srcObject` before the conditional video element mounts. Bind the stream after mounting; stop late permission responses and abandoned tracks |
| R4 / P1 | `propertyScanStore.ts:64,84,111,145`; reconstruct route `POST` | Upload resets status but retains review/model metadata; mutations have no expected revision; a ready preview is reused without matching its input. Add revision/hash fencing and invalidate downstream output on material changes |
| R5 / P1 | `app/admin/property-scans/page.tsx`, `ScanReviewCard` | “Private media manifest” lists filenames/sizes only. Provide authorized image/video inspection and meaningful rescan feedback before approval |
| R6 / P1 | `app/api/property-scans/[scanId]/assets/route.ts`, `POST` | Up to 24 x 75 MiB pass through one function's form-data/body buffers; validation happens after earlier files may already have uploaded. Failure can leave orphaned files; limits are per request, not per session. Add bounded reservations, direct private upload, validated finalization, and cleanup |
| R7 / P2 | Admin detail/reconstruct routes; `propertyScanStore.ts:48` | A detail request searches only the latest 100 sessions. Older valid IDs can return 404. Use an authorized indexed lookup and cursor pagination |
| R8 / P1 | `propertyScanContract.ts:8,13`; `models/PropertyScanSession.ts:13–29` | `listingId` is unverified; intake accepts `publicListingApproval: true`; consent lacks policy version/time. Bind verified property ownership separately and prohibit publication approval through intake |
| R9 / P2 | `propertyScanContract.ts:3,42`; scan-studio upload input | LiDAR is selectable, but only ordinary image/video files are accepted and no depth API/import exists. Disable this mode with an honest explanation until an actual integration is selected |
| R10 / P2 | `propertyScanStore.ts:111,184–233`; upload route mock guard | Mock reconstruction skips real approval/asset gates, while mock uploads still call Supabase storage. Use dependency-injected in-memory fixtures with the same transition rules and no live writes |
| R11 / P2 | Scan API handlers, UI state and session schema | Missing narrow error mapping, recoverable loading/retry states, session restoration, revisioned deletion/retention, asset identities and audit history. `capturedAt` is currently upload time, not verified acquisition time |
| R12 / P1 for scheduler expansion | `durableScheduler.server.ts:47–79`; registry `WorkflowExecution`; scheduler migrations | Registry supports only email/sprints; jobs require `schedule_id`; claim joins enabled schedules; result IDs are UUIDs. There is no one-off reconstruction contract. Also the terminal-completion SQL checks the token but not lease expiry; close that existing fence gap before relying on it for longer jobs |

Priority is implementation order and release risk, not a claim that a runtime exploit was demonstrated. Fixes require tests at the service/storage boundary, not only disabled buttons.

<a id="next-five-hour-sprint--l4-closeout-and-shared-scheduler-readiness"></a>

### 13.4 Active next five-hour sprint — L4 closeout and shared scheduler readiness

This is the single active timebox. L1–L4 foundations are already local; the work below closes evidence gaps before S5 and prepares the existing scheduler as the reusable foundation for future property jobs and scheduled sprints. Do not promise actual photogrammetry, native LiDAR, public tours, or autonomous delivery in five hours.

| Elapsed | Budget | Exact code action | Exit evidence |
| --- | ---: | --- | --- |
| 00:00–00:30 | 30 min | Baseline `git status`, branch/log, `vitest.config.ts`, scheduler migration list, and scan route/store callers. Confirm no new migration or deployment is assumed. | Baseline recorded; missing environment dependencies listed |
| 00:30–01:30 | 60 min | Add disposable-Mongo or repository-approved database tests for `appendPropertyScanAssets` and `updatePropertyScanReview`: one-winner revision races, duplicate asset IDs, approve/upload race, two-reviewer race, reject-after-ready and consent/manifest invalidation. | Exactly one fenced mutation wins; loser receives a typed conflict; no current approval/artifact survives a manifest change |
| 01:30–02:15 | 45 min | Audit `serialize`, admin detail, media-preview and reconstruct reads against `approvedManifestRevision`/hash. Add stale-artifact fixtures and deep-link denial tests; keep old synthetic records as labeled history only. | Stale/revoked output is never current; foreign/revoked actors receive no scan detail or signed URL |
| 02:15–03:00 | 45 min | Run authenticated browser checks for Scan Studio resume, server-enforced review acknowledgement, private media preview, denied access and expired/deep-linked scan URLs. | Browser evidence or exact blocker; screenshots never substitute for database/storage acceptance |
| 03:00–04:15 | 75 min | Audit `durableScheduler.server.ts`, `workflowRegistry.server.ts`, scheduler SQL and existing sprint/email tests. Document the event-job contract, lease-expiry fence, UUID result requirement and owner/payload validation; do not enqueue scan jobs. | One shared scheduler extension design with migration/test targets; recurrence and email approval behavior preserved |
| 04:15–05:00 | 45 min | Run the focused scan suite, scheduler regressions, build and `git diff --check`; update both ledgers with exact counts, blockers, changed paths and next packet. | Reproducible evidence; no PR/push/deploy unless separately authorized |

Dependencies: S5 direct/private upload remains after L4 acceptance; S6 implementation starts only from the shared scheduler contract and existing DB acceptance. S7 cannot enqueue reconstruction work until S5 and S6 pass. A blocked integration check does not become a mock acceptance claim. No background automation is created by this plan.

### 13.5 Line-by-line implementation sequence

Steps below specify edit order within each file. New filenames/symbols are proposals: search for an equivalent implementation before creating them. Mark a step complete only after its exit evidence is recorded. A checkbox here is not a new automatic assignment, live schedule, or authority to act on a client's home.

#### S1 — Correct capability claims and quarantine the demo

1. `lib/scans/reconstruction.ts:3–30`, `PropertyScanReconstruction` / `buildManifestPreview`: separate `demo` metadata from real job/artifact types. Stop inferring rooms from file count. A valid real result requires an actual artifact ID, input revision/hash and provenance; no provider configured means unavailable, not `ready` or 100%.
2. `lib/scans/propertyScanStore.ts:111`, `startPropertyScanReconstruction`: remove synchronous room-shell generation from the real mutation path. Until S7–S8 are accepted, return a typed capability-unavailable outcome without creating a fabricated result. Preserve old records for audit; treat `engine: manifest-preview-v1` as legacy demo data.
3. `app/api/admin/property-scans/[scanId]/reconstruct/route.ts:8`, `POST`: map unavailable to a clear 503 with a stable error code; do not return 202 unless a durable asynchronous job was accepted. Do not reuse legacy demo records as successful reconstructions.
4. `components/scans/PropertyScanPreview.tsx:6` and `app/admin/property-scans/[scanId]/preview/page.tsx:17`: stop linking synthetic geometry to property details. If retained, rename the component `PropertyScanDemo` and label it “Synthetic interface demo — not this property”; genuine preview renders an unavailable/pending state until S9.
5. `app/admin/property-scans/page.tsx`, `ScanReviewCard`, and `lib/navigation/routeCatalog.ts:29,81,91`: distinguish “Capture review”, “Awaiting reconstruction capability” and “Verified artifact available”. Remove inferred-room counts and unconditional “Approved capture” labels.
6. `propertyScanContract.ts`, `scanModeCopy`, and scan-studio mode controls: advertise uploaded photos/videos only; disable new `lidar_capture` submissions with a useful unsupported-mode response while allowing legacy records to display. Camera preview is not video recording. Keep the Wi-Fi transport explanation.
7. `tests/unit/property-scan-reconstruction.test.ts`: replace the 40-files-means-12-rooms assertion with tests proving no room count/artifact is fabricated, including zero assets and legacy demo records. Add unavailable-provider route coverage.

Exit: a user cannot mistake synthetic geometry for their home or an unavailable integration for a running worker.

#### S2 — Scope access, inspect private media, and make review meaningful

1. New `lib/scans/scanAccess.server.ts`: declare a typed actor, resolve the signed-in identity, then implement `canReadScan`, `canReviewScan`, and `requireScanReviewer`. Default to owner access plus explicitly granted scan-review assignments; general `realtor` membership alone is not global household access. Keep any administrative override explicit and audited. Use test identities for local fixtures, not a production host-header bypass.
2. `models/PropertyScanSession.ts:3` and the store: add narrowly scoped reviewer grant IDs and an index supporting actor-scoped queue queries. Only the owner or authorized administrator can grant/revoke; ordinary API callers cannot set these fields. Do not broaden the global operator gate to solve a scan-specific problem.
3. `propertyScanStore.ts:38,48,56`: replace `listAllPropertyScanSessions()` usage with actor-scoped cursor pagination sorted by `(updatedAt, scanId)`, and an indexed `readScanForActor(scanId, actor)`. Detail lookup must work for the 101st/501st session without reading the whole queue. Make metrics clearly page-local or compute scoped totals separately.
4. `app/api/admin/property-scans/route.ts:8`, detail `GET:14` and `PATCH:24`, reconstruct `POST:8`: use the scan access service on every request and pass authorized scope into the store. Return 404 for foreign IDs without disclosing existence. Keep API authorization independent from page navigation.
5. New `app/api/property-scans/[scanId]/assets/[assetId]/preview/route.ts`: await params, authenticate, resolve the asset through its stored session, then issue a short-lived private-media URL for that exact object. Proposed TTL: 60 seconds. Accept asset ID, never an arbitrary bucket path/URL. Recheck grant revocation on every renewal; document that an already-issued URL may remain usable until expiry. Use `Cache-Control: private, no-store`, no public image-optimizer cache, and no signed URLs in logs/analytics.
6. `app/admin/property-scans/page.tsx`, `ScanReviewCard`: extract a `components/scans/ScanMediaGallery.tsx` client component with image/video controls, MIME/error/loading states, keyboard labels, on-demand URL refresh and visible asset identity. Display owner-entered room labels as unverified. Do not autoplay interiors or preload every video in a large queue.
7. Replace hardcoded approval/rescan notes with an editable review form and explicit acknowledgement that the displayed manifest revision was inspected. Missing/failed media or unsupported formats prevent approval; a rejection gives concrete recapture guidance. Opening a file is not automatic quality approval.
8. Split admin page shells into authenticated server entries and serializable client workspaces using the existing page-access pattern. Keep Mongo/storage keys/server modules out of the browser; preserve awaited Next.js dynamic params. Add two-owner, assigned-reviewer, unrelated-realtor, signed-out, revoked-grant, expired-URL and deep-link tests.

Exit: reviewers can inspect the actual capture under a deliberate permission boundary; no unrelated user receives a private-media URL or scan details.

#### S3 — Repair capture lifecycle and collaborative session recovery

1. `app/scan-studio/page.tsx:17`: move interactive state into a proposed `ScanStudioWorkspace.tsx`; use a server page sign-in gate and plain DTO props. Reuse application auth conventions rather than assuming route-catalog metadata enforces access.
2. At the current `videoRef`/`startCamera:58` implementation, mount the video element before attaching a stream using an effect or callback ref. Keep `getUserMedia` user-initiated, audio disabled, and the environment-facing camera as a preference. Handle unsupported/insecure contexts and rejected permission without disabling ordinary file upload.
3. Track an in-flight request generation and a mounted/cancelled flag. Repeated clicks cannot allocate parallel streams; late resolution after stop/unmount stops every returned track. Separate cleanup from UI state mutation. Stop preview on navigation/end-session and provide a deliberate restart after backgrounding.
4. Load owner sessions through the existing GET API with pagination and an explicit resume control. New `app/api/property-scans/[scanId]/route.ts`, owner GET, returns one authorized DTO. Lock the active session's address/mode display to persisted values; editing the next session's setup must not change the active capture's instructions.
5. In `uploadCaptures`, separate creating/uploading/camera states, block duplicate submissions, reset the file input after a handled selection, preserve failed selections and text notes, expose retry/cancel and per-file outcomes, and abort stale requests. Until S5, do not label a buffered request as resumable or show fabricated byte progress.
6. Add owner room labels and recapture questions without inventing geometry; retain author identity/time and separate those notes from approved facts. Link to the existing Keller / Westlake property record only after authorized identity resolution. Do not synthesize a Jamie response without a saved worker result.
7. Add component tests with fake media streams plus browser acceptance for first start, stop, double start, late permission, denial, resume, failed upload and unsupported format. In-browser recording, device depth capture and HEIC conversion remain separate capabilities, not implied by `capture="environment"`.

Exit: capture controls behave predictably and the owner can resume work without losing context or leaving a camera active.

#### S4 — Version consent, manifests, review, and downstream output

Current checkpoint: the consent receipt, manifest hash/revision fence, review acknowledgement, owner-scoped listing resolver, asset dedupe and invalidation foundation are implemented locally. The remaining S4 work is evidence and integration: real concurrent database behavior, deep-link/browser denial, and proving stale output cannot be serialized as current.

1. `propertyScanContract.ts:6,19`: split client intake from server session/asset DTOs. Require positive asset size; assign server asset IDs; keep `uploadedAt` distinct from optional untrusted device `capturedAt`. Add `expectedRevision` to mutations. Reject intake publication approval; store `publicListingApproval: false` server-side for compatibility.
2. Resolve `listingId`/shortlist ID against an owner-authorized property service before linking. An address string does not prove listing ownership; ambiguous or unknown references remain unlinked with an actionable question. Do not equate a public MLS identifier with a private shortlist UUID.
3. `models/PropertyScanSession.ts:3–36`: add session schema version, integer revision, manifest hash, versioned consent receipt (actor, policy version, server time), approved manifest revision/hash, review events, and artifact/job references. Replace `Model<any>`/broad serializers with shared typed DTOs. Existing metadata cannot be backfilled as previously verified consent or media quality.
4. `appendPropertyScanAssets:64`: atomically compare owner/revision, enforce cumulative quota and append finalized unique asset IDs. Increment revision, recompute the canonical manifest hash, reset current approval, and make earlier artifacts stale. Apply equivalent invalidation on removal, relevant identity/consent changes and consent withdrawal. Preserve audit references, not a misleading current-ready pointer.
5. `updatePropertyScanReview:84`: compare expected revision and hash in the same database write as the review event/status update; require valid consent and a nonempty verified manifest for approval. Return typed conflict/not-found/invalid-state outcomes. Use a single-document atomic event append or an explicitly tested transaction, not a status write followed by an optional audit insert.
6. `serialize:145` and all preview/reconstruct reads: expose current approval/artifact only when input revision/hash, consent and access still match. An old artifact may appear only in authorized history as stale/revoked, never as the current approved home.
7. Introduce fixture/storage dependencies shared by mock and real services. Mock mode cannot call real Supabase, accept forbidden transitions or be enabled for production interior data. Add a controlled, idempotent legacy-data upgrade that marks prior demo outputs as synthetic and requires renewed review; do not silently delete records.
8. Add concurrent approve/upload, duplicate finalize, two-reviewer conflict, reject-after-ready, consent-withdrawal and stale-artifact tests. Verify exactly one revision wins and no current publication survives invalidation.

Exit: every downstream artifact can identify the exact consented and reviewed input it used.

#### S5 — Make uploads bounded, private, resumable, and recoverable

1. Before replacing the old upload route, validate all selected file metadata before any write; reject zero-length files; cap total request/session size; use typed failures and tracked cleanup for partial writes. Keep this transitional path restricted until deployment-body limits and cleanup are verified. A 75 MiB storage allowance is not evidence that the app request can carry it.
2. New `lib/scans/scanUpload.server.ts`: define reserve/finalize/abort/reconcile operations in that order. Reserve server-generated owner/scan/asset paths with idempotency keys, expected revision and expiry; count outstanding reservations toward quota so parallel uploads cannot bypass limits. Start with the existing 24-file/75 MiB-per-file ceilings as upper bounds; set an explicit lower pilot byte quota and concurrency limit before rollout.
3. New `app/api/property-scans/[scanId]/uploads/route.ts`: authenticate, authorize the session and validate declared size/type; issue a narrowly scoped signed private-storage upload capability. Use the installed storage SDK's documented direct/resumable mechanism after checking its supported contract. Large media bytes must not pass through the Next.js JSON/form handler. Keep service-role credentials server-only.
4. New `app/api/property-scans/[scanId]/uploads/[uploadId]/complete/route.ts`: resolve the reservation, inspect the exact stored object, verify byte count, supported content signature/decodability and checksum, and only then attach it through S4's conditional mutation. Client MIME/filename/size alone is insufficient. Quarantine objects until validated; do not issue gallery URLs for pending files.
5. Handle a lost finalize response idempotently. If a concurrent session revision changed, reconcile or reject explicitly without duplicating the asset. Abort/remove only objects belonging to that reservation. Add bounded retry and expiry reconciliation for upload-success/manifest-failure, abandoned reservations, invalid media and deletion failures.
6. Add a forward storage-policy migration after the latest migration at implementation time. Audit inherited `storage.objects` policies and all bucket permissions; verify unrelated authenticated users/anonymous callers cannot list/read/write by guessed prefixes. Do not rewrite the existing private-bucket migration or apply live policy changes during local implementation.
7. Wire direct-upload progress, offline/expired-token recovery and limited concurrency into `ScanStudioWorkspace`. If a format cannot be processed, reject with a clear alternative; do not claim native LiDAR/HEIC support by merely adding MIME strings.
8. Test empty/oversized/spoofed files, mixed valid-invalid batches, repeated upload IDs, parallel quota exhaustion, interrupted uploads, replayed finalization and orphan cleanup with a disposable storage environment. Check real deployment request limits before claiming large-file support.

Exit: private media has bounded cost, verified identity/content and a recovery path for each partial failure.

#### S6 — Extend the shared scheduler for one-off jobs without breaking recurrence

1. Implemented the forward scheduler boundary from `20260912040000_durable_workflow_scheduler.sql`, `20260914070000_scheduler_registry_retry_pause.sql`, `durableScheduler.server.ts` and `workflowRegistry.server.ts`; local Postgres is now available and the migrated scheduler suite passes. The existing schedule foreign key and enabled-schedule join were extended deliberately rather than creating a scan-specific repeating schedule.
2. Added `20260916020000_event_workflow_jobs.sql` with `trigger_kind` (`scheduled` / `event`), validated JSON payload/version, stable event identity, nullable `schedule_id` for event jobs, legal-shape checks and partial uniqueness on `(user_id, workflow_key, event_key)`. Existing jobs default to scheduled and retain their occurrence uniqueness.
3. Added service-only `enqueue_workflow_event`, an event-contract registry, and `lib/autonomous-workflows/schedulerEvents.server.ts`. Replays return the existing row only when owner, workflow, event key, payload, version and scheduled time match; both pre-existing rows and concurrent unique-conflict replays are handled, while changed-payload reuse is rejected. The browser has no generic enqueue route.
4. Updated the claim SQL to keep the enabled/matching-owner schedule gate for recurring jobs while admitting due event jobs with no schedule. Existing ordered `SKIP LOCKED`, retry and cancellation paths remain shared. The scheduler GET surface exposes event provenance without returning payload contents.
5. Strengthen completion/failure/deferral RPCs to reject expired as well as mismatched lease tokens. Add a fenced deferred/waiting outcome for asynchronous provider work; waiting for a normal provider poll must not exhaust the failed-attempt budget. Cancellation and terminal states must not be revived by a late poll or callback.
6. `workflowRegistry.server.ts`: add typed payloads and `property_scan_reconstruction` registration only after the worker contract exists. Extend execution results as a discriminated union for terminal versus deferred work. Use a UUID reconstruction artifact/result row because `workflow_results.result_id` and completion RPC take UUIDs; existing `scan_...` / `recon_...` strings are not valid result IDs.
7. `durableScheduler.server.ts:62–79`: branch on that union. Complete only terminal results; defer provider-pending work through the fenced RPC. Bound network calls and per-tick wall time; never run GPU reconstruction or sleep for a model build in a request handler. Preserve existing email/sprint handler behavior.
8. Added `scripts/scheduler-concurrency-acceptance.mjs` and `npm run test:db:concurrency`; the two-session local run proves distinct claims, single-attempt advancement and idempotent duplicate event enqueue. The pgTAP suite still covers owner/permission, pause, expiry, cancellation and atomic receipt behavior. Replay migrations cleanly and against legacy fixtures, then add CI evidence. Do not create another cron, queue implementation or special scan-only scheduler.

Exit: recurrence remains intact and one-off asynchronous work shares tested ownership, idempotency, retries and result fencing.

#### S7 — Bridge reviewed Mongo captures to durable jobs safely

1. New `lib/scans/scanJobs.server.ts`: define a reconstruction request from owner ID, scan ID, approved revision/hash and processor version. Derive one deterministic operation key; never use current timestamp or an arbitrary new UUID as the replay key. New processing versions or revised manifests are separate explicit operations.
2. In the Mongo session's atomic approval/request mutation, persist a bounded enqueue-intent/outbox record with that operation key and frozen input metadata. A Postgres job write and a Mongo status update cannot be one ordinary SQL transaction. Do not claim cross-database atomicity.
3. Add a reconciliation service to the existing scheduler tick: read pending intents in bounded batches, recheck consent/approval, call the idempotent event RPC, then mark the intent acknowledged. A crash between enqueue and acknowledgement must recover the same job. The worker rechecks the source before submission, because an upload may invalidate an intent while it is being relayed.
4. Persist PostgreSQL reconstruction operation/result rows with UUID IDs, owner, manifest hash/revision, processor/version, provider operation ID, status and artifact reference. Keep source storage paths server-side. Use conditional updates so stale jobs cannot replace a newer session's current artifact.
5. Replace `startPropertyScanReconstruction` and its route with this request service. Return 202 with a stable job/status URL only for persisted accepted intent; return 200/reused for the same current completed operation. Unconfigured processors remain 503, stale approvals 409.
6. Add owner-scoped status read/cancel routes and reviewer equivalents through S2. Expose queued/submitted/processing/awaiting-review/failed/cancelled/stale separately; never fake percentage progress. Include retry guidance and a safe error code without leaking provider secrets.
7. Link scan state into `lib/property-sprints/buildPropertyBacklog.ts` through an owner-scoped projection: missing consent/capture/review becomes proposed work, not an automatic scan. Dedupe by property, scan revision and task kind. A scheduled sprint may ask for missing rooms or review; approving it does not grant camera access, spend provider money, publish or email.
8. Test Mongo-write/Postgres-outage, job-created/ack-lost, approval invalidated during relay, stale result projection and duplicate clicks. A durable intent is “queued for processing”, not proof a worker ran.

Exit: one approved input produces one traceable operation despite retries and cross-store failures.

#### S8 — Implement a real reconstruction adapter behind an evidence gate

1. New `lib/scans/reconstructionProvider.server.ts`: define capabilities and `submit`, `status`, `cancel`, `collectArtifact` interfaces; include supported inputs, external processing disclosure, retention, region, maximum cost and version. Provide a deterministic fake for tests and an unavailable implementation by default, never a geometry generator masquerading as success.
2. Before choosing a paid processor/native LiDAR route, run a documented local or authorized provider evaluation on non-sensitive, consented sample data. Record geometry/texture output, missing surfaces, scale limitations, processing time, estimated cost, licensing and deletion behavior. Ask the owner only for choices that actually change external processing/spend; do not upload client interiors as a benchmark.
3. New `lib/autonomous-workflows/propertyScanWorkflow.server.ts`: load the immutable approved manifest, validate current permission and provider capability, reuse the operation key on submit, and persist the provider receipt. A provider with no idempotent submit or operation lookup requires an “uncertain submission” reconciliation path, not blind billable retries.
4. Poll through S6's deferred outcome or implement a provider-specific authenticated callback if supported. For callbacks, verify signatures over the raw body, timestamp/replay window, provider operation ownership, event ordering and terminal-state rules. Never fetch an arbitrary callback-supplied URL; restrict artifact retrieval to trusted provider hosts/objects with size/time limits.
5. Validate the returned real mesh/texture bundle, provenance and input hash before storing it privately. Reject empty, corrupt, incomplete or unsupported output with an actionable result. A “ready” HTTP response from a vendor is not by itself a valid home artifact.
6. Keep reconstruction completion distinct from listing approval. Report unobserved areas and unknown scale explicitly; do not infer bedrooms, legal area, structural condition or dimensions from file count or hallucinated surfaces. Imported native scans require their own provenance and format validation.
7. Test restart after submit, provider timeout/uncertain receipt, duplicate/out-of-order callback, revoked consent, cancelled job and corrupted artifact. Record real sample evidence separately from passing fake-provider tests.

Exit: a supported input yields a real private artifact whose provenance and limitations can be inspected; unsupported cases remain visibly blocked.

#### S9 — Display real artifacts and require separate publication approval

1. Replace the production use of `PropertyScanPreview` with a typed artifact viewer taking an authorized artifact ID, format and provenance, not `roomCount`. Load the chosen supported format (initial candidate: GLB) only after adapter validation; bound asset/texture size and deny uncontrolled external asset URLs.
2. Fit orbit controls to the actual model bounds, support reset/pan/zoom, show loading/error/WebGL fallback, and dispose geometry/textures when changing artifacts. Keep camera/UI code client-side and dynamically load the heavy viewer. Test mobile memory/performance; decorative Abidan geometry is not reusable property geometry.
3. Admin and owner preview pages show capture date versus upload time, input revision, processor/version, review status and scale/coverage limitations. Hide stale/revoked artifacts from the current preview path. Do not show “approved” for a rejected capture just because a nested record exists.
4. Add a separate owner publication action tied to exact artifact ID/hash, listing identity, intended audience and consent version, with its own review receipt. Neither intake's legacy boolean, agent capture approval, reconstruction completion nor sprint approval authorizes publication. Keep the private raw files private even when an explicitly approved derivative is shared.
5. Integrate the approved derivative into the existing listing/tour surface only after its owner mapping is verified. Require authorization on artifact access; a guessed scan ID cannot become a public tour URL. Implement unpublish/consent-withdrawal so new access ceases and document signed-link/cache expiry limits honestly.
6. Add owner deletion and retention controls covering raw uploads, derivatives, reservations, provider copies and cross-store records. Use audited, retryable tombstones until cleanup finishes; preserve minimal required audit evidence without retaining interior imagery indefinitely. Select the actual retention period before rollout, not an unstated default.
7. E2E: upload → inspect → approve capture → enqueue → actual/fake-labeled processor → private artifact review → separate publish → unpublish; include a second user, stale manifest, denied publication and inaccessible raw assets. Fake output must be visibly labelled and never published as real property evidence.

Exit: the owner can inspect an actual model and deliberately control whether a specific derivative appears on a listing.

#### S10 — Verification, ledger, and PR handoff

1. Add focused tests in the existing unit-test directory for scan access, route errors, revision transitions, upload orchestration, job idempotency and model provenance. Malformed JSON is a client error (400), unauthorized/foreign IDs are denied, stale revisions return 409, unsupported capability returns 503, and unexpected faults are sanitized. Error responses must not be cached with private data.
2. Add component tests for camera lifecycle and gallery/review states, integration tests for actual Mongo conditional writes and disposable storage policies, and database acceptance for scheduler changes. Use synthetic fixtures and deliberate fault injection, not the owner's real home or contacts.
3. During implementation run relevant focused suites after each slice. Before requesting merge, run the available `npm run test:unit`, `npm run lint`, `npm run build`, `npm run test:db` and relevant Playwright tests from `apps/pulse`. Record exact exits/counts, environment limitations and skipped checks. This docs-only review ran only the two scan helper suites listed above.
4. Keep contract preview, public-menu, sprint-route and existing scheduler tests as regressions when touching shared auth/registry code. Do not declare all unrelated workflows fixed just because scan tests pass. Resolve the paused-schedule save-label mismatch without changing its saved enable state.
5. Review the complete diff and actual PR base/target. Update the PR description with shipped versus unavailable scan capabilities, privacy/state migration notes, screenshots from meaningful authenticated flows, verification evidence and explicit carryover. Do not reuse a loading-screen screenshot as end-to-end evidence.
6. Update sections 13.2 and 13.6 plus the Keller / Westlake plan after each implemented slice, with commit, acceptance command, outcome and next step. A checkbox can say “code present; acceptance pending”; it cannot turn an unrun integration test into a pass.
7. PR checks → review → merge → normal main deployment. Verify the resulting deployment and migration state when that work is authorized. No direct production promotion, live-data cleanup, private-media publishing or auto-send in a coding handoff.

### 13.6 Remaining roadmap and completion ledger

| Package | Current status at this review | Next evidence required |
| --- | --- | --- |
| S1 truthful capability boundary | Implemented locally; focused tests/build pass | Review the diff, then merge/CI evidence; no synthetic home result or unsupported new LiDAR claim |
| S2 scoped media review | Implemented locally; owner-scoped reviewer assignment mutation and Scan Studio controls now included; focused reviewer-route/store tests pass | Disposable Mongo/storage policy and authenticated browser evidence; verify the owner assignment flow against real auth/storage |
| S3 reliable capture/recovery | Implemented locally; focused lifecycle tests/build pass | Authenticated browser/mobile evidence, denied/late permission and failed-upload recovery evidence |
| S4 versioned state | L4 foundation, review acknowledgement, owner-scoped listing resolver, mock-parity race tests, and a focused browser-boundary spec implemented locally; focused tests/build pass | Disposable Mongo concurrency tests, successful clean-server browser/deep-link evidence, and stale-artifact acceptance |
| S5 private upload pipeline | Reservation plus direct signed capability, owner-scoped deterministic paths, finalize-time size/MIME/signature validation, SHA-256 provenance, rejected-object cleanup, bounded expired-object reconciliation, direct-upload progress/retry/cancel UI, and local/unit/Mongo/build acceptance | Real Supabase storage policy/isolation, authenticated signed-upload browser flow, deployment limits, cleanup retry and full media acceptance |
| S6 one-off shared scheduler | Event-job foundation implemented locally and local DB acceptance passed: nullable schedule for event jobs, versioned JSON payloads, service-only owner/event-key idempotency RPC, shared lease/retry claim path, scheduler UI provenance, 44/44 pgTAP tests, and a repeatable two-session local acceptance harness | CI/migration replay evidence remains; register additional event workflows only after their worker contracts exist |
| S7 cross-store job bridge | Not implemented | Replay-safe intent/job/result reconciliation |
| S8 actual reconstruction | Not implemented; no selected processor | Consented sample artifact and provider failure evidence |
| S9 artifact review/publication | Synthetic preview only | Real private model, separate publication and revocation |
| S10 handoff | L1–L4 implementation and focused verification recorded below; L4 is not merge-accepted | Slice-specific integration/browser/CI evidence |

Existing Packages A–E are not replaced. Preserve their concurrency, owner isolation, email approval and delivery-reconciliation gates; showing reminders and additional backlog sources follow those gates. Scan scheduling must reuse that foundation, not compete with it. The four Keller / Westlake properties remain planning records, not permission to photograph interiors or model someone else's home. The Old Town land lot is not an indoor-room scan task; unresolved identities remain questions for the owner/Jamie.

Research/product measures for a later pilot: successful consent-to-upload completion, recoverable failures, review time, accepted real-artifact rate, processing cost, permission withdrawals, and consultations/showings attributable to an approved listing. Keep fees, subscriptions or paid scans out of the build until the actual unit economics and delivery quality are measured. These measures do not authorize billing or marketing messages.

Next implementation action: replay the private-storage migration in a fresh Supabase stack, add real owner/reviewer identities, and prove signed upload/finalize, foreign/anonymous denial, changed-object rejection and cleanup retry. The direct-upload progress/retry/cancel UI is implemented locally. The owner-scoped reviewer assignment feature is implemented locally: `PATCH /api/property-scans/[scanId]/reviewers` replaces assignments behind the current session revision, and Scan Studio can grant or revoke reviewer user IDs. The sprint workspace now presents conservative assignment states, exposes owner-controlled completion for assigned/in-progress work, preserves backlog descriptions/estimates on partial edits, permits revision-fenced edits to proposed sprint items with supported worker selection, keeps a proposed-item draft open after a failed or stale save, uses accurate Save schedule copy for paused schedules, the shortlist planner displays created-task counts plus actionable exclusions while labeling notes as You or Jamie, and Pulse command results can be added once to the owner backlog with command provenance. S6 now adds replay-safe event jobs and a bounded sprint-planner event producer contract; it does not register property reconstruction or auto-send. The full unit suite passes 282 files / 1,122 tests; the focused upload/UI suite passes 13/13; the scheduler Docker suite passes 9 groups; Mongo acceptance passes 9 tests; and the production build passes with only the existing non-fatal Kepler dynamic-usage warning. CI migration replay, real auth/storage acceptance, S7 job bridge, S8 processor and S9 publication remain gated. Do not spend the next sprint polishing the room-shell demo.

Progress accounting (directional, not story points): local implementation coverage is approximately 40–45% of the ten-packet roadmap (L1–L3 local, L4 foundation/fixtures partial, S10 ledger work), leaving approximately 55–60% of implementation scope. Production-ready acceptance is approximately 20–25% evidenced because Mongo/storage, authenticated browser, CI, migration and deployment checks remain open; approximately 75–80% of acceptance remains. This distinction prevents focused mock tests from being reported as runtime or release completion.

### 13.7 Luna implementation handoff

This is the operational entry point for Luna. Section 13.5 is the implementation specification; this handoff breaks it into smaller, dependency-ordered packets. Do not rewrite the roadmap before coding, redo completed scheduler repairs, or interpret all ten slices as one turn's assignment. Once implementation is requested, finish the next coherent packet and proceed while the request's scope and time budget permit. “Next actionables” means resume from the checkpoint below, not pick an unrelated feature.

#### Read and establish the baseline first

1. From repository root, inspect `git status --short`, `git branch --show-current`, and `git log -5 --oneline`. The reviewed source is `50aa53b2`; if HEAD differs, inspect the intervening changes before assuming a finding still applies. Preserve the existing edits in this document and `KELLER_WESTLAKE_PROPERTY_SPRINT_PLAN.md`.
2. Read applicable repository instructions, sections 13.1–13.4, and the current packet's S-section in full. Read each target file and its direct callers/tests before editing. Use `rg` to relocate declarations; do not patch an old line number blindly. Read any applicable skill before using its implementation workflow.
3. Run the existing two scan helper suites once as a baseline. They previously passed three tests, including a test of the behavior being removed; their passing does not establish correct reconstruction. Inspect existing route-test mocks in `tests/unit/menu-route.test.ts` and `vitest.config.ts`; reuse the harness, not a new test framework.
4. Record the active packet and its failing/missing acceptance cases before the first code change. New failing tests should demonstrate the intended regression; do not change production behavior just to preserve the old room-count expectation.

#### Decisions already made — implement these without reopening them

- Initial capability is private photo/video intake and review. Wi-Fi transports media; it does not scan the home. Native LiDAR, in-browser recording and real reconstruction are unavailable until implemented and tested.
- For L1, remove the synthetic room viewer from property-facing routes. Do not spend time creating a new demo page. Preserve legacy stored records and classify them as synthetic; do not migrate/delete live data. The old component may remain unused until all references are checked.
- No processor configured means a typed unavailable result and a 503 API response, not a fake completed result or a queued job. Authentication/authorization occurs before returning scan details or mutating anything.
- Reuse existing API response helpers, auth identity sources, schema library, storage client and test harness. No new dependencies or framework upgrade are needed for L1–L4.
- Review access is owner-scoped plus explicit scan-review grants. General `realtor` membership is not sufficient to see every household. Owner grant/revoke management is now available through the revision-fenced Scan Studio route; cross-owner administrator grant management remains a separate audited policy. Deny non-owner access when no explicit grant exists; never temporarily fall back to the global queue. An owner must also satisfy the review-role policy to approve; ownership alone permits intake/read, not an automatic agent-review bypass.
- Signed URLs are short-lived capabilities for a resolved stored asset, never client-supplied paths. Gallery/approval must remain disabled until asset identity and access checks are in place.
- New mutation contracts use expected revision. Older synthetic results are never current real artifacts. Re-upload/rejection/consent withdrawal invalidates downstream approval and output.
- Keep the single Keller / Westlake area, existing shared scheduler and review-first email policy. No second scheduler, silent auto-send, fabricated Jamie answers, or invented property facts.

#### Packet map and dependency order

| Packet | Specification / exact scope | Required completion evidence | Next packet |
| --- | --- | --- | --- |
| L1 | S1: unavailable reconstruction, legacy-demo handling, truthful UI/modes | Tests prove no generated/reused synthetic home result; route/UI claims agree | L2 |
| L2 | S2 plus the minimum S4 prerequisites: typed actor, stable asset IDs, scoped lookup, reviewer grants and revision fields | Foreign owner/unassigned realtor denied; old ID outside queue page resolves for authorized actor; legacy assets cannot bypass IDs | L3 |
| L3 | S3: first camera start, cleanup, saved-session identity, recoverable requests | Fake-stream lifecycle/component tests; no lingering stream or lost active-session identity | L4 |
| L4 | Remaining S4 and S2 gallery/review: conditional writes, invalidation, actual media inspection | Approve/upload race and stale artifact rejected; review cannot approve inaccessible media | L5 |
| L5 | S5: reservation → direct private upload → verified finalize → cleanup | Quota, storage isolation, replay and orphan recovery integration tests | L6 |
| L6 | S6: event jobs and live-lease fencing in the shared scheduler | Existing scheduler behavior preserved plus new concurrent DB acceptance | L7 |
| L7 | S7: Mongo intent → idempotent Postgres enqueue → result projection | Crash/retry recovery produces one operation, stale output cannot become current | L8 |
| L8 | S8: fake/unavailable adapter first, then explicitly selected real processor | Fake-provider contract tests; separately recorded authorized real-artifact evidence | L9 |
| L9 | S9: real artifact viewer, exact-artifact publication approval and revocation | Private-to-published flow and denial/revocation evidence | Handoff |

S10 verification/ledger work applies to every packet, not only the end. L2 deliberately pulled stable asset IDs and revision fields forward from S4 because S2's media route depends on them. L4 now has a local foundation; the active timebox closes its database/browser evidence gaps and audits the shared scheduler contract without enqueuing scan work. This dependency clarification overrides any reading of the five-hour table that would expose media before the required identifiers/access rules exist. The five-hour budget is a timebox for L4 acceptance plus scheduler readiness and verification, not a guarantee that production integration will be completed.

#### First implementation packet — L1, edit in this order

1. **Read/search:** inspect `lib/scans/reconstruction.ts`, `lib/scans/propertyScanStore.ts`, `lib/scans/propertyScanContract.ts`, both admin scan pages, the reconstruct route, route catalogue and both scan tests. Find every `buildManifestPreview`, `PropertyScanReconstruction`, `roomCount` and `manifest-preview-v1` reference before changing exports.
2. **Tests first:** replace the misleading expectation in `tests/unit/property-scan-reconstruction.test.ts` with explicit legacy-demo/unavailable behavior. Add `tests/unit/property-scan-reconstruct-route.test.ts` using existing `vi.hoisted`/module-mock conventions. Exercise denied auth, unapproved capture, empty capture, unavailable processor and an existing legacy “ready” record. Assert no reconstruction write/provider call occurs for unavailable processing.
3. **Pure contract:** in `lib/scans/reconstruction.ts`, retain a clearly named legacy metadata shape needed to read old records; add a typed unavailable capability/result and a legacy-demo predicate. Remove the real-path room-count builder. Do not invent a general plugin system or implement the future job lifecycle in this packet.
4. **Store:** in `propertyScanStore.ts`, remove the builder import and replace synchronous reconstruction writes with the unavailable service outcome. Make mock and real paths agree. Keep legacy metadata readable but not eligible for current real-preview success; update DTO consumers together so the build remains type-safe. Never fix the type errors with broader `any` or casts that hide the missing state.
5. **Route:** in `app/api/admin/property-scans/[scanId]/reconstruct/route.ts`, preserve the existing access/input gates for now, remove ready-demo reuse and fabricated 202 responses, and map unavailable to the existing error envelope with a stable machine-readable code. Follow S2 in L2 to replace the broad operator lookup; do not claim L1 repairs review authorization.
6. **UI:** in `app/admin/property-scans/page.tsx` and `[scanId]/preview/page.tsx`, remove synthetic-room rendering/links and show “Reconstruction unavailable” or “Legacy synthetic demo — not a model of this property” as appropriate. Do not display inferred rooms or an unconditional approval badge. Keep intake/review navigation usable.
7. **Modes/copy:** update `propertyScanContract.ts`, `app/scan-studio/page.tsx` and `lib/navigation/routeCatalog.ts` to match actual supported capture behavior. Reject new LiDAR requests while keeping legacy LiDAR records readable. Update `property-scan-contract.test.ts`, which currently treats LiDAR as a supported new request. Do not break deserialization by simply deleting the enum value everywhere.
8. **Verify:** run the three focused files below, inspect the diff, then run build/type validation appropriate to the changed DTO consumers. Search again for builder calls and real-property `roomCount` claims. Remaining legacy references must be deliberate compatibility code, not a live route. Record exact results; do not delete failing tests to obtain green output.
9. **Checkpoint:** mark L1 code/acceptance status, list untouched risks (particularly L2 access and L5 upload safety), and record L2 as next. A 503 instead of invented output is the intended correct interim behavior, not a reason to restore the demo.

Focused commands from `apps/pulse` (the third test file is created during L1):

```powershell
npm run test:unit -- tests/unit/property-scan-contract.test.ts tests/unit/property-scan-reconstruction.test.ts
npm run test:unit -- tests/unit/property-scan-contract.test.ts tests/unit/property-scan-reconstruction.test.ts tests/unit/property-scan-reconstruct-route.test.ts
npm run build
git diff --check
```

Do not run the nonexistent new test as a supposed baseline. If sandbox permissions prevent test startup, use the normal approval mechanism for that exact command; do not modify the toolchain or report an unexecuted suite as passing. A docs-only handoff does not require rerunning a production build.

#### Scope controls and when to ask Taz

- Fix directly required callers/tests in the same packet. If an edit unexpectedly spreads into unrelated features, stop expanding and identify the narrower adapter/boundary. Do not clean up Grill, Abidan, contracts or old sprint code as incidental refactoring.
- A blocked integration test does not stop independent local correctness work. Continue with safe fixtures and clearly record missing acceptance; do not enable rollout on fixture evidence alone. Do not endlessly poll CI or replace database tests with mocks.
- Ask before a paid provider, third-party transfer of interiors, new cross-owner access policy, production change, destructive data action, or a material departure from the plan. Name the precise choice and why it blocks that slice. Routine naming, component extraction and test fixtures do not need another user decision.
- Git commit/push/PR mutations require the applicable user request; this handoff does not itself request them. If authorized, use a focused commit and inspect the active PR before updating it. Never rewrite history, merge or deploy merely because local tests passed.
- At the five-hour boundary, summarize actual results and carryover. Do not mark a partially tested packet complete or start a second sprint silently. No subagents and no unattended background automation.

#### Required checkpoint after each packet

Maintain this table in place; do not append a competing “current plan” elsewhere. Update section 13.6 only when the associated S-requirements actually pass. Record `not committed` instead of inventing a commit ID.

| Field | Current handoff value |
| --- | --- |
| Reviewed baseline | `50aa53b2`; recheck HEAD before coding |
| Last accepted Luna packet | S5 local direct/private upload integrity, bounded cleanup, and Scan Studio direct-upload UI plus S6 deferral foundation; packet acceptance is still local/unit/Docker/Mongo/build evidence, not merge or Supabase acceptance |
| Active / next packet | Fresh Supabase migration/storage/auth acceptance for S5; only after that begin S7's approved-scan outbox bridge. Recurring schedules and one-off events already share durable jobs, leases, retries and owner fencing |
| Code changes from this handoff | L1 boundary; L2 actor policy, reviewer IDs, stable asset IDs, actor-scoped lookup, private signed-URL route/gallery, owner-scoped reviewer grant/revoke route and Scan Studio controls; L3 saved-session recovery, camera attach/cleanup, upload retry state; L4 consent receipt, revision/hash checks, review events, asset dedupe/downstream invalidation, explicit server-enforced review acknowledgement, owner-scoped listing resolver, immutable mock DTO snapshots and race tests; S5 reservation quota, deterministic signed paths, finalize-time metadata/byte-signature/SHA-256 validation, rejected-object cleanup, bounded expiry reconciliation, storage bucket policy migration, Mongo acceptance and integrity tests, direct signed-upload progress/retry/cancel outcomes and revision refresh; Scan Studio prefetch boundary and browser spec; sprint assignment state presentation/completion control, backlog edit preservation, proposed-item revision fence/worker selection, failed-save draft preservation and Pulse result-to-backlog provenance/deduplication; shortlist planning exclusion summary and explicit You/Jamie note labels; paused-schedule Save schedule label; S6 event-job migration, event contract registry, enqueue helper, sprint-planner event producer contract, claim-path support, workflow payload propagation, event provenance UI, deferred outcomes and local two-session acceptance harness |
| Evidence carried forward | Full `npm run test:unit` passed 282 files / 1,122 tests; focused upload/UI/property-route/integrity suite passed 13/13; `npm run docker:test:scans` passed 9/9 real Mongo tests with disposable fixture cleanup; scheduler Docker acceptance passed 9 groups; `npm run build` passed, compiled, type-checked and generated 256 static pages with only the existing non-fatal Kepler dynamic-usage warning; `git diff --check` passed with line-ending normalization warnings only |
| Remaining blockers | Fresh Supabase replay of the scheduler/deferred/storage migrations; real owner/reviewer Auth identities; signed-upload browser acceptance; foreign/anonymous Storage read-write-list denial; changed-object rejection and cleanup retry against real Storage; direct-upload progress/retry UI evidence; remote CI/PR evidence; actual processor unselected; no commit/push/deployment/remote migration in this turn |
| Changed paths / commit | Runtime, tests and plan docs changed locally; not committed |
| Exact next action | Start the fresh Supabase storage/auth acceptance fixture, replay `20260916040000_scheduler_deferred_outcomes.sql` and `20260916050000_property_scan_storage_policy.sql`, test owner/foreign/anonymous upload and preview boundaries, and verify the existing direct-upload progress/retry flow before S7 |

For an implementation checkpoint, replace these values with: packet ID; changed paths; behavior delivered; commands and exit/counts; skipped checks with reason; remaining risks; commit if any; and the exact next packet/step. Keep the user-facing summary short and link here for details.

#### Ready-to-use instruction for Luna

> Implement the Luna handoff in section 13.7 of `apps/pulse/docs/PRAXIS_AGENT_WORKSPACE_PLAN.md`. Recheck the branch and preserve existing changes. Start at the checkpoint's current active packet; currently that means finishing L4/S4 acceptance and the shared scheduler readiness audit. Follow its edit order and acceptance cases, using section 13.5 as the detailed specification. Do not spawn subagents, manufacture home geometry, create a competing scheduler, or change production. Complete and verify a coherent packet, update the checkpoint with exact evidence, and continue only to the next dependency-ready packet within the requested work budget. Ask only when new authority or a material product decision is needed. No provider spending, private-media transfer, publishing, auto-send, commit/push or deployment is authorized merely by this document.
