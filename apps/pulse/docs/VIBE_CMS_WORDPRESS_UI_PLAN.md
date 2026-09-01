# Vibe CMS: WordPress-Aligned Editorial UI Plan

## Purpose

Make the Vibe CMS feel immediately legible to a longtime WordPress editor while
keeping the existing Vibe lifecycle, revision model, and APIs intact. This is a
UI and workflow plan, not a replacement for the CMS domain model.

The target experience is familiar in the useful ways: a persistent editorial
navigation, a practical content list, a focused editor with a right-hand
publish rail, clear revisions, and purposeful confirmations before a Vibe is
applied to a site.

## Current foundation

The CMS already has the core screens required for this direction:

- `/vibes`: searchable, filterable Vibe list with status views, sorting,
  pagination, row actions, and bulk archive/trash actions.
- `/vibes/new`: draft creation with title, slug, description, and starter
  presets.
- `/vibes/[vibeId]/edit`: structured editor, taxonomy selection, save state,
  preview, and a publish rail.
- `/vibes/[vibeId]/revisions`: immutable revision history, compare, restore,
  and apply entry points.
- `/vibes/taxonomy`: taxonomy directory.
- `/vibes/[vibeId]/apply`: an explicit Vibe/revision/site confirmation flow.

The work below improves the composition and clarity of those screens. Existing
route contracts and lifecycle authorization remain the source of truth.

## Product rules

1. **Use familiar language, but retain Vibe-specific concepts.** “All Vibes,”
   “Add New,” “Draft,” “Publish,” “Preview,” “Revisions,” “Trash,” and “Bulk
   actions” are useful mental-model anchors. A Vibe is not renamed to a post.
2. **Make the safe path the obvious path.** Lifecycle state, current published
   revision, and target site must be visible before a consequential action.
3. **Do not create a fake Gutenberg clone.** Start with the current structured
   fields and introduce reusable content sections only when they map to the
   existing payload schema.
4. **Keep privileged data server-side.** The browser must never receive seed
   tokens or protected internal controls. Any future authorized test-site picker
   must return only server-approved, non-customer choices.
5. **Improve screens incrementally.** Each phase must be independently useful,
   testable, and safe to ship.

## Phase 1 — Create a cohesive Vibes admin shell

### Changes

- Make `VibeSidebar` the consistent visual frame for all `/vibes` routes.
- Add a compact header with the Vibes wordmark, **All Vibes**, **Add New**, and
  contextual secondary links. Detail-only links (Edit, Preview, Revisions,
  Audit, Apply) appear only when a Vibe is selected.
- Add a standard notice area below the header for success, warning, and error
  messages, so confirmations are not lost at the bottom of forms.
- Normalize page titles, breadcrumbs, button placement, card borders, and
  desktop/mobile spacing across every Vibe screen.

### Acceptance criteria

- Moving from the list to new, edit, preview, revisions, taxonomy, and back
  never feels like leaving the same product area.
- Current page and current Vibe are clear from navigation alone.
- All existing route URLs remain valid.

## Phase 2 — Make All Vibes behave like an editorial list table

### Changes

- Recompose `VibeList` around the familiar order: status views/counts, search,
  filter controls, bulk action control, then the table.
- Keep existing server-backed filtering and pagination, but present the state as
  selected views such as **All**, **Published**, **Drafts**, **In review**,
  **Archived**, and **Trash** where supported.
- Use a compact title column with descriptive secondary metadata: slug,
  taxonomy, current revision status, and modified time.
- Reveal row actions under the title on hover/focus: Edit, Preview, Revisions,
  and lifecycle-safe actions. Preserve visible keyboard focus, so the actions
  are never mouse-only.
- Give bulk selection a persistent action bar with a selected-count and a
  clear destructive-action confirmation for trashing.
- Add intentional empty states for: no Vibes, no results, and an empty status
  view, each with the single useful next action.

### Acceptance criteria

- A user can locate a Vibe by title, slug, status, taxonomy, or last update
  without opening it.
- Row actions stay reachable by keyboard and at narrow widths.
- Existing bulk archive/trash API behavior is unchanged.

## Phase 3 — Make Add New Vibe self-explanatory

### Changes

- Generate the slug from title until the editor explicitly changes it.
- Put concise help directly beneath the slug: “The URL-safe name. Use lowercase
  letters, numbers, and hyphens; for example `coastal-modern`.”
- Show a live permalink-style preview (`/vibes/coastal-modern`) and inline
  validation guidance rather than relying on the browser’s generic “match the
  requested format” message.
- Keep presets, but place them after the basic identity fields or behind a
  “Start from a style” disclosure so title/slug remain the first task.
- Replace the ambiguous primary label with **Save draft and continue editing**.

### Acceptance criteria

- A new user can create a valid Vibe without knowing the word “slug.”
- A malformed slug produces a readable in-product explanation before submit.
- Preset selection remains optional and creates no hidden shared state.

## Phase 4 — Reshape the editor around the WordPress editing posture

### Changes

- Use a two-column desktop editor: focused structured content canvas on the
  left, sticky right-hand **Publish** rail on the right. Stack predictably on
  smaller screens.
- Put title and permalink/slug at the top of the canvas; surface a compact
  “Last saved” state beside the title.
- Organize current structured fields into clearly named panels: **Identity**,
  **Visual system**, **Layout**, **Taxonomy**, and **Advanced**. Panels should
  be collapsible, retain their state while editing, and describe their purpose
  in plain language.
