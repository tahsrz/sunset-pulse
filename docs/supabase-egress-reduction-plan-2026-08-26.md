# Supabase Egress Reduction Plan

## Goal

Reduce cached egress after the 8.61 GB overage without breaking listing freshness, totals, or operator workflows.

## Immediate Controls

- Keep KDS disabled.
- Keep public listing and Kepler feeds revalidated at 60 seconds.
- Cap map/dataset responses to a conservative maximum until usage is understood.
- Do not expose Supabase Storage cartridge downloads publicly while their response sizes and access frequency are unknown.
- Keep remote cartridge synchronization disabled unless `REMOTE_ATLAS_SYNC_ENABLED=true` is explicitly set in the server environment.

## Measurement

For the same UTC window each day, record Supabase usage by source:

| Source | Measure | Decision threshold |
| --- | --- | --- |
| Database API | Cached egress and request count | Declines after feed cap and revalidation |
| Storage | Egress by bucket/object prefix | Disable or move large public objects if dominant |
| Public listings | Response bytes and cache hit behavior | Page-sized responses only |
| Kepler | Dataset response bytes and request count | No unbounded client refresh loop |

## Historical Backfill: August 23-24

Record the approximately 9 GB separately from the shadow billing checkpoint series. Use the Supabase project usage dashboard as the authoritative source for egress and record the dashboard export or screenshot reference.

| Date | Egress | Egress category | Suspected source | Source reference | Confidence | Notes |
| --- | ---: | --- | --- | --- | --- | --- |
| 2026-08-23 | unknown | cached egress | unknown |  | pending |  |
| 2026-08-24 | unknown | cached egress | unknown |  | pending |  |

Do not infer a per-day split from the combined 9 GB. If the dashboard exposes endpoint, bucket, or cache dimensions, preserve those values; otherwise record the total as an aggregate and label the source unknown.

## Execution Order

1. Apply feed caps and cache controls.
2. Confirm public listing consumers tolerate bounded datasets.
3. Replace `/api/properties` prefetch-plus-slice with count-plus-page queries.
4. Add image/cartridge delivery through a CDN or signed, short-lived URLs.
5. Re-enable remote cartridge sync only after Storage egress is understood.
6. Re-enable KDS only after three clean daily observations.

## Rollback

Restore the prior feed cap only if a documented consumer requires it and Supabase usage evidence shows the request is not a material egress source. Keep KDS disabled during rollback analysis.
