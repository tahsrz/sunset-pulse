# Consultation Real-Auth Acceptance

Branch: `codex/consultation-auth-acceptance`, based on Daily focus PR #94 and scheduler PR #93. This closes the local browser/API/data verification gap using the existing disposable acceptance infrastructure. Production configuration and activation remain separate release steps.

## Fixes Found Through Integration

1. Fresh Supabase scheduling tables did not grant `service_role` SELECT. Bypassing row-level security does not grant table access. The actual calendar read failed with HTTP 500 and REST error `42501`, while mocked UI and PostgreSQL definer-function tests passed. The additive migration `20261028123000_internal_seller_calendar_read_grants.sql` grants only SELECT on `scheduling_bookings` and `scheduling_availability` to the server role. It adds no public/browser grants or write privilege.
2. Public tenant discovery explicitly selected `site_config.active_vibe_revision_id`, which is absent from the migrated schema. This caused a configured Supabase tenant to fall back to an unconfigured site and public intake to return 503. The initial query now uses base-schema fields; the existing shared two-store reader still resolves projection pointers and freshness. The new regression covers a tenant without that column and confirms that the Mongo pointer is retained.
3. The public consultation origin check compared against Next's normalized URL, rejecting legitimate loopback requests with HTTP 403. It now compares Origin to the actual HTTP Host, following the established workflow-route pattern. Forged forwarded hosts, malformed hosts and cross-site fetches remain denied; the browser still must supply Origin.
4. The disposable stack runner's section parser failed on Windows CRLF checkouts. It now normalizes only its temporary TOML copy before rewriting ports. Consultation acceptance supplies the existing disposable Mongo service because public tenant lookup checks both stores.

## Reproduce

From the repository root, with Docker running and Playwright Chromium installed:

```powershell
npm run test:seller-consultations:auth --workspace=apps/pulse
node apps/pulse/scripts/scheduler-concurrency-acceptance.mjs --internal-consultations-only
```

If the shell redirects Playwright's browser cache, set `PLAYWRIGHT_BROWSERS_PATH` to the installed browser directory first. No cloud credentials or `.env.local` are needed. The real-auth runner generates a unique Supabase project, chooses free loopback ports, applies the migration chain, starts its own Next server and creates temporary verified Auth accounts through the local Auth API. It uses rendered password login and real cookie sessions, with mock auth and outbound email/AI providers disabled.

The temporary booking signing secret is generated in memory. The runner does not write credentials to logs or checked-in files. Diagnostics retain route timing and bounded error codes; token-bearing retry comparisons use boolean assertions so failures cannot print capability bodies. Teardown removes only the generated Supabase project, its temporary directory and the generated Mongo Compose project. Existing local/hosted projects are not reset or altered.

## Acceptance Scope

- Owner hours saved through `/consultations`, starting with disabled/empty settings; foreign owner and anonymous denial.
- Real `/seller-plan` intake issues a 15-minute booking offer only after persistence. Intake replay returns a duplicate receipt without refreshing access.
- A reservation is committed through the real API; only its response is deliberately lost. The visitor retries the identical capability, slot and request UUID and receives the original booking. Attendee, case bridge, planner item and reminder remain single records.
- A second saved seller cannot claim that interval. A foreign owner cannot cancel it. Cancellation through the owner UI releases capacity and supersedes the existing reminder; the original request remains cancelled on replay. Another seller can then reserve the released interval.
- Signature tampering, expired claims and wrong purpose are denied. Withdrawn contact permission denies availability. A real foreign JWT cannot read private calendar settings directly.
- Before booking, `/today` displays the actual saved synthetic seller as its primary action and links to that exact inquiry, at phone/desktop widths. The withdrawn competing seller is not later offered as a new-contact action. The run uses no mocked successful API result or fabricated browser session. A separate SQL suite retains observed concurrent-lock coverage and DST/atomicity checks.

Screenshots are kept locally under `apps/pulse/.pulse-local/platform-auth-acceptance/`. The mocked presentation screenshots from PR #94 and real persisted-data screenshots serve different checks.

## Release Requirements

Apply both internal scheduling migrations through the reviewed migration process, including the read-grant migration above. Configure a separate server-only signing secret and the intended seller-site mapping in each deployment environment. Set owner-chosen hours and complete deployment acceptance before production activation. This delivery does not apply production migrations, change hosted secrets, merge/deploy the PR stack or activate a production calendar.

## Results

- Final full real-auth run passed in 128 seconds on generated project `pulse_auth_0781bd49`, including the named seller appearing in Daily focus, real owner login/settings, public intake, lost-response replay, competing seller conflict, cancellation, reminder cleanup, token boundaries, consent and direct authenticated-JWT grant denial. Both Supabase and Mongo resources were removed afterward.
- The disposable PostgreSQL concurrency suite passed with explicit service-role read privilege assertions, existing observed lock contention, atomic rollback, cancellation and DST checks. Its generated fixtures were removed.
- 45 focused application tests passed across seven suites for HTTP origin/capability boundaries, authority failures, picker/owner behavior, intake replay, fresh-schema tenant lookup and two-store freshness.
- Route type generation, full application TypeScript, focused ESLint, Node syntax checks and whitespace checks passed. The development server's generated tsconfig changes were restored.
- Read-only catalog verification confirmed the fresh schema lacks the optional projection column and the new migration grants both required server reads.

No production build, hosted CI wait or deployed browser acceptance was performed. The main-site publication content and owner/client progress-sharing pilot remain independent follow-ups.
