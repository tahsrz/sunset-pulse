# Vibe Dictionary CMS: Luna Implementation Baseline

Owner: Codex  
Product owner: Taz  
Status: Planning baseline  
Target executor: GPT-5.6 Luna

## Purpose

This document is the durable implementation baseline for turning Vibe Dictionary into a WordPress-style content-management system while preserving Vibe Lab as its expressive authoring surface.

It is written for small, focused Luna implementation tasks. Each task should receive settled architectural decisions, explicit contracts, narrow file boundaries, and executable acceptance checks. Luna should not be asked to redesign the system while implementing a ticket.

## Product Boundary

```text
Vibe Lab
  -> mutable draft
  -> admin review
  -> immutable published revision
  -> explicit Launch Kit application
  -> public agent site
```

- **Vibe Lab** extracts and experiments with visual and linguistic ideas.
- **Admin Vibes** manages drafts, review, revisions, publishing, archive, trash, and rollback.
- **Launch Kit** selects a published revision for a specific site.
- **Public Agent Site** consumes compiled tokens from that selected immutable revision.

## Locked Architecture Decisions

These decisions are the baseline unless a new architecture decision record explicitly replaces one.

1. Mongo is authoritative for vibes, revisions, audit events, and active vibe revision pointers during the first implementation.
2. Supabase may remain a compatibility projection, but it does not compete for authority by freshness.
3. Publishing a vibe and applying a published revision to a site are separate domain operations.
4. Published and submitted revisions are immutable.
5. Public rendering reads compiled revision output only and has no path to draft payloads.
6. Autosave updates a mutable working draft; it does not create a permanent revision for every keystroke.
7. Rich Vibe Lab effects remain distinct from safe Launch Kit theme tokens.
8. Arbitrary custom CSS values are excluded from the initial release.
9. Tenant scope and actor capability are checked on every administrative operation.
10. Legacy Vibe Lab and Launch Kit records remain readable throughout migration.
11. Rollback creates a new revision from an old snapshot; historical records are never rewritten.
12. A live site's referenced revision remains resolvable even if its parent vibe is archived or moved to trash.

## Existing System Constraints

The current application includes:

- A permissive legacy Mongoose `Vibe` model.
- An `/api/jamie/vibes` route that currently accepts broad body upserts.
- Launch Kit data mirrored to Supabase and Mongo.
- Site-config reads that currently select the freshest copy.
- Existing operator-access, Launch Kit validation, readiness gates, and test infrastructure.

A true ACID publication cannot span independent Mongo and Supabase writes. The authoritative transaction must complete in Mongo first. Compatibility projections occur after commit and must never override the authoritative record.

## Domain Model

```text
Vibe
  |-- mutable draft payload
  |-- currentDraftVersion
  |-- publishedRevisionId -----------+
  |-- workflow state                 |
  |                                  v
  +---------------------------- VibeRevision
                                   |-- immutable normalized snapshot
                                   |-- compiled cssVars
                                   |-- compiled voiceConfig
                                   |-- validation report
                                   |-- schema version
                                   +-- content hash

AgentSite
  +-- activeVibeRevisionId --------> VibeRevision

VibeAuditEvent
  +-- append-only operational history
```

### Vibe

The editable identity and workflow record:

- Stable ID, tenant ID, title, and tenant-unique slug
- Status and pre-trash status
- Mutable normalized draft payload
- Draft version for optimistic concurrency
- Published revision pointer
- Taxonomy and searchable metadata
- Author, updater, publisher, and timestamps

The Vibe record is never the public rendering payload.

### Vibe Revision

An immutable deployable or reviewable snapshot:

- Revision ID and monotonically increasing revision number
- Vibe ID and tenant ID
- Parent revision ID
- Full normalized visual, linguistic, source, and taxonomy snapshot
- Compiled `cssVars` and `voiceConfig`
- Validation report and schema version
- Content hash, author, timestamp, and change summary
- Submission and publication metadata when applicable

### Agent Site Pointer

The authoritative site record stores:

- `activeVibeRevisionId`
- Applied timestamp
- Applying actor
- Optional denormalized vibe ID, slug, and revision number for diagnostics

### Audit Event

Append-only events include:

- Draft created
- Submitted
- Rejected
- Published
- Applied to site
- Archived
- Moved to trash
- Restored
- Rolled back
- Compatibility projection succeeded or failed

Revision history explains content changes. Audit history explains operational actions.

