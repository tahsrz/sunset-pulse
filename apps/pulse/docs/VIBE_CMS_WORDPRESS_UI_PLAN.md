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

## WordPress reference and design interpretation

The [WordPress UI evolution reference](https://www.wpbeginner.com/showcase/evolution-of-wordpress-user-interface-2003-2009/)
shows that the useful through-line is not a single visual era. WordPress moved
from a simple writing screen toward a responsive, consistent admin workspace:

- a durable admin bar and left navigation that make the editor feel like one
  connected product;
- content-management **data views** that prioritize title, status, filtering,
  row actions, and scanability;
- contextual side panels that keep settings available without taking attention
  from the main editing task;
- progressive disclosure: visible essentials first, advanced configuration only
  when needed;
- responsive layouts and plain, direct interaction feedback rather than ornate
  dashboards.

For Sunset Pulse, use this as an interaction and information-architecture
reference, not a visual copy. Retain the existing dark navy, warm yellow, and
editorial type direction where it is part of the product identity. Avoid
recreating legacy gradients, old dashboard chrome, generic plugin management,
or the full Gutenberg interface.

### Primary visual reference: classic WordPress list-management screen

Use the supplied WordPress Plugins screenshot as the direct reference for the
Vibes list and shell. Reproduce its **information hierarchy**, adapted to
Sunset Pulse branding:

| WordPress pattern | Vibe CMS adaptation |
| --- | --- |
| Dark vertical admin rail with one clearly active item | Persistent dark `VibeSidebar` with **Vibes** active and contextual sub-items beneath it. |
| Compact black utility bar | A compact Vibes utility header for workspace identity, quick **Add New**, and the current signed-in user menu; do not build unrelated global controls. |
| Plain light-gray page canvas | Calm neutral workspace around white, bordered operational surfaces. Retain Sunset Pulse typography and brand accents. |
| Page title plus bordered **Add New** action | **All Vibes** heading with a compact outlined **Add New** control adjacent to it. |
| Status links/counts directly below the title | **All / Published / Drafts / In review / Archived / Trash** as countable list views, using the existing filters. |
| Bulk-actions + Apply, then search on the same operational row | Preserve this order in `VibeList`; destructive actions remain visually distinct and confirmed. |
| Dense table with checkboxes, clear column headers, row actions below the name | A Vibe table with title/slug, description or taxonomy summary, status/current revision, modified time, and inline Edit / Preview / Revisions actions. |
| Repeated table header and bulk controls at the bottom | Add the bottom bulk controls only when the table has enough rows to make the repeated affordance useful. |

Do **not** copy WordPress’s exact colors, icons, typography, old beveled
controls, or plugin-specific columns. The desired outcome is “I know how to
operate this immediately,” not “this is a WordPress replica.”

## Reverse-engineered WordPress UI anatomy

This section is the concrete reference model for implementation. It is derived
from the WordPress admin list-table styling and official Block Editor UI
guidance—not from a visual approximation alone.

### A. Classic admin screen: four persistent layers

| WordPress layer | WordPress responsibility | Sunset Pulse implementation |
| --- | --- | --- |
| Admin bar | Global identity and compact utility actions; it stays fixed above the admin workspace. | `app/vibes/layout.tsx` lines 7–10. Keep the 40px sticky header and make it a semantic Vibes-only utility bar. |
| Admin menu | Persistent location/context, active destination, and contextual child items. | `VibeSidebar.tsx` lines 27–125. Keep All Vibes/Add New/Taxonomy plus current-Vibe workflow items. |
| Content wrap | A calm page canvas with one screen title and action cluster. | Each `/vibes` screen via `VibePageHeader`; remove bespoke duplicated headings after introducing it. |
| Screen body | A dense operational surface: views, toolbar, table/form, then pagination or a follow-up action. | `VibeList.tsx` for collection management; `VibeEditor.tsx` for edit forms; revisions/taxonomy/apply follow the same surface rules. |

**Implementation decision:** do not add a second global dashboard header. The
existing `VibeLayout` is already the Sunset Pulse equivalent of WordPress’s
admin bar plus menu shell. The work is to make its hierarchy more intentional,
not to recreate `wp-admin`.

### B. WordPress list-table grammar, mapped exactly

WordPress’s core list-table CSS establishes several interaction rules worth
preserving:

1. A table uses fixed, named columns for scanning—not unstructured cards.
2. The item title is bold and the dominant cell.
3. Secondary metadata appears beneath the title.
4. Row actions are secondary, revealed on hover/focus and permanently available
   for touch/mobile contexts.
5. Selection lives in a dedicated check column with a full-cell accessible
   label.
6. Sortable headers are complete focusable targets, not tiny arrow-only buttons.
7. Bulk controls and pagination occupy a short toolbar before/after the table.

Apply that grammar to `VibeList.tsx` as follows:

| WordPress structural convention | Exact VibeList target |
| --- | --- |
| `.wrap > h1 + .page-title-action` | Replace lines 115–122 with `VibePageHeader title="All Vibes" actions={<Link href="/vibes/new">Add New</Link>}`. |
| `.subsubsub` status views under the title | Keep lines 125–129, but render each status as a text link/button with a count and CSS separators. Do not keep the second status control as an equal peer. |
| `.tablenav.top` | Replace lines 130–152 with `VibeListToolbar position="top"`. Its order is bulk select → Apply → optional extra filters → search. |
| `.wp-list-table.widefat.fixed` | Keep lines 161–195 as a native table; add stable column widths/classes and a `group` row class. |
| `.column-title > .row-title + .row-actions` | Make lines 177–180 contain title link, slug/metadata, then an inline action region. Remove the separate visual action cell at lines 184–190. |
| `.check-column` | Keep lines 165 and 176 as dedicated checkbox cells; add labels that cover the cell and preserve visible focus. |
| `.tablenav.bottom` | Add `VibeListToolbar position="bottom"` after the table only for lists of 10+ rows; pagination remains the final control on lines 196–204. |

**Important accessibility correction:** WordPress’s classic CSS hides desktop
row actions far off-screen until hover. Do not reproduce that exact hiding
technique. In Vibes, use visible muted actions by default on narrow/touch
layouts, and `group-hover`, `group-focus-within`, and `focus-visible` styling on
desktop. Actions must remain in both the DOM and tab order.

### C. Modern WordPress editor grammar, mapped exactly

The WordPress editor deliberately separates global/document actions from content
editing and advanced settings:

| WordPress editor element | Role | Vibe implementation |
| --- | --- | --- |
| Top toolbar | Navigation, save status, preview, global actions, settings toggle, publish. | Top region of `VibeEditor.tsx` lines 163–170 plus `PublishPanel`. Add a compact editor toolbar with back, draft title, save state, Preview, and a settings toggle. |
| Content canvas | The primary editing task. It should work without opening settings. | `VibeEditor.tsx` lines 173–232. Metadata and the most-used visual controls remain accessible in the canvas. |
| Settings sidebar | Tertiary/document settings, grouped into collapsible panels and optionally hidden on small screens. | The existing 320px right rail at lines 172 and 234. Keep Publish permanently discoverable; make secondary metadata panels collapsible/relocatable. |
| Document vs selected-block distinction | Document-level settings are separate from controls for currently selected content. | Do not implement this until the repeatable-section discovery gate is passed. Current singleton Vibe fields are document-level settings. Future section controls belong to the selected section only. |
| Pre-publish review | A deliberate confirmation summary before publishing. | Existing separate `/publish` route stays authoritative. Enhance its screen copy/summary rather than folding publication into an ambiguous editor button. |

**Implementation decision:** do not add `@wordpress/*`, Gutenberg, its block
store, or WordPress CSS to this repository. The Vibe CMS should copy the
editorial interaction model through small native React components, preserving
the existing structured payload rather than serializing WordPress blocks.

### D. WordPress density and token translation

WordPress list screens feel operational because of compact spacing and deliberate
hierarchy, not because of their exact hex values. Create a Vibes-only class or
CSS module/token map with these role names, then use it consistently in the
components named below:

| Role | Target behavior | First consumers |
| --- | --- | --- |
| `workspace` | light neutral canvas; no decorative gradients | `layout.tsx`, all Vibe pages |
| `admin-bar` | dark, 40px sticky utility layer | `layout.tsx` |
| `admin-menu` | dark persistent rail, clear active blue/brand accent | `VibeSidebar.tsx` |
| `screen-title` | compact h1 with adjacent action—not hero marketing type | `VibePageHeader.tsx`, `VibeList.tsx` |
| `list-header` | muted table heading, 12–13px-weighted operational label | `VibeList.tsx`, `RevisionList.tsx`, taxonomy |
| `row-title` | 14–16px semibold/bold primary link | list and revisions |
| `row-meta` | smaller muted text for slug, time, parent revision, counts | list and revisions |
| `row-action` | compact text action, with danger tone only for destructive action | list, revisions |
| `notice` | left-accented, low-chrome feedback panel | all Vibe routes |
| `focus-ring` | high-contrast 2px visible ring independent of hover | every interactive component |

Implement these as Tailwind composition constants in
`apps/pulse/app/vibes/_components/vibeUi.ts` **only if** the project’s existing
Tailwind setup favors class constants. If there is already a shared component
or token convention elsewhere in `apps/pulse`, use that instead. Do not add
WordPress CSS or hard-coded global `wp-*` class names.

### E. Reverse-engineering-derived component boundaries

Create the following components in this exact sequence. Each component should
have one WordPress-derived responsibility and no data fetching of its own:

1. `VibePageHeader.tsx` — classic screen title/action cluster.
2. `VibeListToolbar.tsx` — top/bottom list-table controls.
3. `VibeRowActions.tsx` — hover/focus/touch-safe item actions.
4. `VibeStatusViews.tsx` — status count navigation below the title.
5. `VibeNotice.tsx` and `VibeConfirmDialog.tsx` — mutation feedback and
   consequential confirmation.
6. `VibeEditorToolbar.tsx` — modern editor-level navigation/save/preview/
   settings controls.
7. `VibePanel.tsx` — WordPress-like collapsible settings sections.
8. `VibeTaxonomyFieldset.tsx` — grouped document-level taxonomy control.

`VibeList`, `VibeEditor`, `RevisionList`, and `TaxonomyDirectory` remain the
data-owning route components. The new pieces should be thin so that the existing
API calls, lifecycle logic, and test mocks remain easy to understand.

### F. What not to reverse-engineer

- WordPress PHP templates, `WP_List_Table`, Dashicons, `wp-admin` CSS, or its
  global selectors.
- A generic post/page/media/plugin/menu taxonomy. Vibes only needs the existing
  Vibe routes and current editorial concepts.
- Gutenberg block serialization, undo store, autosave, or keyboard shortcut
  system before the repeatable-section schema is proven necessary.
- WordPress’s old off-screen row-action hiding behavior or modal-heavy legacy
  patterns.
- Any protected operator/seed data into the browser. WordPress familiarity is a
  UX goal, not a reason to weaken the existing site-application boundary.

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
- Use the application’s current visual system for color and typography, but
  borrow the WordPress admin density: compact navigation, calm page backgrounds,
  clear white working surfaces, and one recognizable primary action per screen.
- Add the compact utility header only inside the Vibes workspace. It should not
  replace the app-wide navigation or create a competing application shell.

### Acceptance criteria

- Moving from the list to new, edit, preview, revisions, taxonomy, and back
  never feels like leaving the same product area.
- Current page and current Vibe are clear from navigation alone.
- All existing route URLs remain valid.

## Phase 2 — Make All Vibes behave like an editorial list table

### Changes

- Recompose `VibeList` around the familiar order: status views/counts, search,
  filter controls, bulk action control, then the table.
- Place **Add New** beside the page title, status filters below it, and the
  search field on the filter row—the spatial sequence shown in the supplied
  reference is intentional and should be retained.
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
- Add an optional compact/list density toggle only after the table’s primary
  scan path is stable. Do not add a decorative card grid as a substitute for
  operational list management.
- Add intentional empty states for: no Vibes, no results, and an empty status
  view, each with the single useful next action.

### Acceptance criteria

- A user can locate a Vibe by title, slug, status, taxonomy, or last update
  without opening it.
- Row actions stay reachable by keyboard and at narrow widths.
- Existing bulk archive/trash API behavior is unchanged.
- At desktop width, an experienced WordPress user recognizes the list workflow
  before reading product-specific documentation.

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
- Include a narrow editor toolbar for navigation and primary actions, then keep
  advanced panels out of the way until expanded. This captures the modern
  WordPress focus on a calmer editing surface without requiring Gutenberg.
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
- Prefer practical feedback patterns from modern WordPress: non-blocking save
  status, clear notices after mutations, and useful recovery language when a
  request fails. Avoid modal interruptions for ordinary successful saves.
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

## File-by-file implementation map

This is the execution map for the UI work. Line references are to the current
`main`-based implementation as of this plan; after a refactor, target the named
symbol and responsibility rather than preserving a stale line number.

### 1. Shared Vibes shell

#### `apps/pulse/app/vibes/layout.tsx`

- **Lines 6–15 (`VibeLayout`): retain this as the only Vibes shell.** It
  already owns the light workspace canvas, sticky dark utility header, and
  `VibeSidebar`. Do not introduce a second shell in individual pages.
- **Line 7:** keep the `h-10` utility-bar height and `sticky top-0 z-20`
  behavior. Replace the bare two-link layout with three semantic regions:
  `<nav aria-label="Vibes utility">` on the left, an optional contextual
  current-Vibe label in the center, and an account/utility region on the right.
  The center must be visually absent (not an empty spacer) on list/new/taxonomy
  routes.
- **Line 8:** replace the text-only `Vibe CMS` link with an icon-plus-label
  link that returns to `/vibes`. Keep `href="/vibes"`; do not point it at a
  global dashboard that this route group does not own.
- **Line 9:** retain the route and action, but restyle it as a compact outlined
  or solid primary control consistent with the supplied WordPress reference.
  Its accessible name remains **Add New Vibe**; visible text may be **Add New**.
- **Line 13:** wrap `children` in a semantic `<main id="vibe-workspace">` and
  add a skip link above the utility header targeting that id. Individual pages
  should then render a content `<div>` or `<section>`, not a second `<main>`.
  Perform this semantic cleanup in the same increment across the route files
  listed below.

#### `apps/pulse/app/vibes/VibeSidebar.tsx`

- **Lines 27–31 (`primaryItems`): keep exactly three primary destination
  entries**—All Vibes, Add New, Taxonomy. Do not add media, plugins, settings,
  or WordPress-lookalike destinations that have no Vibe feature behind them.
- **Lines 41–56 (`getWorkflowItems`): preserve the status-driven workflow
  links.** Reorder only for editorial scanability: Edit Vibe, Preview,
  Revisions, Status & Actions, conditional Submit/Publish, Audit Log, Source
  Details. Move **Apply to site** here only after a Vibe has a current
  published revision; otherwise leave it in revision context.
- **Lines 63–92:** keep the existing status fetch and `vibe-status-changed`
  event. It prevents the sidebar from advertising a transition that no longer
  applies. If the implementation adds a `VibeWorkspaceContext`, migrate this
  fetch into that provider; do not make a second API call from every nav link.
- **Lines 97–108:** preserve dark rail desktop behavior and horizontal
  mobile navigation. Add a labelled section divider for the primary menu,
  then retain the existing **Current Vibe** divider. Do not hide navigation
  labels behind icon-only controls.
- **Lines 112–125 (`SidebarLink`):** add a visible `focus-visible` ring and
  ensure current child routes count as active (for example, `/vibes/:id/edit`
  should keep **Edit Vibe** active). Use a small `isActivePath()` helper rather
  than changing the route list.

#### New shared UI primitives

Create these components under `apps/pulse/app/vibes/_components/`; they should
be presentational and receive data/callbacks by props only:

- `VibePageHeader.tsx`: eyebrow (optional), title, description, and `actions`.
  Replace repeated title/back-link blocks in new, edit, revisions, taxonomy,
  audit, compare, and apply pages.
- `VibeNotice.tsx`: `tone: 'success' | 'warning' | 'error' | 'info'`, optional
  `title`, children, and `role` (`status` except errors use `alert`). Replace
  ad-hoc colored `<p>` messages; do not centralize API error parsing here.
- `VibeStatusBadge.tsx`: maps existing status strings to label/class only. It
  must not translate a lifecycle state into a new value.
- `VibePanel.tsx`: an accessible `details/summary`-based or button-controlled
  collapsible panel. It needs `title`, optional `description`, `defaultOpen`,
  and `children`. Use it for editor settings, not for the top-level Publish
  panel.
- `VibeConfirmDialog.tsx`: controlled dialog used for irreversible UI actions.
  It must move focus into the dialog, return focus to its trigger, and require
  an explicit confirm callback. Introduce it first for bulk trash and revision
  restore; preserve the server as authorization authority.

### 2. All Vibes list (the screenshot’s closest match)

#### `apps/pulse/app/vibes/VibeList.tsx`

- **Lines 6–21 (`Vibe`, `ListResponse`):** extend these client-view types only
  when `/api/vibes` already returns the data. Candidate display additions are
  `taxonomyTermIds?: string[]` and `description?: string`; do not add a client
  fetch-per-row. If the API cannot supply them in the list response, show only
  current fields in this increment and create an API contract task separately.
- **Lines 23–31:** retain `PAGE_SIZE` and the existing `STATUS_VIEWS`. Add a
  `const BULK_ACTIONS` array with the existing `archive` and `trash` values;
  do not invent activate/deactivate semantics.
- **Lines 47–60:** add `bulkAction`, `showFilters`, and an optional
  `notice` state. Keep `selected` as a `Set<string>` and retain `bulkBusy`.
  Do not move query/filter state to an unvalidated URL update in this UI pass.
- **Lines 62–94:** retain the abortable list request and page reset behavior.
  Add a 250–300ms debounce to `search` using a separate `debouncedSearch`
  value, so every keystroke does not immediately load. The fetch effect should
  depend on `debouncedSearch`, not raw `search`.
- **Lines 101–107 (`runBulk`):** replace `window.confirm` with
  `VibeConfirmDialog`. After success, replace `window.location.reload()` with a
  local `reloadList()` callback extracted from the current fetch effect; this
  retains filters, page, focus, and screen-reader context. The request remains
  `POST /api/vibes/bulk` with the same JSON body.
- **Lines 113–122:** replace the custom header markup with `VibePageHeader`.
  Keep the same heading, but move **Add New Vibe** adjacent to the title (not
  at the far edge of a wide page). Do not duplicate the global utility-header
  add button on narrow screens; hide the local one at the same breakpoint or
  use one shared control.
- **Lines 124–129:** retain the status view nav as direct buttons. Apply the
  exact WordPress list-view visual hierarchy: `All (n) | Published (n) | ...`,
  active item dark and non-underlined, inactive items brand-link blue, and
  separators rendered with CSS/pseudo-elements rather than literal text pipes.
- **Lines 130–152:** split into a `VibeListToolbar` component. In left-to-right
  order use: bulk-action `<select>`, **Apply** button, optional filter toggle,
  then search aligned right. The status select must not compete with the status
  view nav: either remove it once views fully cover it, or label it **Filter
  status** and hide it until the filter toggle opens. This fixes the current
  duplicated status control.
- **Line 136:** ensure `min-w-0 w-full sm:w-64 sm:flex-none` (or equivalent)
  on the search input so it cannot bleed into adjacent controls at intermediate
  widths—the same class of overflow seen in the existing status dropdown.
- **Lines 154–157:** replace plain status text with `VibeNotice` and distinct
  empty states: no Vibes at all (Add New action), no search results (clear
  search), and no Vibes in selected status (change view). Preserve `role=alert`
  on fetch error.
- **Lines 162–194:** keep the semantic `<table>`. Change columns to: checkbox,
  **Vibe**, **Status**, **Revision**, **Last modified**. Remove the dedicated
  Actions column; at lines 177–180 render row actions directly underneath the
  Vibe title in a `group-focus-within`/`group-hover` region. Actions should be
  Edit, Preview, Revisions, and conditional lifecycle action. This directly
  follows the WordPress screenshot while remaining keyboard reachable.
- **Lines 175–191:** add `group` to the row, `focus-within:bg-*`, and an
  always-visible-on-touch action layout. Do not hide actions with `display:
  none`; use opacity/visibility only with `focus-within` override.
- **Lines 165 and 176:** add shared checkbox styles and explicit `aria-label`s;
  retain current select-all behavior. When pagination changes, selected items
  must still reset as the current effect does on line 86.
- **Lines 196–204:** retain existing paging, then add a second toolbar below
  the table only when `vibes.length >= 10`. It repeats bulk select/apply plus
  “Showing x–y of z,” mirroring the reference without adding duplicate controls
  for tiny lists.

#### Tests for the list

Create `apps/pulse/tests/unit/vibe-list.test.tsx`.

- Mock `/api/vibes` and `/api/vibes/bulk`.
- Assert status views apply the expected request query.
- Assert a 250–300ms debounced search issues one final request.
- Assert row actions are present in the DOM and reachable by keyboard focus.
- Assert bulk trash opens a dialog; confirm sends unchanged API payload;
  cancel sends no request.
- Assert each empty-state branch renders its correct next action.

### 3. Add New Vibe

#### `apps/pulse/app/vibes/new/page.tsx`

- **Lines 4–5:** extract `toSlug` to `apps/pulse/lib/cms/slug.ts` as
  `toVibeSlug`. Export `VIBE_SLUG_PATTERN` and `isValidVibeSlug` from the same
  file. Use this in both client help and API validation only if the server does
  not already own an equivalent validator; otherwise import the server-safe
  shared validator rather than duplicating regexes.
- **Line 9 (currently a single JSX line): split this component into readable
  named sections before changing behavior.** First, render Title, Slug,
  description, and submit button; place the optional preset selector afterward
  inside a `VibePanel` named **Start from a style**.
- **Title input:** retain auto-slug generation until a boolean
  `hasManuallyEditedSlug` becomes true. Add `aria-describedby` pointing to slug
  help and a live permalink preview.
- **Slug input:** retain the pattern, but show an inline error derived from
  `isValidVibeSlug(slug)` while typing and on submit. Explain the allowed format
  exactly: lowercase letters, numbers, hyphens; no spaces or leading/trailing
  hyphen. Do not rely only on native `patternMismatch` text.
- **Submit button:** change visible label to **Save draft and continue editing**
  and preserve disabled/saving behavior. After successful creation, keep the
  existing edit-route navigation; do not add a new route.
- **Preset selector:** retain the existing preset payload/copy behavior but make
  it opt-in. Selecting a card must be a normal radio interaction with a visible
  focus ring, not an `sr-only`-only control with no focus indication.

#### Tests for Add New

Create `apps/pulse/tests/unit/vibe-new-page.test.tsx` covering title-to-slug
generation, manual-slug preservation, readable invalid-slug feedback, preset
selection, and the existing create request payload.

### 4. Editor and Publish rail

#### `apps/pulse/app/vibes/[vibeId]/edit/VibeEditor.tsx`

- **Lines 21 and 85–160:** preserve `SaveState`, the version-conflict branch,
  `PATCH /api/vibes/:id?tenantId=default`, and the draft construction logic.
  Refactor the JSX only after extracting `saveDraft` into a stable callback so
  child components can receive `onSubmit` without stale state.
- **Lines 48–82 (`PublishPanel`): keep this component as the action authority.**
  Change its visual order to: status badge, last-saved/save-state text, Preview,
  primary lifecycle action, Save draft, revision summary/link, then conflict or
  error notice. Do not make the primary action submit the form unless it is
  explicitly “Save draft.” Publishing remains a separate route/action.
- **Lines 163–170:** replace the generic **Edit Vibe** heading with the current
  draft title; retain a subtle “Editing draft” or “Current published revision
  available” context beside it. Use `VibePageHeader` and show the permalink
  preview directly below the title.
- **Line 172:** retain the `lg:grid-cols-[1fr_320px]` structure; this is already
  the desired WordPress-style canvas/rail layout. Change `gap-5` to shared
  spacing tokens only if the project already has them—do not introduce a new
  design-token system in this PR.
- **Lines 174–181 (Metadata):** use `VibePanel defaultOpen`. Keep title, slug,
  description field names and `FormData` keys unchanged. Add the same slug help
  and permalink preview used in Add New.
- **Lines 183–189 (Taxonomy):** extract `VibeTaxonomyFieldset.tsx`. Group terms
  by `group`, render each group label once, show selected term count in the
  panel summary, and retain checkbox name `taxonomyTermIds` and values `id`.
- **Lines 191–200 (Source details):** move into `VibePanel defaultOpen={false}`
  labelled **Source and provenance**. Preserve `sourceKind`, `sourceUrl`,
  `sourceAttribution`, and `sourceOwnershipNote` names exactly; they map to the
  existing `saveDraft` object at lines 124–139.
- **Lines 202–226 (Visual system):** split into three panels: **Colors**,
  **Typography**, **Layout**. Make only Colors open by default. Preserve each
  input `name`, min/max, and the `baseFontSize` pattern because the existing
  validation test proves the format contract.
- **Lines 228–231 (Jamie voice):** use a collapsed **Voice** panel. Keep
  `primaryTone` select values unchanged.
- **Line 165:** replace the blanket `onChange` dirty marker with a helper that
  ignores changes originating in non-draft navigation/dialog controls. The
  form must still become dirty whenever an editable draft field changes.
- **Lines 104–105:** replace bare loading/error `<main>` markup with the shared
  workspace state components after the layout semantic cleanup; preserve the
  errors themselves.

#### Editor tests

Update `apps/pulse/tests/unit/vibe-editor-validation.test.tsx`:

- Retain lines 42–73 unchanged as regression coverage for `baseFontSize`.
- Add assertions for the slug help/permalink preview and panel names.
- Add a test proving form field names remain present when panels collapse/expand
  and that a save produces the same normalized PATCH payload.
- Add a conflict-state test: API 409 shows reload guidance and does not mark
  the draft as successfully saved.

### 5. Revisions and audit

#### `apps/pulse/app/vibes/[vibeId]/revisions/RevisionList.tsx`

- **Lines 24 onward:** preserve the existing revision fetch, restore endpoint,
  comparison links, and `publishedRevisionId` semantics.
- **Lines 86 onward:** retain the table but order rows/visual groups as current
  published revision, previous published revisions, then checkpoints. If the
  API ordering is not guaranteed, derive a presentational ordered array in this
  component without mutating data or changing the API.
- Replace inline `window.confirm` (in `restoreRevision`) with `VibeConfirmDialog`.
  Dialog copy must say: “Restore this revision to the draft. It will not publish
  or apply it to any site.”
- Render action links in a row beneath the revision title/number rather than a
  detached final column; retain **Apply to site** only for the current published
  revision, as current code does.
- Show change summary and parent revision in the row’s secondary text when the
  response already provides them; do not add a revision-per-row fetch.

#### `apps/pulse/app/vibes/[vibeId]/revisions/page.tsx`

- **Lines 8–12:** retain server-side operator access check. Replace its custom
  page header with `VibePageHeader`; do not move `getVibeCmsAccess` to a client
  component.

#### `apps/pulse/app/vibes/[vibeId]/audit/page.tsx`

- Replace the hard-coded workflow-link `<nav>` with the already persistent
  sidebar context; keep a compact local back link only.
- Group activity by date, add human-readable action labels, and place raw
  revision/site IDs behind an accessible **Details** disclosure. Do not remove
  identifiers from the DOM because they are useful operational evidence.

### 6. Taxonomy

#### `apps/pulse/app/vibes/taxonomy/TaxonomyDirectory.tsx`

- **Lines 5–6:** retain `TaxonomyTerm` IDs and response count shape.
- **Lines 12 onward:** keep current loading/fetch state, but render a list table
  with **Term**, **Group**, and **Used by** columns instead of a purely card-like
  directory. Use the existing `counts` map for usage; missing count displays
  `0`, not an invented value.
- Add a controlled search field and group filter using client-side `useMemo`
  over the already fetched terms. This is intentionally client-side because the
  entire directory is already loaded and no new taxonomy API is needed.
- Do not add term creation, term deletion, inline term editing, or new taxonomy
  mutations in this plan.

### 7. Apply to site

#### `apps/pulse/app/vibes/[vibeId]/apply/page.tsx`

- **Lines 9–51:** preserve `checkPointer`, the current apply request, run-ID
  derivation, and all existing response/error behavior until a server-authorized
  selector exists. This screen must not fetch protected seed details from a
  browser component.
- **Line 52 (current one-line JSX): split into named presentational blocks**:
  `DisposableSiteSelector`, `ManualSiteIdField`, `RevisionSelectionSummary`,
  `CurrentPointerCard`, `ApplyPreflightSummary`, and `ApplyConfirmation`.
- Make **RevisionSelectionSummary** the first editable decision. When launched
  from revision history, show the revision number and ID as read-only context;
  keep an explicit “Choose a different revision” disclosure for manual entry.
- Put the disposable run-ID input behind a disclosure named **Use a disposable
  verification site**. Manual Site ID becomes a separate disclosure. This makes
  the safe planned flow primary without pretending that arbitrary site IDs are
  automatically safe.
- Disable final apply until `checkPointer()` succeeds for a non-empty site and
  revision. Display exact preflight rows: Vibe, selected revision, current
  pointer, new pointer, and disposable expiry warning. This is a UI guard only;
  existing protected endpoint validation stays authoritative.
- Use `VibeConfirmDialog` for the final “Apply revision” intent. The confirm
  button calls the unchanged `apply` function.

### 8. Page migration order and route invariants

Migrate in this order to avoid styling two competing shells:

1. Add shared primitives and update `layout.tsx` / `VibeSidebar.tsx`.
2. Refactor `VibeList.tsx` and create its tests.
3. Refactor `new/page.tsx` and create its tests.
4. Refactor `VibeEditor.tsx` and extend existing validation tests.
5. Refactor revisions/audit/taxonomy.
6. Refactor Apply only after the shared dialog/notice primitives exist.

Do not change these route or API contracts during the visual pass:

- `GET /api/vibes` list query parameter names and response fields.
- `POST /api/vibes/bulk` body `{ vibeIds, action }`.
- `PATCH /api/vibes/:vibeId?tenantId=default` draft payload and
  `expectedVersion` conflict behavior.
- Current publish, submit, restore, preview, compare, and apply routes.
- Server-side `getVibeCmsAccess` checks on protected pages.

### 9. Definition of a complete UI increment

For each increment, the implementing agent must include:

1. A compact before/after screenshot at desktop width and one responsive
   screenshot at approximately 768px.
2. Unit tests for newly interactive client behavior, plus preservation of the
   existing editor-validation tests.
3. A browser walkthrough of the changed route with keyboard navigation through
   links, controls, dialogs, and visible error state.
4. No API, migration, environment-variable, authorization, or production-data
   change unless it is separately proposed and approved.

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
