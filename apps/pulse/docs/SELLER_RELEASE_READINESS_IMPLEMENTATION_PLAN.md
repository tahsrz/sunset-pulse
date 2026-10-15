# Seller release readiness — supporting implementation plan

Created October 14, 2026. Status: **planned; implementation has not started**. Source baseline: `e6aa5c801fc1bb409b96a260b7a4690cb2dc5a2a`, PR #80, `codex/seller-acquisition-2026q4`.

This is the next release packet under the existing seller-business plan. It does not replace the operating-platform roadmap or reopen completed seller features. Implement sequentially using the existing scheduler.

October 14 product direction: the user wants the whole process to feel more human, visual and fluid. The [humanized operating experience plan](HUMANIZED_OPERATING_EXPERIENCE_PLAN.md) now owns the user-facing build order, beginning with a focused Today slice and seller journey. This document supplies the release/configuration/schema evidence behind that experience; its command-line reporting belongs to operators, not everyday seller flows.

## Current plans and their relationship

| Plan | What it owns | Current evidence and remaining work |
| --- | --- | --- |
| [Seller daily workspace](SELLER_BUSINESS_DAILY_WORKSPACE_IMPLEMENTATION_PLAN.md) and [connected seller service](SELLER_SERVICE_IMPLEMENTATION.md) | Intake, inbox, planner/reminders, Today, Jamie handoffs, cases, reviewed communication, client progress and business measurement | Implemented and exercised in disposable database/auth/browser suites. All six GitHub Actions jobs and Vercel pass on the baseline. Hosted schema, real owner/client acceptance, cadence and sending remain separate release gates. |
| [Keller / Westlake acquisition](KELLER_WESTLAKE_CLIENT_ACQUISITION_PLAN.md) | Seller offer, sourced guides, reviewed CMA/video work, manual distribution and the operational pilot | Substantial local implementation, including review/publication/outcome records. Public identity, approved sources/media and actual pilot observations still require operational evidence. A recorded post is not an automatic publication. |
| [Realtor planner and scoreboard](REALTOR_PLANNER_SCOREBOARD_PLAN.md) | Private planner, money, goals, recurrence, reminders and progress | Existing product foundation, extended by the seller packets. Older September backlog entries must be checked against later acceptance before treating them as unfinished; do not recreate the personal Jamie bridge or planner features. |
| [Operating platform](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md) | Shared workspaces, JSON runs, checkpoints, manifests, policies, quotas and control surfaces | Much of the core engine has local implementation/evidence. General connector execution, provider effects, team-domain acceptance and controlled activation remain gated. This is the canonical platform plan. |
| [Praxis agent workspace](PRAXIS_AGENT_WORKSPACE_PLAN.md) | Agent interaction, capture, private scans, property missions and artifact review | Its September review lists remaining durability, delivery, private artifact and real-device acceptance work. Real reconstruction still requires a selected processor and actual artifact evidence. Some old upload limits are superseded by the new 50 MB cap; reconcile before implementation. |
| [Vibe CMS vertical slice](VIBE_CMS_VERTICAL_SLICE_PLAN.md) and [editorial UI](VIBE_CMS_WORDPRESS_UI_PLAN.md) | Editorial screens, reviewed revisions, apply/rollback and disposable site verification | The dated ledger records phases 1–9 implemented, 10–11 partial and 12–14 open. Authorized disposable-site discovery, complete lifecycle and controlled hosted evidence remain. This plan does not certify those older milestones against current source. |
| [Storage budget](../../../docs/supabase-storage-budget.md) and [activation evidence](../../../docs/supabase-storage-activation-2026-10-13.md) | Shared file admission, conservative reservations, background publishing and existing-worker inspection | Guard and cron-health migrations installed on the confirmed non-production project; real Storage API acceptance and preservation checks pass. Database growth and provider temporary/orphan bytes are separate from tracked file admission. |

The next priority is making the implemented seller product usable on the selected hosted target, then running the acquisition pilot. More generic autonomy or reconstruction is not a prerequisite for that release.

## Verified starting point

