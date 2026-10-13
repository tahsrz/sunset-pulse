# Supabase storage admission budget

The October 13 cleanup left 362,399 bytes of cloud files and about 67.2 MB of database data. The Wikipedia backup remains local. This change adds an 800,000,000-byte admission budget for project file storage, leaving 200 MB below the current 1 GB Free allowance.

The user-confirmed non-production project now has both storage migrations installed and reports healthy. All 313 existing objects and both private bucket settings are unchanged. See the [activation and remaining release report](./supabase-storage-activation-2026-10-13.md). Production promotion and complete seller-worker readiness remain separate gates.

## Behavior

- All application uploads and cartridge publishing scripts reserve capacity before contacting Storage. Missing migrations, unreachable capacity checks, or malformed responses stop new uploads.
- Each reservation charges the bucket's entire provider-enforced maximum file size, including signed upload URLs. Concurrent reservations lock one shared budget row. Successful uploads settle to the actual provider-reported size.
- A Storage metadata trigger requires reservations even for service-role uploads. Files are immutable; replacement, copy, move and recreation of a committed/deleted reserved path are blocked. Use a fresh path for a new version.
- Capacity exhaustion returns HTTP 507; unavailable capacity checks return 503. Existing downloads remain available. No customer files are automatically deleted.
- Failed or abandoned uploads retain their reservation. Deleted object bytes move into a retired charge because backend deletion can lag. Neither charge is automatically reclaimed or expired.
- Bulk `wiki_` and `wikipedia-`/`wikipedia.` cartridge uploads are blocked. Use the preserved local library.

## Scheduled maintenance and background publishing

The existing `/api/admin/automations/hotlist-email/worker` invocation runs every five minutes. It now performs a read-only storage inspection, returns `storageMaintenance` alongside its cleanup/job results, and logs a bounded `[STORAGE_MAINTENANCE]` warning when action is needed. Healthy checks are quiet. An unavailable inspection has a five-second deadline so other jobs can proceed.

Generated cartridge publishing pauses before the next bucket-sized reservation would cross **700 MB**, leaving 100 MB within the 800 MB admission budget for customer uploads. It also pauses at **400 MB of database data**, on metadata/accounting drift, on incompatible bucket limits, or when capacity cannot be verified. These thresholds and the **50 MB scan file limit** share `apps/pulse/lib/storage/projectStoragePolicy.mjs`. The 700 MB background threshold is a conservative preflight; the locked 800 MB admission ledger remains the concurrency backstop.

`session-conveyor-belt.ts`, `migrate-tah.mjs`, `vercel-sync.mjs`, and `SessionForge` use this policy before generating or loading a new cartridge. Existing immutable paths are skipped, Wikipedia files stay local, and a cloud error stops the batch until a later invocation. The CLI publishers resolve environment and cartridge paths relative to the Pulse app, allowing existing scheduled commands to run from other working directories.

Scan cleanup continues to delete only its previously eligible cancelled/expired captures. Seller jobs also continue when optional publishing is paused. Neither inspection nor cleanup releases pending or retired budget charges. No storage-check history rows are created, no customer files are purged to make room, and inspection does not send external notifications.

Run a read-only check with:

```sh
npm run storage:inspect --workspace=apps/pulse
```

It reports `healthy`, `warning`, `blocked`, or `unavailable`, together with reasons, aggregate usage and `backgroundUploadsAllowed`. Exit codes: 0 for healthy, 2 for attention required, 1 for missing local configuration. The deployed worker uses its existing `CRON_SECRET`; inspect its JSON response and `[STORAGE_MAINTENANCE]` logs. Do not invoke that worker merely to inspect usage, because it also processes existing seller jobs.

For a read-only deployment check, use `GET /api/admin/storage/health?expectedProjectRef=YOUR_PROJECT_REF` with the deployment's `CRON_SECRET` bearer header. It verifies the selected project and matching server/browser origins before inspecting capacity. A target mismatch returns 409; missing/unavailable inspection returns 503. It does not process jobs or cleanup and is not an additional cron schedule.

For `bucket_limit_mismatch`, adjust the bucket through Storage settings/API while preserving privacy and MIME restrictions. For `accounting_mismatch`, investigate provider metadata before resuming publishers; do not reset the counters. `capacity_unverified` commonly means the two storage migrations or the service-role configuration are missing. No automatic setting changes or budget reclamation occur.

## Deployment

