# Vibe Dictionary: WordPress-Style CMS Plan

Owner: Codex  
Product owner: Taz  
Status: Planning

## Objective

Turn the Vibe Dictionary from a creative extraction surface into a dependable content-management system for reusable Jamie and agent-site brand systems.

The target is WordPress-like in workflow and information architecture, while preserving the more expressive Vibe Lab as the creative authoring tool.

```text
Vibe Lab -> draft vibe -> admin review -> published vibe version -> Launch Kit -> public agent site
```

## Product Boundary

### Vibe Lab

Creative workspace for extracting, experimenting with, and saving visual and linguistic ideas from source media.

### Admin Vibes

WordPress-style management workspace for searching, editing, reviewing, revising, publishing, archiving, and restoring vibes.

### Launch Kit

Consumer of published vibe versions. It must not silently consume arbitrary mutable drafts.

### Public Agent Site

Renders the selected published vibe as validated theme and voice tokens.

## Target Workflow

1. Create a draft from Vibe Lab or the admin editor.
2. Complete title, slug, description, tokens, source, and taxonomy.
3. Save and autosave revisions.
4. Preview the vibe against a representative agent site.
5. Submit for review.
6. Approve and publish a version.
7. Apply the published version in Launch Kit.
8. Roll back to a prior published version when needed.

## Phase 1: Secure The Existing Model

### VIBE-001: Define the canonical schema

Extend `Vibe` with:

- `title` and stable `slug`.
- `status`: `draft`, `review`, `published`, `archived`, `trash`.
- `authorId`, `updatedBy`, and `publishedBy`.
- `publishedRevisionId`.
- `excerpt` and long description.
- Structured visual tokens.
- Structured linguistic tokens.
- Taxonomy term IDs.
- Source media metadata and attribution.
- `createdAt`, `updatedAt`, `publishedAt`, and `archivedAt`.

Acceptance: legacy records parse into the new schema without losing existing fields.

### VIBE-002: Validate and authorize the API

Replace arbitrary body upserts in `/api/jamie/vibes` with:

- Zod input contracts.
- Authentication and role checks.
- Field allowlisting.
- Server-generated IDs and timestamps.
- Rate limiting for extraction and writes.
- Tenant ownership checks where a vibe is applied to an agent site.

Acceptance: unauthenticated writes, unknown fields, malformed colors, invalid statuses, and cross-tenant updates are rejected.

### VIBE-003: Preserve and normalize legacy data

Create a migration or normalization job that:

- Generates slugs from existing names.
- Assigns legacy records to `draft` or `published` according to current usage.
- Maps `visualParameters` into the canonical token structure.
- Maps `linguisticLogic` into the canonical voice structure.
- Records the original document shape in migration metadata.

Acceptance: the current Vibe Lab and Launch Kit continue working during migration.

## Phase 2: Build the WordPress-Style Admin Workspace

### VIBE-101: Add the admin shell

Create `/admin/vibes` with:

- Persistent admin navigation.
- Vibes section and active state.
- “Add New Vibe” action.
- Search input.
- Status, taxonomy, author, and date filters.
- Sortable updated-date and title columns.
- Pagination.
- Empty, loading, and error states.

The visual target is dense and quiet: neutral surfaces, compact controls, clear hierarchy, and minimal decorative animation.

### VIBE-102: Build the list table

Each row should show:

- Vibe title and slug.
- Status.
- Preview color.
- Taxonomy terms.
- Author.
- Last modified date.
- Published version date.
- Row actions.

Actions:

- Edit.
- Preview.
- Submit for review.
- Publish.
- Archive.
- Move to trash.
- Restore.

Acceptance: an operator can find and change the state of a vibe without opening Vibe Lab.

### VIBE-103: Create the edit screen

Create `/admin/vibes/[vibeId]/edit` with:

- Title and slug fields.
- Description and excerpt.
- Visual token editor.
- Linguistic token editor.
- Taxonomy selector.
- Source and attribution fields.
- Live preview.
- Save Draft, Preview, Submit for Review, Publish, and Archive controls.
- Revision status and last-saved information.

Acceptance: all persisted fields can be edited without raw JSON.

## Phase 3: Add Publishing Safety

### VIBE-201: Implement revisions

Create immutable vibe revisions containing:

- Revision ID.
- Vibe ID.
- Full normalized snapshot.
- Author.
- Created timestamp.
- Parent revision ID.
- Change summary.

