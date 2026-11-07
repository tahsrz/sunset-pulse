# Vibe CMS Access Repair

Branch: `codex/vibe-cms-access-guard`, based on PR #102 at `2d56ac545c0e84c8b82ba4c57f1fa68fa829234a`. [Code implementation plan](../vibe-cms-access-implementation-plan-2026-11-03.md).

## Problem and Result

Previously an unset WIP variable created a synthetic operator for Vibe CMS requests. An explicit true did the same in production. The collection/taxonomy readers could also query editorial records without authorization. A public realtor registration passed the generic helper. The legacy Jamie dictionary accessed the same collection through a public reader and a broader writer.

The repaired CMS requires a trusted admin/operator role or the existing configured operator-email match. Public consumer/realtor registration alone grants no global editorial authority. Collection, taxonomy and legacy dictionary reads authorize before connecting to MongoDB. Existing Vibe mutations use the same repaired guard; the legacy upsert now shares that boundary and validates before database access. Its invalid input returns 400 instead of a database-dependent 500.

Production ignores both `VIBE_CMS_PUBLIC_WRITE_WIP` and `E2E_OPERATOR_ACCESS`, regardless of Host. The WIP identity requires explicit true, development mode and loopback. Normal local development remains available through the existing local operator policy. Existing generic realtor access outside CMS is preserved. The existing `OPERATOR_EMAIL` then `AUTHORIZED_EMAIL` precedence is preserved; this code does not infer approval from arbitrary user metadata or assign account roles.

## Use and Verify

Sign in with the approved operator authority before opening `/vibes`. Creating/editing/submitting/publishing/reviewing Vibes and the legacy dictionary now require that authority. A public realtor account cannot administer the global Vibe collection. If access is denied, verify the authoritative profile and approved configured email through an authorized review; do not enable a production test flag to work around it.

Local-only WIP identity: start development on loopback with `VIBE_CMS_PUBLIC_WRITE_WIP=true`. This produces `vibe-cms-wip-local` audit identity, never a production permission. No production variable update is necessary to make the code ignore the old bypass. Removing or setting the retired hosted flag to false remains configuration cleanup.

From a checkout with its main lockfile installed, Docker and Playwright Chromium, and no runtime env files:

```powershell
npm run test:unit --workspace=apps/pulse -- tests/unit/operator-access.test.ts tests/unit/vibe-cms-route-access.test.ts tests/unit/auth-callback-profile-authority.test.ts tests/unit/auth-redirect.test.ts
npm run test:profile-roles:preflight --workspace=apps/pulse
npm run test:vibe-cms:security --workspace=apps/pulse
```

The final command includes an optimized production build. It reuses the generated Supabase setup/teardown, main's 163 migrations plus the role guard, real password/cookie sessions and three actual callback writes. Mock auth remains disabled. WIP and E2E operator flags are deliberately true. A request with a loopback Host must still receive 403 from the protected operator probe. Provider credentials are placeholders, welcome-email state is prefilled on fixtures only and no message is sent.

The CMS browser matrix sends invalid `null` bodies to create/update/publish/bulk/legacy-upsert probes. Authorized accounts must reach 400 validation before MongoDB; denied accounts must receive 403. Collection, taxonomy, detail and legacy-list reads are tested for denial. Authorized read projections are covered by actual-handler unit tests with mocked data. This run performs no CMS write or publish/apply cycle and does not claim that full publication lifecycle has been retested.

Private aggregate results and redacted build/route logs stay under ignored `apps/pulse/.pulse-local/vibe-cms-hotfix/`, separate from PR #102's original evidence. Tokens, generated credentials and account identifiers are not recorded in the aggregate result. The owned server, accounts, project containers and volumes are removed by the existing runner.

## Verified Results

The final production-mode snapshot was recorded November 3, 2026 at 4:24 PM America/Chicago. The optimized build passes in 163 seconds on main-locked Next 15.5.27 and Zod 3.25.76, including framework type validation. Eighteen SQL role assertions pass on 164 migrations, with consultation tables absent. Three real callback writes preserve authority and update a benign profile field. Mock auth and configured operator-email shortcuts are disabled; WIP and E2E operator flags are deliberately true and cannot grant production access.

| Actor | CMS checks | Result |
| --- | --- | --- |
| Anonymous | Four reads and five mutations, including legacy dictionary | All nine return 403 |
| Actual public signup claiming admin, after callback | Same nine checks | Consumer profile retained; all return 403 |
| Public realtor registration | Same nine checks | Realtor retained; all return 403 |
| Trusted operator | Five invalid mutation requests | All reach 400 validation without content writes |
| Trusted admin | Five invalid mutation requests | All reach 400 validation without content writes |

The separate loopback-Host operator probe returns 403 despite the enabled E2E flag. Existing realtor access to the generic protected probe remains 200. The final browser run has no page errors or failed callback writes. On November 4, a follow-up check confirms the generated project's containers/volumes and its owned application listener are absent.

Seventy-two focused unit tests pass across operator access, nine actual CMS/legacy handlers, callback authority and redirects. A November 4 follow-up passes the fifteen existing Command Post access tests, for 87 relevant unit cases in total. Thirty-five offline audit/runner checks pass, including invalid CMS suite combinations before resource creation. Focused ESLint, Node syntax and whitespace checks pass. The earlier production run preceded the legacy-probe extension; only the final nine/five-probe matrix above covers the full implemented scope.

## Release Scope

This PR depends on PR #102's profile-role migration and matching callback repair; it adds no migration or dependency update. After #102 lands, rebase this branch onto main. Production and previews share the same database and remain a production release decision. No hosted schema, role, flag, content, provider, calendar or deployment change is included here. Pending CI is not polled or bypassed by local verification.

Deployed operator-email values remain unverified because the existing Vercel connection denied environment reads; no unchanged retry was attempted. Only the owner's two approved addresses may be accepted during that review. Database profile counts do not cover configured email authority. Site application through the separate Launch Kit APIs and the recorded controlled-site publication cycle remain separate review/acceptance work; this repair does not declare the entire application security audit complete.