- The user confirmed `xlyfhiafactxahhvikyv` as the intended non-production database.
- October 13 storage audit: 313 retained files, 362,399 live bytes, 95 retired test bytes, zero reservations, approximately 48 MB database storage. These are dated measurements, not a fresh October 14 quota audit.
- Database history snapshot: 34 recorded versions / 163 repository migrations; 129 versions unrecorded. Some older unrecorded changes have related objects present. Missing records do not prove missing schema.
- `realtor_preferences`, `workflow_jobs` and `workflow_schedules` were confirmed absent at the audit.
- Exact-head READY preview: `dpl_9g37idFdfeHe3Grpoa24YiJbzB8u`, `https://sunset-pulse-ayoymzw04-tahsrzs-projects.vercel.app`.
- Vercel project `prj_EkrxJi7uHCqq1HztPygeYTj57gYs`, team `team_nx1IWfVXcJxGdPgQyNvvYcXl`. CLI 64.0.2 is authenticated as `tahsrz`; scoped metadata reads and protected-preview access work. Connector environment metadata still returns 403.
- The preview health endpoint is reachable through `vercel curl` but returns application 503, `Storage health access is not configured.` Its `CRON_SECRET` is missing; runtime database mapping is still unverified.
- Source schedules: hourly dispatch and five-minute processing. Their presence and a READY preview do not establish actual hosted execution.

## Desired behavior

One operator command produces a bounded, private readiness report tied to the exact source SHA, deployment and database ref. It shows configuration, schema/history, storage, owner/client acceptance and scheduler evidence independently. A green storage check cannot hide missing schema or an unverified worker. The command performs reads only.

Existing `/seller-setup` gains a clearer owner-scoped queue health view after the matching schema is installed. It cannot invoke the worker, decrypt environment variables or expose another owner's jobs.

## R0 — Reconcile the release ledger first

Files: `docs/SELLER_BUSINESS_RELEASE_CHECKLIST.md`, root `docs/supabase-storage-activation-2026-10-13.md`, this document.

1. Keep dated evidence and historical candidate SHAs; do not erase earlier failures.
2. Correct the current CLI/access status and identify missing preview `CRON_SECRET` as a different blocker.
3. Link this packet from the seller checklist. Replace the old request to choose a target with verification of the already-confirmed target's actual runtime mapping.
4. Record new evidence with date, source SHA, deployment ID/ref and scope. Never label a passing build or a local mock as a hosted acceptance result.

Exit: no current action asks the user to reconfirm the already-selected project or describes the CLI fallback as unavailable.

## R1 — Build a pure readiness contract

New file: `lib/release/sellerReadiness.mjs`. New tests: `scripts/seller-readiness.test.mjs`.

1. Export `evaluateSellerReadiness(evidence)` as a pure function.
2. Define closed evidence statuses and explicit booleans; absent values are not passing values. Validate object shape before evaluation.
3. Require deployment SHA, repository SHA, selected project ref and observed project ref to match. A preview URL alone is not identity evidence.
4. Keep history reconciliation, schema access and actual owner/client acceptance distinct.
5. Return all blocking gates, not only the first. Return `READY_FOR_NONPRODUCTION_RELEASE_REVIEW` only when every required gate passes. This is a review result, not an automatic deployment permission.
6. Return only allowlisted fields and reason codes. Do not serialize raw provider responses, environment objects, SQL function bodies or private records.

Core evaluator shape (implement validation and bounded report parsing before accepting external evidence):

```js
export function evaluateSellerReadiness(e) {
  const gates = [
    ['deployment_identity', e.deploymentSha === e.repositorySha],
    ['database_identity', e.observedProjectRef === e.expectedProjectRef],
    ['health_authentication', e.previewHealthAuthenticated === true],
    ['history_reconciliation', e.historyReconciled === true],
    ['schema_access', e.schemaStatus === 'READ_ONLY_PROBES_PASSED'],
    ['storage_accounting', e.storageStatus === 'healthy'],
    ['owner_client_flow', e.ownerClientAccepted === true],
    ['scheduler_cadence', e.hostedCadenceAccepted === true],
    ['reviewed_source', e.sourceFingerprintsVerified === true],
  ];
  const blockingGates = gates.filter(([, passed]) => !passed).map(([key]) => key);
  return {
    schemaVersion: 1,
    status: blockingGates.length ? 'BLOCKED' : 'READY_FOR_NONPRODUCTION_RELEASE_REVIEW',
    blockingGates,
  };
}
```

