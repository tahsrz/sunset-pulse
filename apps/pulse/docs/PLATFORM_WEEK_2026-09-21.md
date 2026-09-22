# Platform implementation handoff — September 21–25, 2026

Prepared September 18 against `12716f15` on [PR #79](https://github.com/tahsrz/sunset-pulse/pull/79). This is the active execution queue under the [three-phase roadmap](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md), not a fourth architecture plan. Work sequentially, without subagents. All code paths below are relative to `apps/pulse`; **new** means proposed, not implemented. Resolve symbols in source before editing rather than relying on stale line numbers.

## Outcome and order

Make existing property planning safe for an explicitly selected workspace, then let a real user launch a pinned, property-bound intake and answer it through one shared inbox. The same UI should render the existing content intake manifest, but authoritative content launch stays unavailable until its Vibe revision adapter is proven. Intake notes do not approve facts, complete assignments, send email or publish content.

| Target slot | Deliverable | Dependency / exit |
| --- | --- | --- |
| Monday, September 21 — W1 | Workspace-scoped planner input selection | Read-side leased-job/workspace identity boundary is implemented; team resource selection and persistence remain gated for W2 |
| Tuesday, September 22 — W2 | Atomic scoped persistence and legacy mutation compatibility | Legacy owner fallback guard is implemented; atomic persistence and concurrency evidence remain |
| Wednesday, September 23 — W3 | Pinned manifest launch bound to an authorized property/task revision | W2; duplicate launch and install/resource race tests |
| Thursday, September 24 — W4 | Shared schema form, checkpoint inbox and run detail | W3; real browser flow, accessible controls and no second response store |
| Friday, September 25 — W5 | Acceptance, migration/rollback handoff and PR review | W1–W4; fresh CI, local real-auth evidence, explicit unresolved gates |

These are sequencing targets, not a claim that each fits one day. Minimum weekly commitment is W1–W3 with evidence. W4 is the next deliverable if those gates close; W5 still records an honest handoff if UI work carries over. Do not trade isolation tests for a larger demo.

## Start-of-session checklist

1. Check branch/status and current PR head; preserve other work and do not rewrite shared commits.
2. Read the [current ledger](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md#current-ledger-and-next-session), this week's active section and its direct source/test files only.
3. Check Docker engine availability for database work. Follow the [local runbook](../../../infra/local/README.md); do not reset Supabase, claim unrelated jobs or prune shared Docker data.
4. Record current runtime: `.node-version` selects 22, CI uses 20, and the September 18 host used 23.3.0. Runtime alignment is a separate reviewed tooling change, not an incidental lockfile upgrade.
5. Keep `platform_run` admission disabled outside isolated/local acceptance. End each slice with code, tests and a short evidence entry before starting the next.

## W1 — select planning inputs by workspace

**Status at September 22:** the read-side identity boundary is implemented in `sprintPlanningScope.server.ts` and consumed by `sprintPlannerWorkflow.server.ts`; mapped backlog/property readers now use the resolved workspace, and 9 focused W1 tests pass. The resolver is intentionally still owner-compatible. It does not authorize team writes or remove the SQL guard.

1. Extend `lib/platform/access/sprintPlanningScope.server.ts` around `requireOwnerCompatiblePlanning`. Add a scoped resolver that reads the **stored** job/schedule mapping and validates its live lease, active workspace and current requester membership. Return separate actor, resource-owner and workspace identities; never substitute `job.user_id` for all three.
2. Extend the existing `lib/property-sprints/shortlist.server.ts::listShortlistEntriesForWorkspace` and `lib/property-sprints/sprintWorkspace.server.ts` readers only where needed. Select active, mapped resources with bounded queries; reject unresolved mappings and exclude other personal/team workspaces even when their rows share an owner.
3. Change `lib/autonomous-workflows/sprintPlannerWorkflow.server.ts::runSprintPlannerWorkflow` and `lib/property-sprints/planPropertySprint.server.ts::createPropertySprintProposal` to consume scoped input snapshots instead of owner-wide backlog/shortlist reads. Keep `sprintSelection.ts` and `buildPropertyBacklog.ts` as deterministic selection logic.
4. Scope existing-task/dedupe lookups to the same workspace; preserve source IDs, resource revisions, assignment descriptions and the `keller-westlake` area. Do not silently remap legacy rows or mix one owner's personal backlog into their team proposal.
5. Keep `requireOwnerCompatiblePlanning` on unsupported paths until W2's persistence checks exist. A read-time membership check alone does not authorize the later write.

**Done when:** extend `platform-planning-scope.test.ts`, `property-sprint-builder.test.ts`, `sprint-selection.test.ts` and `domain-scope.test.ts` with one owner in two workspaces, different requester/resource owners, foreign/mixed/unmapped inputs and revoked/archived cases. W1 may ship internally while team admission remains blocked; it must not enable incomplete team execution.

## W2 — persist and mutate under the same scope

**Status at September 22:** `20260918060000_platform_owner_mutation_guard.sql` and the `sprints` route guard legacy backlog/sprint/assignment/approval mutations. `20260918070000_platform_scoped_sprint_persistence.sql` and `20260918080000_platform_scoped_property_persistence.sql` now provide atomic workspace-aware manual/property proposal paths, and the expanded planner/workspace suite passes 26/26; the acceptance harness covers mapped team schedule/backlog/property inputs, concurrent replay, scope-link creation and foreign-workspace denial. Disposable Postgres could not start because Docker Desktop's Linux engine pipe was unavailable; do not enable or roll out the new RPCs until that SQL gate passes.

1. Add a forward SQL migration after `20260918050000_platform_app_installs.sql`; do not edit previously applied migrations. Extend `persist_scheduled_sprint_proposal` and `platform_persist_property_sprint_proposal` with explicit workspace/source snapshots using backward-compatible adapters or a new signature. Preserve replay identity and existing personal behavior.
2. Within one transaction, revalidate the live job lease, original requester membership, active workspace, schedule mapping, selected input mappings/revisions and dedupe identity. Lock resources in deterministic order; write proposal, items, assignments/scope links and audit atomically. A stale input or revoked member rolls back the entire proposal.
3. Inventory every branch in `app/api/sprints/route.ts`: create, approve, item edit/remove, assignment completion, backlog add/update/remove and schedule creation. Route each through actor-aware workspace adapters; use `expectedRevision` for mutable records. Missing `workspaceId` means verified personal compatibility, never a bypass for explicitly team-mapped records.
4. Apply the same rule to `app/api/scheduler/route.ts` controls and legacy functions in `lib/property-sprints/shortlist.server.ts` / `app/api/property-shortlist/route.ts`. Preserve legitimate legacy users without mappings; fail explicitly when an existing mapping is unresolved, archived or outside their access. No implicit transfer or automatic broad backfill.
5. Add narrow helpers to `lib/platform/access/domainScope.server.ts` rather than trusting browser-supplied owner IDs. Reuse existing role policy and shared workspace/member locks in scoped SQL functions.

**Done when:** `sprints-route.test.ts`, `scheduler-route.test.ts`, `sprint-workspace.test.ts`, `property-shortlist-workspace.test.ts` and real DB assertions pass. Extend `scripts/platform-followup-acceptance.mjs` with concurrent revocation/archive vs persistence, stale source revisions, duplicate proposals, omitted-workspace mutations and lease expiry. Tests must observe overlapping transactions. Enable only the locally tested team path; do not relax the guard globally.

## W3 — launch from the pinned install, not browser-supplied authority

1. Extend `lib/platform/contracts/appManifest.ts` with a separate strict launch request: install ID, expected install revision, workflow key, validated inputs, resource references/revisions and request key. Do not add executable strings or relax the existing empty-capabilities constraint.
2. Add **new** `lib/platform/apps/appLaunch.server.ts`. Load the active install server-side, select the stored workflow, validate inputs using `parseManifestValues`, resolve access and build a bounded immutable launch snapshot. Never accept a replacement graph/hash/owner from the browser for this path.
3. Use `domainScope.server.ts` to resolve the authoritative property and, when launching from an assignment, its task revision and property relationship in the same workspace. A generic string `property_id` or `platform_scope_links.source_revision` alone is not sufficient evidence of current domain authority.
4. Add a forward migration/RPC for Postgres-backed admission: atomically pin install ID/version/hash/revision, relevant settings, workflow definition, input values and resource references onto the existing `platform_runs` row, then enqueue through the existing scheduler. Recheck install status/revision, workspace/membership and current resource revisions under locks. Do not add another run/job store.
5. Add **new** `app/api/workspaces/[workspaceId]/apps/launch/route.ts`, reusing `workspaceWorkflowRequest` and bounded `readWorkflowBody`. Same request/content replays; changed content conflicts. Upgrading/disabling the install cannot rewrite existing snapshots; disabled installs deny new launches.
6. Extend `runStore.server.ts` and affected transition RPCs so bound runs cannot silently swap inputs. Domain-sensitive steps revalidate the pinned resource and current authority; changed sources require explicit supersession preserving old answers. Generic run start remains non-domain-authoritative and must not acquire property/publication rights by naming an ID.
7. `resolveVibeRevisionScope` currently returns `UNSUPPORTED`. Inspect the authoritative Vibe revision and site/tenant access services before implementing it. A mapping row does not grant publication authority. If its cross-store authorization cannot be proven in this slice, return a visible unavailable state for content-bound launch; keep the reviewed JSON fixture and document the blocker. Do not invent a Postgres/Mongo transaction.

**Done when:** add `platform-app-launch.test.ts` and route/DB cases for foreign IDs, mismatched property/assignment, stale revision, duplicate/concurrent launch, upgrade/disable race and member revocation. Demonstrate a real authorized property-bound intake. Existing checkpoint/complete behavior remains unchanged; the content path is either separately proven or explicitly unavailable.

## W4 — one human interaction surface

1. Extend `appInstallStore.server.ts` and `app/api/workspaces/[workspaceId]/apps/route.ts` with bounded, scoped reads needed by the UI. Extend run detail/history reads through the existing run/checkpoint service; expose only authorized metadata, exact targets, immutable answers and supersession links.
2. Add **new** `components/platform/ManifestForm.tsx` for the existing flat scalar schema subset: labelled string/enum/number/boolean controls, required/bounds errors and in-memory draft preservation. Do not interpret HTML, code or unsupported schema widgets. Server validation remains authoritative.
3. Add **new** `components/platform/CheckpointCard.tsx` with discriminated question/approval/effect-gate controls. Display exact target/version and consequences; preserve the opened revision, submission key and draft on conflict. Disable unauthorized actions but enforce authorization again server-side. Approval is not proof of delivery.
4. Add **new** `app/workspaces/[workspaceId]/inbox/page.tsx` and run-detail/launch surfaces as needed. Consume existing APIs and `{ items, nextCursor }`, with bounded refresh, empty/error/access-denied states and no optimistic success before a server receipt. Use existing recover/cancel/supersede APIs, not a parallel interaction subsystem.
5. Update `lib/navigation/routeCatalog.ts` and the marked root README inventory together. Workspace links must use an actual authorized selection, not a placeholder ID. Add keyboard/focus, mobile layout, stale-response and cursor tests.
6. Give Jamie and users a link to the same context where an existing authorized integration supports it. Direct chat submission is a follow-up unless it calls the same validated services with explicit user intent; do not add a new model/tool execution path to finish this UI slice.

**Done when:** focused form/card tests plus `app-route-catalog.test.ts`, `command-route-directory.test.tsx` and `global-command-routes.test.tsx` pass. Extend the real local Auth harness to operate rendered launch/inbox controls (not just browser `fetch`): launch → answer → completion; second-user denial; cancelled and stale-conflict cases. Render both fixtures, but label any unbound content path unavailable.

## W5 — prove and hand off

1. Run affected unit suites, disposable scheduler/platform concurrency, full Supabase migration/database tests, lint and production build. Re-run Mongo acceptance if a Vibe/scan adapter changed. Use the [verification baseline](PLATFORM_VERIFICATION_2026-09-18.md) for commands, not as substitute evidence.
2. Run real local Supabase browser acceptance with mock auth off; cover team members, a foreign user, revocation, archived workspaces and source changes between read and write. Remove only created fixtures, restore the prior admission flag and stop the owned test server.
3. Write a dated migration/rollout checklist: required migration order, worker version, admissions disabled during preparation, target environment, smoke checks, rollback-to-disabled procedure and data-preservation limits. Do not recommend dropping tables to roll back evidence.
4. Check fresh PR CI at its exact head and update the description, capability matrix and current ledger. Review in order: authorization/migrations → runtime/adapters → routes/UI → tests/docs. No force-push, squash or merge during routine cleanup.
5. Record remaining issues with a file/symbol, user impact, dependency and next test. If W1–W3 are not complete, carry them forward before new features. Do not report a percentage based on unchecked future vision bullets.

## Explicitly outside this week's automatic scope

- MCP/OpenAPI invocation, nonempty capabilities, arbitrary condition/expression nodes or paid model calls.
- Automatic email sends, publication, payments, offers, signatures or representation commitments. Existing domain approval/receipt/consent boundaries stay intact.
- Reconstruction providers, Wi-Fi home scanning, broad scan rewrites, team invitations, cross-workspace admin access or worker autoscaling.
- Production migration/backfill, deployment/promotion, enabling admissions/providers, or changing live schedules. Keller / Westlake stays one area; the existing weekly Monday 08:00 America/Chicago planning intent is preserved, not scheduled by this document.

## Completion ledger

| Slice | State at handoff | Evidence required before marking done |
| --- | --- | --- |
| W1 | In progress — read-side identity boundary complete | Scoped readers must consume resolved workspace/resource IDs; team selection and persistence remain W2 gates |
| W2 | In progress — guard and scoped RPC implemented; DB gate blocked | Start Docker, run disposable SQL/concurrency acceptance, then add concurrent revocation/revision evidence |
| W3 | Not started | Pinned property-bound launch and admission races |
| W4 | Not started; conditional on W3 | Rendered real-session human workflow |
| W5 | Not started | Fresh head checks, cleanup and rollout/handoff record |

For each completion, append only: commit, changed paths, exact checks/results, environment, remaining boundary and next action. Keep implementation evidence separate from deployment claims.