Only a revision can be published. The mutable working document remains a draft pointer.

### VIBE-202: Add preview and compare

Support:

- Draft preview.
- Published preview.
- Side-by-side revision comparison.
- Preview against desktop and mobile site layouts.
- Preview with Jamie response examples.

Acceptance: an operator can see what changed before publication.

### VIBE-203: Add publish gates

Block publication when:

- Required colors are invalid or lack readable contrast.
- Required title, slug, description, or source fields are missing.
- Linguistic rules are empty.
- Theme tokens contain unsupported CSS values.
- The vibe references missing media.
- The agent-site compliance review is incomplete when the vibe is tenant-specific.

Every publication records actor, revision, timestamp, and reason.

### VIBE-204: Add rollback

Allow an operator to restore a previously published revision by creating a new revision from it. Never rewrite the old published record.

Acceptance: rollback is auditable and does not mutate historical revisions.

## Phase 4: Add Taxonomy and Media

### VIBE-301: Add taxonomy

Initial controlled taxonomies:

- Mood: calm, tactical, luxurious, playful.
- Audience: buyer, seller, rental, brokerage.
- Visual family: light, dark, editorial, high-contrast.
- Voice: warm, concise, analytical, energetic.
- Industry use: real estate, hospitality, commerce, personal brand.

Support filtering and discovery by term.

### VIBE-302: Add source-media management

Track:

- Source media ID and URL/path.
- Attribution.
- Extraction date.
- Extraction method.
- Consent or ownership note.
- Thumbnail or preview asset.

The dictionary should distinguish an extracted source from a manually authored vibe.

## Phase 5: Connect Launch Kit Safely

### VIBE-401: Consume published versions

Change Launch Kit to select a published vibe revision rather than a mutable document.

Store:

- Vibe ID.
- Revision ID.
- Slug.
- Applied timestamp.
- Applying operator.

Acceptance: editing a draft does not change a live agent site.

### VIBE-402: Add site preview and rollback

Show the selected vibe in the Launch Kit preview and allow a previously published revision to be reapplied.

### VIBE-403: Export stable tokens

Expose validated outputs for:

- CSS custom properties.
- Jamie voice configuration.
- Launch Kit branding configuration.
- JSON export/import.

## Phase 6: WordPress-Like Extensibility

Only after the core workflow is stable:

- REST-style read endpoints.
- Webhook on publish.
- Import/export bundles.
- Bulk editing.
- Scheduled publishing.
- Role-specific capabilities.
- Optional block-based vibe composition.

Do not begin with a block editor. The list, edit, revision, and publishing workflows deliver the majority of the WordPress feel with less risk.

## Security and Data Rules

- Public consumers may read published vibes only.
- Operators may manage vibes within their authorized scope.
- Drafts and revisions are never exposed through public site routes.
- Source media URLs are validated and sanitized.
- CSS values are parsed through an allowlisted token schema.
- Publication and rollback are audited.
- Deletion is soft-delete only; historical revisions remain recoverable.
- The API never accepts arbitrary Mongo update operators from the client.

## Success Metrics

- An operator can create and publish a vibe in under five minutes.
- An operator can find any vibe in under 30 seconds.
- A draft edit never changes a published site.
- Every published site identifies its vibe revision.
- Every rollback is reproducible from the revision history.
- Zero unauthorized vibe writes in route tests.
- Zero invalid token values reach a public site.

## Delivery Order

1. VIBE-001: canonical schema.
2. VIBE-002: API validation and authorization.
3. VIBE-003: legacy normalization.
4. VIBE-101: admin shell and list table.
5. VIBE-103: edit screen.
6. VIBE-201: revisions.
7. VIBE-203: publish gates.
8. VIBE-401: Launch Kit published-version consumption.
9. VIBE-301: taxonomy and media management.
10. VIBE-402 and VIBE-403: preview, rollback, and token export.

## Release Gates

- Existing Vibe Lab extraction and save flow still works.
- Launch Kit can read legacy and normalized records during migration.
- All admin writes are authenticated and authorized.
- Draft, review, published, archived, and trash states have tests.
- Revisions are immutable and rollback creates a new revision.
- Public routes expose published versions only.
- Desktop and mobile admin workflows are verified.
- No unrelated styling or billing changes ship with the first CMS slice.