## Token Model

Visual authoring must preserve the expressive legacy Vibe Lab data without exposing unsafe values to public sites.

```ts
type VisualTokens = {
  theme: {
    colors: unknown;
    typography: unknown;
    spacing: unknown;
    radius: unknown;
    elevation: unknown;
  };
  effects: {
    meshColor?: string;
    bloomIntensity?: number;
    glitchFrequency?: number;
    particleDensity?: number;
    motionPreset?: string;
  };
};
```

- `theme` contains validated values that may compile into public CSS variables.
- `effects` preserves richer Vibe Lab concepts and is opt-in for approved renderers.
- Public consumers receive compiled output, not arbitrary author-entered CSS.

## Workflow State Machine

Canonical statuses:

- `draft`
- `in_review`
- `published`
- `archived`
- `trash`

Rules:

```text
draft -> in_review -> published -> archived
  ^          |            |           |
  +----------+            +-----------+

draft | in_review | archived -> trash
trash -> recorded pre-trash state
```

- Editing published content creates or updates a new draft without mutating the published revision.
- Submitting freezes an immutable review revision.
- Rejection returns the editorial record to draft with a reason.
- Publishing targets a specific immutable revision.
- Applying targets a published revision and a specific authorized site.
- Rollback copies an earlier snapshot into a new revision.

The transition rules must live in one shared pure domain function used by services, routes, and UI action rendering.

## Publication Pipeline

```text
Draft
  -> shape validation
  -> semantic validation
  -> contrast validation
  -> security validation
  -> CSS-variable compilation
  -> voice-config compilation
  -> immutable revision artifact
```

Publication transaction:

```text
Validate and compile requested revision
  -> begin Mongo transaction
  -> insert/finalize immutable revision
  -> update Vibe.publishedRevisionId and status
  -> append audit event
  -> commit
  -> update compatibility projections asynchronously
```

Applying to a site is a separate transaction:

```text
Resolve published revision
  -> validate tenant and actor
  -> begin Mongo transaction
  -> update AgentSite.activeVibeRevisionId
  -> append audit event
  -> commit
  -> update compatibility projections asynchronously
```

The UI may offer a combined “Publish and apply” experience, but the domain operations remain explicit and separately auditable.

## Public Runtime Contract

```text
Tenant host
  -> authoritative AgentSite lookup
  -> activeVibeRevisionId
  -> indexed VibeRevision point lookup
  -> project cssVars and voiceConfig only
  -> render public site
```

Runtime rules:

- No public query may reach `Vibe.draftPayload`.
- No public endpoint accepts an arbitrary draft ID.
- Missing or invalid revisions fail safely to an approved default theme and voice configuration.
- The resolved revision ID is available in server-side diagnostics.
- Public reads use indexed point lookups and narrow projections.

## Admin UI Information Architecture

### Vibe list: `/admin/vibes`

The list is the operational center and includes:

- Add New Vibe action
- Search
- Status, taxonomy, author, and date filters
- URL-backed filter and pagination state
- Sortable title and modified-date columns
- Title, slug, status, preview colors, taxonomy, author, modified date, published date, and live-site usage
- Row actions permitted by state and actor capability
- Loading, empty, error, desktop, and mobile states

The visual direction is dense, quiet, neutral, compact, and minimally animated.

### Editor: `/admin/vibes/[vibeId]/edit`

Desktop layout:

- Main column for metadata, visual theme, effects, and voice
- Right rail for workflow state, publication controls, taxonomy, source, and validation
- Preview panel or drawer for site and Jamie examples

Mobile layout:

- Stacked editor sections
- Sticky action bar
- Preview as a full-screen panel or drawer

The editor exposes structured controls rather than raw JSON. A read-only advanced JSON view may be added later for diagnostics.

### Autosave

- Maintain explicit dirty, saving, saved, conflict, and error states.
- Debounce draft writes.
- Send the expected draft version with every write.
- Return a conflict when another actor has advanced the draft.
- Provide reload, compare, or duplicate-as-new-draft recovery.
- Permanent revisions are created by checkpoints, submission, publication, and rollback—not every autosave.

## Administrative API

Routes are thin adapters over tested application services.

