# Standalone Profile Role Hotfix Evidence

Branch: `codex/profile-role-security-hotfix`, directly based on production/main `31c9571ec4cbe0102b780fcfd53d2b4e393b3fcd`. Core repair: `da139db7`, cherry-picked from `68aacdcf`. The five repair files are identical to their verified PR #100 versions. [Implementation plan and exact file changes](../profile-role-hotfix-implementation-plan-2026-11-03.md).

## Resulting Behavior

Public signup metadata accepts only the existing consumer/realtor registration choices. A claimed admin/operator role becomes consumer. An invoker trigger rejects direct client role changes while preserving ordinary profile edits and trusted server assignment under their existing grants. The migration adds no application table grants or existing-account role changes.

Callback sync reads the existing profile authority before writing. Existing role, subscription and advanced-mode fields are omitted from its update payload. Missing profiles receive only a permitted public registration role; conflict-ignore protects a concurrently created profile. A failed authority read causes no write. Single-use callback credentials are no longer logged. A valid explicit auth redirect origin is respected; otherwise the request origin is retained.

## Independence From the Feature Stack

This branch has main's 163 migrations plus one role-security migration. The two internal-consultation migrations are absent, as are the publication-readiness, Explorer, Atlas and dependency-upgrade changes from the stacked release. It retains main's lockfile without changing dependency versions.

The browser probe is the existing `/api/admin/mls/status` GET, which reads in-memory status without starting a sync. It is available on main. Its existing realtor-access policy is preserved; this verification does not claim the broader application authorization review is complete.

## Verification

- Installed dependencies were aligned to this worktree's main lockfile: Next 15.5.27 and Zod 3.25.76. The primary checkout's unrelated edits were preserved. Local Prisma generation also succeeded without a database URL or connection.
- Sixteen focused cases pass: fourteen callback authority/origin/logging regressions and the two existing redirect tests. Focused ESLint, Node syntax and whitespace checks pass.
- Eighteen pgTAP assertions pass on the standalone 164-migration chain. The consultation settings table is absent.
- The final optimized build passed in 159 seconds, including framework type validation and all 212 static pages. No type or dependency repair from the feature stack was needed.
- The final production-mode browser run, including project setup/build/cleanup, passed in 231 seconds. Three actual service-client callback writes changed a benign display-name field and preserved the intended role. This proves the writer was exercised successfully.

| Scenario | Profile role | Protected GET result |
| --- | --- | --- |
| Anonymous browser on `admin.localhost` | None | 403 |
| Public signup claiming admin, before and after callback | Consumer | 403 |
| Trusted operator fixture, before and after callback | Operator | 200 |
| Trusted admin fixture, before and after callback | Admin | 200 |
| Existing public realtor registration | Realtor | 200, preserving main's policy |

Mock sessions, local operator bypass and operator-email shortcuts were disabled. The reserved browser hostname remained intact through callbacks. Provider credentials were placeholders, Supabase was generated on loopback, and welcome-email state was prefilled only on fixtures. No provider message was sent. The owned server, generated accounts and disposable project were removed. This delivery invokes no application scheduler or worker and introduces no cron job.

The first Windows run exposed CRLF handling in the existing local config rewriter; it now normalizes line endings before replacing port values. The first optimized browser run found another email field mounted elsewhere in the page DOM. The driver now scopes inputs to the form with the visible Sign In button. These changes make the acceptance driver precise; they change no public page markup.

## Reproduce Locally

