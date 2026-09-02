# Vibe CMS normalized taxonomy migration plan

Owner: Luna implementation handoff  
Prerequisite: PR #75 UI verification and merge

## Implementation status

Implemented on PR #75:

- Three normalized Mongoose models and required indexes.
- Legacy-ID resolver and idempotent relationship repository.
- Deterministic controlled-term seed.
- Read-only backfill analysis and explicitly gated write mode.
- Disabled-by-default draft dual write.
- Embedded/normalized count comparison and normalized-read cutover flag.
- Read-only reconciliation endpoint and route-level rollback tests.
- Operator runbook covering observation, cutover, and rollback.

Operationally pending: merge/deploy, run the dry-run report, execute an approved backfill,
observe zero mismatches for every tenant, and then decide whether to enable normalized reads.
Embedded IDs must not be removed in this phase.

### Dry-run evidence — 2026-09-02

Command: `npm run vibes:taxonomy:backfill:dry-run`

- Mode: `dry-run`
- Total Vibes: 6
- Expected relationships: 9
- Duplicate embedded IDs: 0
- Unknown legacy IDs: 0
- Tenants: `default` (6 Vibes, 9 expected relationships)
- Result: eligible for an explicitly approved gated backfill

## Current contract

Vibes currently store controlled IDs such as `mood:calm` in both
`Vibe.taxonomyTermIds` and `draftPayload.taxonomyTermIds`. The editor, presets,
revision snapshots, and `/api/vibes/taxonomy` depend on that string-array contract.
The migration must preserve it until the final cutover.

## Target collections

### `vibe_taxonomies`

- `_id`: ObjectId
- `tenantId`: string
- `slug`: stable machine name, for example `property-type`
- `label`: operator-facing name
- `hierarchical`: boolean
- `status`: `active | archived`
- timestamps
- unique index: `{ tenantId: 1, slug: 1 }`

### `vibe_terms`

- `_id`: ObjectId
- `tenantId`: string
- `taxonomyId`: ObjectId
- `slug`: stable machine name, for example `condo`
- `label`: operator-facing name
- `description`: optional string
- `parentTermId`: optional ObjectId for hierarchical taxonomies
- `legacyId`: optional compatibility ID, for example `mood:calm`
- `status`: `active | archived`
- timestamps
- unique index: `{ tenantId: 1, taxonomyId: 1, slug: 1 }`
- sparse unique index: `{ tenantId: 1, legacyId: 1 }`

### `vibe_term_relationships`

- `_id`: ObjectId
- `tenantId`: string
- `vibeId`: string
- `termId`: ObjectId
- `assignedBy`: string
- timestamps
- unique index: `{ tenantId: 1, vibeId: 1, termId: 1 }`
- lookup index: `{ tenantId: 1, termId: 1, vibeId: 1 }`

## Canonical implementation sequence

1. Add `VibeTaxonomy`, `VibeTerm`, and `VibeTermRelationship` Mongoose models.
2. Add a repository module that resolves legacy IDs and reads/writes relationships.
3. Seed the current constants from `lib/cms/taxonomy.ts` using deterministic
   taxonomy slugs, term slugs, and `legacyId` values.
4. Add a dry-run backfill command that reports Vibe count, relationship count,
   unknown legacy IDs, duplicates, and tenant totals without writing.
5. Add an explicitly enabled write mode that upserts relationships idempotently.
6. Dual-read `/api/vibes/taxonomy`: keep the current response shape while comparing
   relationship counts against embedded-array counts and logging mismatches.
7. Dual-write `saveVibeDraft`: keep `taxonomyTermIds` unchanged and synchronize
   relationships in the same Mongo transaction where transactions are available.
8. Add reconciliation tests for repeated writes, removed terms, unknown IDs,
   tenant isolation, archived terms, and rollback.
9. After a zero-mismatch observation window, switch directory counts to relationships.
10. Remove embedded writes only in a later cleanup PR; revision snapshots retain their
    historical string IDs permanently.

## Compatibility rules

- API responses continue returning `{ id, group, term }` during migration.
- `VibeDraft.taxonomyTermIds` remains a string array.
- Existing presets require no immediate changes.
- Published revision snapshots are immutable and are never backfilled.
- Unknown legacy IDs are reported and preserved, never silently discarded.
- Term deletion is archival while any relationship or revision snapshot references it.

## Rollback

Gate relationship reads and writes behind separate environment flags. Disabling the
read flag immediately restores embedded-array authority. Disabling the write flag stops
new relationship mutations without affecting draft saves. The backfill is idempotent;
rollback does not delete normalized records until reconciliation evidence is retained.

- `VIBE_TAXONOMY_NORMALIZED_WRITE=1`: best-effort relationship synchronization after a successful embedded draft save.
- `VIBE_TAXONOMY_COMPARE_READS=1`: compare embedded and normalized directory counts and log mismatches.
- `VIBE_TAXONOMY_NORMALIZED_READ=1`: return normalized directory counts while preserving the response shape.

## Acceptance evidence

- Seed and backfill dry run reports zero unknown IDs for controlled terms.
- A repeated backfill creates no duplicate relationships.
- Embedded and normalized usage counts agree for every tenant and term.
- Saving a draft adds and removes relationships correctly while preserving payload IDs.
- Trash exclusion matches the existing taxonomy API.
- Disabling normalized reads restores current behavior without deployment rollback.