```text
GET    /api/admin/vibes
POST   /api/admin/vibes
GET    /api/admin/vibes/:id
PATCH  /api/admin/vibes/:id/draft
POST   /api/admin/vibes/:id/submit
POST   /api/admin/vibes/:id/reject
POST   /api/admin/vibes/:id/publish
POST   /api/admin/vibes/:id/archive
POST   /api/admin/vibes/:id/trash
POST   /api/admin/vibes/:id/restore
GET    /api/admin/vibes/:id/revisions
GET    /api/admin/vibes/:id/revisions/:revisionId
POST   /api/admin/vibes/:id/rollback
GET    /api/admin/sites/:siteId/vibe
POST   /api/admin/sites/:siteId/apply-vibe
```

Every mutation route must:

1. Authenticate the operator.
2. Resolve tenant scope server-side.
3. Check the required capability.
4. Parse an allowlisted input contract.
5. Call one application service.
6. Map domain failures to stable error codes.
7. Never pass a request body directly to Mongo.

## Luna Work Packages

### Batch 0: Architecture Lock

Human or stronger-model review is required before implementation proceeds.

- Record datastore authority and projection behavior.
- Confirm domain terminology and state transitions.
- Confirm schemas and route contracts.
- Confirm tenant and role capabilities.
- Confirm migration and rollback strategy.

Exit condition: no unresolved cross-cutting architectural choice remains in a Luna ticket.

### Batch 1: Safe Foundation

#### LUNA-A01: Shared schemas

Create schemas for Vibe, draft payload, revision, visual tokens, linguistic tokens, source metadata, taxonomy, validation reports, and audit events.

Acceptance:

- Valid legacy and normalized fixtures parse.
- Unknown write fields are rejected.
- Tests cover every status and token group.

#### LUNA-A02: Workflow transitions

Implement one pure transition function for save, submit, reject, publish, archive, trash, restore, and rollback.

Acceptance:

- Every valid and invalid transition is tested.
- Failures return stable error codes.
- UI and API can consume the same transition result.

#### LUNA-A03: Persistence models and indexes

Create normalized Vibe, VibeRevision, and VibeAuditEvent persistence models plus the authoritative site revision pointer.

Acceptance:

- Tenant-scoped slug uniqueness exists.
- Revision lookup and ordering indexes exist.
- Immutable revisions cannot be modified through repository methods.

#### LUNA-A04: Legacy normalization

Map legacy fields without discarding original data:

```text
name             -> title
vibeId           -> stable legacy identity
linguisticLogic  -> linguistic tokens
visualParameters -> visual.effects
sourceVideoPath  -> source metadata
metadata         -> migration metadata
```

Acceptance:

- Migration is idempotent.
- Original shape is recoverable.
- Current Vibe Lab records remain readable.

#### LUNA-B01: Secure existing API

Replace arbitrary body upserts with authentication, authorization, allowlisted schemas, server-generated metadata, tenant checks, and bounded rate limits.

Acceptance:

- Anonymous writes fail.
- Unknown fields fail.
- Mongo operators cannot be injected.
- Cross-tenant operations fail.

Batch 1 exit condition: normalized records and safe write boundaries exist before new UI mutations are introduced.

### Batch 2: Application Services and Admin List

#### LUNA-B02: Query service

Implement tenant-scoped search, filters, sorting, and bounded pagination using indexed fields.

#### LUNA-B03: Draft service

Implement create, load, autosave, slug generation, and optimistic concurrency.

#### LUNA-B04: Revision service

Implement checkpoints, revision summaries, revision reads, and normalized comparison.

#### LUNA-B05: Publication compiler

Implement deterministic validation and compilation into `cssVars` and `voiceConfig` with a content hash.

#### LUNA-C01: List and create routes

Implement `GET /api/admin/vibes` and `POST /api/admin/vibes` as thin service adapters.

#### LUNA-D01: Admin shell

Add navigation, active state, page header, Add New Vibe action, and responsive frame.

#### LUNA-D02: Management controls

Create search, filters, status badges, pagination, sortable headers, skeletons, empty states, errors, and confirmation dialogs.

#### LUNA-D03: Vibe list screen

Build the URL-backed list table with permission-aware row actions.

Batch 2 exit condition: an authorized operator can securely find and create normalized vibes.

### Batch 3: Editor and Editorial Workflow

#### LUNA-E01: Editor frame

Create the editor layout, status rail, preview region, sticky actions, and save-state indicator.

#### LUNA-E02: Metadata editor

Add title, slug, excerpt, description, source, attribution, and ownership fields.

#### LUNA-E03: Visual theme editor