- Keep the existing publish rail as the action authority, but present status,
  current published revision, Preview, Revisions, and the next lifecycle action
  in a stable WordPress-like order.
- Rename lifecycle calls in the UI for clarity while preserving their existing
  routes and semantics: “Send for review,” “Publish revision,” and “Return to
  draft” only when that state transition is actually permitted.

### Acceptance criteria

- A user always knows whether they are editing a draft or viewing the current
  published revision.
- Preview and revision history are available without scrolling through the
  entire form.
- No lifecycle transition is silently changed by a UI refactor.

## Phase 5 — Add structured content-section authoring (not a Gutenberg clone)

### Discovery gate

Before adding drag-and-drop or new components, document which existing Vibe
payload fields represent repeatable sections and which are singleton settings.
Do not invent a second content schema.

### Changes after the gate

- Create a small “Sections” editor only for repeatable, already-supported
  payload entries.
- Provide **Add section**, edit, duplicate, remove, and move up/down controls.
- Use semantic controls and button labels; add drag-and-drop only if keyboard
  reordering remains equally supported.
- Give each section a compact summary in its collapsed state so an editor can
  scan a long Vibe quickly.

### Acceptance criteria

- Reordering or duplicating a section preserves the exact normalized payload.
- Keyboard-only editing and reordering are possible.
- The editor does not expose controls for fields the publish/preview pipeline
  cannot render.

## Phase 6 — Make revisions and audit history useful at a glance

### Changes

- Keep the revision list table, but make the hierarchy explicit: current live
  revision, prior published revisions, then review checkpoints.
- Display revision number, author/actor when available, publication time,
  parent revision, and change summary in predictable columns.
- Add row actions for Compare, Preview, Restore draft, and Apply to site only
  when their existing server-side rules allow them.
- Make restoration a confirmation dialog that states the result precisely:
  restoring creates/updates the draft; it does not silently republish a site.
- Restyle audit events as a chronological activity feed with concise human
  action names and expandable technical identifiers.

### Acceptance criteria

- An editor can identify the live revision and recover an earlier revision
  without confusing restoration with publication.
- Compare and audit links retain their current query and route behavior.

## Phase 7 — Bring taxonomy and presets up to editorial-tool quality

### Changes

- Present taxonomy as a directory/list table with search, group filters,
  descriptions, and Vibe usage counts where data exists.
- In the editor, use grouped checkboxes with concise selected-term summaries and
  an accessible “show more” disclosure for long groups.
- Make preset cards more compact and let editors preview their color/type cues
  without overwhelming the new-Vibe flow.
- Do not add term creation or deletion until the taxonomy data ownership and
  route contract are explicitly approved.

### Acceptance criteria

- Terms can be found and understood without memorizing internal IDs.
- Applying taxonomy does not change the underlying IDs or API payload format.

## Phase 8 — Redesign Apply to site as an operator workflow

### Changes

- Replace freeform-first site selection with a server-authorized site chooser
  when an approved data source exists. During the interim, retain manual entry
  behind an “Enter site ID manually” disclosure.
- Treat revision selection as context from Revision History; prefill the
  selected current published revision and render it read-only unless the user
  intentionally changes it.
- Present a single preflight summary: Vibe, revision, target site, current
  pointer, resulting pointer, disposable expiry (when applicable), and a
  plain-language risk notice.
- Keep final application behind an explicit confirmation step. The protected
  API remains responsible for all authorization and validation.

### Acceptance criteria

- The happy path never requires an operator to type an opaque revision ID.
- No seed token, internal authorization secret, or customer-site enumeration is
  exposed to the client.
- Existing apply route validation remains authoritative.

## Phase 9 — Polish, accessibility, and verification

### Changes

- Establish shared UI primitives for notices, status badges, table action
  links, panel headers, confirmation dialogs, and empty states.
- Meet keyboard, focus, label, table-header, and contrast requirements across
  the Vibes area.
- Add responsive behavior for the list table and editor rail; prioritize the
  core edit/save/preview workflow on tablet widths.
- Add focused component tests for interaction states and retain route/API tests
  for lifecycle behavior.
- Run a browser walkthrough for: create draft, edit/save, taxonomy change,
  send/publish, preview, compare/restore, and apply preflight.

### Acceptance criteria

- No client-side UI change weakens server-side lifecycle validation.
- The core workflow works with keyboard navigation and at mobile/tablet widths.
- Test coverage documents both happy path and visible error states.

## Delivery sequence

Deliver in four reviewable increments:

1. **Navigation, list, and Add New clarity** (Phases 1–3).
2. **Editor and publish rail** (Phase 4).
3. **Revisions, taxonomy, and structured sections discovery/prototype**
   (Phases 5–7).
4. **Apply workflow, accessibility pass, and browser verification**
   (Phases 8–9).

Each increment should include before/after screenshots, a short manual test
checklist, and tests limited to the UI and route contracts it changes.

## Explicitly out of scope

- A generic WordPress plugin/theme system.
- Media library, comments, menus, pages/posts, or a full Gutenberg block editor.
- Permission-model redesign, security auditing, or broad backend rewrites.
- Production lifecycle actions, deployments, or customer-site changes.

## Definition of done

The Vibes area is complete for this initiative when a user familiar with
WordPress can create a draft, understand its URL, edit its structured content,
publish an immutable revision, inspect and restore history, preview it, and
apply it through a comprehensible confirmation flow—without needing to know
internal IDs or lifecycle implementation details.