1. Require the `storage-budget` CI check to pass. It creates its own disposable Supabase stack, exercises the actual Storage API, and destroys only its generated resources. Run locally with `npm run test:storage-budget --workspace=apps/pulse` when Docker's Linux engine is available.
2. Temporarily stop upload traffic and cartridge publishing jobs. Confirm the target project and verify that current file usage is below 800 MB. Back up the existing bucket settings.
3. Give every upload bucket a finite native `fileSizeLimit`. Suggested limits for Free: cartridges 5,242,880; lead-evidence 10,485,760; reports 10,485,760; property-scans 50,000,000. The app's scan file limit is also 50,000,000 bytes. Supabase Free's [global file limit is 50 MB](https://supabase.com/docs/guides/storage/uploads/file-limits); the older scan bucket migrations used 75 MiB, so explicitly lower that bucket during rollout. The guard supports bounded buckets up to 80,000,000 bytes on paid plans, but a bucket must also fit the provider's global limit. Preserve privacy and existing MIME restrictions. An unbounded bucket cannot obtain a reservation. Do not increase a bucket limit while it has pending reservations.
4. Apply `20261013170000_project_storage_budget.sql`, then `20261013180000_project_storage_cron_health.sql` from `apps/pulse/supabase/migrations/` to the verified project, then deploy the matching application code before resuming uploads. If the first migration is already recorded, apply only the second. Do not blindly run the unrelated pending seller release migrations. Record both through your normal migration-history process so they are not applied twice.
5. Verify an ordinary upload, download, and rejection of an unreserved service-role upload. Confirm that the budget's live bytes match Storage metadata. Resume the existing jobs only after these checks.

Activation is coordinated with deployment: older app versions do not reserve capacity and will be rejected by the trigger. The PR alone does not activate hosted enforcement.

The trigger modifies behavior on Supabase's managed Storage schema. Test it again before a Storage service upgrade; Supabase recommends treating that schema as read-only. Its API authorization probes run in rolled-back transactions, whereas the final metadata commit consumes the reservation. See [Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design).

## Inspect and pause

Use a server-side service-role client:

```js
const { data, error } = await supabaseAdmin.rpc('project_storage_budget_status');
if (error) throw error;
// limitBytes, liveBytes, reservedBytes, retiredBytes, availableBytes,
// paused, pendingUploads, databaseBytes, databaseWarning,
// observedBytes, unknownSizeObjects, bucketLimits
```

For an immediate upload stop, an authorized database operator can run:

```sql
UPDATE public.project_storage_budget SET paused = true WHERE singleton;
-- After the incident is resolved:
UPDATE public.project_storage_budget SET paused = false WHERE singleton;
```

At capacity, review large files and pending uploads. Delete selected files through the Storage API, after verifying backups. Never delete Storage metadata directly. Release pending or retired charges only after independently verifying that no signed capability or upload remains active and backend bytes have been removed. There is intentionally no automatic reclamation endpoint.

For development and CLI uploads, import `uploadWithStorageBudget` or `createBudgetedSignedUploadUrl` from `apps/pulse/lib/storage/projectStorageBudget.mjs` and use a service-role client on the server. Do not expose that key to browsers. Scheduling remains in the existing scheduler; admission is checked synchronously for every scheduled upload as well as interactive uploads.

## Guarantee boundary

The enforced invariant is `liveBytes + reservedBytes + retiredBytes <= 800,000,000` for tracked file admission. Native Supabase file limits apply to individual files, not total project usage: [file size restrictions](https://supabase.com/docs/guides/troubleshooting/upload-file-size-restrictions-Y4wQLT).

This cannot promise that Supabase's billable physical storage will *never* exceed a provider limit. Provider temporary/orphan versions, concurrent replay of a signed capability before its first commit, or an owner disabling/changing the guard are outside this accounting. The 200 MB headroom reduces that risk. Consult provider usage metrics when investigating discrepancies.

Database size is separate from file storage. The status RPC reports it and warns at 400 MB, below the current 500 MB Free database allowance. This does not impose a database write cap, shrink indexes, or bound provider Auth/log growth. Keep monitoring both database and file usage; do not downgrade solely because this guard exists.

## Rollback

Pause uploads first. Preserve the accounting tables and stop publishing jobs. If a provider upgrade makes the trigger incompatible, an authorized operator can drop `project_storage_budget_guard` on `storage.objects` and roll back the app as a coordinated operation. Dropping it removes direct-write enforcement; keep uploads disabled until protection is restored. Do not automatically reset live, reserved or retired counters.