Add structured color, typography, spacing, radius, elevation, and contrast controls.

#### LUNA-E04: Visual effects editor

Preserve mesh, bloom, glitch, particle, and motion concepts without exposing them automatically to public templates.

#### LUNA-E05: Voice editor

Add tone, scales, vocabulary, replacements, directives, and response examples.

#### LUNA-E06: Taxonomy editor

Use controlled taxonomy terms for the initial release.

#### LUNA-E07: Autosave controller

Implement debounced saves, explicit save state, optimistic concurrency, recovery, and unsaved-change warnings.

#### LUNA-E08: Workflow controls

Render available actions from shared transition and permission rules.

#### LUNA-C02: Draft and workflow routes

Implement draft, submit, reject, publish, archive, trash, and restore routes.

Batch 3 exit condition: an operator can edit, validate, submit, reject, and publish without editing JSON.

### Batch 4: Preview and Revision Safety

#### LUNA-F01: Shared preview renderer

Render desktop and mobile previews from compiled revision output.

#### LUNA-F02: Jamie voice preview

Render deterministic example scenarios from stored prompts and expected voice rules. Publication must not depend on nondeterministic generation.

#### LUNA-F03: Revision timeline

Show actor, date, state, summary, and publication markers.

#### LUNA-F04: Revision comparison

Begin with field-level added, removed, and changed values.

#### LUNA-F05: Rollback

Create a new revision from a selected historical snapshot with a required reason.

Batch 4 exit condition: operators can understand changes before publishing and can reproduce a prior state without rewriting history.

### Batch 5: Launch Kit and Public Runtime

#### LUNA-G01: Published revision selection

Show published revisions only, including the current applied revision and warnings about unpublished draft changes.

#### LUNA-G02: Explicit site application

Require site selection, preview, readiness checks, confirmation, and an audit reason.

#### LUNA-G03: Runtime resolution

Resolve the tenant site's immutable revision by indexed ID and project only compiled tokens.

#### LUNA-G04: Compatibility projection

Update Supabase after authoritative commits, record projection state, and retry failures without allowing projection freshness to override Mongo.

Batch 5 exit condition: a draft edit cannot change a live site, and a published revision can be explicitly applied and rolled back.

### Batch 6: Release Verification

#### LUNA-H01: Security tests

Cover authentication, authorization, tenant isolation, unknown fields, Mongo operator injection, draft exposure, and application of unpublished revisions.

#### LUNA-H02: Workflow tests

Cover every allowed and rejected transition.

#### LUNA-H03: Migration tests

Use representative records from the existing Vibe Dictionary backup.

#### LUNA-H04: UI tests

Cover list filters, autosave, validation, submit, publish, apply, archive, trash, restore, and rollback.

#### LUNA-H05: End-to-end proof

1. Create a vibe.
2. Edit its tokens.
3. Submit it.
4. Publish revision 1.
5. Apply revision 1 to a test site.
6. Edit the working draft.
7. Confirm the public site remains on revision 1.
8. Publish revision 2.
9. Confirm the site remains on revision 1.
10. Apply revision 2.
11. Roll back by creating revision 3 from revision 1.

Batch 6 exit condition: security, desktop, mobile, migration, rollback, and failure-recovery gates pass.

## Standard Luna Ticket Template

Use this template when starting each implementation task.

```md
# Objective

Implement one concrete outcome.

## Context

- Relevant architecture decision:
- Existing code paths:
- Upstream contract:
- Downstream consumers:

## In Scope

- Exact behavior to add or change.
- Exact files or directory boundary when known.

## Out of Scope

- Related work that must not be included.

## Contracts

- Input schema:
- Output schema:
- Domain errors:
- Authorization rule:
- Tenant rule:

## Acceptance Criteria

- Observable behavior.
- Failure behavior.
- Compatibility requirement.

## Verification

- Focused typecheck or lint command.
- Focused unit tests.
- Integration or browser check if applicable.

## Completion Report

- Files changed.
- Tests run and results.
- Assumptions made.
- Remaining risks or follow-up tickets.
```

## Luna Task Rules

- One ticket has one primary outcome.
- Prefer a small coherent change over a broad layer rewrite.
- Do not combine schema design, database migration, API creation, and full UI implementation in one task.
- Do not invent a new architecture when this baseline already decides the issue.
- Preserve unrelated user changes in the worktree.
- Use shared schemas and transition rules instead of duplicating them in routes or components.
- Add focused tests with every behavior change.
- Report assumptions instead of silently broadening scope.
- Stop and escalate when the required choice affects security, tenancy, transactions, or migration cutover.

