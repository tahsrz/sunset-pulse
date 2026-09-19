# Platform verification and PR handoff — September 18, 2026

Implementation baseline: `12716f1589e315f15f2585fbdc1f6a770a19c728` on [PR #79](https://github.com/tahsrz/sunset-pulse/pull/79), branch `codex/cms-vertical-slice-followup`, base `main`. This is dated evidence, not a permanent green-build claim. The [active plan](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md) owns architecture and current status; the [September 21–25 handoff](PLATFORM_WEEK_2026-09-21.md) owns the next execution queue.

## Implemented scope

- Versioned JSON run/checkpoint backend with request/submission replay, active membership/role checks, live-lease fencing, atomic queue/result receipts and audit. Human waits do not retain worker leases.
- Workspace/collection-bound keyset cursors; revision-checked blocked recovery retaining the original requester; whole-run supersession preserving prior answer attribution and cancelling old pending checkpoints.
- Explicit scope mappings win over personal-owner fallback. Mapped-resource transfers and archived mutations are rejected. Legacy owner-only planners reject team/mixed/unresolved input before selection and persistence; **team planning itself is not implemented**.
- Strict inert JSON app manifests, pinned revision-checked install store/API and two tool-free intake fixtures. Same-version content replacement and downgrades conflict. Inputs naming properties/revisions are **not yet resource-bound launch authority**.
- Browser-discovered fixes: remove automation-only Vibe markup/theme behavior that caused hydration mismatch; check same-origin writes against the actual Host while rejecting forwarded-host spoofing. Both have regression coverage.

## Local evidence carried forward from implementation

| Check | Recorded result | Scope / limit |
| --- | --- | --- |
| Focused affected unit suites | **79/79 tests, 13 suites passed** | Platform/owner scope, manifests, cursor contracts, scheduler compatibility and hydration; not the whole repository |
| `npm run test:db:concurrency` | Passed all scheduler/platform groups | Disposable Postgres; real overlapping transactions, fixture JWT claims rather than real Auth |
| `npm run test:platform:auth -- --stack <local-stack-id>` | Exit 0 | Real local Supabase password/cookie sessions and real-JWT RLS; no mocked auth, no production writes |
| Initial Core production build | Exit 0 | Earlier implementation state; Kepler dynamic-server diagnostic was nonfatal |
| Cleanup rebuild, `npm run pulse:build` | Exit 0 | Compiled, type-checked and generated 256/256 pages; nonfatal Kepler and sandbox-blocked external-fetch diagnostics |

The focused command, from `apps/pulse`, was:

```sh
npm run test:unit -- tests/unit/vibe-provider-hydration.test.tsx tests/unit/platform-run-contracts.test.ts tests/unit/platform-run-routes.test.ts tests/unit/platform-run-handler.test.ts tests/unit/platform-manifest.test.ts tests/unit/platform-pagination.test.ts tests/unit/platform-planning-scope.test.ts tests/unit/domain-scope.test.ts tests/unit/workspace-access.test.ts tests/unit/property-shortlist-workspace.test.ts tests/unit/sprint-workspace.test.ts tests/unit/scheduler-registry.test.ts tests/unit/scheduler-deferred-outcomes.test.ts
```

Database assertions include duplicate starts, typed/competing answers, gate-specific roles, exact replay, revoked requesters, cancellation, stale leases, atomic resume rollback, concurrent recovery/supersession/install changes, authenticated-role isolation, archived mutations and mapping-transfer rollback. Admission-key serialization prevents supersession from adopting an unrelated concurrently started run. Existing resolved checkpoint evidence remains unchanged.

Real-session acceptance rendered the login form, created a workspace, started/answered/completed one run, cancelled another, read cursor pages and denied a second user through both API and JWT/RLS. Its browser interactions with workflow APIs do **not** constitute acceptance of a generic inbox UI; that UI does not yet exist. The harness leases only its own test jobs; scheduler claim contention is tested separately.

Temporary accounts/workspaces were removed, the owned test server stopped, and the previous `platform_run.enabled=false` restored. Reviewed missing migrations applied to the existing local stack were retained; no database reset occurred. Screenshots remain ignored under `apps/pulse/.pulse-local/platform-auth-acceptance/`, not in the PR. These checks did not send messages or invoke paid providers.

## Remote checks at the implementation head

Read September 18 from GitHub at `12716f15`; [CI run 35406527655](https://github.com/tahsrz/sunset-pulse/actions/runs/35406527655):

| Check | Result |
| --- | --- |
| lint | Success |
| test (includes unit tests and commercial inventory truth) | Success |
| scheduler-db | Success |
| docker-acceptance | Success |
| jamie-e2e | Success |
| Vercel | Success |
| Vercel Preview Comments | Success |
| Supabase Preview | **Skipped**, not a database acceptance pass |

No inline review threads were returned by GitHub at this inspection. This is not an assertion of human approval or exhaustive code review. CI uses Node 20; `.node-version` selects 22; the cleanup host reports Node 23.3.0 / npm 10.9.0. Vercel status success is not proof of production migration, domain access, provider behavior or every browser route.

## Migration and operational boundary

Foundation migrations begin with `20260917010000_platform_workspaces.sql` and scope adapters through `20260918010000_platform_sprint_schedule_backlog_scope.sql`. Apply dependencies in filename order in an explicitly chosen environment. The latest core slice adds:

| Migration | Purpose |
| --- | --- |
| `20260918020000_platform_json_runs_checkpoints.sql` | JSON runs, unified checkpoints, atomic transitions and disabled event registration |
| `20260918030000_platform_scope_fencing.sql` | Workspace/member fencing and mapped-resource transfer protection |
| `20260918035000_platform_owner_planning_guard.sql` | Fail-closed legacy planner admission/persistence |
| `20260918040000_platform_run_recovery.sql` | Recovery, supersession and request-key serialization |
| `20260918050000_platform_app_installs.sql` | Inert manifest validation, pinned installs and audit |

Do not apply these individually to an unprepared database or enable a worker merely because its schema exists. The full branch also includes earlier scheduler/email/property/scan migrations. Disposable scheduler tests supply minimal legacy prerequisites; `scheduler-db` separately checks the Supabase migration chain. Neither authorizes production application. Existing email/CMS/Stripe receipts remain authoritative; a checkpoint is not a provider receipt.

## Cleanup verification

Documentation-only cleanup preserves implementation commit `12716f15` and the PR base/history. A fresh `npm run pulse:build` completed with exit 0 (compile, types, 256/256 generated pages and build traces). The known Kepler dynamic-server warning and network-sandbox `EACCES` fetch diagnostics did not fail the build; external live data was not verified. Build still skips lint; the earlier remote lint result is recorded separately above.

The first navigation-test attempt was blocked before test execution by sandbox filesystem access in esbuild. A permitted retry is used to distinguish that environment failure from application test results. Final navigation/README and link-check results are recorded before committing this handoff.

## Remaining gates

1. Team-scoped planner selectors/persistence and legacy manual mutation compatibility; current guards are safety stops, not team support.
2. Property/assignment-bound app launch; `resolveVibeRevisionScope` remains unsupported until authoritative revision/site access is implemented.
3. Shared schema forms, checkpoint inbox and run detail; fresh rendered browser acceptance after those screens exist.
4. Complete all-domain/Storage access and deployment-specific checks where relevant. Earlier scan evidence is separate from platform Auth evidence.
5. Policy, effect identity/receipts and transactional cost controls before capability/provider execution. Empty capabilities and disabled admissions are deliberate limits.
6. Review migration/worker rollout, fresh PR-head CI and explicit promotion authority before production operations. Historical passing tests are not release approval.
