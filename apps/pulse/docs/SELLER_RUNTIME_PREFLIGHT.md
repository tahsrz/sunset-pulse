# Seller runtime preflight and recovery

Use this read-only diagnostic before interpreting missing listings, default branding,
or unavailable seller workspaces as application defects. A rendered homepage does
not prove its database is available.

From `apps/pulse`, run:

```powershell
node scripts/seller-runtime-preflight.mjs --expected-project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with the selected project's 20-character reference from
the Supabase dashboard. The default loader uses Next.js's effective development
environment, including process variables and local environment files. It verifies
that configured server/browser Supabase origins agree with that explicit project.
It never infers the application's hardcoded fallback project.

To inspect a separately prepared environment file without inheriting ambient
credentials, use an ignored file containing both the selected URL and its
server-only service credential:

```powershell
node scripts/seller-runtime-preflight.mjs --expected-project-ref YOUR_PROJECT_REF --env-file .pulse-local/selected-target.env
```

For an already running local Supabase stack, use `--expected-project-ref local`
and a file with its loopback URL and local service credential. Do not put secret
values in command arguments, the PR, or source control.

## What it checks

The script performs GET requests with `limit=0` for site configuration, realtor
preferences, worker lease columns, and private case/event/booking/message table
columns. It reads at most two matching `seller_email` event-contract rows to check
that version 1 is enabled. Private record contents are not returned by those
table probes. Each request has a 10-second deadline and a 16 KiB response limit;
the first failed check stops subsequent reads. Redirects are not followed.

Output contains only the selected project identity, fixed status codes, allowlisted
quota/schema codes, configuration booleans and check results. Raw provider bodies,
credential values, sender addresses and exception details are excluded. No worker
or cron endpoint, email provider, migration, account write or billing action runs.

Exit code 0 means `READ_ONLY_PROBES_PASSED`; any blocked check exits 1. A pass covers
only these table/column reads and the email event contract. It does not compare
applied migration history, inspect all RPC definitions, verify owner/client flows,
establish hosted cadence or prove email delivery. Even a passing result does not
authorize a release. Use the [release checklist](SELLER_BUSINESS_RELEASE_CHECKLIST.md)
for those remaining checks.

## Respond to the result

| Result | Next action |
| --- | --- |
| `QUOTA_RESTRICTED` / `SERVICE_RESTRICTED` | Review the selected organization's Usage/Billing and restriction notice. Resolve its usage/plan issue before repeating database acceptance. |
| `CONFIGURATION_FAILURE` | Correct the selected project, differing server/browser URLs, missing service credential, invalid flags or enabled mock mode. No database request is made for these configuration failures. |
| `CREDENTIAL_OR_PERMISSION_FAILURE` | Verify the server-only key belongs to the selected project and retains the reviewed grants. Do not broaden browser permissions to make the probe pass. |
| `SCHEMA_NOT_READY` | Export the target's full applied version history; use the existing offline migration planner and prepare the resulting pending list for review. Missing table/column access is evidence of a gap, not a complete migration audit. |
| `EMAIL_CONTRACT_NOT_READY` | Review the migration and explicit admission state for the shared `seller_email` v1 contract. The tool does not enable it or invoke jobs. |
| `NETWORK_OR_TIMEOUT_FAILURE` / `HTTP_FAILURE` / `UNEXPECTED_RESPONSE` | Check connectivity and the selected API endpoint's configuration/status. Unexpected or oversized responses never count as success. |

For storage restrictions, Supabase's [billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)
describes immediate restoration through upgrading a Free plan or disabling a Pro
spend cap, which permits billed overages. The project owner must choose that billing
action. Storage usage is averaged over the billing period, so removing assets may
not immediately clear a restriction; see [storage usage](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).
Delete reviewed unwanted assets through the Storage API or dashboard, not direct
SQL deletion of storage metadata; see [orphaned storage guidance](https://supabase.com/docs/guides/troubleshooting/storage-unexpectedly-high-usage-or-exceed_storage_size_quota-errors-ae21a5).
This preflight does not select or delete any assets.

## Keep local work moving

The existing `npm run dev:mock` in `apps/pulse` can preview supported mock surfaces.
It does not verify real authentication, database ownership, scheduler jobs or
provider delivery. For the seller feature's actual database/auth/browser flow,
use its existing disposable local Supabase runner:

```powershell
node scripts/platform-disposable-auth-acceptance.mjs --suite seller-service
```

Docker must be available. The runner creates its own local project, replays the
repository migrations, uses real synthetic logins, verifies owner/client privacy
and shared scheduler behavior, and removes its isolated project afterward. It
keeps email sending gated and uses synthetic receipts. Do not point that acceptance
runner at the hosted project as a workaround for a restriction.

## Recorded check: October 12, 2026

The explicitly selected local configuration points to project
`xlyfhiafactxahhvikyv`. Its first `site_config` GET returned HTTP 402 with
`exceed_storage_size_quota`; the diagnostic stopped after that read. Sender,
webhook and seller intake configuration are absent, and email sending is disabled.
This records the local process configuration, not the preview deployment's
configuration or a verified non-production release target.

All 21 runtime-preflight regression tests pass, along with focused lint and
whole-app TypeScript validation. The unchanged compatibility preflight verifies
27 sources and 161 migrations; all nine migration-planner regression tests pass.
Regression coverage verifies target mismatch/no-request behavior, server/browser
origin agreement, read limits, disabled/incompatible event contracts, quota/schema/
permission classification, redirects, timeout handling, response bounds and secret
redaction. A CLI test against a temporary loopback server also verifies that the
selected env file alone supplies the target URL and credentials.
