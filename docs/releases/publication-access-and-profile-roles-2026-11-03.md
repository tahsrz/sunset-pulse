# Publication Access and Profile Role Repair

Branch: `codex/publication-operator-acceptance`, stacked on [PR #99](https://github.com/tahsrz/sunset-pulse/pull/99) at `f006948e`. This continues the publication operator walkthrough in the existing release plan.

Source repair and database/callback regression commit: `68aacdcf`.

## Security Finding

An anonymous signup against a generated local Supabase project submitted `role: admin` in user metadata. The current migration chain created a profile whose role was `admin`. This is a reproduced privilege-assignment defect, not evidence of an attack against the hosted application. No hosted accounts were inspected or changed.

The auth callback also built its privileged profile upsert from client-controlled metadata. Fixing only the signup trigger would leave that independent writer unsafe and could downgrade a legitimately assigned operator to its older metadata role.

Migration `20261103150000_profile_role_assignment_guard.sql` limits new signup roles to the existing public consumer/realtor registration choices. Other claims become consumer. It preserves existing role assignments during profile conflicts and adds an invoker trigger that rejects direct anonymous/authenticated role changes. Ordinary profile field edits and trusted server role assignment remain available under their existing grants and policies. The migration adds no application table grants and does not change existing account roles.

The callback first reads the authoritative profile. Existing profiles keep their role, subscription and advanced-mode fields; metadata cannot overwrite those fields through this writer. A missing profile gets only a permitted public signup role, and conflict-ignore avoids replacing a concurrently created profile. A failed authority read causes no profile write. Callback code/token payload logging has been removed.

The callback honors the explicitly configured `NEXT_PUBLIC_AUTH_REDIRECT_ORIGIN` when it is a plain HTTP(S) origin without credentials, path, query or fragment. Otherwise it retains the request origin. This matches the existing explicit auth-origin configuration used by login and prevents Next's local internal hostname from moving the acceptance browser onto a development-bypass origin. No forwarded-host header is newly trusted.

This is a focused role-boundary repair, not a complete authentication, billing or privileged-account audit. The existing public realtor registration behavior remains unchanged.

## Local Verification and Reproduction

Run from a checkout without runtime `.env` files, with Docker and Playwright Chromium installed:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Taz/AppData/Local/ms-playwright'
npm run test:marketing:auth --workspace=apps/pulse
```

The command extends the existing disposable auth runner. It applies the copied migration chain only to a generated `pulse_auth_*` local project, creates fictional test accounts, opens a local Next development server with isolated output, and removes its project afterward. It rejects combinations with other suites. No hosted database, storage upload, scheduler admission flag, provider activation or production deployment is changed.

`admin.localhost` resolves through Chromium to the local server but does not qualify for the development operator bypass; it is also a reserved hostname that avoids tenant-page rewriting. Anonymous API denial verifies that bypass is inactive. Mock auth and the E2E operator override are disabled. Browser requests, rather than Node's request client, handle this local hostname. Credentials and single-use callback links remain in memory and out of screenshots and logs.

Trusted SQL seeds the operator/realtor fixtures. The consumer case uses actual anonymous signup with a forged administrator metadata claim. Test-only service grants inside the generated project exercise the callback's real profile writer rather than hiding behind missing local REST grants. The database tests also use transaction-scoped grants to prove the role guard still works when table privileges exist. Neither set of test grants becomes a production migration. Welcome-email flags are prefilled only on fixtures; no message is sent.

The walkthrough checks real password/cookie login, callback role preservation, anonymous/consumer/realtor denial, operator/admin access, bounded private readiness responses, required versus optional content, phone/desktop layouts, refresh, unavailable-read recovery and draft download. Repository hashes prove the marketing copy, seller introduction and presentation source remain unchanged. Downloads and screenshots stay in ignored `.pulse-local/platform-auth-acceptance/` output.

## Results

Eighteen database assertions pass for signup claims, direct self-promotion, ordinary edits, trusted assignment, existing administrator preservation and later metadata changes. Fifty publication regression tests and sixteen auth callback/redirect tests pass, including fourteen callback authority regressions. Full application TypeScript, focused ESLint, Node syntax and whitespace checks pass. No new optimized production build or hosted review was performed for this delivery.

The final disposable real-auth browser walkthrough passed in 118 seconds, including migration startup and cleanup. Both actual callback profile writes applied a benign display-name change, proving role preservation was not merely a silently failed writer. The operator remained operator; the signup with forged admin metadata remained consumer before and after the callback. Operator/admin readiness requests returned 200; anonymous/realtor/consumer requests returned 403 on the non-bypass hostname. Phone/desktop checks passed at 390px/1440px. Draft download, source-file hashes, bounded private responses, failed-read recovery and both callback origin checks passed. The generated project and its accounts were removed, and the local server stopped. Scheduling admission was not changed. Local screenshots were inspected; this remains automated acceptance rather than human/device review.

## Operator Directions

1. Sign in using an approved global operator or administrator account. Open `/admin/marketing` and select **Check Content Readiness**.
2. The current seller introduction needs its biography and review. Its saved name and contact are present; its portrait remains optional. The three text guides remain published. Their missing photos/places/maps are optional additions.
3. Expand **Review Seller Introduction** or **Review Old Town Keller** for the exact source paths. Keep the KCD contact separate. Add only approved biography text and licensed images; the inspected checkouts still contain no biography or neighborhood photo package.
4. In Marketing Content, change a field and choose **Download Draft**. The downloaded JSON contains the edit; the current site does not change. Review and publish through the normal repository/deployment process.
5. **Refresh Checks** reruns the read. A failed read clears the old report and offers **Try Again**. An ordinary realtor or consumer must see an access message without publication cards.

## Before Hosted Release

The owner has since confirmed that the selected project serves both production and previews. The [shared database preflight](./profile-role-release-preflight-2026-11-03.md) supersedes its earlier non-production classification and records the exact pending migration packet. Review application of the migration as a production change. Deploy the callback repair together with the reviewed schema change; changing only the callback does not repair signup-time role assignment. Hosted mutation acceptance requires an isolated target or an explicitly reviewed production test procedure.

The subsequent aggregate-only hosted profile audit found seven consumer profiles and no operator/admin assignments. No role remediation was performed. That snapshot does not cover deployed email-based operator overrides or historical compromise; Vercel environment-read access is still unavailable. This migration deliberately does not guess which existing accounts are legitimate or automatically demote them.

This is a release blocker until the role repair and account review are handled for the intended hosted environment. Approved content assets, controlled performance benchmarking, deployed acceptance and human/device review remain separate open work. Pending hosted CI is not polled.
