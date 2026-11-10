# Vibe CMS Access Repair

This follow-up is based on PR #102 at `2d56ac54`. Keep its role migration and callback repair as an explicit dependency; introduce no new migration. The current shared-production role audit remains blocked until that earlier repair ships. This delivery prepares and verifies source locally, without changing hosted environment settings or content.

## Observed Defects

`getVibeCmsAccess` manufactures an operator when `VIBE_CMS_PUBLIC_WRITE_WIP` is absent or differs from the exact string `false`. All Vibe mutation handlers use this helper through route authorization. Separately, the collection and taxonomy GET handlers query drafts and editorial usage without that guard. Public realtor registration also passes the generic operator helper, which is broader than global CMS authority. The E2E operator shortcut lacks the production exclusion used by ordinary local access.

## Code Implementation

| File | Change |
| --- | --- |
| `apps/pulse/lib/core/operator_access.ts` | Restrict WIP identity to explicit true on development loopback. Require global admin/operator authority or an existing configured operator-email match for hosted CMS access; retain ordinary local development and existing unrelated realtor policies. Disable the E2E host shortcut in production. |
| `apps/pulse/app/api/vibes/route.ts` | Authorize collection reads before database access. Existing POST uses the repaired shared guard. |
| `apps/pulse/app/api/vibes/taxonomy/route.ts` | Authorize editorial taxonomy counts before database access. |
| `apps/pulse/lib/core/routeAuth.ts`, `apps/pulse/app/api/jamie/vibes/route.ts` | Apply the same CMS authority to the legacy dictionary reader/upsert, which uses the same Vibe collection. Require access before reads and validate writes before connecting. This closes a legacy route around the newer CMS boundary. |
| `apps/pulse/tests/unit/operator-access.test.ts` | Replace public-WIP expectations with production denial, explicit local opt-in, role/email authority and spoofed host/forwarded-host cases. Restore test environment/session state. |
| `apps/pulse/tests/unit/vibe-cms-route-access.test.ts` | Exercise actual guarded handlers with mocked data dependencies: anonymous/realtor denial before reads/writes, authorized collection/taxonomy reads and mutation validation. |
| Existing disposable security runner | Add an opt-in CMS production verification mode. Use generated real accounts and deliberate WIP/E2E true values to prove production ignores them. Anonymous, forged-admin signup and public realtor cannot read CMS data or reach mutation validation; trusted operator/admin can reach validation without a content write. |

## Verification and Release

Run focused auth/route tests, lint and syntax checks. Rebuild in production mode against generated local Supabase; use the existing browser/password/callback walkthrough and add the CMS matrix. The invalid mutation probe must stop at validation, before MongoDB or publication. Verify generated resource cleanup. No email, hosted content mutation, cron or provider activation is needed. Record exact commands and results, then open a focused draft PR stacked on #102. After #102 lands, rebase this repair onto main; deployment and migration remain separate reviewed release actions.

## Implemented Results

The code changes and final production-mode matrix are implemented. Eighty-seven relevant unit cases, thirty-five offline audit/runner checks and eighteen role SQL assertions pass. The optimized build passes on main's locked dependencies in 163 seconds. The final real-auth matrix covers nine CMS probes for each denied actor and five invalid mutation probes for each trusted operator/admin, including the legacy dictionary. It performs no CMS content write; the loopback Host cannot bypass production operator access. Follow-up cleanup verification confirms the final project's containers, volumes and server listener are absent. See [release evidence and directions](./releases/vibe-cms-access-guard-2026-11-03.md).
