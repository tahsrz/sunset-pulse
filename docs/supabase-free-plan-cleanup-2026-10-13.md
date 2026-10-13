# Supabase Free plan size cleanup: October 13, 2026

Project: Sunset Pulse (`xlyfhiafactxahhvikyv`). The owner upgraded its plan to restore access, then explicitly approved removing the backed-up Wikipedia cloud library. The cleanup is complete; subscription settings were not changed.

## Verified result

| Measure | Before | After |
| --- | ---: | ---: |
| PostgreSQL database | 67,243,155 bytes | 67,243,155 bytes |
| File storage | 1,786,595,887 bytes | 362,399 bytes |
| Objects in private `cartridges` bucket | 20,122 | 313 |
| Objects in private `lead-evidence` bucket | 0 | 0 |

Removed 19,808 English Wikipedia `.tah` cartridges and their 5,242,829-byte catalog using the **Storage API**, in requests of at most 300 objects. No SQL deletion was used. Independent read-only SQL confirmed every approved object was absent and every preserved object's size and ETag was unchanged. Database records were outside the cleanup's scope.

The database was already below the Free plan's 500 MB limit. The file storage overage, rather than customer database data, was responsible for `exceed_storage_size_quota`. Live file storage is now below the Free plan's 1 GB limit. These measurements do not establish eligibility for a subscription downgrade: bandwidth and other quotas still need checking, and Supabase's billing-period usage averages may remain elevated after deletion. See [database size](https://supabase.com/docs/guides/platform/database-size) and [Storage size accounting](https://supabase.com/docs/guides/platform/manage-your-usage/storage-size).

## Recovery and application effect

A verified local recovery archive, the original cloud catalog, exact object manifest, before/after audits, and completion receipt are retained in `apps/pulse/.pulse-local/supabase-cleanup/2026-10-13-xlyfhiafactxahhvikyv/`. This directory is ignored by Git; keep it when moving the workstation or clearing local data. Recovery directions are in that directory's `README.md`.

The archive's 19,808 cartridge payloads were read back and matched against cloud metadata by size and MD5. Its SHA-256 is `286af1ea6e0c10827e0260abec2761e2fc0e3740317b0bad47735051b3f46e93`. The complete archive SHA-256 and separate catalog MD5 were checked again before removal. Original local cartridges remain in `apps/pulse/cartridges/wikipedia`.

This Wikipedia library is no longer available through Supabase cloud retrieval. The other 313 cloud objects remain private and unchanged. Local bulk remote reads were already disabled (`REMOTE_ATLAS_SYNC_ENABLED` was not `true`); no hosted environment or scheduled job was changed. Do not bulk reupload the uncompressed library: it would exceed the Free storage allowance again.

The post-cleanup app preflight reads `site_config` successfully (HTTP 200). Seller readiness still stops at missing `realtor_preferences` (HTTP 404 / `PGRST205`); restoring quota access does not install pending schema migrations.

## Binary encoding and compression

The removed Wikipedia cartridges are already binary `.tah` files. A deterministic sample of 199 archived cartridges totaled 18,947,214 bytes. Gzip produced 3,680,169 bytes (80.58% smaller); Brotli quality 4 produced 3,564,992 bytes (81.18% smaller). Every sample round-tripped to identical original bytes. These are sample results, not a full-library capacity guarantee or a deployed format change. Detailed results are in the recovery directory's `compression-sample.json`.

Keep accounts, leads, bookings, and other queryable records in typed PostgreSQL tables. PostgreSQL already supports [binary `jsonb`](https://www.postgresql.org/docs/current/datatype-json.html) and transparent [TOAST compression](https://www.postgresql.org/docs/current/storage-toast.html) for large values. An application-wide blob conversion would require rewriting query and indexing behavior without resolving a database size problem here.

For future cloud knowledge storage, benchmark compression across the whole approved library, implement bounded decompression and format validation in the readers, and enforce an upload budget with room for customer assets before publishing compressed files. Removing these cloud copies is not permission to republish the library or automatically delete future uploads.
