# Supabase storage admission budget

The October 13 cleanup left 362,399 bytes of cloud files and about 67.2 MB of database data. The Wikipedia backup remains local. This change adds an 800,000,000-byte admission budget for project file storage, leaving 200 MB below the current 1 GB Free allowance.

## Behavior

- All application uploads and cartridge publishing scripts reserve capacity before contacting Storage. Missing migrations, unreachable capacity checks, or malformed responses stop new uploads.
- Each reservation charges the bucket's entire provider-enforced maximum file size, including signed upload URLs. Concurrent reservations lock one shared budget row. Successful uploads settle to the actual provider-reported size.
- A Storage metadata trigger requires reservations even for service-role uploads. Files are immutable; replacement, copy, move and recreation of a committed/deleted reserved path are blocked. Use a fresh path for a new version.
- Capacity exhaustion returns HTTP 507; unavailable capacity checks return 503. Existing downloads remain available. No customer files are automatically deleted.
- Failed or abandoned uploads retain their reservation. Deleted object bytes move into a retired charge because backend deletion can lag. Neither charge is automatically reclaimed or expired.
- Bulk `wiki_` and `wikipedia-`/`wikipedia.` cartridge uploads are blocked. Use the preserved local library.

## Deployment

1. Require the `storage-budget` CI check to pass. It creates its own disposable Supabase stack, exercises the actual Storage API, and destroys only its generated resources. Run locally with `npm run test:storage-budget --workspace=apps/pulse` when Docker's Linux engine is available.
2. Temporarily stop upload traffic and cartridge publishing jobs. Confirm the target project and verify that current file usage is below 800 MB. Back up the existing bucket settings.
3. Give every upload bucket a finite native `fileSizeLimit` of at most 80,000,000 bytes. Suggested limits: cartridges 5,242,880; lead-evidence 10,485,760; reports 10,485,760; property-scans 78,643,200. Preserve privacy and existing MIME restrictions. An unbounded bucket cannot obtain a reservation. Do not increase a bucket limit while it has pending reservations.
4. Apply **only** `apps/pulse/supabase/migrations/20261013170000_project_storage_budget.sql` to the verified project, then deploy the matching application code before resuming uploads. Do not blindly run the unrelated pending seller release migrations. Record this migration through your normal migration-history process so it is not applied twice.
5. Verify an ordinary upload, download, and rejection of an unreserved service-role upload. Confirm that the budget's live bytes match Storage metadata. Resume the existing jobs only after these checks.

Activation is coordinated with deployment: older app versions do not reserve capacity and will be rejected by the trigger. The PR alone does not activate hosted enforcement.

The trigger modifies behavior on Supabase's managed Storage schema. Test it again before a Storage service upgrade; Supabase recommends treating that schema as read-only. Its API authorization probes run in rolled-back transactions, whereas the final metadata commit consumes the reservation. See [Storage schema guidance](https://supabase.com/docs/guides/storage/schema/design).

## Inspect and pause

Use a server-side service-role client:

```js
const { data, error } = await supabaseAdmin.rpc('project_storage_budget_status');
if (error) throw error;
// limitBytes, liveBytes, reservedBytes, retiredBytes, availableBytes,
// paused, pendingUploads, databaseBytes, databaseWarning
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
