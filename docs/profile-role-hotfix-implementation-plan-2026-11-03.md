# Standalone Profile Role Security Hotfix

The existing release plan identifies signup/callback role assignment as the next blocker. This delivery isolates that repair from the feature stack so it can be reviewed against current `main`, `31c9571e`. Production and previews share a database; this plan prepares source and disposable local evidence. Production rollout remains a separate release action.

## Code Implementation

| File | Specific change | Verification |
| --- | --- | --- |
| `apps/pulse/supabase/migrations/20261103150000_profile_role_assignment_guard.sql` | Limit signup roles to consumer/realtor, preserve existing assignments and reject direct authenticated role changes through an invoker trigger. Add no table grants. | Existing 18-assertion pgTAP packet on main's migrations plus this migration |
| `apps/pulse/app/auth/callback/route.js` | Read the authoritative profile before sync; omit existing role/entitlement fields; bound missing-profile roles and ignore conflicting inserts. Remove callback credential logging. | Callback unit tests and two actual service-client profile writes |
| `apps/pulse/lib/core/auth_redirect.ts` | Accept a valid explicit auth callback origin and otherwise retain the request origin. | Existing redirect cases plus configured-origin rejection/preservation cases |
| `apps/pulse/tests/unit/auth-callback-profile-authority.test.ts` | Preserve consumer/realtor/operator/admin roles, reject privileged metadata authority, skip writes after read errors and protect callback credentials/origins. | Fourteen focused callback cases |
| `apps/pulse/scripts/platform-disposable-auth-acceptance.mjs` | Add a dedicated `profile-role-security` suite and production mode using the current generated local Supabase lifecycle. Normalize copied TOML line endings before changing local ports. | Existing project cleanup and exact local target checks |
| `apps/pulse/scripts/profile-role-security-acceptance.mjs` | Validate copied migrations and locked Next/Zod versions; run role SQL assertions; build/start production or development with a sanitized environment. Sign into actual accounts through the active form. Exercise real magic-link callbacks with generated tokens held only in memory. | Forged-admin signup remains consumer; approved operator/admin fixtures retain access to an existing protected read endpoint; anonymous/consumer access is denied |
| `apps/pulse/package.json` | Add one named command for the standalone acceptance suite. | Run it from the main-based hotfix branch |

The protected browser probe uses `/api/admin/mls/status`, whose GET reads the existing in-memory status without starting a sync. It deliberately does not depend on the publication-readiness endpoint introduced by the feature stack. Existing public realtor registration behavior is preserved.

## Execution Order

1. Refresh main, compare the two runtime files with the original repair parent, and cherry-pick only repair commit `68aacdcf`. They match; the isolated repair is `da139db7`.
2. Align this worktree's installed dependencies with main's lockfile. The previous feature checkout has newer Zod/Next packages, which cannot establish baseline build compatibility. Preserve the unrelated dirty primary checkout.
3. Add the dedicated local acceptance runner. Use generated projects only, disable mock/operator shortcuts, preserve the reserved `admin.localhost` browser hostname and prefill welcome-email state only on fixtures. No provider message is sent.
4. Run callback/redirect tests, the SQL packet, real password/cookie and callback acceptance, focused lint and TypeScript. Verify main's 163 migration baseline plus the role guard, without the two pending consultation migrations.
5. Attempt an optimized build using placeholder providers and loopback backends only. Record any baseline blocker precisely; do not add unrelated product changes to make the result appear green.
6. Open a focused draft PR to main with the exact source snapshot, results, migration effect and rollout directions. Keep the feature-stack PRs available and identify the duplicated repair dependency there.

## Completion and Release Limits

The reviewable result is a small main-based security PR with local evidence independent of consultation/publication features. Existing account roles remain intact. The current aggregate hosted audit found seven consumer profiles and no operator/admin profiles, while deployed email-based operator overrides remain unverified because Vercel denies environment reads.

The role migration and matching callback deployment must be released together through a reviewed shared-production procedure. No hosted migration, account promotion/demotion, calendar activation or production deployment is included in implementation of this plan.

## Implemented Results

The plan is implemented. Main-locked Next 15.5.27 and Zod 3.25.76 passed the optimized build and framework type validation, with 212 static pages generated. Sixteen callback/redirect unit cases and eighteen database assertions pass. The production-mode browser walkthrough verifies three successful callback profile writes, role preservation and protected access on 164 migrations, with consultation tables absent. A shared-project CLI dry run identifies only the role-guard migration. See [standalone hotfix release evidence](./releases/standalone-profile-role-hotfix-2026-11-03.md) for the exact scope, commands and rollout limits.