Validation must require nonempty 40-hex SHAs and 20-character project refs before this function's identity comparisons; otherwise two missing values could appear equal. Model email as a separate `disabled` / `configuration_required` / `review_required` state. Keeping sending disabled must not prevent a read-only/non-sending seller pilot; it must prevent claiming email readiness.

Tests: missing/malformed evidence fails; matching undefined identities never pass; healthy storage with missing schema remains blocked; stale SHA/ref fails; incomplete owner/cadence evidence fails; every independently verified gate passes only the non-production review result; raw secret/provider fields are rejected or omitted.

## R2 — Compose existing checks into one read-only command

New file: `scripts/seller-readiness.mjs`. Modify `package.json` to add:

```json
{
  "seller-business:readiness": "node scripts/seller-readiness.mjs",
  "test:seller-business:readiness": "node --test scripts/seller-readiness.test.mjs"
}
```

Reuse these existing exports; do not duplicate their network/validation logic:

```js
import { inspectSellerMigrationHistory, inspectSellerReleaseSources }
  from './seller-release-preflight.mjs';
import { inspectSellerRuntime } from './seller-runtime-preflight.mjs';
import { inspectProjectStorage } from '../lib/storage/projectStorageMaintenance.mjs';
import { evaluateSellerReadiness } from '../lib/release/sellerReadiness.mjs';
```

Implementation order:

1. Parse only `--expected-project-ref`, `--env-file`, `--applied-migrations`, `--deployment-evidence`, and `--acceptance-evidence`. Require all target/evidence inputs before requests. `--help` reads no credentials.
2. Resolve input paths; limit evidence JSON size, reject unknown fields and invalid dates. An explicit env file is isolated from ambient credentials using the existing runtime preflight behavior.
3. Read the current manifest and complete migration inventory with `inspectSellerReleaseSources`.
4. Diagnose the exported history with `inspectSellerMigrationHistory`. Label the report as an export unless its privately recorded target/hash/timestamp provenance is reviewed; the JSON array cannot prove its source.
5. Run `inspectSellerRuntime` against the explicitly selected environment. Keep its bounded empty-table probes and fail-closed credential rules.
6. Instantiate a service-role Supabase client only inside the operator process, disable persisted auth, and call `inspectProjectStorage`. Print its aggregate report only.
7. Evaluate the separately captured exact-deployment health and human acceptance evidence. Reject future or stale evidence and mismatched source identities. Evidence files are review inputs, not trusted authorization to execute anything.
8. Print one allowlisted JSON report. Exit 0 for `READY_FOR_NONPRODUCTION_RELEASE_REVIEW`, 2 for known blockers and 1 for malformed inputs/tool failure.
9. Make no calls to cron, worker, enqueue/claim RPCs, provider sends, SQL migrations, billing or history repair. Do not shell out with caller-supplied commands.

Integration tests use a local HTTP fixture to prove target mismatch sends zero requests, schema checks read no rows, timeout/oversized responses fail, optional evidence does not fabricate cadence, and output never contains fixture credentials.

## R3 — Restore private preview health configuration

Operational files: ignored `.pulse-local/release/<date>-<project-ref>/` evidence and private credential file. Existing source: `app/api/admin/storage/health/route.ts`. No new application route or cron needed.

