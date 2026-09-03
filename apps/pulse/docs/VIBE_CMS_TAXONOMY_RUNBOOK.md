# Vibe taxonomy normalization runbook

This runbook migrates taxonomy usage without removing `taxonomyTermIds` or changing
revision snapshots. Perform one environment at a time.

## 1. Dry run

Run:

```bash
npm run vibes:taxonomy:backfill:dry-run
```

Save the JSON output. Do not continue while `unknownLegacyIds` or `duplicateIds` are
unexpected. Confirm every tenant appears and `expectedRelationships` is plausible.

## 2. Gated backfill

Set `VIBE_TAXONOMY_BACKFILL_WRITE=1` only for the command process, then run:

```bash
npm run vibes:taxonomy:backfill:write
```

Save `addedRelationships`, `removedRelationships`, and `unresolved`. Run the command a
second time; both relationship change counts must be zero.

## 3. Dual-write observation

Enable `VIBE_TAXONOMY_NORMALIZED_WRITE=1`. Leave normalized reads disabled. Create or
edit controlled test Vibes, add and remove terms, and confirm draft saves still succeed.
Unknown IDs and synchronization failures appear as structured warnings and must be
resolved before cutover.

## 4. Read comparison

Enable `VIBE_TAXONOMY_COMPARE_READS=1`. Read:

```text
/api/vibes/taxonomy/reconciliation?tenantId=<tenant-id>
```

Capture the response for every tenant. Require `state: "agrees"`, equal totals, and an
empty `mismatchTermIds` list throughout the observation window.

## 5. Count cutover

Enable `VIBE_TAXONOMY_NORMALIZED_READ=1` while keeping comparison and dual-write enabled.
The directory API response shape does not change. Verify taxonomy filtering, counts, and
trash exclusion before considering the cutover complete.

Enable `VIBE_TAXONOMY_MANAGE_TERMS=1` only after normalized reads are active. Term and
taxonomy mutation routes require both flags, matching the management capability returned
to the directory UI. Disabling either flag makes those mutation routes unavailable.

## Rollback

Disable `VIBE_TAXONOMY_NORMALIZED_READ` first to restore embedded count authority. If
needed, disable `VIBE_TAXONOMY_NORMALIZED_WRITE` to stop relationship changes. Leave the
normalized collections intact for diagnosis; do not delete them during rollback. The
embedded IDs and revision snapshots remain the recovery source throughout this phase.

## Completion evidence

- Initial and repeated backfill reports.
- Per-tenant reconciliation responses.
- One add-term, remove-term, trash, and restore verification.
- Timestamped flag changes and rollback owner.
- Final confirmation that API response fields remain `{ terms, counts }`.