Use a checkout without runtime `.env` files and install its own lockfile. This machine used the controlled setup below; Prisma generation makes no database connection:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
node node_modules/prisma/build/index.js generate --schema apps/pulse/prisma/schema.prisma
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Taz/AppData/Local/ms-playwright'
npm run test:unit --workspace=apps/pulse -- tests/unit/auth-callback-profile-authority.test.ts tests/unit/auth-redirect.test.ts
npm run test:profile-roles:security --workspace=apps/pulse -- --production
```

Docker and installed Playwright Chromium are required. The runner builds using its generated local backend and an OS-only child environment with explicit fixture settings. It refuses mismatched installed Next/Zod versions and incompatible suite flags. `--production` includes an optimized build and starts the production server; omitting it uses development mode for targeted iteration. Logs redact generated credentials. Only aggregate test results and route/status signals are stored under ignored `.pulse-local/profile-role-hotfix/`.

## Shared-Production Migration Dry Run

The owner confirmed that `xlyfhiafactxahhvikyv` is shared by production and previews. A local ignored release directory was prepared from this branch's 164 migrations, tracked config and the existing confirmed project-ref link. Its manifest records the role migration's LF-normalized SHA-256:

`8be7e777c1108295178857e44ce97f48af954da76531638431fd7bd1e8e97f7f`

The installed CLI's documented `db push --linked --dry-run` completed successfully against that prepared directory. It listed exactly:

```text
20261103150000_profile_role_assignment_guard.sql
```

The dry run applied no migration. The prepared metadata and filtered result are in ignored `.pulse-local/profile-role-production-release/` at repository root. No account identity export, account promotion/demotion, hosted schema change or production promotion was performed. The earlier aggregate-only audit found seven consumer profiles and no operator/admin profiles; that snapshot does not cover deployed email-based operator overrides or establish absence of historical compromise.

## Reviewed Rollout Still Required

1. Review/merge the focused main-based repair through the required PR checks, and release its matching callback code with the single role migration. Production and preview share the target; this is a production change. The dry-run packet and source checksum make the intended migration concrete.
2. Verify deployed `OPERATOR_EMAIL` and `AUTHORIZED_EMAIL` against the approved owner addresses. Vercel environment reads remain unavailable through the current connection; no secret values need to be posted in chat.
3. Recheck role-function/trigger state, approved-profile aggregates and the reviewed application access matrix after rollout. Current local evidence does not mean the hosted repair is live.
4. Rebase the feature stack after this hotfix. Its duplicated role repair can be absorbed by main. If the role migration is applied first, the two older consultation migrations need a separately reviewed full-inventory dry run for their later release; their original versions remain unchanged.

The broader publication, dependency, map, calendar and human/device release work remains tracked separately. No hosted CI job was awaited or bypassed by this source implementation.

## Standalone Read-Only Post-Release Audit

The main-based hotfix now includes the aggregate audit previously available only in PR #101. It uses this checkout's 164-migration inventory, so the two feature-only calendar migrations do not block an independent security release. Exact file changes and verification order are in the implementation plan's next-delivery table.

The audit validates approved/unapproved privileged-profile counts, complete migration history, both repaired routine bodies and their security attributes, and both signup/guard triggers. It rejects disabled or replica-only triggers, wrong functions/events, WHEN conditions, trigger arguments, and role guards limited to specific UPDATE columns. It runs fixed SELECTs in a bounded read-only transaction, returns no account identities or routine bodies, and suppresses raw provider diagnostics. Private approved-address input, query files and reports remain under ignored `.pulse-local/`; temporary SQL is removed.

Commands from repository root:

```powershell
npm run test:profile-roles:preflight --workspace=apps/pulse
npm run test:profile-roles:db --workspace=apps/pulse
node apps/pulse/scripts/profile-role-release-preflight.mjs `
  --expected-project-ref xlyfhiafactxahhvikyv `
  --linked-project-dir C:/Users/Taz/SunsetPulse/apps/pulse `
  --approved-accounts-file apps/pulse/.pulse-local/profile-role-approvals.json
```

Use the installed CLI with `db query --linked` support and an already matching link. The private file shape is `{"emails":["approved-owner@example.test"]}`; populate it only with the approved addresses, never commit it. The script reads no application env file and never links a project. The direct Node invocation preserves named options on this Windows/npm installation. A failed invocation is not a fresh audit result; do not use a previously saved report as evidence for it. Exit 2 means database checks are BLOCKED, exit 1 means the audit could not complete, and exit 0 means only the database checks pass.

The fresh shared-production read on November 3, 2026 at 4:01 PM America/Chicago reports seven consumer profiles, zero privileged profiles, 163 applied versions and exactly one pending version, `20261103150000`. There are no unknown remote versions. The signup trigger is active with its expected binding; the old signup body and missing role-guard routine/trigger correctly block the report. The migration checksum matches the dry-run packet above. No mutation was requested. This result does not verify deployed email overrides or callback code and does not establish absence of historical compromise.

The database-only command starts no application server, build or browser. Deliberate drift is confined to its generated local project. Auth-trigger fixtures use the local Auth table owner through loopback, with that generated container's password held only in memory. They do not change table ownership or production privileges. The existing runner owns final resource removal. No cron job, provider message or new scheduling infrastructure is involved.

Verification: 32 offline contract tests pass. The generated main-based database passes all 18 role assertions and seven audit scenarios, then verifies the restored baseline. Node syntax and whitespace checks pass. Runtime callback/UI files, dependencies and the migration packet are unchanged in this follow-up, so the optimized build and browser evidence above were not repeated. The new audit pattern is recorded at `.mex/patterns/profile-role-release-audit.md`.