1. Verify the linked project/team using CLI `project inspect` before environment changes.
2. Inspect generic preview metadata separately from branch-specific overrides. The branch-only list returning no variables does not mean inherited preview variables are missing.
3. Prepare a branch-specific private `CRON_SECRET` for `codex/seller-acquisition-2026q4`. Pass its value through a private input stream; never use a literal command-line token or print the value. Check installed `env add --help` for branch, sensitive-value and stdin behavior before mutation.
4. Apply only the reviewed preview configuration, then redeploy that same reviewed source to preview. An environment change does not update an existing deployment. Confirm the new deployment's SHA/team/project/environment before inspection.
5. Use authenticated `vercel curl` against the exact deployment and pass the app bearer header from private process input. Keep protection enabled and avoid forwarding the app secret across redirects to unrelated origins.
6. Require HTTP 200, `ok: true`, `target.projectRef === expectedProjectRef` and `storage.status === 'healthy'`. Save only aggregate evidence. The existing route checks target agreement before database inspection.

Known working reachability command from `apps/pulse` (no app credential, so currently returns 503):

```powershell
npx --yes vercel@64.0.2 --scope team_nx1IWfVXcJxGdPgQyNvvYcXl curl 'https://sunset-pulse-ayoymzw04-tahsrzs-projects.vercel.app/api/admin/storage/health?expectedProjectRef=xlyfhiafactxahhvikyv' -- --silent --show-error --max-time 20
```

Exit: actual authenticated preview-to-database mapping verified. Do not infer broader seller readiness from this storage-only endpoint. Connector OAuth repair is an independent account action; do not loosen ChatGPT approvals or deployment protection to address its 403.

## R4 — Reconcile actual schema before migration actions

New read-only query file: `supabase/queries/seller-release-schema-audit.sql`. New comparator: `scripts/seller-schema-audit.mjs`. Fixture tests: `scripts/seller-schema-audit.test.mjs`.

1. Query catalog metadata for affected public objects, never customer rows: columns/types/defaults, constraints, indexes, triggers, RLS/policies, grants and exact function signatures/definitions. Export migration history separately.
2. Use the eight historical gaps and the full 129-unrecorded inventory from the dated audit as starting points; refresh rather than hardcode those counts.
3. Query table existence first; metadata collection must succeed when a required table is absent.

Initial existence query:

```sql
BEGIN READ ONLY;
SELECT name, to_regclass(format('public.%I', name)) IS NOT NULL AS present
FROM unnest(ARRAY[
  'realtor_preferences', 'workflow_jobs', 'workflow_schedules',
  'workflow_event_contracts', 'seller_cases', 'seller_case_messages'
]) AS required(name)
ORDER BY name;
ROLLBACK;
```

4. Compare full schema effects with a fresh disposable replay of the repository. Match SQL signatures, privileges, policies and data-change obligations, not table names alone.
5. Classify each version as `recorded`, `absent`, `equivalence_review_required`, or `conflict`. `equivalent` requires reviewed evidence; do not infer it with regex parsing of SQL files.
6. Produce an ordered proposed action packet with original-source hashes, prerequisites, backup references and expected effects. History repair and SQL execution stay separate explicit operations.
7. Preserve the installed storage ledger and its held charges. Test the chosen reconciliation sequence on an isolated schema snapshot/replay before any hosted application change.

Exit: a reviewed, target-specific migration sequence. Neither the new comparator nor the readiness command executes or marks a migration applied.

## R5 — Improve owner-scoped queue health using existing records

New forward migration `<new_timestamp>_seller_queue_health.sql`; modify `lib/realtor-workspace/sellerServiceContract.ts`, `sellerService.server.ts`, `app/api/realtor/seller-service/overview/route.ts`, and the existing setup component after locating its actual caller. Preserve `seller_service_health(UUID)` fields and access checks.

1. Add an owner-scoped health projection for only `seller_email`, `realtor_reminder` and `realtor_planner` jobs.
2. Return due-queued count, earliest due queued time, expired-running-lease count and failed count. Use database `now()` for comparisons, not browser time.
3. Never include payloads, email recipients, message text, provider errors or another owner's jobs.
4. Validate nullable ISO times and nonnegative bounded counts before rendering. Failed reads show `Unavailable`, never zero work.
5. Keep the existing signed-in `realtorApi` boundary and server-only RPC grants. No browser service-role access; no direct queue mutation.

Aggregate query shape inside the reviewed projection:

