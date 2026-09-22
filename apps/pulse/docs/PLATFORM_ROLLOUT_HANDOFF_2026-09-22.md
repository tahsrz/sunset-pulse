# Platform rollout handoff — September 22, 2026

This checklist covers the workspace-scoped planning, pinned app launch, shared inbox and run-detail slice from PR #79. It is a preparation record, not a production deployment approval.

## Migration order

Apply migrations in timestamp order using the repository's normal Supabase migration process:

1. `20260916030000_scheduler_live_lease_and_event_replay.sql`
2. `20260916040000_scheduler_deferred_outcomes.sql`
3. `20260917010000_platform_workspaces.sql`
4. `20260917020000_platform_scope_links.sql`
5. `20260917030000_platform_property_scope_mutations.sql`
6. `20260917040000_platform_sprint_scope.sql`
7. `20260918010000_platform_sprint_schedule_backlog_scope.sql`
8. `20260918020000_platform_json_runs_checkpoints.sql`
9. `20260918030000_platform_scope_fencing.sql`
10. `20260918035000_platform_owner_planning_guard.sql`
11. `20260918040000_platform_run_recovery.sql`
12. `20260918050000_platform_app_installs.sql`
13. `20260918060000_platform_owner_mutation_guard.sql`
14. `20260918070000_platform_scoped_sprint_persistence.sql`
15. `20260918080000_platform_scoped_property_persistence.sql`
16. `20260918090000_platform_app_launch_admission.sql`
17. `20260918090100_platform_scoped_sprint_replay_fix.sql`
18. `20260918090200_platform_scoped_property_replay_fix.sql`

Do not edit or reorder an applied migration. Confirm the migration ledger before and after application.

## Preparation and worker boundary

- Deploy the application and worker artifact from the same reviewed commit.
- Keep `workflow_event_contracts.platform_run.enabled = false` while migrations and smoke checks run.
- Keep provider execution disabled. This slice does not authorize MCP/OpenAPI tools, paid model calls, email, publication or other effects.
- Run the worker only with the existing scheduler lease/replay behavior. Do not drain unrelated jobs or claim jobs outside the test fixture.
- Do not run a broad backfill or silently transfer legacy owner-scoped records into a workspace.

## Smoke checks

1. Unauthenticated workspace API returns `401`.
2. An authorized user can create/select a workspace, view the inbox, launch an installed manifest and see a pinned run.
3. The rendered flow can open a checkpoint, preserve its revision/submission key, answer it and reach completion.
4. Cancelled runs remain cancelled and do not execute provider effects.
5. Cursor pagination returns bounded, non-overlapping run pages.
6. A foreign user receives denial and direct JWT RLS reads return no foreign rows.
7. Install revision/resource revision conflicts deny new launches without mutating an existing run.
8. Content-bound launch displays unavailable until the Vibe revision authorization adapter is proven.

## Rollback and data preservation

- First response: disable `workflow_event_contracts.platform_run` and stop admitting new app launches.
- Preserve `platform_runs`, checkpoints, audit entries, install snapshots and scheduler outcomes for investigation.
- Continue read-only run/inbox access only if the deployed code can safely read the existing schema; otherwise roll back the application artifact to the matching reviewed version.
- Do not drop tables, delete evidence, rewrite pinned snapshots or reset the database as a rollback technique.
- Re-enable admission only after the failing migration/runtime/authorization condition is corrected and the smoke checks pass again.

## Current evidence and unresolved gates

- Local disposable Postgres concurrency acceptance passed for scoped persistence and app launch races.
- Local real Supabase browser acceptance passed with mock auth disabled: login, start, checkpoint answer, completion, cancel, cursor paging, foreign-user denial and JWT RLS denial.
- Focused unit suites passed: 15 files, 97 tests.
- Production build passed on the current local head.
- Production migration, deployment promotion, provider execution and live admission are intentionally not performed here.
- `resolveVibeRevisionScope` remains the blocker for authorized content-bound launch.
