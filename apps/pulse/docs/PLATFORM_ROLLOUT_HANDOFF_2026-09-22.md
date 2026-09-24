# Platform rollout handoff — refreshed September 24, 2026

This checklist covers the workspace-scoped planning, pinned app launch, shared inbox and run-detail slice from PR #79. It is a preparation record, not a production deployment approval.

## Migration preparation (not authorization to apply)

The dated September 22 list below is historical and incomplete. Do not manually copy that subset into a deployment. Use the repository's pinned Supabase CLI and the complete checked-in migration directory as the source of truth; the CLI must apply every pending migration in timestamp order, including the existing scheduler/property/sprint prerequisites preceding the platform migrations. Never edit or reorder an applied migration.

Current platform/control-layer migration tail (all remain subject to fresh review against the target's migration ledger):

1. `20260916020000_event_workflow_jobs.sql`
2. `20260916030000_scheduler_live_lease_and_event_replay.sql`
3. `20260916040000_scheduler_deferred_outcomes.sql`
4. `20260917010000_platform_workspaces.sql`
5. `20260917020000_platform_scope_links.sql`
6. `20260917030000_platform_property_scope_mutations.sql`
7. `20260917040000_platform_sprint_scope.sql`
8. `20260918010000_platform_sprint_schedule_backlog_scope.sql`
9. `20260918020000_platform_json_runs_checkpoints.sql`
10. `20260918030000_platform_scope_fencing.sql`
11. `20260918035000_platform_owner_planning_guard.sql`
12. `20260918040000_platform_run_recovery.sql`
13. `20260918050000_platform_app_installs.sql`
14. `20260918060000_platform_owner_mutation_guard.sql`
15. `20260918070000_platform_scoped_sprint_persistence.sql`
16. `20260918080000_platform_scoped_property_persistence.sql`
17. `20260918090000_platform_app_launch_admission.sql`
18. `20260918090100_platform_scoped_sprint_replay_fix.sql`
19. `20260918090200_platform_scoped_property_replay_fix.sql`
20. `20260922100000_platform_condition_nodes.sql`
21. `20260922110000_platform_capability_receipts.sql`
22. `20260922120000_platform_capability_admission.sql`
23. `20260922130000_platform_connector_snapshots.sql`
24. `20260922140000_platform_effect_receipt_transitions.sql`
25. `20260923100000_platform_connector_response_provenance.sql`
26. `20260923110000_platform_connector_health.sql`
27. `20260923120000_platform_connector_health_scheduler.sql`
28. `20260923130000_platform_connector_health_summary.sql`
29. `20260923140000_platform_connector_health_history_receipts.sql`
30. `20260923150000_platform_connector_health_schedule_audit.sql`
31. `20260923160000_platform_quota_budget_settlement.sql`
32. `20260923170000_platform_quota_overrun_fences.sql`
33. `20260923180000_platform_provider_adapter_reviews.sql`
34. `20260923190000_platform_provider_quotas.sql`
35. `20260924100000_platform_quota_reconciliation_event.sql`
36. `20260924110000_platform_provider_exception_read_model.sql`
37. `20260924120000_platform_exception_recovery_evidence.sql`
38. `20260924130000_platform_unknown_effect_inbox.sql`
39. `20260924140000_platform_workspace_invitations.sql`
40. `20260924150000_platform_retry_intent_idempotency_race.sql`
41. `20260924160000_platform_user_layouts.sql`
42. `20260924170000_platform_workspace_member_email_cast.sql`

These are only the platform/control-layer portion. The repository contains earlier scheduler, sprint and property migrations that must also be applied by the standard migration runner when pending; do not treat this list as permission to skip them or to hand-apply SQL.

Before a separately approved deployment, record the exact reviewed commit and target project; inspect local/remote migration status; review every pending SQL migration and its prerequisite; run the repository's migration dry-run; and have an operator confirm that no production target was selected accidentally. After application, compare the migration ledger with the expected head and run the scoped smoke checks below. If the installed CLI cannot provide a trustworthy dry-run or the target/ledger is ambiguous, stop without applying migrations. Migration `20260924170000_platform_workspace_member_email_cast.sql` has only been applied to the local Supabase stack as of this handoff; this document does not claim it is applied elsewhere.

## Preparation and worker boundary

- This is a preparation checklist only. No production or shared-environment migration, deployment, admission change, provider setup, or participant invitation is authorized by this document.
- Before any future non-production participant rehearsal, record environment/project identity, operator, reviewed commit, current migration head, `platform_run` admission state, provider/effect flags, and the intended workspace ID. A workspace ID must come from the signed-in owner in the selected non-production environment, not generated acceptance fixtures.
- Deploy the application and worker artifact from the same reviewed commit.
- Keep `workflow_event_contracts.platform_run.enabled = false` while migrations and smoke checks run. Restore its recorded prior state only after the separately approved rehearsal; production stays disabled absent a distinct launch decision.
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

- First response: disable `workflow_event_contracts.platform_run`, stop new app launches and pause only the specifically affected worker/event contract. Record the operator, timestamp, affected run/job/operation IDs and observed impact without copying sensitive payloads.
- Preserve `platform_runs`, checkpoints, audit entries, install snapshots and scheduler outcomes for investigation.
- Continue read-only run/inbox access only if the deployed code can safely read the additive schema. Otherwise roll back the application/worker artifacts to a compatible reviewed version while leaving additive data and migrations intact.
- Do not drop tables, delete evidence, rewrite pinned snapshots or reset the database as a rollback technique.
- Do not re-enable admission as part of rollback. Re-enabling requires a separate operator decision after the failing migration/runtime/authorization condition is corrected, evidence is reviewed and the relevant smoke checks pass again.

## Current local evidence and next gate

- The local authenticated acceptance passed on September 24 with mock auth disabled, including owner-created member/reviewer invitations, explicit acceptance, wrong-account denial, member revocation and subsequent revoked-member denial. Temporary generated users/workspace were removed and local `platform_run` admission was restored to `false`.
- Local post-acceptance read-only state: migration head `20260924170000`, `platform_run` admission disabled, zero active team workspaces. Reviewed app manifests have empty capabilities.
- The focused workspace/pilot UI/API/unit suite passed 26/26; the production build passed; `git diff --check` passed. The build emitted the existing non-fatal `/api/kepler/listings` dynamic-usage diagnostic.
- These checks are local technical evidence only. No intended real-participant workspace, real participant acceptance, production migration, deployment, provider execution or external effect has been exercised or authorized.
- Next: an operator selects and verifies a dedicated non-production environment and intended team workspace, names the session operator, and obtains the separate approval required by the pilot runbook. Then run the read-only preflight against that exact workspace before scheduling any rehearsal. Until those inputs exist, do not create a guessed workspace, issue real invitations, enable admission, or claim the pilot is ready.

## Historical September 22 evidence (superseded by current evidence above)

- Local disposable Postgres concurrency acceptance passed for scoped persistence and app launch races.
- Local real Supabase browser acceptance passed with mock auth disabled: login, start, checkpoint answer, completion, cancel, cursor paging, foreign-user denial and JWT RLS denial.
- Focused unit suites passed: 15 files, 97 tests.
- Production build passed on the current local head.
- Production migration, deployment promotion, provider execution and live admission are intentionally not performed here.
- `resolveVibeRevisionScope` remains the blocker for authorized content-bound launch.