```sql
SELECT
  count(*) FILTER (WHERE status = 'queued' AND scheduled_for <= now()) AS due_jobs,
  min(scheduled_for) FILTER (WHERE status = 'queued' AND scheduled_for <= now()) AS oldest_due_at,
  count(*) FILTER (WHERE status = 'running' AND lease_until <= now()) AS expired_leases,
  count(*) FILTER (WHERE status = 'failed') AS failed_jobs
FROM public.workflow_jobs
WHERE user_id = p_actor_id
  AND workflow_key IN ('seller_email', 'realtor_reminder', 'realtor_planner');
```

Use existing indexes after examining the actual deployed schema/query plan; add an index only if the measured owner-scoped query requires it. Do not create a parallel job table, cron, or append-only polling history.

Tests: foreign-owner isolation, no copied private fields, future queued jobs excluded from due count, expired lease boundary, missing table/RPC unavailable, UI empty versus unavailable and draft-preserving refresh.

## R6 — Prove scheduler execution and the seller flow

Reuse `vercel.json`, `durableScheduler.server.ts`, existing cron/worker routes, and `scripts/platform-disposable-auth-acceptance.mjs --suite seller-service`.

1. Keep hourly dispatch and five-minute worker processing. Do not add a second scheduler or use the worker as a health probe.
2. Run the disposable real-auth seller suite against the complete reviewed migration sequence. Exercise owner/foreign-owner/client isolation, booking cancellation/rescheduling, exact planner time, lost-response replay and sharing revocation.
3. Use only synthetic email-provider fixtures; leave real sends disabled until the separate sender/webhook review is complete.
4. After hosted schema and scope gates pass, inspect actual cron logs and existing due job/result evidence over multiple scheduled intervals. A manually invoked worker is manual evidence; do not label it scheduled cadence.
5. Confirm the deployment environment actually schedules these routes. A preview build and source cron definitions are insufficient; use a verified cron-capable non-production arrangement or leave hosted cadence blocked. Do not promote to production merely to obtain a cron tick.
6. Verify storage inspection is healthy, optional generation pauses at existing thresholds, and unrelated approved jobs are not silently disabled. Do not lower the budget or reset retired charges to manufacture a pass.
7. Save only bounded aggregate evidence locally. Reuse provider/log retention; do not persist a new database history row for every polling check.

Exit: separately dated owner/client, schema, storage and actual scheduler evidence, tied to the accepted deployment and target.

## R7 — Final release review and acquisition pilot

1. Run the new readiness command with reviewed evidence. List outstanding gates explicitly.
2. Update the release checklist/PR with the exact deployment, migrations, private backup references and feature usage directions.
3. Keep production promotion and external sending as separately prepared release actions; do not infer them from this plan or a readiness report.
4. Once the chosen release is accepted, use the existing seller inbox, Today, cases and planner in the two-week acquisition pilot. Record actual requests, replies, consultations, work time and friction; do not invent results or causal attribution.

## Build order and verification

| Order | Review unit | Verification |
| --- | --- | --- |
| First | R0 + R1: current ledger and pure evidence contract | Offline contract tests; dated source links; no credentials or network |
| Second | R2: composed read-only command | Fixture HTTP/CLI acceptance, strict target binding, redaction, exit codes |
| Third | R3 + R4: preview configuration and schema action packet | Exact preview/ref evidence, metadata comparison and disposable replay |
| Fourth | R5: existing owner health projection/UI | SQL isolation/boundaries, route validation, responsive/browser recovery |
| Fifth | R6 + R7: hosted execution evidence and release review | Real-auth flow, actual invocation logs, readiness report and rollback packet |

Run narrow tests after each unit; broaden only when runtime changes justify it. For R5 and later application changes, run whole-app TypeScript, changed-source lint, the seller-service disposable acceptance and relevant CI jobs. Tests of this documentation alone are unnecessary.

This plan's completion criteria are observable acceptance results, not a percentage of files written. Next operator implementation action: R1's validated pure readiness evaluator and its meaningful blocker/identity tests. The product-facing next slice is H2 in the humanized experience plan; keep the two scopes distinct.
