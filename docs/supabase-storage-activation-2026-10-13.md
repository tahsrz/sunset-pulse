# Non-production storage activation: October 13, 2026

The user confirmed `xlyfhiafactxahhvikyv` as the intended non-production target for PR #80. The tested storage guard and cron-health migrations are now installed there. This does not promote the PR to production or establish that the entire seller app is ready.

## Completed activation

- Confirmed project identity, required SQL privileges, 0 object writes in the preceding two hours, and known sizes for all existing objects.
- Saved the bucket configuration, exact object size/ETag manifest and applied migration history before activation.
- Applied `20261013170000_project_storage_budget.sql` and `20261013180000_project_storage_cron_health.sql` in one transaction, with a five-second lock timeout. Recorded only these two actually applied versions and their source statements; requested PostgREST schema reload.
- Verified the real Storage API rejects an unreserved service-role upload. A reserved synthetic 56-byte cartridge uploaded, downloaded identically, and was removed through the Storage API.
- Verified a signed upload reserves the full 5 MiB bucket limit before issuance, accepts a synthetic 39-byte upload from an anonymous client, and settles to its actual bytes. After removing the synthetic file, replaying its still-valid signed token was rejected. Both deleted test files' charges remain held: 95 retired bytes in total.
- Independently compared the before/after manifests: all **313 existing files** retain identical paths, sizes and ETags; both private bucket settings are unchanged.

The resulting inspection is **healthy**: 362,399 live file bytes, 95 retired bytes, 0 reserved bytes, an 800,000,000-byte admission budget, and about 48.0 MB of database storage. Background publishing is allowed. No customer records or existing files were deleted. No seller worker, email provider or production deployment was invoked.

Private recovery/audit files are retained under `apps/pulse/.pulse-local/storage-rollout/2026-10-13-xlyfhiafactxahhvikyv/`: `before.json`, `activation.json`, `after.json`, and `receipt.json`. This directory is ignored by Git. Keep it with the previously preserved Wikipedia recovery archive.

## October 15 Free-plan check

The `property-scans` bucket was set through the Storage API to a native 50,000,000-byte file limit. Its private setting and allowed MIME types were preserved, and all 313 objects remain unchanged. The live read-only inspection now reports healthy: 362,399 live bytes, 95 retired bytes, 0 reserved bytes, and 53,398,675 database bytes. A forward migration, `20261015190000_property_scan_free_file_limit.sql`, keeps that cap in repository-managed setup. This fixes the previous `bucket_limit_mismatch` and re-enables background uploads.

The October 15 dashboard review showed the organization on Pro with one project, spend cap enabled, and no current-cycle quota overages. For the October 13 to November 13 cycle, it showed 0.009 GB uncached egress, 0 GB cached egress, and 0.036 GB average Storage size. The project is on `t4g.nano`, has a 2 GB provisioned database disk with auto-expansion capped at 8 GB, and has no read replicas. Usage can take up to one hour to refresh. The project-level database and Storage measurements are below Free allowances.

Before downgrading, a local logical database backup was created and checksum-verified in `apps/pulse/.pulse-local/supabase-cleanup/2026-10-15-xlyfhiafactxahhvikyv-pre-free/`. It includes roles, the default app schema and data, separate `auth` and `storage` schema and data dumps, and migration-history schema and data. The dump does not include Storage API file bytes; all 313 existing objects remain in the project. The directory is ignored by Git and contains sensitive database data, so keep it private and retain an offsite copy. Supabase Free does not include downloadable automated database backups.

## Remaining application release work

Before activation, the project recorded 32 of 163 repository migrations. Its latest recorded version was `20260821020000`, with eight earlier versions absent from the history:

| Version | Migration |
| --- | --- |
| 20260803010000 | internal lead operating system |
| 20260803020000 | lead intelligence evidence |
| 20260804010000 | lead discovery identity |
| 20260804020000 | lead correspondence |
| 20260804030000 | lead outreach operations |
| 20260804040000 | lead draft fingerprint constraint |
| 20260811000000 | crawler heartbeats |
| 20260818010000 | agent site lead idempotency |

Some related objects already exist, including `lead_notes`, `lead_attachments`, `lead_intel_evidence` and `crawler_heartbeats`. Their presence does not establish complete migration equivalence. Do not mark those versions applied merely because a table exists, or replay data-changing SQL without comparing its full schema effects.

After the independent storage patch, the history records **34 versions**, leaving **129 repository versions unrecorded**. The normal release planner still refuses the gaps. `realtor_preferences`, `workflow_jobs` and `workflow_schedules` are absent, so the seller worker is not ready for an end-to-end hosted run.

Diagnose an exported history without executing SQL or changing migration records:

```sh
node apps/pulse/scripts/seller-release-preflight.mjs --diagnose-history path/to/applied-migrations.json
```

The report lists unknown recorded versions, gaps and all unrecorded repository files. Exit code 2 means reconciliation is required. `--applied-migrations` retains its strict refusal to plan across history gaps.

Next, compare the actual schema against the older unrecorded migrations, then prepare the remaining application migration sequence with backups. Preserve the storage ledger and its retired charges. Keep external sending disabled until the existing sender/webhook/owner checks pass.

## Deployment identity and safe health inspection

At activation, Vercel confirmed READY preview `dpl_9Equ6DQKvQsL6rJQkwEvuvh4czzq` at commit `3e013b35db6b3689017beb8f0b844736d7a1c325` in project `sunset-pulse` / `prj_EkrxJi7uHCqq1HztPygeYTj57gYs`, team `team_nx1IWfVXcJxGdPgQyNvvYcXl`. The subsequent health-route commit `e6aa5c801fc1bb409b96a260b7a4690cb2dc5a2a` has READY preview `dpl_9g37idFdfeHe3Grpoa24YiJbzB8u` and passing CI. The user confirmed the intended database; the preview's actual runtime mapping must still be checked.

October 14 access follow-up: Vercel CLI 64.0.2 is authenticated as `tahsrz` and verifies the intended project/team, preview variable metadata and protected preview reachability. The connector's metadata operation still returns 403. The preview health route returns application 503 because its `CRON_SECRET` is missing; configure private preview authentication and redeploy the reviewed source before checking runtime mapping. No protection settings or app environment values were changed during the access diagnosis. The [next implementation plan](../apps/pulse/docs/SELLER_RELEASE_READINESS_IMPLEMENTATION_PLAN.md) separates these configuration, schema and acceptance gates.

The PR adds a manual read-only endpoint:

```text
GET /api/admin/storage/health?expectedProjectRef=xlyfhiafactxahhvikyv
Authorization: Bearer <the deployment's private CRON_SECRET>
```

It rejects mismatched server/browser or selected database targets before querying, returns only the project ref and aggregate storage inspection, and disables caching. It does not invoke cleanup, seller jobs or notifications. Deployment Protection authentication may also be required for a protected preview. Do not post any secret in chat.

Use `npm run storage:inspect --workspace=apps/pulse` for direct read-only database health. Use the new endpoint to verify the deployed app's mapping before a broader release. Do not use the seller worker as a health probe.