## Escalation Triggers

Pause Luna implementation and request architectural review when a task encounters:

- A choice between Mongo and Supabase authority
- A transaction spanning independent stores
- A new role or tenant-access rule
- A breaking public runtime contract
- A migration that may discard or reinterpret legacy data
- A need for arbitrary CSS execution
- A change to revision immutability
- A change that could make draft data publicly reachable
- Conflicting or duplicated site pointers
- A race condition without an established concurrency rule

## Release Gates

- Existing Vibe Lab extraction and save flows still work.
- Legacy and normalized records remain readable during migration.
- All admin writes are authenticated, authorized, allowlisted, and tenant-scoped.
- Draft, review, published, archived, and trash transitions are tested.
- Revisions are immutable.
- Rollback creates a new revision.
- Public routes expose compiled published output only.
- Editing a draft never changes a live site.
- Each public site identifies its applied revision.
- Desktop and mobile admin workflows are verified.
- Projection failure cannot override or corrupt authoritative state.
- No unrelated styling, billing, or scheduling changes ship with the first CMS slice.

## First Vertical Milestone

The first milestone is complete only when the system can:

> Create a vibe, edit structured fields, submit it, publish an immutable revision, apply that revision to one test site, and prove that later draft edits do not affect the live site.

This is the architectural proof. Taxonomy expansion, media management, bulk editing, scheduled publishing, webhooks, import/export, and block composition remain later phases.

## Selective GitHub Projects and References

These projects may accelerate later UI and token work. They are references or candidates, not automatic dependencies.

