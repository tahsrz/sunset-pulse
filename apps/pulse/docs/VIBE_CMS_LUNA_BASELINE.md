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

Next recommended slice:

- Add service-level tests for draft conflicts, revision numbering, and publication failures.
- Add `GET /api/admin/vibes/:id` and draft read/write service coverage.
- Wire Launch Kit runtime reads to the authoritative active revision pointer.

Known verification note: the repository-wide TypeScript check currently reports pre-existing errors in unrelated Jamie guide, TAH, and weekly-dispatch tests. The focused Vitest runner also has an existing Windows path/config resolution failure; this baseline's new contract test has not yet run through that runner.