- [TanStack Table](https://github.com/TanStack/table): evaluate for server-side sorting, filtering, pagination, row selection, and future bulk actions in the Vibes list.
- [react-colorful](https://github.com/omgovich/react-colorful): preferred candidate for accessible, lightweight color controls in the visual editor.
- [KeystoneJS](https://github.com/Thinkmill/keystone): architecture reference for CMS fields, admin workflows, and access control; do not adopt as the CMS runtime.
- [Shopify Polaris Tokens](https://github.com/Shopify/polaris-tokens): naming and multi-format design-token reference.
- [Diez](https://github.com/diez/diez): typed token compilation and export reference; do not add unless cross-platform output becomes a requirement.
- [design-book](https://github.com/meodai/design-book): reference for derived tokens, contrast selection, and CSS-variable rendering.

Selection rule: preserve the custom domain, workflow, revision, and publication services. Add a dependency only when it removes meaningful UI risk or duplication without weakening tenant isolation or immutable revision guarantees.

## Implementation Status

Completed in the current working tree:

- Shared normalized token schemas in `lib/cms/vibeSchema.ts`.
- Shared workflow transition rules in `lib/cms/vibeWorkflow.ts`.
- Focused contract tests in `tests/unit/vibe-cms-contracts.test.ts`.
- Extended legacy Vibe persistence fields and indexes.
- Added immutable-oriented `VibeRevision` persistence model and indexes.
- Added operator authorization and strict allowlisted parsing to the legacy vibe write route.
- Added draft save and deterministic revision hashing services.
- Added transaction-aware immutable revision publication service.
- Added `activeVibeRevisionId` to the site configuration model.
- Added service-level tests for deterministic hashing and compiled token output.
- Added authenticated, tenant-scoped `GET /api/admin/vibes` with bounded search and pagination.
- Added authenticated `GET` and optimistic-concurrency `PATCH` admin detail route at `/api/admin/vibes/:vibeId`.
- Added authenticated, tenant-scoped revision history at `/api/admin/vibes/:vibeId/revisions`.
- Added authorized revision detail reads at `/api/admin/vibes/:vibeId/revisions/:revisionId` for admin preview.
- Added controlled taxonomy catalog and authenticated `GET /api/admin/vibes/taxonomy` endpoint.
- Added authorized source-media metadata read at `/api/admin/vibes/:vibeId/source`.
- Added strict `PATCH /api/admin/vibes/:vibeId/source` metadata updates.
- Added append-only audit-event persistence and publication audit recording inside the publish transaction.
- Added authenticated draft preview projection at `/api/admin/vibes/:vibeId/preview`.
- Added revision comparison and auditable rollback endpoints.
- Added the first `/admin/vibes/:vibeId/edit` editor shell with metadata and editorial status surfaces.
- Added explicit authenticated `POST /api/admin/vibes/:vibeId/submit` workflow transition.
- Added authenticated reject and archive lifecycle routes using shared transition rules.
- Added explicit published-revision application service and `/api/admin/sites/:siteId/apply-vibe` route.
- Propagated `activeVibeRevisionId` through the Launch Kit type, schema, normalization, and persistence serializers.
- Added a narrow published-revision runtime projection reader for future public-site integration.
- Added authenticated `GET /api/admin/sites/:siteId/vibe` for applied-revision visibility.
- Added lifecycle audit events for create, submit, reject, publish, apply, archive, trash, restore, and rollback.
- Added tenant-scoped audit history at `/api/admin/vibes/:vibeId/audit` and an operator audit timeline screen.
- Added server-authoritative publication from an immutable submitted revision.
- Applied published CSS variables and voice tone to the public site runtime, with active revision diagnostics.
- Persisted revision application timestamp and actor metadata on site configuration.

Next recommended slice:

- Add focused service/integration tests for draft conflicts, revision numbering, publication failures, and draft/live isolation.
- Add status-aware editor navigation for all lifecycle actions, including audit history.
- Verify the complete create → submit → publish → apply → public runtime flow on desktop and mobile.

Latest verification checkpoint (2026-08-26): GitHub unit tests, lint, Jamie E2E, Vercel preview comments, and Vercel deployment all passed after correcting the preview JSX type error and publication-gate fixture.

Remaining milestone proof is manual/runtime validation of the complete operator-to-public flow and draft/live isolation; no new architecture or broad audit work is required for this checkpoint.

Known verification note: the repository-wide TypeScript check currently reports pre-existing errors in unrelated Jamie guide, TAH, and weekly-dispatch tests. The focused Vitest runner also has an existing Windows path/config resolution failure; this baseline's new contract test has not yet run through that runner.

## Post-Implementation Review and Re-formed Execution Plan

This section supersedes the earlier `Next recommended slice` ordering. It does not replace the locked architecture decisions, domain contracts, Luna task rules, escalation triggers, or release gates above.

Current assessment: the first vertical milestone is approximately 60–65% complete. Luna has created substantial schema, service, API, runtime, and admin-UI scaffolding, but the submitted-review-published contract and the complete public-site proof still need to be closed.

### Review Findings

1. The current PR diff contains a large number of unrelated changes following the `53f1fec3` merge and `43200758` revert sequence. The CMS work must be isolated onto a clean branch before more feature work is accepted.
2. Submission currently changes the Vibe status to `in_review` but does not freeze an immutable review revision as required by the workflow contract.
3. Publication currently accepts a normalized draft snapshot from the client. Publication must instead target a specific immutable submitted revision and enforce the `in_review` to `published` transition.
4. Revision-number lookup is scoped by Vibe ID but not tenant ID. Numbering, parent selection, and uniqueness must use the same tenant/Vibe identity boundary.
5. Launch Kit and site-data code can resolve a published revision projection, but the public site does not yet visibly consume the compiled CSS variables or voice configuration.
6. Admin pages exist for most actions, but they are not yet presented as one status-aware editor workflow. Several screens require direct URL knowledge.
7. Focused coverage is still missing for optimistic draft conflicts, tenant-scoped numbering, transactional publication failure, immutable review submission, exact-revision publication, rollback lineage, and draft/live isolation.

### Phase 0: Recover a Clean PR

Create a clean branch from the intended current base and replay only the Vibe CMS changes. Limit the resulting diff to:

- Vibe CMS schemas, models, services, routes, tests, and UI.
- Narrow Launch Kit and public-site runtime integration required by the milestone.
- This baseline document.
- Explicitly intended legacy Vibe compatibility changes.

Do not carry unrelated billing, scheduling, tenancy, AI, notification, documentation, migration, or platform deletions into the replacement branch.

Exit condition: the PR diff contains only the approved CMS vertical slice and its narrow runtime integration.

### Phase 1: Correct the Editorial Contract

1. Keep draft saving mutable and versioned.
2. Make submit create an immutable review revision or checkpoint.
3. Store the submitted revision ID on the editorial Vibe record.
4. Change publish to accept a revision ID rather than a browser-supplied draft.
5. Require the Vibe to be `in_review` before publication.
6. Publish exactly the submitted immutable revision.
7. Preserve review and revision history when a submission is rejected.
8. Ensure later draft edits never mutate submitted or published snapshots.

Exit condition: the content reviewed is exactly the content published.

### Phase 2: Finish Revision Correctness

Add narrowly scoped behavior and tests for:

- Optimistic draft-version conflicts.
- Tenant-scoped revision numbering and parent selection.
- Concurrent revision-number collision behavior.
- Transaction rollback when revision creation, audit creation, or Vibe update fails.
- Rollback creating a new revision with explicit lineage.
- Protection against mutation of existing revision records through CMS services.

Exit condition: revision identity, ordering, immutability, and failure behavior are deterministic and covered by focused tests.

### Phase 3: Consolidate the Editor Workflow

- Present Preview, Submit, Publish, Reject, Archive, Trash, Source, Taxonomy, and Revisions as status-aware editor actions.
- Connect source metadata and taxonomy selection to the editor rail.
- Display dirty, saving, saved, conflict, and error states.
- Provide reload, compare, or duplicate recovery for draft conflicts without expanding into real-time collaborative editing.
- Retain the existing structured controls and add only fields needed for the first vertical milestone.

Exit condition: an operator can complete the editorial lifecycle without manually entering route URLs or editing JSON.

### Phase 4: Complete Launch Kit Application

- Display the currently applied revision for a selected site.
- Allow an authorized operator to apply a published revision.
- Confirm the exact site and revision before application.
- Display the applied revision after success.
- Use the established Launch Kit site identity and persistence path.

Exit condition: an operator can deliberately apply one published revision to one test site.

### Phase 5: Complete Public Consumption

- Apply compiled CSS variables at the public site root.
- Feed the published voice configuration into the existing Jamie/site configuration boundary.
- Preserve the approved fallback when the pointer or revision cannot be resolved.
- Make the resolved revision ID available in server-side diagnostics.

Exit condition: the public site visibly and behaviorally consumes the selected immutable revision.

### Phase 6: Prove the First Vertical Milestone

Run and record this focused scenario:

1. Create a Vibe.
2. Edit structured visual and linguistic fields.
3. Submit an immutable review revision.
4. Publish that exact revision.
5. Apply it to one test site.
6. Confirm the public site consumes it.
7. Modify the mutable draft.
8. Confirm the public site remains unchanged.
9. Explicitly apply a later revision or roll back and verify the intended change.

Use focused service tests plus manual desktop and mobile verification. If the existing E2E runner remains blocked by its known configuration issue, record that separately rather than widening the implementation ticket.

Exit condition: the architectural proof stated in `First Vertical Milestone` passes from operator UI through public runtime.

### Phase 7: Deferred Expansion

Do not add taxonomy expansion, media management, bulk editing, scheduled publishing, webhooks, import/export, block composition, broad security redesign, or unrelated audits until the first vertical milestone passes.

### Luna Resume Instruction

Start with Phase 0. After producing a clean, narrowly scoped PR diff, execute Phases 1–6 in order using the Standard Luna Ticket Template and the existing Luna Task Rules. Treat each phase as multiple small tickets where necessary. Do not skip the immutable review-revision correction, and do not begin deferred expansion while the first vertical milestone remains unproven.

## Pre-Merge Review Findings and Required Luna Actions

This section records the final merge-readiness review. These findings block production merge even when automated checks are green. Luna must complete them in the order below without broadening the CMS scope.

### Blocker 1: Isolate the PR Diff

The current PR contains approximately 351 changed files and extensive unrelated deletions or rewrites across profit, billing, scheduling, representation, tenancy, Atlas, migrations, tests, documentation, and CI configuration. This violates the release gate prohibiting unrelated work.

Required action:

1. Preserve the current branch and commits as recoverable history.
2. Produce a CMS-only PR diff against the intended current `main` base.
3. Include only Vibe CMS schemas, models, services, routes, UI, focused tests, this baseline, explicit legacy compatibility changes, and narrow Launch Kit/public-runtime integration.
4. Exclude unrelated product, platform, migration, documentation, test, and CI deletions.
5. Review the final changed-file list before any merge.

Exit condition: every file in the PR is directly justified by the first Vibe CMS vertical milestone.

### Blocker 2: Resolve the Production Site Pointer Path

The application service writes `activeVibeRevisionId` to Mongo `SiteConfig`, while public site loading checks Supabase first and returns immediately when a Supabase site record exists. A production site with a Supabase record may therefore ignore the Mongo pointer.

Required action:

1. Follow the locked datastore authority and projection decision in this baseline.
2. Make the apply operation update the authoritative pointer path used by public reads, or make public reads resolve the authoritative Mongo pointer before accepting the Supabase projection.
3. Do not introduce two independently writable authoritative pointers.
4. Preserve safe fallback behavior when a revision cannot be resolved.
5. Add focused coverage for a site that exists in both Supabase and Mongo.

Exit condition: applying one published revision causes the same revision ID to resolve through the production public-site read path.

### Blocker 3: Restore the Repeatable Editorial Cycle

Saving changes to a published Vibe currently mutates `draftPayload` while leaving the record in `published`. Submission accepts only `draft`, so edited published content cannot cleanly re-enter review.

Required action:

1. Preserve the existing published revision and live-site pointer.
2. On the first edit after publication, establish a new mutable draft state or an equivalent explicit draft branch without mutating published history.
3. Allow that new draft to be submitted as a new immutable review revision.
4. Publish only the submitted revision.
5. Prove that the previously applied site remains unchanged until the new published revision is explicitly applied.

Exit condition: the same Vibe can complete multiple draft → review → publish cycles while older published revisions remain immutable and usable.

### Blocker 4: Add an Operator Site-Application Screen

The apply API exists, but the vertical milestone cannot currently be completed through the admin UI without a browser-console request.

Required action:

1. Add a status-aware application screen reachable from the published revision or editor workflow.
2. Let the operator select or confirm an authorized Launch Kit site.
3. Display the exact Vibe, revision number, revision ID, and current site pointer before confirmation.
4. Apply only published revisions.
5. Display the resulting pointer, applying actor, and timestamp after success.

Exit condition: an authorized operator can apply a published revision to a test site without manually constructing an API request.

### Blocker 5: Fix Authenticated Draft Preview Loading

The preview page performs a protected server-side API fetch without explicitly forwarding the incoming operator authentication context. Production may therefore display `Unable to load preview` for an authenticated operator.

Required action:

1. Prefer a shared server-side preview service or direct authorized data read rather than a server component calling its own protected HTTP endpoint.
2. If the HTTP boundary is retained, forward only the required authenticated request context using the established application pattern.
3. Keep preview draft-only and inaccessible to anonymous or public callers.
4. Verify preview behavior in the deployed environment with a real operator session.

Exit condition: an authenticated operator can load draft preview in production, while an anonymous request remains denied.

### Follow-Up: Make Lifecycle State and Audit Persistence Consistent

Publication and site application record audit events transactionally. Creation, rejection, archive, trash, and restore currently mutate lifecycle state and then write audit events separately, allowing an audit failure after state has changed.

Required action:

- Move each state transition and its required audit event into one established transactional service boundary where supported.
- Return success only when the state change and required audit event have both completed.
- Add focused failure tests for the chosen boundary.

Exit condition: a failed required audit write cannot leave a successful but unaudited lifecycle transition.

### Required CMS Verification Before Merge

Automated lint, unit tests, Jamie E2E, Vercel preview comments, and Vercel deployment have passed, but they do not prove the CMS vertical milestone. Before merge, execute and record:

1. Create a disposable Vibe through the admin UI.
2. Save structured visual and linguistic fields.
3. Load authenticated draft preview.
4. Submit an immutable review revision.
5. Publish exactly that submitted revision.
6. Apply it to a controlled Launch Kit site through the admin UI.
7. Confirm the public site reports the applied revision ID and compiled CSS variables.
8. Confirm the published voice tone reaches the site assistant profile.
9. Edit the mutable draft without publishing or applying it.
10. Confirm the public revision ID and rendered tokens remain unchanged.
11. Complete a second review and publication cycle.
12. Roll back by creating and explicitly applying a new revision derived from an older snapshot.
13. Restore the controlled site to its original revision.

Exit condition: the complete operator-to-public flow, repeatable editorial cycle, draft/live isolation, and recovery path are recorded with revision IDs and observable results.

### Updated Luna Resume Instruction

Do not merge the current PR based solely on green checks. Begin with Blocker 1, then complete Blockers 2–5, the transactional audit follow-up, and the required CMS verification. Stop and escalate only when a choice changes the locked datastore authority, tenant boundary, transaction model, or public runtime contract.
