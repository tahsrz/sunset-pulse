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
7. `VibePanel.tsx` — collapsible settings sections.
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

### G. Operational affordances: adopt, defer, or reject

The following decisions come from studying how WordPress uses screen options,
list filtering, help, previews, and its editor preferences. They make the
implementation plan concrete and prevent an attractive but unsafe imitation.

| WordPress affordance | Decision for Vibes | Exact implementation consequence |
| --- | --- | --- |
| Status views with counts | **Adopt now.** | `VibeStatusViews.tsx` consumes the existing `statusCounts` from `GET /api/vibes`; no new API work. |
| Bulk actions + Apply | **Adopt now.** | `VibeListToolbar.tsx` only exposes current `archive` and `trash` actions, then invokes the unchanged bulk endpoint. |
| Search on the right of the list toolbar | **Adopt now.** | Keep one search field in `VibeList.tsx`; debounce the existing request, do not add client-side filtering over incomplete pages. |
| Screen Options (column visibility / per-page) | **Adopt later, presentation-only.** | After the list refactor, add a `VibeScreenOptions` popover with column visibility stored in namespaced `localStorage` (for example `vibes:list:visible-columns`). Do not persist it through an API or change `PAGE_SIZE` until product approval. |
| Collapsible/rearrangeable edit modules | **Adopt in limited form.** | `VibePanel` controls collapse state. Persist only panel open/closed preference locally; do not add drag-to-reorder, because editor section order has semantic meaning and needs its own schema. |
| Quick Edit | **Defer.** | Do not add an inline row form to `VibeList` yet. Existing saves require a full draft plus `expectedVersion`; a partial list-row PATCH would create hidden merge/conflict behavior. Revisit only after a server-approved partial-edit contract exists. |
| Bulk Edit | **Reject for this initiative.** | Existing archive/trash is safe because it already has a dedicated bulk route. Do not bulk-change taxonomy, visual tokens, titles, or lifecycle state. |
| “Undo” notice after trash | **Do not claim it yet.** | Render a success notice that accurately states the completed action. Add an Undo link only when an explicit restore endpoint and expiry window exist. |
| Screen Help | **Adopt later, contextual and small.** | Add `VibeHelpPanel` only to explain Vibe/revision/site-pointer concepts on their relevant pages. It should be a client disclosure, not a broad support center. |
| Admin-menu collapse | **Adopt when shell work is stable.** | Add a local `isCollapsed` state in `VibeSidebar`; persist it locally and keep tooltips + accessible labels. On mobile, retain horizontal navigation rather than a collapsed icon rail. |
| Keyboard command palette | **Defer.** | No `Cmd/Ctrl+K` until the route/action inventory and focus management are complete. Native browser find/search is sufficient in this slice. |
| Dashboard widgets | **Reject.** | `/vibes` remains a management list, not a dashboard. Status counts and useful empty states are enough. |
| Responsive preview modes | **Adopt after preview baseline.** | Add Desktop / Tablet / Mobile choices to the Vibe preview screen only after verifying the preview renderer can be constrained without changing public output. |

### H. Preview-first editing model

WordPress’s Customizer and recent editor views reinforce a useful Vibe-specific
principle: visual tokens should be understood through a preview, not by reading
hex fields alone. Implement it without conflating preview with publication.

1. Keep `/vibes/[vibeId]/preview` as the rendering authority; do not create a
   second preview renderer inside the editor.
2. In `VibeEditorToolbar.tsx`, retain the existing Preview route link. Add a
   visible “Open preview” label rather than an icon-only eye control.
3. After save succeeds, show `VibeNotice` with **Preview changes** link. Do not
   auto-open a new tab on every save.
4. In a later increment, add viewport query parameters such as
   `?viewport=desktop|tablet|mobile` only if the preview page can apply them as
   a non-persistent display constraint. The Vibe payload, published revision,
   and site pointer must not change.
5. A preview must label its data source clearly: **Draft preview** or
   **Published revision preview**. This label prevents an editor from assuming
   unsaved work is live.

### I. Information architecture decisions

WordPress uses a stable global menu plus a screen-specific local hierarchy. The
Vibes equivalent should be intentionally small:

```text
Vibes workspace
├── All Vibes
├── Add New
├── Taxonomy
└── Current Vibe (only on /vibes/:vibeId/*)
    ├── Edit Vibe
    ├── Preview
    ├── Revisions
    ├── Status & Actions
    ├── Publish or Submit for review (status-dependent)
    ├── Audit Log
    └── Source Details
```

`Apply to site` stays an action reached from the current published revision,
not a persistent top-level navigation item. It is an operator outcome, not an
ordinary authoring destination.

### J. Interaction-state specification

Every new shared component must implement these states before visual polish is
considered complete:

| Component | Required states |
| --- | --- |
| `VibeListToolbar` | default, search pending, bulk disabled, bulk busy, no selection, selected count, error notice |
| `VibeStatusViews` | default, active, keyboard focus, zero count |
| `VibeRowActions` | desktop idle, hover, keyboard focus-within, mobile/touch visible, destructive action tone |
| `VibePanel` | open, closed, keyboard toggled, content retains form values while closed |
| `PublishPanel` | saved, dirty, saving, conflict, lifecycle action unavailable, API error |
| `VibeConfirmDialog` | open, confirm busy, request error, cancel, Escape close where no request is pending |
| `VibeNotice` | info, success, warning, error; error with `role="alert"`, non-error with `role="status"` |

The unit-test additions in the file-by-file map must cover these state changes;
visual screenshots alone are not enough.

### K. Save, recovery, and revision behavior

WordPress presents saving and revisions as editorial reassurance. Vibe CMS can
provide that reassurance, but only by truthfully reflecting the contracts it
already has.

| Capability | Current Vibe contract | UI decision |
| --- | --- | --- |
| Manual draft save | `VibeEditor.saveDraft` sends a complete normalized draft with `expectedVersion`. | Keep **Save draft** as the explicit primary persistence action. Display one of Saved / Unsaved changes / Saving / Conflict beside the editor title and in `PublishPanel`. |
| Concurrent-edit detection | Server returns 409 / `VIBE_DRAFT_CONFLICT`. | Keep current reload-latest flow; add a clear notice explaining that local unsaved changes cannot be merged automatically. Do not overwrite or silently retry. |
| Autosave | No demonstrated autosave-specific API, per-user recovery record, or merge policy. | **Do not add background server autosave** in this UI initiative. It would generate revisions/conflicts that the current model does not describe. |
| Local recovery draft | Not currently specified. | **Discovery only:** assess whether `sessionStorage` can hold a non-authoritative editor snapshot with version + timestamp. Implement only after a separate recovery UX decision; never call it a saved revision or send it automatically. |
| Published revisions | Immutable revision history already exists. | Make “Current published” visually dominant and explain that later draft saves do not modify it. |
| Republish revision | Existing guarded rollback behavior. | Confirmation copy must say it creates a new published revision from the selected snapshot and does not apply it to a site. |
| Compare | Existing compare route. | First improve the existing summary and selected revision labels. Do not copy WordPress’s slider/highlight interface until the Vibe payload diff can produce meaningful, stable field-level changes. |
| Scheduled publish | No stated lifecycle/API capability. | **Out of scope.** Never display a scheduling control merely because WordPress has one. |

#### Required implementation changes

- In `VibeEditor.tsx`, extend `SaveState` only if necessary with a distinct
  `error` display state; preserve `saved`, `dirty`, `saving`, and `conflict`.
  The error message itself remains `error` state. Do not collapse `conflict`
  into a generic failure.
- In `PublishPanel`, show save status as short text before the action controls:
  “Saved,” “Unsaved changes,” “Saving…,” or “Conflict detected.” Use an
  `aria-live="polite"` region for normal state changes.
- On successful save at `VibeEditor.tsx` lines 154–155, set an ephemeral
  success notice with a Preview action. It disappears only when the user
  navigates, makes another edit, or dismisses it; do not persist it across
  routes.
- On a 409 at lines 145–148, keep the form values mounted. The Reload action
  must have copy warning that it replaces the current unsaved form with the
  server draft.
- In `RevisionList.tsx`, represent revision identity in this exact order:
  status badge → `Revision n` title → timestamp/actor → change summary/parent
  metadata → row actions. Avoid rendering raw database IDs as the primary
  title.

### L. Notice and confirmation policy

The WordPress model distinguishes non-blocking notices from actions that require
an intentional decision. Vibes should do the same.

| Event | UI mechanism | Required message/action |
| --- | --- | --- |
| Draft saved | success `VibeNotice`, `role="status"` | “Draft saved.” with **Preview changes** link. |
| Draft conflict | error `VibeNotice`, `role="alert"` | Explain another session changed the draft; show **Reload latest draft**. |
| List fetch error | error notice, `role="alert"` | “Unable to load Vibes.” Include **Try again** that invokes the existing list reload callback. |
| Archive completed | success notice, `role="status"` | State the count and action. No Undo unless a real restore behavior is available. |
| Move to trash | confirmation dialog, then success notice | Dialog names selected count and irreversibility; success names the completed count. |
| Republish revision | confirmation dialog | “Create a new published revision from this snapshot; this will not apply it to a site.” |
| Apply revision | preflight + confirmation dialog | Name Vibe, revision, site, current pointer, and new pointer. |
| Validation issue | inline field error plus summary notice only if submit was attempted | Focus the first invalid field after a failed submit; do not announce every keystroke as an alert. |

`VibeNotice` must accept optional action props (`label`, `href` or `onClick`) so
the caller, rather than a global singleton, owns the next step. Do not create a
cross-route toast queue in this increment; it hides critical lifecycle feedback
and complicates server/client boundaries unnecessarily.

### M. Preference storage contract

WordPress remembers screen preferences. Vibes can adopt the comfort of that
behavior without creating an account-settings project.

1. All Vibes list column preferences may use a single versioned local key:
   `sunset-pulse:vibes:list:v1`.
2. Editor panel-collapse preferences may use:
   `sunset-pulse:vibes:editor-panels:v1`.
3. Sidebar collapse preference may use:
   `sunset-pulse:vibes:sidebar:v1`.
4. Read these only inside client components after hydration. The server-rendered
   initial UI must remain complete and usable without any preference stored.
5. Validate parsed JSON against an allowlist of column/panel IDs. Invalid or
   expired schema values fall back silently to defaults.
6. Do not store Vibe content, site IDs, revision IDs, authorization data, or
   anything from an operator action in browser preferences.
7. Do not make columns hidden by default. The initial Vibe list remains
   Title/Status/Revision/Last modified, with only optional secondary metadata
   eligible for hiding later.

### N. Responsive behavior specification

The screenshot is desktop-oriented; its interaction model must survive smaller
screens rather than merely shrink.

| Viewport | Shell | List | Editor |
| --- | --- | --- | --- |
| `>= 1024px` | sticky utility bar + 240px rail | dense table, row actions revealed on hover/focus, toolbar in one line where space allows | two columns, 320px sticky Publish rail |
| `640–1023px` | utility bar + horizontal Vibe navigation | table remains scrollable; search becomes full-width before filter controls; row actions always visible | single canvas followed by Publish rail; panels retain order |
| `< 640px` | utility bar with accessible Add New; horizontal navigation is scrollable | retain native table semantics in an overflow container; no card-only rewrite; action links visible and wrap | one column; save/preview/lifecycle controls remain at top and Publish details follow content |

For the list, table overflow is preferable to deleting status/revision context.
If a later mobile study shows a need for a disclosure row, it must expose the
same table data and actions, not a reduced mobile-only data model.

### O. Anti-drift implementation gates

An implementation PR must stop and seek a separate decision if it encounters
any of the following:

- A proposed UI needs a new API response field not currently returned.
- A proposed action requires partial draft update, new mutation semantics, or
  a new lifecycle transition.
- A component needs to reveal a site inventory, seed status, secret, or
  customer pointer in the browser.
- A WordPress feature would require importing Gutenberg, a new drag/drop
  dependency, a global state library, or a broad design-system rewrite.
- A design change would alter generated Vibe payload shape, preview rendering,
  revision immutability, or apply-to-site behavior.

In those cases, leave the UI control out, document the gap, and propose a
bounded follow-up rather than widening this plan mid-implementation.

### P. Action hierarchy and exact labels

WordPress screens remain understandable because each screen has one obvious
next action. Apply the same discipline; buttons are not interchangeable visual
decoration.

| Screen | One primary action | Secondary actions | Explicitly not primary |
| --- | --- | --- | --- |
| All Vibes | **Add New** | Search, status view, bulk Apply, filters | Archive/trash, which remain secondary/danger actions |
| Add New Vibe | **Save draft and continue editing** | Back to All Vibes, Start from a style | Publish, preview, or apply-to-site |
| Edit draft | **Save draft** while dirty; otherwise the permitted lifecycle action is visually prominent in the Publish rail | Preview, Revisions, status details | A destructive lifecycle action or Apply to site |
| Submit for review | **Submit for review** | Back to edit, Preview | Publish if current status is draft |
| Publish | **Publish revision** | Back to edit, Preview, View revisions | Apply to site |
| Revisions | No global primary action | Compare, Republish selected revision, Apply current published revision | Apply for a non-current revision |
| Apply to site | **Confirm and apply revision** only after preflight succeeds | Check current pointer, choose a different revision/site | Freeform apply before pointer check |

Use these exact labels in user-facing controls. Internal terms such as
“immutable” can appear in explanatory copy, but not as the only action label.
Button variants are constrained as follows:

- **Primary:** one per visual region; solid brand treatment.
- **Secondary:** outline or neutral treatment; safe navigation/actions.
- **Link:** row actions and low-emphasis navigation.
- **Danger:** only Move to trash and an approved destructive future action.
- **Disabled:** include adjacent explanation or a `title`/described-by message;
  a disabled button without reason is not usable feedback.

### Q. Component contracts for Luna

These are intentionally thin prop contracts. They avoid a new global state
layer and make the existing route components retain ownership of data and API
calls.

```ts
// apps/pulse/app/vibes/_components/VibePageHeader.tsx
type VibePageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
};

// apps/pulse/app/vibes/_components/VibeStatusViews.tsx
type VibeStatusView = { value: string; label: string; count: number };
type VibeStatusViewsProps = {
  views: readonly VibeStatusView[];
  activeValue: string;
  onChange: (value: string) => void;
};

// apps/pulse/app/vibes/_components/VibeListToolbar.tsx
type VibeListToolbarProps = {
  position: 'top' | 'bottom';
  selectedCount: number;
  action: '' | 'archive' | 'trash';
  onActionChange: (action: '' | 'archive' | 'trash') => void;
  onApply: () => void;
  busy?: boolean;
  search?: string;
  onSearchChange?: (value: string) => void;
  children?: React.ReactNode; // reserved for approved filters only
};

// apps/pulse/app/vibes/_components/VibeRowActions.tsx
type VibeRowActionsProps = {
  actions: Array<{
    label: string;
    href?: string;
    onClick?: () => void;
    tone?: 'default' | 'danger';
    disabled?: boolean;
  }>;
};

// apps/pulse/app/vibes/_components/VibePanel.tsx
type VibePanelProps = {
  id: string;
  title: string;
  description?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

// apps/pulse/app/vibes/_components/VibeNotice.tsx
type VibeNoticeProps = {
  tone: 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  onDismiss?: () => void;
};
```

`VibeConfirmDialog` should accept `open`, `title`, `description`,
`confirmLabel`, `cancelLabel`, `busy`, `onConfirm`, and `onOpenChange`. It must
not receive API endpoint strings or construct a request itself.

Do not create a `VibeProvider`, Zustand store, Redux store, or shared mutation
client merely to support these components. The present API/data ownership stays
inside `VibeList`, `VibeEditor`, `RevisionList`, and Apply.

### R. Keyboard and focus specification

The WordPress reference uses stable regions; Vibes should make those regions
clear to keyboard and assistive-technology users.

1. `layout.tsx` renders a **Skip to Vibe workspace** link before the utility
   bar. It points to `#vibe-workspace`.
2. The utility bar uses one `<nav aria-label="Vibes utility">`; the sidebar
   uses the existing `<nav aria-label="Vibe CMS navigation">`; each screen has
   one h1.
3. `VibeListToolbar` uses normal Tab order: bulk select → Apply → approved
   filters → search. It must not implement roving tabindex because these are
   form controls, not one composite toolbar.
4. `VibeStatusViews` uses native buttons/links in document order. Arrow-key
   roving behavior is unnecessary unless it becomes a real `tablist` with panels
   (it is not one in this plan).
5. Sort headers use full-width `<button>` targets with an `aria-sort` value on
   the containing `<th>` (`none`, `ascending`, or `descending`). The arrow is
   decorative and `aria-hidden`.
6. Opening `VibeConfirmDialog` moves focus to its cancel button or heading;
   closing returns focus to the exact trigger. Escape closes only while no
   request is in flight. While busy, both dismiss controls are disabled.
7. `VibePanel` uses a native `<button aria-expanded aria-controls>` or semantic
   `<details>/<summary>`. Do not make a `<div>` clickable.
8. After an unsuccessful form submit, programmatically focus the first invalid
   field only when native validation did not already do so. After a successful
   save, preserve focus on the submit button and announce success politely.
9. All icon-only controls require an accessible label. Prefer text controls for
   the first iteration where a label improves discoverability.

### S. Form and panel behavior specification

The “meta box” feeling comes from grouped, scannable settings—not from putting
everything into cards.

- Use fieldset/legend for groups of related checkboxes (taxonomy) and visible
  `<label>` elements for every scalar field.
- Keep metadata open by default. Keep Source and provenance, Typography,
  Layout, and Voice closed by default once their values have good defaults.
- When a panel is collapsed, its form controls remain mounted so current values
  remain in `FormData` on save. Do not conditionally unmount fields.
- Put validation text directly below the relevant input, and tie it with
  `aria-describedby`. Do not use placeholder text as a label or sole format
  explanation.
- Slug is a primary identity field. Show a live non-authoritative identifier
  preview, then validate again on the server when saved. A Vibe slug does not
  create or identify a public tenant-site URL.
- Color fields retain the native color input and a readable adjacent hex value
  only if the existing payload supports direct hex editing. Avoid a bespoke
  color-picker dependency in this initiative.

### T. Implementation sequencing at commit granularity

Avoid mixing structural, behavioral, and lifecycle work in one review. The
recommended commit/PR slices are:

1. **`vibes: add shared primitives and shell semantics`**
   - Add `_components` primitives, skip link, sidebar focus/active behavior.
   - No API requests or lifecycle changes.
2. **`vibes: refactor all-vibes list table`**
   - Extract views/toolbar/row actions; preserve list and bulk endpoints.
   - Add `vibe-list.test.tsx`.
3. **`vibes: clarify new-vibe identity flow`**
   - Slug helper/help, optional preset panel, form tests.
4. **`vibes: compose editor canvas and publish rail`**
   - Panels/toolbars/notice states; extend editor validation tests.
5. **`vibes: align revision and taxonomy management screens`**
   - Revision presentation, restore dialog, taxonomy table/filtering.
6. **`vibes: refine apply preflight`**
   - Presentational decomposition and final confirmation; no protected data
     exposure.
7. **`vibes: verify responsive and keyboard workflows`**
   - Browser/manual evidence only after behavior is stable.

Each slice must leave all existing Vibe routes operational; no intermediate
commit may depend on a future slice to restore access to save, preview, publish,
or revisions.

### U. Review checklist for a familiar, purpose-built editorial workspace

Before accepting any UI increment, review against these questions:

- Can a regular editor identify the current screen, current Vibe, and next safe
  action in under five seconds?
- Does the screen show a compact operational workspace rather than a marketing
  hero or oversized dashboard card layout?
- Is one action visually primary, with destructive options visibly secondary?
- Is the data list a real accessible table with scanable columns and inline row
  actions?
- Can essential edit/save/preview work occur without expanding advanced panels?
- Are status, revision, and site-application words truthful to the current
  backend contract?
- Do keyboard focus, error announcement, and mobile layout retain the same
  operations rather than hiding them?
- Did the implementation avoid importing WordPress code/CSS or broadening
  backend scope?

### V. Navigation, URL state, and return-path behavior

The list is an operational workspace. Returning from an editor, preview, or
revision should restore the editor’s context rather than reset it to a generic
first page.

#### List URL contract

Move the **list UI state**—not data ownership—to validated URL search params:

```text
/vibes?status=published&q=coastal&sort=updatedAt&dir=desc&page=2
```

Implement this in `VibeList.tsx` with `useSearchParams`, `useRouter`, and a
small parser in `apps/pulse/lib/cms/vibeListQuery.ts`:

```ts
type VibeListQuery = {
  status: '' | 'draft' | 'in_review' | 'published' | 'archived' | 'trash';
  q: string;
  sort: 'title' | 'status' | 'updatedAt';
  dir: 'asc' | 'desc';
  page: number;
};
```

- Parse unknown, duplicate, malformed, or out-of-range parameters to safe
  defaults. Limit `q` to the same maximum length the API supports; do not pass
  arbitrary query data through unexamined.
- Hydrate initial `VibeList` state from the parsed URL so direct links and
  browser Back restore the same view.
- For a status/sort/page selection, call `router.push()` so Back returns to the
  preceding list state. For debounced typing in search, call `router.replace()`
  so Back does not replay every keystroke.
- Build the existing `GET /api/vibes` request only from the parsed state. The
  API parameter names remain unchanged: `search`, `status`, `sort`,
  `direction`, `page`, and `pageSize`.
- Reset `page` to `1` when status, sort, direction, or `q` changes. Preserve
  page when only a display preference changes.
- Do not add route params to a Vibe edit URL. Browser Back from Edit naturally
  returns to the already-stateful list URL.

This supersedes the earlier caution against an **unvalidated** URL update. The
requirement is now a small validated query helper with unit tests, not ad hoc
string mutation in JSX.

#### Unsaved-change policy

- Add `useVibeUnsavedChangesWarning(isDirty)` under
  `app/vibes/_components/` or `lib/cms/`. Its first responsibility is a native
  `beforeunload` warning while `saveState === 'dirty'`.
- Do not attempt to intercept every internal `Link` on the first pass; it is
  error-prone and can conflict with browser navigation. The editor already
  surfaces the dirty state prominently.
- When a future internal-navigation confirmation is added, it must present
  **Stay and save**, **Leave without saving**, and **Cancel**—never silently
  discard. It must not block links while save is in flight.
- Preview opens only from a persisted draft. Its label tells the user it
  reflects the last saved draft, not unsaved inputs currently in the form.

#### Route and identity copy rules

- Browser-facing navigation uses the Vibe title first, then a slug/identifier
  context. `vibeId` is operational metadata and should not lead a page title.
- Keep current routes based on `vibeId`; replacing them with slugs is out of
  scope and risks breaking lifecycle/revision links.
- Any raw Vibe/revision/site ID shown for operational verification appears in a
  visually secondary code-style field with a copy control only after a real
  copy-success feedback path exists.

### W. Editorial copy and progressive disclosure system

The interface should teach domain concepts at the moment they matter, rather
than force editors to learn implementation vocabulary first.

| Concept | First-use copy | Where it appears | Do not say |
| --- | --- | --- | --- |
| Vibe | “A reusable visual and editorial system for a site.” | All Vibes empty state / Add New intro | “CMS record” |
| Slug | “A URL-safe Vibe identifier, for example `coastal-modern`. It does not create a public site URL.” | Under the slug field | “Must match the requested format” alone |
| Draft | “Saved changes that are not yet a published revision.” | Save state / editor | “Unpublished object” |
| Revision | “A frozen version created when you publish.” | Publish and revisions | “Database snapshot” |
| Republish revision | “Creates a new published revision from this snapshot.” | Revision confirmation | “Rollback” without explanation |
| Apply to site | “Sets this site to use the selected published revision.” | Apply preflight | “Mutate pointer” |
| Disposable verification site | “A temporary site used only for controlled testing.” | Apply preflight | “Seed target” |

Rules for progressive disclosure:

1. Show one sentence of help under an unfamiliar field; provide longer context
   through a small **What is this?** disclosure, not a modal tour.
2. Do not show help labels on every familiar control. Help should disappear from
   the scan path once the form is understood.
3. Use exact outcome verbs: **Save**, **Submit**, **Publish**, **Restore**,
   **Apply**, **Archive**, **Move to trash**. Avoid generic “Continue” and
   “Confirm” unless the immediately adjacent text names the outcome.
4. Preserve backend error text only when it is editor-safe; otherwise map it to
   a plain-language message while retaining a technical Details disclosure for
   operators.

### X. Design consistency boundaries

The workspace must feel coherent without leaking admin styling into the public
product.

- Scope all new CSS/classes/components under `app/vibes` or the existing Vibes
  route group. Do not alter global body typography, global button defaults, or
  public-site page spacing for this initiative.
- Keep the existing dark Vibes shell and neutral work area; use one brand action
  color, one danger color, and status tones only for meaningful lifecycle state.
- Avoid excessive rounded cards. Tables, toolbars, and panels need borders and
  spacing hierarchy more than large radii or shadows.
- Use icon libraries already in the repository (`lucide-react` is currently in
  `VibeSidebar.tsx`); do not add icon fonts or copy a third-party icon set.
- If a shared global component could be useful outside Vibes, leave it local
  first. Promote it only after a separate cross-product review.

### Y. Additional verification cases

Add these to the manual/browser verification checklist after the relevant slice:

1. Open a filtered, sorted second page of All Vibes; edit one Vibe; use browser
   Back; confirm query, status view, sort, and page are preserved.
2. Type a search query, wait for debounce, then use Back once; confirm it moves
   to the prior stable query—not each keystroke.
3. Make an editor change, attempt browser refresh/close, and confirm native
   unsaved-change warning appears. Save, then repeat; it must not appear.
4. Collapse every advanced panel, save the form, reload, and confirm all field
   values persisted while panel preference behavior follows its local setting.
5. Tab through the list’s status views, toolbar, sort headers, select-all,
   first row actions, pagination, and dialog; no focus target may be invisible.
6. Reduce viewport to 375px, 768px, and 1440px; verify controls wrap or scroll
   intentionally and no select/search field overlaps an adjacent control.
7. Trigger a draft conflict using the existing test/mocked response; verify
   fields remain visible, no false success notice appears, and reload warning is
   explicit.

### Z. Current-to-target UI gap ledger

Use this ledger during implementation review. Every change should close a stated
gap or be rejected as unrelated scope.

| Current implementation | User-facing issue | Target change | File / current anchor | Contract that must remain unchanged |
| --- | --- | --- | --- | --- |
| `VibeLayout` has a useful dark header but only two bare links. | The workspace identity and current context are thin. | Turn it into a labelled utility region with a skip link and contextual current-Vibe label. | `layout.tsx` lines 7–10 | `/vibes` and `/vibes/new` navigation. |
| Sidebar already fetches current status and builds workflow links. | Correct functionality, but active child routes and compact/mobile behavior need polish. | Improve active matching, focus treatment, grouping, and optional local collapse. | `VibeSidebar.tsx` lines 41–125 | Status-dependent workflow links and event refresh. |
| List title uses hero-scale type and Add New is far right. | It reads more like a marketing page than an operational screen. | Compact heading/action cluster and status views directly below it. | `VibeList.tsx` lines 115–129 | `href="/vibes/new"`. |
| List has both status views and a status select. | Duplicate controls imply two different filters and waste horizontal room. | Status views own status filtering; move future secondary filters behind an explicit filter control. | `VibeList.tsx` lines 126–150 | Existing status values/query behavior. |
| Search is a flexible input beside a select. | At intermediate widths it can collide/bleed into neighboring controls. | Fixed responsive widths, toolbar wrapping, debounce, and URL state. | `VibeList.tsx` lines 130–142 | Search API parameter and data results. |
| Row actions live in a dedicated right-aligned cell. | The eye travels away from title to operate an item. | Move Edit/Preview/Revisions/actions under the Vibe title. | `VibeList.tsx` lines 177–190 | Existing action routes. |
| Bulk actions are individual buttons shown only after selection. | Less familiar scan path and no standard action selection/apply rhythm. | Select action + Apply; confirmation only for destructive action. | `VibeList.tsx` lines 101–107, 151 | Bulk endpoint body and archive/trash choices. |
| New Vibe page is one long JSX return with presets before identity. | The first task is visually obscured and invalid-slug feedback is browser-generic. | Split sections, title/slug first, explanatory validation, optional preset panel. | `new/page.tsx` line 9 | Create payload and preset copy behavior. |
| Editor already has a 320px sticky Publish rail. | Strong foundation, but the canvas is a sequence of equally weighted cards. | Keep rail; turn canvas groups into purpose-ranked collapsible panels. | `VibeEditor.tsx` lines 172–235 | Draft normalization, PATCH request, conflict handling. |
| Publish rail shows save state, preview, action, revisions. | Action order does not make save state / next lifecycle action easy to scan. | Add compact status summary and action hierarchy without merging routes. | `VibeEditor.tsx` lines 48–82 | `workflowAction` status logic and separate publish route. |
| Revision page exposes state but raw revision context dominates. | It takes extra work to identify live versus historical revision. | Status-first row hierarchy, readable metadata, explicit republish outcome. | `RevisionList.tsx` lines 86 onward | Apply only current published revision; rollback endpoint behavior. |
| Apply page is a single dense JSX form with manual fields near the top. | It asks for opaque identifiers before showing the decision/risk. | Revision context → site selection → pointer check → preflight → confirmation. | `apply/page.tsx` lines 9–52 | Protected validation and run-ID derivation. |
| Taxonomy directory loads data but is not explicitly a management table. | Harder to scan usage and group membership at scale. | Searchable/group-filtered table using current terms/counts response. | `TaxonomyDirectory.tsx` lines 5 onward | Term IDs, current read-only API. |

### AA. Lifecycle-aware screen rules

The CMS has states. The UI must expose those states instead of making all Vibes
look equally actionable.

| Vibe state | List badge/copy | Editor rail | Row actions | Revision screen | Apply eligibility |
| --- | --- | --- | --- | --- | --- |
| Draft | Neutral **Draft** | Save draft; **Submit for review** as next lifecycle action | Edit, Preview, Status & Actions | Checkpoints may exist | Not eligible |
| In review | Review **In review** | Explain that the draft awaits publication; **Publish revision** is next | Edit, Preview, Status & Actions | Review checkpoints visible | Not eligible until a current published revision exists |
| Published | Positive **Published** plus revision cue | State that later saves change the draft, not the current published revision | Edit, Preview, Revisions | Current published revision is first | Current published revision only |
| Archived | Muted **Archived** | Status management only; no misleading publish/apply CTA | Preview, Status & Actions, audit | Historical context remains viewable | Not eligible |
| Trash | Danger/muted **Trash** | No standard editor CTA unless existing backend supports restoration | View context only as currently supported | Historical context remains viewable | Not eligible |

Rules:

1. Never use button color alone to convey lifecycle state; badge text names it.
2. Never display **Apply to site** merely because any revision exists. The
   existing condition—current published revision—is the UI eligibility rule.
3. A draft with a published revision needs two labels when relevant: current
   **Draft** status and an informational “Published revision available” cue.
4. Archive/trash controls are list-management actions, not normal editor
   primary actions.
5. If the server rejects an action shown by a stale client view, retain the
   server message and refresh the Vibe status/navigation context.

### AB. Visual density and layout measurements

These are target ranges, not new global design tokens. They keep the workspace
compact and readable without requiring a visual redesign of the entire product.

| Element | Target |
| --- | --- |
| Utility header | Existing 40px height; horizontal padding 12–16px. |
| Desktop navigation rail | Existing 240px (`lg:w-60`) maximum; no widened permanent rail. |
| Work area width | List: `max-w-7xl`; editor/revisions: `max-w-6xl`/`max-w-5xl` as current context requires. |
| Screen title | 28–32px, semibold/black only where justified; action sits adjacent. |
| Toolbar controls | 32–36px minimum control height; 8px gaps; wrap before overlap. |
| Table header | 12–13px operational label, compact vertical padding. |
| Table row | 48–64px for simple rows; allow taller title cells for actions/metadata. |
| Row actions | 12–13px, grouped under item title with subtle separators. |
| Editor rail | Existing 320px desktop width; no fixed width at tablet/mobile. |
| Panel spacing | 16–20px inner padding; 12–16px field gaps; do not surround every field with its own card. |
| Focus indicator | 2px visible high-contrast ring with offset; never rely on box-shadow too faint to see on dark rail. |

### AC. Loading and failure presentation

The present code often renders a single text paragraph while loading. Replace
that with visual continuity but preserve honest failure states.

- `VibeList`: use a table-shaped skeleton with 5–8 rows while the first request
  is pending. Do not show stale list data as current after a filter changes;
  mark it as updating or replace it deliberately.
- `VibeEditor`: use a header/canvas/rail skeleton, not a bare “Loading vibe…”
  paragraph. The skeleton must not resemble editable saved data.
- `RevisionList` and `TaxonomyDirectory`: use compact table row skeletons.
- Error states use `VibeNotice tone="error"` plus a Retry callback where a
  refetch is safe. Retry must not replay mutation requests.
- Mutations show busy state on the originating control and prevent duplicate
  submission. Do not disable unrelated navigation unless leaving would corrupt
  in-flight UI state.
- Preserve empty state distinction: an empty collection is not a load failure;
  an unauthorized access message is not a missing Vibe.

### AD. Definition of “done enough to implement”

Before implementation begins, Luna should confirm all of the following from this
plan:

- Which exact increment is being built and which files it changes.
- Which existing route/API contracts are explicitly preserved.
- Which shared components are needed in that increment—and no others.
- Which interaction states and unit/browser cases apply.
- Whether any current UI gap requires an API change; if yes, stop at the
  anti-drift gate and propose it separately.

This prevents a broad visual refactor from becoming a hidden CMS redesign.

### AE. End-to-end editorial journey contracts

Each journey below is a product contract. A UI increment is incomplete when its
component tests pass but its affected journey is confusing or broken.

#### Journey 1 — Find and resume a draft

1. Editor opens **All Vibes** and immediately sees status views, search, and
   compact table context.
2. Editor selects **Drafts**, searches by title or slug, and opens the title or
   **Edit** row action.
3. The editor shows the Vibe title, Draft state, saved/unsaved state, and next
   permitted action without exposing internal IDs first.
4. Browser Back returns to the same list filter/search/sort/page.

**Success evidence:** query params restore the list; title row actions are
keyboard reachable; no lifecycle action appears that the draft cannot take.

#### Journey 2 — Create a clear draft identity

1. Editor chooses **Add New** from either the utility header or All Vibes.
2. Editor enters a human title; slug is generated and a URL-safe explanation is
   visible.
3. Editor may expand **Start from a style** and choose a preset, or leave the
   default unchanged.
4. Editor chooses **Save draft and continue editing** and lands in the draft
   editor with a truthful saved state.

**Success evidence:** invalid slug shows inline guidance before an API request;
manual slug edits stop automatic overwrite; selected preset is copied only into
the new draft.

#### Journey 3 — Edit, save, and preview a draft

1. Editor changes title, taxonomy, or visual controls in the canvas.
2. Save state changes to **Unsaved changes**; no false success signal appears.
3. Editor saves; the originating control becomes busy, then the state reads
   **Saved** and offers **Preview changes**.
4. Preview clearly states it is a saved draft preview or published revision
   preview, as appropriate.
5. If the server reports a conflict, the editor stays mounted, fields remain
   visible, and the user is told exactly what reloading would replace.

**Success evidence:** outgoing PATCH payload remains normalized as today;
base-font-size validation test still passes; no browser-only UI state is treated
as published content.

#### Journey 4 — Publish and understand history

1. An in-review Vibe makes **Publish revision** the clear next lifecycle action.
2. Publish screen explains that publication freezes the selected draft state.
3. After publishing, Revision history puts the current published revision first
   and distinguishes it from previous publications/checkpoints.
4. Editor can compare history or republish an earlier published revision as a
   new current published revision after an explicit confirmation.

**Success evidence:** restore does not claim to publish/apply; raw revision IDs
remain secondary; Apply action is offered only from current published revision.

#### Journey 5 — Apply safely to an approved site

1. Operator arrives from the current published revision, with revision context
   already visible.
2. Operator chooses an approved site mechanism or explicitly expands manual
   site ID entry.
3. Operator checks current pointer; a preflight summary renders Vibe, revision,
   site, current pointer, new pointer, and temporary-site warning if relevant.
4. Only then can the operator confirm the application.
5. Response becomes a visible success/error notice without inventing a new
   client-side source of truth.

**Success evidence:** no secrets/customer-site inventory appear in the browser;
the protected API continues to validate all input; an apply result is not
mistaken for a draft save or publication.

### AF. UI error-language matrix

Treat errors as part of the workflow. Exact phrasing can be refined during UI
copy review, but error categories and next actions must remain stable.

| Situation | Visible message | Next action | Technical detail handling |
| --- | --- | --- | --- |
| List unavailable | “We couldn’t load Vibes right now.” | **Try again** | Keep network/status detail out of the default message. |
| No matching search | “No Vibes match this search.” | **Clear search** | No error semantics. |
| Invalid slug | “Use lowercase letters, numbers, and hyphens only.” | Fix the Slug field | Inline; do not wait for server failure. |
| Invalid base font size | Existing unit-specific field guidance. | Fix the field | Preserve current pattern validation and help text. |
| Draft save failed | “Draft could not be saved. Check your connection and try again.” | **Try again** | Keep locally entered fields visible. |
| Draft conflict | “This draft changed in another session.” | **Reload latest draft** | Describe replacement effect; no auto-merge claim. |
| Publication rejected | “This Vibe can’t be published in its current state.” | **Review status** or return to editor | Offer backend error through a Details disclosure where safe. |
| Revision restore rejected | “This revision could not be restored.” | **Try again** / return to history | Preserve selected revision context. |
| Site pointer check failed | “We couldn’t verify the current site revision.” | **Check again** | Do not enable apply. |
| Application rejected | “The selected revision was not applied.” | Review preflight / try again only when safe | Preserve server reason in an operator Details disclosure. |

Never show raw `Error`, a fetch exception, JSON serialization output, or an HTTP
status as the user-facing message. However, a technical Details disclosure may
include a correlation ID or safe server code if the API already provides one.

### AG. Visual regression and design-review evidence

For every UI slice, capture the same state set so reviewers can identify
regressions rather than comparing arbitrary screenshots:

| Screen | Required visual states |
| --- | --- |
| All Vibes | populated, selected rows/bulk toolbar, no results, fetch error, 375px width |
| Add New | default, generated slug, invalid slug, preset expanded/selected, saving |
| Edit | saved, unsaved, saving, conflict, advanced panels collapsed, tablet width |
| Revisions | current published, prior published, checkpoint, restore confirmation |
| Taxonomy | populated, search/filter result, empty result, fetch error |
| Apply | initial, pointer checked, disposable warning, final confirmation, API error |

Evidence must use disposable/local fixture data only. Screenshots must not
contain customer site IDs, tokens, production secrets, or private editorial
content.

### AH. Deliberate future opportunities (not current work)

These are valid future directions discovered while reasoning about the workflow;
they are recorded to avoid rediscovering them, but they are not implementation
tasks in this plan.

- Server-supported partial draft updates could eventually make a careful
  title/slug/taxonomy quick edit viable.
- A per-user recovery-draft design could eventually support crash recovery
  without pretending it is a published revision.
- A stable payload-aware revision diff could eventually support richer visual
  compare views than the current history list.
- A server-authorized disposable-site picker could eventually replace manual
  run-ID/site-ID entry in the operator flow.
- Responsive preview widths can become a stronger visual-token authoring aid
  after the preview renderer is proven to support it.

No future opportunity authorizes a dependency, API, database, permission, or
production change by itself.

### AI. Desktop wireframes and component tree

These are layout contracts, not pixel-perfect mockups. They establish hierarchy,
placement, and action order before class-level styling begins.

#### All Vibes

```text
┌──────────────────────────────── Vibes utility bar ───────────────────────────────┐
│ [Vibes]                 [current context when applicable]            [+ Add New] │
├───────────────┬──────────────────────────────────────────────────────────────────┤
│ ALL VIBES     │ All Vibes  [Add New]                                               │
│ ADD NEW       │ Manage drafts, reviews, published revisions, and history.         │
│ TAXONOMY      │ All (24) | Drafts (5) | In review (2) | Published (14) | ...     │
│               │                                                                    │
│               │ [Bulk actions v] [Apply] [Filters]        [Search Vibes       ]  │
│               │ ┌────┬────────────────────────┬───────────┬────────┬───────────┐ │
│               │ │ □  │ Vibe                   │ Status    │ Rev.   │ Modified  │ │
│               │ ├────┼────────────────────────┼───────────┼────────┼───────────┤ │
│               │ │ □  │ Coastal Modern         │ Published │ r12    │ Aug 31    │ │
│               │ │    │ /coastal-modern         │           │        │            │ │
│               │ │    │ Edit · Preview · Revisions                                    │
│               │ └────┴────────────────────────┴───────────┴────────┴───────────┘ │
│               │ Showing 1–25 of 24                                     [‹] [›]   │
└───────────────┴──────────────────────────────────────────────────────────────────┘
```

```text
VibeList (data/state owner)
├── VibePageHeader
├── VibeStatusViews
├── VibeListToolbar (top)
├── VibeNotice (conditional)
├── VibeListTable
│   ├── sortable table headers
│   ├── selection checkbox cells
│   └── VibeRowActions
├── VibeListToolbar (bottom, conditional)
├── VibePagination
└── VibeConfirmDialog (controlled by VibeList)
```

#### Edit Vibe

```text
┌──────────────────────────────── Vibes utility bar ───────────────────────────────┐
│ [Vibes]   [← All Vibes]  Editing: Coastal Modern                 [Preview] [⚙]   │
├───────────────┬───────────────────────────────────────────┬──────────────────────┤
│ ALL VIBES     │ Coastal Modern                             │ PUBLISH              │
│ ADD NEW       │ Slug: coastal-modern                       │ Published revision   │
│ TAXONOMY      │ Saved / Unsaved changes / Saving / Conflict│ r12 available        │
│               │                                            │                      │
│ CURRENT VIBE  │ [Metadata                         −]        │ [Save draft]         │
│ Edit Vibe     │   Title · Slug · Description                │ [Preview]            │
│ Preview       │                                            │ [Submit / Publish]   │
│ Revisions     │ [Taxonomy                        +]         │                      │
│ Status        │ [Colors                          +]         │ Revision history     │
│ Audit log     │ [Typography                      +]         │                      │
│ Source        │ [Layout                          +]         │                      │
│               │ [Source and provenance           +]         │                      │
│               │ [Voice                           +]         │                      │
└───────────────┴───────────────────────────────────────────┴──────────────────────┘
```

```text
VibeEditor (data/state owner)
├── VibeEditorToolbar
│   ├── back link / current title / slug identifier
│   ├── save-state indicator
│   ├── Preview link
│   └── settings visibility control (later, optional)
├── VibeNotice (conditional)
├── editor form
│   ├── VibePanel: Metadata
│   ├── VibePanel: Taxonomy → VibeTaxonomyFieldset
│   ├── VibePanel: Colors
│   ├── VibePanel: Typography
│   ├── VibePanel: Layout
│   ├── VibePanel: Source and provenance
│   └── VibePanel: Voice
└── PublishPanel
    ├── lifecycle/status summary
    ├── save action
    ├── Preview
    ├── next permitted lifecycle action
    └── revision-history link
```

#### Apply a published revision

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Back to revisions                                                               │
│ Apply published revision                                                          │
│                                                                                  │
│ 1. Revision                                                                       │
│    Current published revision: r12 · 7f…9c       [Choose a different revision]  │
│                                                                                  │
│ 2. Target site                                                                    │
│    [Use a disposable verification site +]                                         │
│    [Enter site ID manually +]                                                     │
│                                                                                  │
│ 3. Verify current site pointer                                                    │
│    [Check current site pointer]                                                   │
│                                                                                  │
│ 4. Review change                                                                  │
│    Vibe / selected revision / site / current pointer / new pointer               │
│    Temporary-site warning, when relevant                                          │
│                                                                                  │
│                                              [Confirm and apply revision]         │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### AJ. Mobile layout decisions

Mobile should retain the same data and decisions, with controlled stacking:

1. Utility bar keeps Vibes identity and **Add New**. It must not include a
   dense current-Vibe label that crowds the route action.
2. Sidebar remains a horizontally scrollable text-and-icon navigation row. Do
   not switch to an unlabeled hamburger menu for this route group.
3. All Vibes title/action stack, then status views wrap, then toolbar controls
   stack in decision order. Search takes a complete line.
4. The native table remains in an intentional overflow container. Checkbox,
   title, status, revision, and modified data stay available; do not replace it
   with cards that hide lifecycle information.
5. Row actions are always visible below the Vibe title on touch widths.
6. Editor toolbar is a compact two-row region: back/title/save state then
   Preview/lifecycle/settings controls. Publish rail follows the editable canvas
   as a full-width section; it is not permanently sticky.
7. Confirmation dialogs use near-full-width layout with cancel reachable before
   confirm in document order. No critical information is hidden behind scrolling
   inside a small dialog.

### AK. UI implementation decision log

When an implementation choice is made, append a one-line entry to the relevant
PR description or implementation note in this form:

```text
[screen] [decision] — [reason] — [contract preserved] — [test evidence]
```

Examples:

```text
[All Vibes] status select moved behind Filters — status views are the primary
collection navigation — GET /api/vibes status query unchanged — vibe-list.test.tsx.

[Editor] Typography collapsed by default — it is advanced configuration with
safe defaults — FormData keys and PATCH payload unchanged — editor validation test.
```

This is intentionally concise. It helps future reviewers understand why an
interaction changed without duplicating the full plan in code comments.

### AL. Design review red flags

Reject or revise a UI change when it causes any of the following:

- The title/action area requires a user to scan the full width of the screen to
  find the primary next action.
- Status can be changed from two conflicting controls on the same screen.
- A table action is hidden for keyboard users or becomes unreachable on touch.
- A draft can be mistaken for a published revision or a site-applied revision.
- A save/publish/apply button changes behavior based on styling rather than its
  visible label and adjacent state explanation.
- A generic card grid replaces a dense operational table without preserving all
  list columns and actions.
- A panel unmounts its inputs when closed, causing an incomplete save payload.
- A UI component fetches protected/operator data solely to fill a convenience
  control.
- A visual refactor requires an API/lifecycle/backend change that is not named
  in its implementation increment.

### AM. App Router and client-boundary architecture

The UI should improve without moving authorization or data authority into the
browser. Apply these boundaries exactly:

| File / component | Rendering boundary | Reason | Implementation rule |
| --- | --- | --- | --- |
| `app/vibes/layout.tsx` | Server component | Owns route shell and static landmarks. | Keep it server-rendered; it may render client children such as `VibeSidebar`. |
| `app/vibes/VibeSidebar.tsx` | Client component | Uses pathname, local state, and status refresh event. | Keep `'use client'`; do not move `getVibeCmsAccess` here. |
| `app/vibes/page.tsx` | Server page wrapper | Static metadata and route boundary. | Keep it minimal and render `VibeList`. |
| `app/vibes/VibeList.tsx` | Client component | Search/filter/pagination/bulk interaction and list fetching. | Keep request construction and bulk mutation ownership here. |
| `app/vibes/new/page.tsx` | Client page today | Controlled form state and create navigation. | It may be split into a server wrapper plus `NewVibeForm` later, but no access behavior changes in the UI slice. |
| `app/vibes/[vibeId]/edit/page.tsx` | Server page | Runs `getVibeCmsAccess` before client editor mounts. | Preserve this boundary exactly; no UI component may replace this check. |
| `app/vibes/[vibeId]/edit/VibeEditor.tsx` | Client component | Fetches draft and manages form/save state. | Remains data owner for editor child components. |
| `app/vibes/[vibeId]/revisions/page.tsx` | Server page | Runs access check. | Preserve it; only revise header composition. |
| `RevisionList.tsx`, `TaxonomyDirectory.tsx`, `apply/page.tsx` | Client components/pages | Current client fetch/mutation behavior. | Split markup into children without moving protected data lookups client-side. |

#### Shared-component directive rules

1. Do not put `'use client'` in an `_components/index.ts` barrel. It would make
   otherwise static shared markup needlessly client-bound.
2. `VibePageHeader`, `VibeStatusBadge`, and static empty-state components remain
   server-compatible: no hooks, browser APIs, or event callbacks internally.
3. `VibeStatusViews`, `VibeListToolbar`, `VibeRowActions`, `VibePanel`,
   `VibeNotice` with dismissal, and `VibeConfirmDialog` are client components
   because their parents pass callbacks or they maintain local interaction state.
4. Pass serializable values from server pages into client components. Do not pass
   request headers, access objects, database clients, or server-only functions.
5. Keep all protected APIs behind their current server routes. A UI component may
   render a safe result from a route response; it may not import protected
   service modules directly.

### AN. Dialog and disclosure implementation choice

The project currently has Tooltip/Slot primitives but no installed dialog
primitive. For this scoped work:

- Implement `VibeConfirmDialog` with the native HTML `<dialog>` element,
  `ref.showModal()`, `ref.close()`, and a form/button structure. Verify target
  browser support in the browser walkthrough.
- Use the dialog’s native modal behavior rather than adding a dialog package or
  hand-writing a brittle focus trap. Capture the trigger element before opening
  and restore focus on close.
- Render confirm/cancel as actual buttons. The confirm button reflects `busy`,
  and the dialog cannot dismiss through Escape/backdrop while confirmation is
  in flight.
- If the project’s target browser matrix cannot support `<dialog>`, stop and
  propose a narrowly scoped dependency decision; do not replace it with a
  generic `div role="dialog"` that lacks focus management.
- Use native `<details>/<summary>` for low-risk disclosures such as manual site
  ID, disposable verification site, and advanced field help. Use `VibePanel`
  button/region behavior where panel preference persistence is required.

### AO. Component file layout

Create files only when a component is used by more than one route or contains a
non-trivial interaction. Avoid a folder full of one-line wrappers.

```text
apps/pulse/app/vibes/
├── _components/
│   ├── VibePageHeader.tsx          # server-compatible markup
│   ├── VibeStatusBadge.tsx         # server-compatible mapping
│   ├── VibeStatusViews.tsx         # client interactions
│   ├── VibeListToolbar.tsx         # client interactions
│   ├── VibeRowActions.tsx          # client interaction/presentation
│   ├── VibePanel.tsx               # client collapse preference
│   ├── VibeNotice.tsx              # client only if dismissible
│   ├── VibeConfirmDialog.tsx       # client/native dialog
│   ├── VibeEditorToolbar.tsx       # client editor controls
│   ├── VibeTaxonomyFieldset.tsx    # client form fieldset
│   └── vibeUi.ts                   # optional local class composition constants
├── VibeList.tsx                    # list data/query/mutation ownership
└── [vibeId]/edit/VibeEditor.tsx    # editor data/form/mutation ownership
```

No component in this directory may introduce a general-purpose CMS abstraction,
read environment variables, or query a database.

### AP. Test architecture by boundary

| Concern | Test location / method | Required assertion |
| --- | --- | --- |
| URL query parser | `tests/unit/vibe-list-query.test.ts` | defaults, allowlist rejection, page normalization, safe search length. |
| List interaction | `tests/unit/vibe-list.test.tsx` | views, debounce, bulk dialog, row actions, URL update behavior. |
| New Vibe identity | `tests/unit/vibe-new-page.test.tsx` | title-to-slug, manual slug, inline validation, create payload. |
| Editor field integrity | existing `tests/unit/vibe-editor-validation.test.tsx` | current validation plus collapsed panels retaining FormData keys. |
| Dialog/disclosure | `tests/unit/vibe-confirm-dialog.test.tsx` | focus restoration, cancel, busy blocking dismissal, confirm callback once. |
| Server access pages | existing/operator route tests | UI refactor did not remove server access guard. |
| Browser walkthrough | existing Playwright setup or controlled browser session | keyboard sequence, responsive layout, and full affected journey. |

Tests should mock `next/navigation` locally where URL behavior is exercised.
They must not require a live customer site, production token, or deployment.

### AQ. Performance and hydration limits

- Do not add a global Vibes client provider or a global UI state store.
- Do not import the editor component or its visual-token form into the All Vibes
  list bundle.
- Debounce only search input. Status, sort, pagination, and explicit actions
  should respond immediately.
- Abort stale list/editor fetches as the current components already do; preserve
  that cleanup during extraction.
- Avoid data fan-out: list rows render fields from the single list response;
  they do not fetch revisions, taxonomy, or status individually.
- Preferences read from `localStorage` happen after hydration and may not block
  initial render. Use defaults until the read completes.
- Skeletons should be plain local markup and not a heavy animation dependency.

### AR. Cross-route consistency audit

Before merging a UI increment, compare every touched route against this common
set:

- Same utility/header landmarks and same Vibes navigation.
- Same title/action spacing and action variants.
- Same status badge labels/colors.
- Same notice placement: below header/toolbar, above primary work surface.
- Same empty/loading/error visual language.
- Same focus ring on dark navigation and light workspace surfaces.
- Same back-link wording: **All Vibes**, **Back to Vibe**, or **Back to
  revisions**, based on actual parent context.
- Same raw-ID treatment: secondary, copyable only if verified, never title-led.

This audit is a visual/code review step, not a new runtime feature.

### AS. Existing shared-control compatibility decision

`apps/pulse/components/ui/button.tsx` is currently optimized for the broader
application’s dark/cyan visual surfaces. Its default/outline/link variants are
not a drop-in fit for the neutral operational workspace planned here.

Therefore:

1. **Do not change the existing global `Button` variants as part of this plan.**
   That would alter unrelated product surfaces and make this UI refactor harder
   to review.
2. In `app/vibes/_components/vibeUi.ts`, define local class composition values
   for `primary`, `secondary`, `link`, and `danger` action styles. They must use
   existing Tailwind utilities only; no CSS framework or new styling dependency.
3. Use semantic `<button>` and `<Link>` elements with those local classes in the
   Vibes route group. A navigation link must not be rendered as a button merely
   to inherit styles.
4. If a later cross-product design review wants a neutral operational `Button`
   variant, propose it separately with visual regression evidence for current
   consumers of `components/ui/button.tsx`.

Suggested local class roles:

```ts
export const vibeActionClass = {
  primary: 'inline-flex h-9 items-center justify-center rounded border border-[#2271b1] bg-[#2271b1] px-3 text-sm font-semibold text-white hover:bg-[#135e96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  secondary: 'inline-flex h-9 items-center justify-center rounded border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  link: 'text-sm font-medium text-[#2271b1] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2',
  danger: 'text-sm font-medium text-[#b32d2e] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#b32d2e] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
} as const;
```

These values are a starting specification, not a mandate to add an abstraction
if the same style is used only once. Avoid hard-coded one-off button variants in
every page.

### AT. Mutation-state and idempotent-interaction rules

Each mutation already depends on a server contract. The UI must prevent obvious
duplicate interaction without claiming to provide transaction guarantees.

| Mutation | Originating UI | Busy behavior | Success behavior | Failure behavior |
| --- | --- | --- | --- | --- |
| Save draft | `PublishPanel` / editor form | Disable only save submit; retain safe navigation | Save state becomes Saved; show optional preview notice | Keep form values and mark Unsaved changes/error |
| Bulk archive/trash | `VibeListToolbar` dialog | Disable confirm and cancel dismissal while request pending | Refetch list; clear selection; success notice | Preserve selection; show error; permit retry |
| Publish revision | Publish route button | Disable submit; do not re-enable until response | Navigate to revisions on confirmed success | Keep change summary and show error |
| Republish revision | Revision-row dialog | Disable confirm; keep selected revision context | Reload revision list; success notice | Keep dialog error or return focus to trigger with notice |
| Apply revision | Apply confirmation dialog | Disable confirm and preflight-changing inputs during request | Preserve response message and refresh pointer only if safe | Preserve preflight summary; show rejection detail safely |

Rules:

- One busy state is owned by the component that sends the request; do not create
  a global “app loading” overlay.
- A busy action’s label uses a progressive verb (`Saving…`, `Publishing…`,
  `Restoring…`, `Applying…`) rather than generic `Loading…`.
- Do not show a success notice until the corresponding route response is
  successful. A button click, client-side navigation start, or optimistic badge
  is not evidence of success.
- Refetch after a mutation only when the current route’s data needs it. Do not
  reload the full browser page as a shortcut.
- Preserve a stable correlation between error message and action. An apply
  error may not appear as a general editor save error.

### AU. Motion, feedback, and visual restraint

The workspace is an operational environment. Motion should clarify changes,
not compete with content or cause uncertainty.

- Use no entrance animation for page-level data tables or editor forms.
- A panel may expand/collapse with a short (150–200ms) height/opacity transition
  only when `prefers-reduced-motion` does not request reduction. Native details
  without animation is acceptable.
- Dialog open/close may fade the backdrop and surface, but focus must move
  immediately; animation never delays interaction.
- Loading skeletons use static neutral blocks or a subtle reduced-motion-safe
  pulse. They do not use branded shimmer effects.
- Status changes are communicated in text and accessible live regions; color or
  animation is supplementary only.
- Do not animate table rows out before a successful bulk response. Replace the
  list after refresh so state remains truthful.

### AV. Semantic table and form checklist

Before merging list/editor changes, inspect DOM semantics directly:

- All Vibes uses one `<table>` with `<thead>`, `<tbody>`, `<th scope="col">`,
  and real checkbox inputs.
- The title cell contains the main title link, secondary slug/metadata, and row
  actions; title is not duplicated as a visually hidden separate action name.
- Each sort header has `aria-sort`; sort icon has `aria-hidden="true"`.
- Status views use a `<nav aria-label="Vibe status views">`, not an unlabeled
  group of controls.
- Search has a visible or programmatic label; filter selects have labels; the
  Apply button is `type="button"` outside forms or `type="submit"` only when it
  genuinely submits its surrounding form.
- Editor has a single `<form>` for the draft payload. `VibePanel` does not nest
  forms. Taxonomy is a fieldset with a legend.
- Primary page title is the only h1. Panel titles are h2/h3 in logical order.
- Notices use the role policy in section L; dialogs have an accessible name and
  descriptive body.

### AW. Baseline accessibility quality bar

The planned UI is not complete when it only looks correct with a mouse:

1. All interactive controls have a visible focus indicator against both light
   work surfaces and dark navigation surfaces.
2. Text and status badges meet legible contrast without relying on low-opacity
   color alone.
3. Icons supplement labels; icon-only controls have accessible names and
   tooltips where needed.
4. Checkbox hit areas are at least the surrounding table cell/control target
   size, while retaining a real native input.
5. Dialog, panel, navigation, toolbar, and table focus order match visual
   reading order.
6. Reduced-motion users can use every operation with no required animation.
7. Error and success status are announced once, without interrupting active
   typing for normal save feedback.

## Platform integration: tenant sites and structured Vibe data

### AX. What already exists

Sunset Pulse already implements the core dynamic-subdomain pattern. This UI plan
must integrate with it rather than create a second multi-tenant stack.

| Concern | Existing implementation | UI-plan consequence |
| --- | --- | --- |
| Hostname parsing | `lib/sites/tenantRouting.ts` normalizes hostnames, root domains, reserved names, and valid tenant slugs. | Do not add client-side subdomain parsing or derive tenant identity from a Vibe slug. |
| Tenant request rewrite | `middleware.js` calls `getTenantRewrite`, rewrites tenant hosts to `/sites/[tenant]`, and forwards trusted tenant headers. | Do not change middleware, DNS, SSL, or host headers for the Vibes UI work. |
| Public site route | `app/sites/[site]/[[...path]]/page.tsx` renders the tenant site. | Treat public site rendering as the downstream consumer of a selected Vibe revision. |
| Active Vibe pointer | Launch Kit/site data includes `activeVibeRevisionId` and application metadata. | Apply UI may display the pointer as verification context; it does not own or infer tenant routing. |
| Structured Vibe payload | `VibeEditor` edits `draftPayload`; `vibeService` publishes immutable snapshots with CSS variables and voice configuration. | Keep editor UI bound to the existing schema; do not introduce a second page-content representation. |
| Public Vibe projection | Site data resolves the active revision into `vibeCssVars` and `vibeVoiceConfig` for public rendering. | Preview/apply copy must distinguish saved draft preview from tenant site output. |

### AY. Canonical content and rendering flow

```text
Authoring UI
  /vibes/:vibeId/edit
       │ saves normalized draftPayload with expectedVersion
       ▼
Vibe draft (not public)
       │ publish
       ▼
Immutable VibeRevision
  snapshot + cssVars + voiceConfig
       │ apply to site (protected route)
       ▼
Tenant site pointer
  activeVibeRevisionId
       │ request arrives at <tenant>.<root-domain>
       ▼
middleware.js → /sites/:tenant rewrite
       │ resolves tenant site + active revision projection
       ▼
Public tenant rendering
  CSS variables + voice configuration + site data
```

Rules derived from this flow:

1. A draft is never public merely because it has a title, slug, or preview.
2. A published revision is not live on every tenant; it becomes live only for a
   site after that site’s pointer is updated through the protected apply flow.
3. A tenant subdomain names a tenant site, not a Vibe. Multiple sites can
   eventually point at the same published Vibe revision.
4. Vibe slugs are editorial identifiers, not public site URLs or DNS labels,
   and not a substitute for tenant identity.
5. The Vibes workspace should communicate this distinction in the apply
   preflight, revision history, and preview labels—not by exposing middleware
   mechanics to ordinary editors.

### AZ. Dynamic-subdomain work: explicit disposition

The multi-tenant routing proposal has two layers:

| Proposal | Disposition | Reason |
| --- | --- | --- |
| Wildcard DNS | Platform/deployment concern; not in this UI plan. | The application already has runtime tenant-host resolution. DNS configuration belongs to deployment/domain operations. |
| Wildcard TLS | Platform/deployment concern; not in this UI plan. | Certificate/domain management is outside Vibe authoring UX. |
| Read Host header and resolve tenant | Already implemented server-side. | `tenantRouting.ts` and `middleware.js` own this boundary. |
| Query tenant records and render tenant-specific content | Already implemented through site data / public site routes. | The Vibes UI is an upstream authoring surface, not a second public router. |
| Show site/subdomain relationship in UI | In scope only where it aids an operator decision. | Apply preflight may show selected site ID and safe human-facing site label/domain if an approved response already supplies it. |

Do not add a “Subdomains” navigation item to the Vibes workspace. Tenant/domain
management has a different lifecycle and should remain in its existing site or
Launch Kit surfaces.

### BA. Block-editor proposal: explicit disposition

The structured-JSON principle is compatible with the current architecture; the
suggested generic editor frameworks are not automatically a fit.

| Idea | Disposition | Reason |
| --- | --- | --- |
| Store structured data rather than raw HTML | Already adopted. | Vibe drafts and revision snapshots are structured data validated before preview/publish. |
| Map structured data to a controlled renderer | Already adopted. | Public site projection uses published revision CSS/voice data; preview renders the saved normalized draft. |
| Generic rich-document editor | Not needed for current Vibe fields. | Current Vibe model is a structured visual/editorial system, not a freeform article body. |
| Editor.js | Defer unless a future Vibe schema introduces a rich text document field. | It would solve document-block authoring, not current visual-token editing. |
| GrapeJS | Reject for this initiative. | It introduces a separate visual-builder model, CSS persistence, and rendering pipeline that would diverge from Vibe revisions and tenant rendering. |
| Craft.js | Defer pending a defined repeatable-section schema and renderer contract. | Drag/drop UI without a schema, persistence format, rendering contract, and keyboard model would be premature. |
| Native structured-section editor | Discovery gate only. | It is the lowest-risk future direction if existing payload fields become repeatable sections. |

### BB. Guardrails for any future repeatable-section model

If the discovery gate in Phase 5 proves a repeatable section schema is needed,
write and approve a separate schema/rendering plan before adding drag-and-drop.
That plan must define:

1. A versioned section node shape with stable `id`, `type`, and validated props.
2. An allowlist of section types and an explicit renderer for each type.
3. Normalization rules, defaults, and migration behavior.
4. How a section node is stored inside the existing Vibe draft and frozen in an
   immutable revision snapshot.
5. How public tenant rendering consumes the same published node structure.
6. Keyboard add, edit, duplicate, delete, and move controls before pointer drag
   is introduced.
7. Preview/test fixtures for every type and an unknown-type fallback that fails
   safely rather than rendering arbitrary markup.

Until those conditions are met, retain the current native structured fields and
the UI improvements described in this plan.

### BC. UI copy that reflects the tenant relationship

Use these precise explanations where needed:

| Screen | Copy rule |
| --- | --- |
| Draft preview | “Saved draft preview. This does not change any tenant site.” |
| Publish | “Publishing creates a reusable revision. It does not apply it to a site.” |
| Revision history | “Current published revision” means the Vibe’s current publication, not a tenant’s active selection. |
| Apply preflight | “This site will use the selected published revision after you confirm.” |
| Apply success | “Revision rN is now selected for this site.” Do not claim DNS, deployment, or global publication changed. |
| Tenant/public context, if shown | Show approved site label/domain as context, then secondary site ID; never expose host-resolution/debug headers. |

### BD. Tenant-aware manual verification additions

After the UI work and only in a controlled environment:

1. Use one disposable or approved non-customer tenant site with a known original
   Vibe pointer.
2. Save a Vibe draft and verify its preview label clearly says no tenant site
   changed.
3. Publish the draft and verify the tenant’s public output remains unchanged.
4. Apply the published revision through the preflight; verify the selected
   tenant route displays the resolved Vibe CSS/voice projection.
5. Verify a different tenant route remains unchanged.
6. Revisit revision history and apply preflight; verify the current pointer
   matches the selected revision.
7. Revoke/restore according to the existing controlled lifecycle runbook; do
   not use a customer site for UI verification.

### BE. Site-versus-Vibe ownership matrix

The public tenant projection shows that a Vibe is an applied layer inside a site,
not a replacement for the site record. Keep these responsibilities separate in
the UI and in future schema decisions.

| Concern | Canonical owner today | Evidence in code | UI consequence |
| --- | --- | --- | --- |
| Hostname / subdomain / custom domain | Tenant site configuration and routing | `tenantRouting.ts`, `siteData.ts` lines 161–164 | Vibes screens show a target site only as apply context; they do not edit DNS/domain identity. |
| Site publication readiness | Tenant site configuration | `siteData.ts` lines 169–208 | Vibe publication must not claim a tenant site became public. |
| Site title, owner, agent profile, compliance, integrations | Tenant site configuration | `siteData.ts` lines 155–215 | Do not put agent/site-profile fields in Vibe editor panels. |
| Public page section inventory/order | Tenant site configuration | `siteData.ts` lines 214 and 257–266; public route lines 148–203 | Do not introduce hero/listings/contact drag-and-drop controls in Vibe editor. |
| Vibe draft visual/editorial configuration | Vibe draft payload | `VibeEditor.tsx` lines 107–139 | Existing structured editor remains the Vibe authoring surface. |
| Immutable reusable visual/editorial release | Vibe revision snapshot | `vibeService.ts` publish flow | Revision history explains this as reusable publication, not tenant deployment. |
| Active selection for one site | Tenant-site active Vibe revision pointer | `siteData.ts` lines 272–285 | Apply flow changes selection only after protected validation/preflight. |
| Rendered Vibe values | Published revision CSS variables / voice configuration | `siteData.ts` lines 276–282; public route lines 163 and 184 | Public site output uses the resolved projection; no browser-side Vibe lookup is needed. |

### BF. Visual precedence contract

At present, a tenant site is normalized with its own branding, title, sections,
and profiles, then may be hydrated with an active Vibe projection. The hydration
adds `vibeCssVars`, `vibeVoiceConfig`, and a Vibe-derived assistant tone; the
public site route applies `vibeCssVars` to its root style.

The UI must communicate only what is guaranteed:

1. Applying a Vibe selects a published revision for a site.
2. That selected revision contributes its published visual variables and voice
   configuration to public tenant rendering.
3. It does **not** replace the tenant’s domain, owner, title, readiness,
   listings, compliance profile, integration profile, or section inventory.
4. It must not claim that every site-branding field will visibly change; actual
   public components may consume only specific CSS variables.
5. Before adding a UI field named “site-wide color” or “site-wide font,” inspect
   the public component consuming that field and document whether site branding
   or the active Vibe projection wins. Do not infer precedence from labels.

This is a product-accuracy requirement. It prevents the Vibes UI from promising
a full theme replacement when it currently supplies a controlled style/voice
projection.

### BG. Preview terminology correction

The current `/vibes/[vibeId]/preview` page renders a representative layout from
the saved Vibe draft. It is valuable for reviewing colors, typography, layout,
and voice, but it is not the public tenant route and does not render a selected
tenant’s listings, profiles, sections, or readiness state.

Update plan copy accordingly:

| Existing or proposed wording | Required wording |
| --- | --- |
| “Preview changes” | “Preview Vibe settings” when it opens the representative draft preview. |
| “Draft preview” | “Saved Vibe settings preview · not applied to a site.” |
| “Published revision preview” | “Published Vibe revision preview” unless a real tenant-site route is being rendered. |
| “See how your site looks” | Do not use for the current preview route. |

Future tenant-site preview is a separate capability. It may be proposed only if
the UI can safely select an authorized site and render that site’s real public
composition against a chosen saved/published Vibe revision without changing its
active pointer. That requires a separate server-rendering and authorization
design; it is not a client iframe or a generic page-builder canvas.

### BH. Consequences for the repeatable-section discovery gate

The existing public site has a site-owned section list (`hero`,
`featured_listings`, `about_agent`, `contact`). That is evidence against putting
site-composition controls into the Vibe editor today.

The Phase 5 discovery gate must answer two separate questions before any new UI:

1. Are there repeatable **Vibe-owned** values that should become sections inside
   the Vibe revision snapshot?
2. Or is the desired capability actually a tenant-site section/layout change
   that belongs in a site/Launch Kit workspace?

If the answer is the second, remove it from this Vibes plan and propose it under
the tenant-site product area. Reusing a style layer across sites and composing a
site’s public sections are different products with different data owners.

### BI. Apply preflight: pointer-aware impact rules

The existing pointer read route resolves the site’s active published revision.
Its response is enough to make the preflight more truthful without adding an
API route, as long as the client type represents the returned revision identity.

#### Required client-type and state changes

In `app/vibes/[vibeId]/apply/page.tsx`:

1. Expand `Pointer` so `revision` includes optional `vibeId` in addition to
   `revisionId` and `revisionNumber`. The pointer endpoint already returns the
   published projection; the current client type merely omits this context.
2. Replace the single `pointer` truthy check with an explicit preflight state:
   `idle | checking | verified | error` plus `checkedSiteId` and `checkedAt`.
3. Invalidate `verified` when the Site ID changes. Revision changes update the
   summary but do not erase the fact that the selected site pointer was checked.
4. Keep the final apply button disabled unless `preflightState === 'verified'`,
   `checkedSiteId === siteId`, and a revision ID is present.
5. Render the check time as “Current site selection checked just now” or a
   formatted timestamp. It is a preflight observation, not a lock on the site.
6. After a successful apply, refetch the pointer using existing `checkPointer()`
   and show the returned pointer in the success confirmation.

#### Preflight presentation rules

| Site pointer condition | What to show | Available next action |
| --- | --- | --- |
| No active revision | “This site does not currently have a published Vibe revision selected.” | Apply remains available after a successful pointer check and final confirmation. |
| Active revision belongs to this Vibe | “Currently using rN from this Vibe.” | Show **Compare revisions** only if current and selected revision IDs differ. |
| Active revision belongs to a different Vibe | “Currently using a revision from another Vibe.” | No cross-Vibe compare link. Show exact current revision as secondary operational context. |
| Active revision equals selected revision | “This site already uses the selected revision.” | Disable final apply and offer **Back to revisions**; do not send an idempotent no-op by default. |
| Pointer check unavailable | Error notice with reason and **Check again**. | Apply remains disabled. |
| Site ID changed after check | “Check the current site selection before applying.” | Apply remains disabled until checked again. |

For same-Vibe comparison only, link to the existing compare route:

```text
/vibes/:vibeId/compare?from=:currentRevisionId&to=:selectedRevisionId
```

Do not construct this link when `pointer.revision.vibeId !== vibeId`; the
current comparison route is scoped to one Vibe and must not be presented as a
cross-Vibe semantic diff.

#### Concurrency wording

The current apply API does not accept an expected-current-pointer value. The UI
must therefore never say “the site will change only if it is still on rN.” Use
this wording instead:

> You checked the current selection at [time]. The protected apply action will
> validate the requested published revision before updating the site.

If conditional pointer compare-and-set behavior becomes necessary, it requires a
separate API contract and is not a client-side confirmation enhancement.

### BJ. Preview capability boundary

There are two distinct review surfaces:

| Surface | Existing? | What it proves | What it does not prove |
| --- | --- | --- | --- |
| Saved Vibe settings preview | Yes, `/vibes/:vibeId/preview` | The Vibe draft’s normalized style/voice settings can render in the representative preview. | Tenant site sections, listings, profile content, host routing, or actual applied result. |
| Public tenant route | Yes, tenant host rewritten to `/sites/:tenant` | The real tenant composition resolves its active Vibe projection. | A proposed/draft Vibe revision before pointer application. |
| Tenant-site revision preview | No | Would let an authorized operator inspect a real tenant composition against a chosen revision. | Must not mutate the active pointer or expose tenant inventory. |

Do not add a site selector, iframe, or `?site=` query parameter to the existing
Vibe settings preview. A future tenant-site revision preview needs all of these
before it is proposed for implementation:

1. A server-authorized site selection boundary.
2. A server-rendered or server-validated temporary revision override that does
   not persist into the tenant site pointer.
3. Clear draft versus published-revision eligibility rules.
4. Reuse of the actual public tenant rendering path rather than a duplicate
   client renderer.
5. A controlled verification strategy that never exercises a customer site
   without authorization.

### BK. Version and renderer compatibility guardrails

The Vibe UI must assume revisions can outlive the current editor code. Avoid
features that make old published snapshots impossible to inspect or apply.

- Existing preview/publish schema validation remains the source of truth.
- UI panels must provide defaults for missing optional visual fields, as the
  current editor does, but must not silently write unknown schema values on save.
- Revision rows with a projection that cannot render should display a clear
  “Revision data is unavailable for preview” state and preserve audit metadata;
  they must not be represented as a healthy current selection.
- New Vibe fields require a schema, preview, revision-snapshot, public-renderer,
  and compare-path decision before they appear in the editor. A field is not
  complete because it saves to draft JSON alone.
- Any schema-version or migration policy belongs to a separate data-model plan;
  this UI plan records the compatibility gate but does not invent a versioning
  mechanism.

## Executable implementation backlog

### BL. Work-package dependency graph

```text
W0: shared UI foundations + query helper
 ├── W1: All Vibes list / URL state / bulk confirmation
 ├── W2: Add New identity and slug flow
 └── W3: editor toolbar, panels, save feedback
      ├── W4: revisions, compare presentation, audit, taxonomy
      └── W5: pointer-aware apply preflight
             └── W6: browser, responsive, and keyboard verification
```

W1 and W2 can be reviewed independently after W0. W4 may begin after W3’s
shared notice/dialog/panel primitives are stable. W5 uses the dialog/notice
primitives but must not wait for any unapproved tenant-preview feature.

### BM. Bounded work packages

| Package | Files to add/change | Deliverable | Must not change | Exit evidence |
| --- | --- | --- | --- | --- |
| W0 — UI foundations | `layout.tsx`, `VibeSidebar.tsx`, selected `_components/*`, `lib/cms/vibeListQuery.ts` | Skip landmark, shell hierarchy, local action/notice/panel/dialog primitives, validated list-query parser | APIs, access gates, global button component, database schema | Unit parser tests; sidebar keyboard/manual check; `git diff --check`. |
| W1 — All Vibes | `VibeList.tsx`, `vibe-list.test.tsx`, components consumed only by list | Compact title/action cluster, status views, toolbar, URL state, dense table row actions, bulk confirmation | GET list query names, POST bulk payload, bulk action set | List tests cover status/search/sort/page/bulk/empty/error; desktop + mobile screenshot. |
| W2 — Add New | `new/page.tsx`, optional `NewVibeForm.tsx`, slug helper/tests | Identity-first create flow, readable slug validation, optional preset panel | POST create payload, create redirect, preset meaning | New-Vibe tests for slug/manual edit/create payload; keyboard radio check. |
| W3 — Editor | `VibeEditor.tsx`, editor components, existing editor tests | Toolbar, concise save state, panelized form, safe dirty/conflict feedback | PATCH normalization, `expectedVersion`, server page access check, lifecycle routes | Existing validation tests plus panel/FormData/conflict tests; tablet screenshot. |
| W4 — History and taxonomy | `RevisionList.tsx`, revisions/audit/taxonomy screens/tests | Current-first revision hierarchy, restore confirmation, readable audit feed, taxonomy table/search/group filter | Revision endpoints, restore semantics, taxonomy IDs/API | Revision restore/compare action test; taxonomy filter test; keyboard review. |
| W5 — Apply | `apply/page.tsx`, apply-only components/tests | Pointer-state preflight, same-Vibe comparison link, accurate site-impact confirmation | Apply endpoint body/protected validation, run-ID derivation, tenant routing | Apply state tests for none/same/different/stale/error/already selected; controlled non-customer walkthrough. |
| W6 — Verification | test files and documentation evidence only | Cross-route consistency, responsive, keyboard, visual evidence | Application behavior except test fixes | Focused unit runs, appropriate browser walkthrough, no production/customer mutation. |

### BN. Package-level acceptance checklist

Before marking a package complete, the implementer answers every item in its PR
description:

1. Which work package is this?
2. Which current files/symbols were changed, added, or deliberately left alone?
3. Which existing route/API contract is preserved?
4. Which component interaction states were tested?
5. Which desktop and narrow-width evidence was captured?
6. Did a new API, schema, environment, dependency, route, or authorization need
   arise? If yes, why was the package stopped rather than widened?
7. Did the implementation modify anything outside `apps/pulse/app/vibes`, its
   focused Vibe tests, or a named local helper? If yes, name and justify it.

### BO. Suggested focused verification commands

Run the smallest relevant tests during each package, then use broader checks at
integration boundaries. Commands are run from `apps/pulse` unless noted.

```powershell
# W0 / W1 query and list work
npx vitest run tests/unit/vibe-list-query.test.ts tests/unit/vibe-list.test.tsx

# W2 create form work
npx vitest run tests/unit/vibe-new-page.test.tsx

# W3 editor work; preserve the current validation contract
npx vitest run tests/unit/vibe-editor-validation.test.tsx tests/unit/vibe-cms-contracts.test.ts

# W4 / W5 focused additions, once the named files exist
npx vitest run tests/unit/vibe-revisions.test.tsx tests/unit/vibe-taxonomy.test.tsx tests/unit/vibe-apply.test.tsx

# Integration boundary
npm run test:unit
npm run build
```

If a proposed named test file has not yet been created, create it in its owning
package before claiming that package complete. Browser checks come after the
relevant focused unit tests; they do not replace them.

### BP. Reversibility and rollback posture

This initiative should remain easy to revert because it is primarily presentational
and client interaction work.

- Do not add migrations, change persisted Vibe fields, or rename existing routes
  in W0–W6.
- Keep each work package in its own commit or tightly related commit group so a
  later UI regression can be reverted without removing unrelated CMS work.
- URL query state is additive; old `/vibes` links without query params remain
  valid and resolve to defaults.
- Local preference keys are optional; deleting them returns the UI to defaults
  and does not affect Vibe/site data.
- New shared components must be introduced alongside one migrated consumer,
  rather than as an untested abstract library.
- If a UI extraction changes a mutation’s request body or timing, stop and
  compare it against existing tests before proceeding. Refactoring JSX is not
  authorization to alter mutation semantics.

### BQ. Final integration review order

Review the completed packages in this sequence:

1. **Semantic/route review:** server access gates and route/API invariants still
   match this plan.
2. **Interaction review:** loading, error, busy, conflict, confirmation, and
   success states work from keyboard and mouse/touch.
3. **Editorial review:** labels make draft, revision, and site application
   distinctions clear without exposing internal implementation vocabulary first.
4. **Visual review:** shell, table density, panel hierarchy, responsive widths,
   focus ring, and status badges are consistent across routes.
5. **Tenant review:** public tenant rendering is not altered; controlled apply
   evidence confirms only the intended selected site changes.

No package is “done” merely because its happy-path screenshot looks polished.

## Luna execution runbook

### BR. Operating rules for Luna

For each turn, execute **one unchecked task only**. Do not start a later task
because it appears related.

1. Read this runbook section plus the named section(s) for the task.
2. Run `git status --short` and preserve unrelated changes.
3. Inspect only the named files and focused tests with `rg`/bounded reads.
4. Use `apply_patch` for changes. Do not perform broad formatting rewrites.
5. Run the exact focused test command listed for the task.
6. Run `git diff --check` and inspect `git diff --stat`.
7. Report: files changed, behavior changed, test result, and the next unchecked
   task. Do not create an API, schema, deployment, DNS, tenant-routing, or
   access-control change unless the task explicitly says to stop and propose it.

If a task discovers a missing API field, mutation behavior, access requirement,
or public-renderer contract, stop at that task and write a concise finding under
the task’s **Stop condition**. Do not work around it in the client.

### BS. Task 0A — add server-compatible display primitives

- [ ] Create `apps/pulse/app/vibes/_components/VibePageHeader.tsx` with the
  `VibePageHeaderProps` contract in section Q. It renders optional back link,
  optional eyebrow, one h1, description, and actions. It uses no hooks and has
  no `'use client'` directive.
- [ ] Create `apps/pulse/app/vibes/_components/VibeStatusBadge.tsx` that maps
  existing status strings (`draft`, `in_review`, `published`, `archived`,
  `trash`) to labels/classes. Unknown status renders a neutral formatted label;
  it does not throw or translate lifecycle values.
- [ ] Create `apps/pulse/app/vibes/_components/VibeNotice.tsx` initially without
  dismissal. It accepts tone, children, optional action, and renders `alert`
  only for error; otherwise `status`.
- [ ] Update `app/vibes/layout.tsx` only to add a skip link and
  `<main id="vibe-workspace">` around children. Preserve header links/routes.

**Do not touch:** API routes, `VibeList`, `VibeEditor`, global Button,
middleware, tenant routing.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-editor-validation.test.tsx
npm run build
```

**Done when:** the Vibes layout has one skip target, shared display primitives
exist, and the existing editor test/build pass.

**Stop condition:** build shows server/client serialization errors. Keep static
components server-compatible; do not mark the layout client-side.

### BT. Task 0B — sidebar navigation polish

- [ ] In `VibeSidebar.tsx`, add `isActivePath(pathname, href)` so a route such
  as `/vibes/:id/edit` marks **Edit Vibe** active without marking sibling items.
- [ ] Add visible `focus-visible` ring classes to `SidebarLink` for both active
  and inactive links.
- [ ] Keep `primaryItems` limited to All Vibes, Add New, Taxonomy.
- [ ] Reorder workflow links exactly: Edit Vibe, Preview, Revisions, Status &
  Actions, status-dependent Submit/Publish, Audit Log, Source Details.
- [ ] Retain status fetch, abort cleanup, and `vibe-status-changed` listener.

**Do not touch:** status APIs, route paths, site/apply navigation, tenant code.

**Verify:** manually open `/vibes/:id/edit`, `/preview`, `/revisions`, and
`/actions`; tab through each sidebar item. Then run:

```powershell
npx vitest run tests/unit/vibe-editor-validation.test.tsx
```

**Done when:** exactly one contextual workflow item is active, focus is visible,
and status-dependent links remain correct.

**Stop condition:** sidebar cannot know status without a new API call. Keep the
existing fetch/event logic; do not introduce a provider.

### BU. Task 0C — list query parser and URL state

- [ ] Create `apps/pulse/lib/cms/vibeListQuery.ts` with a parser/serializer for
  `status`, `q`, `sort`, `dir`, and `page` exactly as defined in section V.
- [ ] Add `tests/unit/vibe-list-query.test.ts` for defaults, invalid status,
  invalid sort/dir, page normalization, duplicate values, and search length.
- [ ] Refactor `VibeList.tsx` state initialization to use parsed search params.
- [ ] Add URL update helpers: `router.push` for status/sort/page and debounced
  `router.replace` for search. Keep fetch parameter names unchanged.
- [ ] Keep page reset on search/status/sort/direction changes.

**Do not touch:** `/api/vibes` route, page-size constant, list response type
beyond fields already returned.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-list-query.test.ts
```

**Done when:** opening `/vibes?status=published&q=coastal&sort=title&dir=asc&page=2`
initializes the matching UI state and generated fetch query; invalid params use
safe defaults.

**Stop condition:** the current Next navigation test setup cannot mock query
state. Record the test-harness gap; do not abandon parsing/validation or move
URL logic into a global store.

### BV. Task 1A — restructure the All Vibes header, views, and toolbar

- [ ] Create client `VibeStatusViews.tsx` and `VibeListToolbar.tsx` using the
  prop contracts in section Q.
- [ ] Replace `VibeList.tsx` lines 115–152 with `VibePageHeader`, status views,
  and one top toolbar.
- [ ] Move the visible **Add New** action next to the title. Keep the global
  Add New in the utility bar; ensure narrow widths do not visually duplicate
  competing primaries.
- [ ] Remove the always-visible duplicate status `<select>` once status views
  own filtering. Do not remove any supported status value.
- [ ] Make search use `min-w-0 w-full sm:w-64 sm:flex-none` (or equivalent) and
  a 250–300ms debounce.
- [ ] Add list loading/error/empty-state branches described in sections L and
  AC; no visual skeleton dependency.

**Do not touch:** table columns/row actions/bulk request behavior yet; those are
Task 1B.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-list-query.test.ts tests/unit/vibe-list.test.tsx
```

**Done when:** title/action, views, toolbar, search, URL state, and empty/error
states work without table behavior regression.

**Stop condition:** list test file does not yet exist. Create it only for these
behaviors; do not add an end-to-end framework or live-site requirement.

### BW. Task 1B — table rows, selection, and bulk confirmation

- [ ] Create client `VibeRowActions.tsx` and `VibeConfirmDialog.tsx` following
  sections Q, AN, AT, and AV.
- [ ] Move list row actions from the far-right action cell into the Vibe title
  cell beneath title/slug metadata. Keep Edit, Preview, Revisions, and existing
  safe actions/routes.
- [ ] Retain native table/checkbox structure. Add `aria-sort` to sortable `<th>`
  and decorative sort arrows only.
- [ ] Replace `window.confirm` in `runBulk` with `VibeConfirmDialog`.
- [ ] Replace `window.location.reload()` after a successful bulk request with a
  local list refresh callback, preserve current query state, clear selection,
  and show success/error notice.
- [ ] Add bottom toolbar only when the loaded list has at least ten rows.

**Do not touch:** bulk endpoint body, archive/trash choices, API authorization.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-list.test.tsx
```

**Done when:** keyboard users can reach row actions; bulk trash asks for
confirmation; cancel sends no request; success refetches list without full page
reload.

**Stop condition:** native dialog behavior cannot be tested in the current DOM
environment. Mock the dialog method narrowly in the test; do not substitute an
inaccessible faux dialog.

### BX. Task 2 — Add New Vibe identity flow

- [ ] Extract `toVibeSlug`, `VIBE_SLUG_PATTERN`, and `isValidVibeSlug` into a
  shared safe helper only after checking whether an equivalent schema helper
  already exists.
- [ ] Split `new/page.tsx` into readable JSX sections or a `NewVibeForm` client
  component. Keep request and redirect behavior unchanged.
- [ ] Put title, slug, help, identifier preview, description, and submit before
  the optional **Start from a style** panel.
- [ ] Keep auto-slug only until the user manually edits it. Render inline
  validation and do not depend solely on native pattern text.
- [ ] Change visible submit label to **Save draft and continue editing**.
- [ ] Ensure preset radios have visible focus treatment.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-new-page.test.tsx
```

**Done when:** title-to-slug, manual-slug, invalid-slug, preset, and unchanged
create payload behaviors are all tested.

**Stop condition:** server slug validation differs from the discovered shared
helper. Use the server-safe validator or stop; do not let client/server rules
diverge.

### BY. Task 3 — editor toolbar and panel composition

- [ ] Create `VibeEditorToolbar.tsx`, `VibePanel.tsx`, and
  `VibeTaxonomyFieldset.tsx` as client components.
- [ ] Preserve `VibeEditor` as draft data/form owner. Do not move `saveDraft`,
  fetch, `SaveState`, or conflict behavior into child components.
- [ ] Replace the current header with title, identifier context, saved/unsaved
  state, and Preview link. Use exact preview terminology from section BG.
- [ ] Keep two-column desktop layout. Keep PublishPanel sticky at desktop; stack
  after canvas on narrower widths.
- [ ] Convert Metadata, Taxonomy, Colors, Typography, Layout, Source and
  provenance, and Voice into panels. Keep metadata open; preserve all mounted
  form fields/FormData names when other panels close.
- [ ] Reorder PublishPanel: status/lifecycle summary → save state → Save draft
  → Preview Vibe settings → permitted lifecycle action → revision history.
- [ ] Add polite saved/dirty/saving status and explicit conflict/error notice.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-editor-validation.test.tsx tests/unit/vibe-cms-contracts.test.ts
```

**Done when:** existing PATCH normalization/expectedVersion behavior is intact,
the current base-font-size contract passes, and collapsed panels still submit all
current field values.

**Stop condition:** an editor field has no validated schema/preview/render path.
Leave that field unchanged and record the gap; do not add it to a new panel.

### BZ. Task 4 — revisions, audit, and taxonomy

- [ ] Update `RevisionList.tsx` to present current published revision first,
  then prior publications, then checkpoints; retain actual response ordering if
  it already guarantees this or derive presentation-only order.
- [ ] Replace revision restore confirmation with `VibeConfirmDialog`; copy must
  say it creates a new published revision and does not apply it to a site.
- [ ] Keep Apply link only for current published revision.
- [ ] Update revisions/audit page headers to use shared header primitives while
  preserving server access checks.
- [ ] Replace audit’s duplicate workflow nav with current sidebar context;
  group events by date and hide raw IDs in Details disclosure.
- [ ] Refactor `TaxonomyDirectory.tsx` into searchable/group-filtered table
  using its current in-memory terms and counts response only.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-revisions.test.tsx tests/unit/vibe-taxonomy.test.tsx
```

**Done when:** restore confirmation is accurate, current revision is obvious,
taxonomy filtering is client-side over loaded terms, and no taxonomy mutation is
introduced.

**Stop condition:** revision ordering/comparison needs fields absent from the
existing response. Render current known metadata and propose an API addition;
do not fetch one revision per row.

### CA. Task 5 — pointer-aware Apply preflight

- [ ] Split `apply/page.tsx` into named presentational blocks listed in section
  7; retain page-level state/fetch/apply functions.
- [ ] Add `vibeId` to the client Pointer revision type and explicit preflight
  state from section BI.
- [ ] Invalidate verification only when Site ID changes; disable apply until a
  fresh check for the current site completes.
- [ ] Render none/same-Vibe/different-Vibe/already-selected states exactly as in
  the preflight table.
- [ ] Generate Compare link only for same-Vibe, different revision IDs.
- [ ] Keep manual Site ID and disposable run-ID controls behind disclosures.
- [ ] Replace final direct submit with `VibeConfirmDialog`; use accurate
  preflight wording and post-success pointer refresh.

**Verify:**

```powershell
npx vitest run tests/unit/vibe-apply.test.tsx
```

**Done when:** no-pointer/same/different/already-selected/error/stale-site
states have tests; final apply does not bypass pointer check or alter endpoint
payload.

**Stop condition:** desired comparison crosses Vibes or needs a site-preview
override. Do not invent an endpoint/query/iframe; record it as future work.

### CB. Task 6 — integration verification and documentation evidence

- [ ] Run each focused unit suite for completed work packages.
- [ ] Run `npm run test:unit` and `npm run build` after W1–W5 integration.
- [ ] Capture required screenshots from section AG with non-customer fixture
  data at 1440px, 768px, and 375px as applicable.
- [ ] Perform the keyboard and browser-Back checks in sections R, V, and Y.
- [ ] Perform controlled non-customer tenant verification from section BD only
  if separately authorized and the environment is available.
- [ ] Add a concise implementation evidence note: completed packages, test
  output, screenshots, deferred gaps, and no-change confirmation for routing,
  tenant configuration, and public rendering.

**Done when:** every completed package has evidence and every uncompleted gap is
listed explicitly. Do not call the initiative complete while a required package
is merely visually drafted.

## Luna line-level code blueprint

### CC. Reading this blueprint

Line references are anchored to the current files at the time this blueprint was
written. When a prior Luna task changes a file, locate the named function or JSX
region, not the old numeric line alone. Every instruction below describes a
small patch; do not rewrite an entire file merely because its current JSX is
compressed onto one line.

### CD. `app/vibes/layout.tsx` — exact patch

**Current lines 4–17, `VibeLayout`:**

1. Keep line 6’s outer background/font wrapper.
2. Before current line 7’s `<header>`, insert an anchor:

   ```tsx
   <a
     href="#vibe-workspace"
     className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-slate-900"
   >
     Skip to Vibe workspace
   </a>
   ```

3. Replace line 7’s bare header children with:

   ```tsx
   <nav aria-label="Vibes utility" className="flex w-full items-center justify-between">
     <Link href="/vibes" className="inline-flex items-center gap-2 font-semibold hover:text-white">
       Vibe CMS
     </Link>
     <Link href="/vibes/new" className="rounded bg-[#2271b1] px-2.5 py-1 text-xs font-semibold text-white hover:bg-[#135e96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#1d2327]">
       + Add New
     </Link>
   </nav>
   ```

   Keep both existing href values exactly.
4. Replace current line 13’s `<div className="min-w-0 flex-1">{children}</div>`
   with `<main id="vibe-workspace" className="min-w-0 flex-1">{children}</main>`.
5. After this change, remove the outer `<main>` from child route pages only as
   each page is migrated. Do not do a broad semantic replacement in Task 0A;
   nested landmark cleanup belongs to the page’s own task.

**Behavioral invariant:** layout remains a server component; no hook, browser
API, or `'use client'` directive is added.

### CE. `app/vibes/VibeSidebar.tsx` — exact patch

**Current lines 33–39:** add below `getVibeId`:

```ts
function isActivePath(pathname: string, href: string) {
  return pathname === href || (href !== '/vibes' && pathname.startsWith(`${href}/`));
}
```

Then adjust the behavior for dynamic current-Vibe links: `href` values such as
`/vibes/:id/edit` are active only for themselves and their child routes; the
primary `/vibes` item is active only at `/vibes` so it does not remain active on
every Vibe detail page.

**Current lines 41–56, `getWorkflowItems`:** replace the returned item order
with this sequence while retaining all existing hrefs/icons:

```ts
const items = [
  { href: `/vibes/${vibeId}/edit`, label: 'Edit Vibe', icon: Pencil },
  { href: `/vibes/${vibeId}/preview`, label: 'Preview', icon: Eye },
  { href: `/vibes/${vibeId}/revisions`, label: 'Revisions', icon: History },
  { href: `/vibes/${vibeId}/actions`, label: 'Status & Actions', icon: Settings },
];

if (status === 'draft') items.push({ href: `/vibes/${vibeId}/submit`, label: 'Submit for Review', icon: Send });
if (status === 'in_review') items.push({ href: `/vibes/${vibeId}/publish`, label: 'Publish', icon: Upload });

items.push(
  { href: `/vibes/${vibeId}/audit`, label: 'Audit Log', icon: ClipboardList },
  { href: `/vibes/${vibeId}/source`, label: 'Source Details', icon: FileText },
);

return items;
```

**Current lines 112–125, `SidebarLink`:**

1. Replace line 113’s equality test with a call to `isActivePath`.
2. Add these classes to both branches of line 120’s class expression:
   `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-inset`.
3. Keep `aria-current={active ? 'page' : undefined}`.
4. Do not change lines 68–92: the abortable status fetch and
   `vibe-status-changed` event are required.

### CF. New local primitives — exact files

Create only these files in Task 0A/0B. Use named exports; do not create a barrel
file.

#### `app/vibes/_components/VibePageHeader.tsx`

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

type VibePageHeaderProps = {
  title: string;
  description?: ReactNode;
  eyebrow?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
};

export function VibePageHeader({ title, description, eyebrow, backHref, backLabel, actions }: VibePageHeaderProps) {
  return (
    <header className="mb-5">
      {backHref && backLabel ? <Link href={backHref} className="text-sm font-semibold text-slate-500 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2">← {backLabel}</Link> : null}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div>
          {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p> : null}
          <h1 className="text-3xl font-black tracking-tight text-slate-900">{title}</h1>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
    </header>
  );
}
```

Do not add `'use client'` or a local state hook.

#### `app/vibes/_components/VibeStatusBadge.tsx`

- Define a `statusStyles` record for known statuses.
- Normalize label by replacing underscores with spaces.
- Return `<span className={...}>{label}</span>`.
- For an unknown/empty status, render **Draft** only when caller intentionally
  passes the existing fallback; do not silently alter a meaningful unknown
  server state.

#### `app/vibes/_components/VibeNotice.tsx`

- Props: `tone`, `children`, optional `action`, optional `onDismiss`.
- Map `tone === 'error'` to `role="alert"`; all other tones to `role="status"`.
- Render optional `action.href` with `Link`, optional `action.onClick` with a
  `type="button"` button, never both for one action.
- Keep the component’s own markup passive: it does not store global notices.

### CG. `app/vibes/VibeList.tsx` — state/query patch order

**Current lines 6–21:**

1. Do not add taxonomy/description properties until `GET /api/vibes` is proven
   to return them.
2. Add `type BulkAction = '' | 'archive' | 'trash';` below `ListResponse`.

**Current lines 47–60, state declarations:**

1. Import `useRouter`, `useSearchParams`, `usePathname` from `next/navigation`.
2. Import `parseVibeListQuery` and `serializeVibeListQuery` from
   `lib/cms/vibeListQuery`.
3. Read parsed query once from `useSearchParams()`; initialize `search`,
   `status`, `sort`, `direction`, and `page` from it.
4. Add `const [bulkAction, setBulkAction] = useState<BulkAction>('');`.
5. Add `const [debouncedSearch, setDebouncedSearch] = useState(search);`.
6. Add `const [notice, setNotice] = useState<React.ReactNode>(null);` only if
   the list will display post-mutation success/failure through `VibeNotice`.

**Current lines 62–64:** replace the one generic page-reset effect with two
effects:

```ts
useEffect(() => {
  const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
  return () => window.clearTimeout(timer);
}, [search]);

useEffect(() => {
  setPage(1);
}, [debouncedSearch, status, sort, direction]);
```

Do not include raw `search` in the fetch-effect dependency after this change.

**Current lines 66–94, fetch effect:**

1. Change line 69 to test `debouncedSearch.trim()`.
2. Change line 94 dependency from `search` to `debouncedSearch`.
3. Extract the request body inside the effect into `loadList(signal)` only if
   the same function is needed after bulk mutation. It must accept the current
   parsed state, call the exact same `/api/vibes` URL, and update the same six
   state values currently set in lines 80–86.
4. On a successful response, keep `setSelected(new Set())`.

**URL update helper:**

Create `updateQuery(next, mode)` that serializes a complete `VibeListQuery` and
uses `router.push(`${pathname}?${query}`)` for selection/page/sort state, or
`router.replace(...)` for debounced search. Omit `?` when serializer returns an
empty string. Never concatenate raw user input into the URL.

**Current lines 96–99, `changeSort`:** after calculating next values, update
both local state and URL query. Retain default title ascending and other sorts
descending.

**Current lines 101–107, `runBulk`:**

1. Delete `window.confirm` from line 102.
2. Create `pendingBulkAction` state that opens `VibeConfirmDialog` with count
   and specific message only for `trash`. Archive can run after an explicit
   selected bulk action/Apply click or use the same dialog if product wants one;
   do not change API semantics.
3. Retain POST JSON exactly:

   ```ts
   { vibeIds: [...selected], action }
   ```

4. Delete `window.location.reload()` from line 104. After response success call
   local `loadList`, clear selected/bulk action, and set success notice.
5. Catch only sets list error/notice; it must preserve selection for retry.

### CH. `app/vibes/VibeList.tsx` — JSX patch order

**Current lines 113–122:** replace outer `<main>`/manual `<header>` with a
non-landmark `<div className="min-h-full bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">`
and `VibePageHeader`.

Use:

```tsx
<VibePageHeader
  eyebrow="Content management"
  title="All Vibes"
  description="Manage drafts, reviews, published revisions, and their editorial history."
  actions={<Link href="/vibes/new" className={vibeActionClass.secondary}>Add New</Link>}
/>
```

**Current lines 124–129:** replace inline map with `VibeStatusViews`. Preserve
the `STATUS_VIEWS` array and the existing total-count calculation.

**Current lines 130–152:** replace with `VibeListToolbar`:

- Select has an empty first option **Bulk actions** and only Archive/Move to
  trash values.
- Apply button is disabled if `selected.size === 0 || bulkAction === '' ||
  bulkBusy`.
- Search is passed as controlled props.
- Do not render the duplicate status select.

**Current lines 154–157:**

- Loading: table-shaped skeleton inside the existing section.
- Error: `VibeNotice tone="error"` with a retry action calling `loadList`.
- Empty: branch based on `total`, `search`, and `status` to offer Add New,
  Clear search, or clear status filter.

**Current lines 162–194:**

1. Keep native table elements.
2. Delete current line 170 Actions column header.
3. Set each sortable `<th>` `aria-sort` based on current sort/direction.
4. Change line 175 row class to include `group focus-within:bg-slate-50`.
5. In title cell at lines 177–180, render title link, slug, then
   `<VibeRowActions actions={[...]}/>`.
6. Remove lines 184–190 entirely after row actions move.
7. Include Revisions link in the new action array; do not make an API call to
   determine it.

**Current lines 196–204:** preserve pagination, but call `updateQuery` on
Previous/Next. Insert bottom toolbar only when `vibes.length >= 10`.

### CI. `app/vibes/new/page.tsx` — one-line file expansion patch

**Current lines 2–9:** this file is intentionally compressed. First reformat it
into normal imports, `PRESETS`, `toSlug`, component state, `create`, and JSX;
the initial reformat must preserve every existing request field and route.

Then make these exact behavioral edits:

1. Replace local `toSlug` only after importing a shared helper that matches the
   server’s allowed pattern. If no server helper exists, retain the existing
   implementation and extract it unchanged.
2. Keep `title`, `slug`, `description`, `preset`, `saving`, `error`, and
   `slugEdited` state. Rename `slugEdited` to `hasManuallyEditedSlug` only if all
   its references are updated in the same patch.
3. Render fields in this order: Title → Slug → identifier preview → Description
   → Start from a style → error → submit.
4. On Title `onChange`, call `setSlug(toVibeSlug(next))` only while manual flag
   is false.
5. On Slug `onChange`, call `setHasManuallyEditedSlug(true)` for any user edit;
   calculate `isSlugValid` from trimmed current value.
6. Give slug field `aria-describedby="vibe-slug-help vibe-slug-error"`; render
   `vibe-slug-error` only for non-empty invalid current value or submit attempt.
7. Keep `required` and pattern on the input as defense in depth.
8. Wrap preset card list in `<VibePanel id="starting-style" title="Start from a style" defaultOpen={false}>`.
9. Change submit text from **Create Draft** to **Save draft and continue
   editing**; retain disabled state and exact `POST /api/vibes` JSON.

### CJ. `app/vibes/[vibeId]/edit/VibeEditor.tsx` — exact patch

**Current lines 21–22:** do not remove or rename existing `SaveState` values.
If an extra UI-only state is needed, derive it from `error`, rather than changing
PATCH lifecycle semantics.

**Current lines 48–82, `PublishPanel`:**

1. Keep `workflowAction(status, vibeId)` unchanged.
2. Replace the current unordered visual sequence with: status badge → saved/
   dirty/saving/conflict text → draft version/published revision summary → Save
   draft submit button → Preview Vibe settings link → workflow action link →
   revision history link → error/reload-conflict controls.
3. Keep the save control `type="submit"`; all links remain `Link` components.
4. Change Preview visible label to **Preview Vibe settings**.
5. Do not move publish to this form; `workflowAction` continues to route to the
   separate Submit/Publish pages.

**Current lines 120–160, `saveDraft`:** do not change the `FormData` names or
the object fields constructed at lines 127–139. Only add, after successful
`setSaveState('saved')`, a local success notice state if introduced. Keep 409
handling and its existing `expectedVersion` request untouched.

**Current lines 163–170:** replace manual header with `VibeEditorToolbar` and
`VibePageHeader` composition. Page title should use `draft.title`, not generic
**Edit Vibe**. Render a secondary **Slug: `<value>`** identifier context only;
do not construct `/vibes/${draft.slug}` or imply it is a public permalink. Do
not change route identity.

**Current lines 172–235:** retain grid and PublishPanel placement. Replace each
`<article>` as follows:

| Current lines | New panel id | defaultOpen | Form names that must remain |
| --- | --- | --- | --- |
| 174–181 Metadata | `metadata` | true | `title`, `slug`, `description` |
| 183–189 Taxonomy | `taxonomy` | true | `taxonomyTermIds` |
| 191–200 Source details | `source` | false | `sourceKind`, `sourceUrl`, `sourceAttribution`, `sourceOwnershipNote` |
| 202–217 Colors/Typography start | `colors` then `typography` | colors true, typography false | `primary`, `background`, `surface`, `textPrimary`, `textSecondary`, font fields |
| 218–226 Layout | `layout` | false | `borderRadius`, `spacingBasePx`, `elevation` |
| 228–231 Jamie voice | `voice` | false | `primaryTone` |

For every panel, render children while collapsed—do not conditionally unmount
the inputs. Preserve line 212’s base-font-size pattern and
`aria-describedby="base-font-size-help"` unchanged.

### CK. `app/vibes/[vibeId]/revisions/RevisionList.tsx` — exact lifecycle patch

**Current lines 49–72:** the function is named `restoreRevision`, but it sends
`POST /rollback` and line 65 correctly reports a new published revision. This
is a republish/rollback action, not a draft restore.

1. Rename function to `republishRevision` and update its call at current line
   119 in the same patch.
2. Replace line 50 prompt with explicit controlled dialog state:
   `pendingRepublish: Revision | null`, `republishReason`, and optional
   `dialogError`.
3. Dialog requires a non-empty reason before enabling confirmation; retain JSON
   body `{ revisionId: revision._id, reason: reason.trim() }` exactly.
4. Replace line 52 confirmation text with: “Create a new published revision
   from rN? Existing revisions remain unchanged. This does not apply it to a
   site.”
5. Keep line 65 success message’s actual semantics, preferably:
   `Created a new published revision from r${revision.revisionNumber}.`
6. Keep `await loadRevisions()` after a successful response.

**Current lines 77–125:**

1. Build a presentation array, without mutating `revisions`: current published,
   then other `publishedAt` items, then checkpoints. Preserve original relative
   order within each group.
2. Use that array for rows and use an ID-to-number map from the original set for
   parent labels.
3. Render the status badge first in the title cell, then `rN`, based-on text,
   date/author/summary, then `VibeRowActions` below.
4. Keep **Apply to site** only when `isCurrentPublished` is true.
5. Change action label from **Restore revision** to **Republish revision**.
6. Existing **Compare with rN** remains a same-Vibe compare link; do not change
   its query shape.

### CL. `app/vibes/[vibeId]/audit/page.tsx` — exact patch

**Current lines 13–17:**

1. Expand line 14 into a readable abortable fetch effect. Add `AbortController`
   and ignore `AbortError`, matching list/editor patterns.
2. Delete line 16’s local `links` array and line 17’s workflow `<nav>`.
   Contextual workflow navigation already lives in `VibeSidebar`.
3. Replace line 17’s one-line return with `VibePageHeader` using back href
   `/vibes/${vibeId}/edit`, back label **Back to Vibe**, title **Audit history**.
4. Before rendering, derive groups by local calendar date from `occurredAt`; do
   not change API order or dates.
5. For each event render action label, timestamp, actor, reason, then native
   `<details>` containing raw revision/site IDs. Do not remove IDs.
6. Use `VibeNotice` for fetch error and a distinct empty state.

### CM. `app/vibes/taxonomy/TaxonomyDirectory.tsx` — exact patch

**Current lines 13–42:** preserve all state names and the current one-time fetch.
The current `useMemo` filtering already satisfies the client-side requirement;
do not add a new taxonomy API.

**Current lines 44–45:** replace bare `<p>` status blocks with `VibeNotice`
error and a table-shaped/loading surface.

**Current lines 47–59:**

1. Keep search/filter controls but fix search class from `min-w-56 flex-1` to
   `min-w-0 w-full sm:w-64 sm:flex-none`.
2. Keep the term count line.
3. Replace current line 57 card grid with native table:
   **Term**, **Group**, **Used by** columns.
4. Each row uses `term.id` key, title-cased display label, `groupLabel`, and
   `counts[term.id] || 0`.
5. Preserve line 58’s read-only schema ownership explanation; do not add term
   mutation UI.

### CN. `app/vibes/[vibeId]/apply/page.tsx` — exact state and JSX patch

**Current line 7:** replace Pointer type with:

```ts
type Pointer = {
  siteId?: string;
  revision?: { revisionId?: string; revisionNumber?: number; vibeId?: string } | null;
  appliedAt?: string | null;
  appliedBy?: string | null;
};
type PreflightState = 'idle' | 'checking' | 'verified' | 'error';
```

**Current lines 11–18:** add:

```ts
const [preflightState, setPreflightState] = useState<PreflightState>('idle');
const [checkedSiteId, setCheckedSiteId] = useState('');
const [checkedAt, setCheckedAt] = useState<string | null>(null);
const [confirmOpen, setConfirmOpen] = useState(false);
```

**Current `setSiteId` call sites:** create `changeSiteId(value)` that sets site
ID, clears `pointer`, sets preflight to `idle`, clears `checkedSiteId` and
`checkedAt`, then use it for manual site input and **Use disposable site**.

**Current lines 31–39, `checkPointer`:**

1. If `siteId.trim()` is empty, set preflight error/message and return without
   fetch.
2. Set `preflightState('checking')`, clear message.
3. Keep the exact GET endpoint and tenant query.
4. On success, set pointer, `checkedSiteId(siteId)`, `checkedAt(new Date().toISOString())`,
   `preflightState('verified')`.
5. On error, set preflight error and current plain-language message.

**Current lines 41–50, `apply`:**

1. Move `event.preventDefault()` to form submit only; confirmation should call
   an `applyRevision()` helper with no event.
2. At helper start, guard `preflightState === 'verified'` and
   `checkedSiteId === siteId`; otherwise set message and return without POST.
3. Keep POST endpoint/body exactly `{ vibeId, revisionId }`.
4. On success, set success message, close dialog, then await `checkPointer()`.
5. On failure, keep preflight/pointer visible and show error; do not clear site
   or revision values.

**Current line 52:** split the one-line JSX into this ordered structure:

```tsx
<VibePageHeader ... />
<form onSubmit={(event) => { event.preventDefault(); setConfirmOpen(true); }}>
  <RevisionSelectionSummary ... />
  <details>{/* disposable verification site controls */}</details>
  <details>{/* manual Site ID field */}</details>
  <CurrentPointerCard ... />
  <ApplyPreflightSummary ... />
  <VibeNotice ... />
  <button type="submit" disabled={!canOpenConfirm}>Confirm and apply revision</button>
</form>
<VibeConfirmDialog open={confirmOpen} ... onConfirm={applyRevision} />
```

Set `canOpenConfirm` to true only when revision ID is non-empty, preflight is
verified for current site, and selected revision does not equal the current
pointer revision.

For same-Vibe different revisions, render the existing compare route. For
different Vibes, render explanation only—no compare link. Keep run-ID regex and
derivation behavior unchanged.

### CO. Supporting lifecycle pages — exact scope

These pages are not allowed to change lifecycle requests; they only receive
header/notice/action-style cleanup after core primitives are stable.

| File | Current lines | Exact safe change |
| --- | --- | --- |
| `[vibeId]/submit/page.tsx` | 7–11 | Expand compressed code; preserve POST `/submit`, status guard, event dispatch, and redirect. Replace manual header/error with shared header/notice; keep label **Submit for review**. |
| `[vibeId]/publish/page.tsx` | 7–12 | Expand compressed code; preserve POST `/publish` body `{ changeSummary: reason }`, dispatch, and revisions redirect. Use **Publish revision** button label; retain truthful immutable-revision copy. |
| `[vibeId]/actions/page.tsx` | 48–79 and 97–145 | Keep action endpoints/bodies/status guards. Replace only trash `window.confirm` with `VibeConfirmDialog`; use local notices/header classes. Do not consolidate lifecycle actions into editor. |
| `[vibeId]/revisions/page.tsx` | 8–12 | Preserve server access guard exactly; replace only repeated header markup with `VibePageHeader`. |
| `[vibeId]/compare/page.tsx` and `CompareView.tsx` | page 8–13; view 5–8 | Preserve `from`/`to` query validation and endpoint. Apply shared header/notice/table styling only; do not build a new slider/diff data model. |

### CP. Line-level test additions

| Test file | Exact assertions to add |
| --- | --- |
| `tests/unit/vibe-list-query.test.ts` | `status=invalid` becomes `''`; unknown sort becomes `updatedAt`; `dir=down` becomes `desc`; `page=0` becomes `1`; serializer does not emit unsafe values. |
| `tests/unit/vibe-list.test.tsx` | Search debounce triggers final query once; active status query; `aria-sort`; row action focus; bulk trash cancel has no POST; confirmed archive/trash sends unchanged body and refetches. |
| `tests/unit/vibe-new-page.test.tsx` | Initial title fills slug; manual slug is preserved after title change; invalid slug blocks create and renders help; preset request payload unchanged. |
| `tests/unit/vibe-editor-validation.test.tsx` | Existing base font assertions remain; closing panels does not remove named inputs from FormData; 409 keeps conflict text and no Saved state. |
| `tests/unit/vibe-revisions.test.tsx` | Current published row appears first; **Republish revision** dialog requires reason; POST rollback body unchanged; Apply action only current published. |
| `tests/unit/vibe-taxonomy.test.tsx` | Query/group use local filtering; used-by counts render; no mutation control appears. |
| `tests/unit/vibe-apply.test.tsx` | Apply disabled before check; Site ID change invalidates check; same Vibe yields compare link; different Vibe does not; same revision disables apply; POST body unchanged after confirmation. |

### CQ. Luna’s next command

Start with **Task 0A only**. The first code change is the layout skip landmark
and the three shared display primitive files. Do not start list, editor, dialog,
URL query, or tenant work in the same task.

### CR. Missing component contracts — write these before touching route JSX

The route tasks above refer to five small components. Create them in the order
below. They are local to `app/vibes/_components/`; they must not call APIs or
read router state. Route owners remain responsible for fetches and mutations.

#### `VibePanel.tsx`

1. Export `VibePanel({ id, title, description, defaultOpen = true, children })`.
2. Use native `<details open={defaultOpen}>`; do **not** use controlled React
   state. The browser owns open/closed state and fields remain mounted.
3. Render `<summary>` with `id={`${id}-heading`}` and a visible chevron that is
   decorative (`aria-hidden="true"`).
4. Render `children` inside a padded `<div aria-labelledby={`${id}-heading`}>`.
5. Do not put form controls on the summary itself. The summary must only toggle
   the panel.

#### `VibeConfirmDialog.tsx`

1. Props must be exactly: `open`, `title`, `description`, `confirmLabel`,
   `cancelLabel = 'Cancel'`, `busy = false`, `children`, `onCancel`, and
   `onConfirm`.
2. Return `null` when `open` is false. When open, use `role="dialog"`,
   `aria-modal="true"`, `aria-labelledby="vibe-confirm-title"`, and a unique
   `aria-describedby` ID supplied by a required `dialogId` prop if two dialogs
   can coexist on the page. Do not hard-code duplicate IDs.
3. Add an effect only while open that focuses the cancel button. Another effect
   attaches an Escape handler that calls `onCancel` only when `busy` is false;
   remove that handler during cleanup.
4. The confirm button has `type="button"` and calls `onConfirm`; the cancel
   button has `type="button"` and calls `onCancel`. Do not let dialog buttons
   accidentally submit the parent editor form.
5. `children` is the sole location for destructive-action reason fields. The
   component never stores or trims reason text itself.

#### `VibeListToolbar.tsx` and `VibeRowActions.tsx`

1. `VibeListToolbar` receives only controlled values and callbacks:
   `search`, `onSearchChange`, `selectedCount`, `bulkAction`,
   `onBulkActionChange`, `onApplyBulkAction`, `bulkBusy`.
2. The search input name is `vibe-search`; it uses `type="search"` and label
   text rendered with `sr-only`. Do not put this input in a nested `<form>`.
3. Bulk `<select>` uses `aria-label="Bulk actions"`. The Apply control uses
   `type="button"`, not submit.
4. `VibeRowActions` receives a pre-built `actions` array with `href`, `label`,
   optional `tone`. It renders links only. It must not infer permissions,
   statuses, or create action URLs.
5. For narrow viewports, use `flex flex-wrap gap-x-2 gap-y-1`; never hide an
   action behind hover-only UI.

#### `VibeStatusViews.tsx`, `VibeEditorToolbar.tsx`, and apply-only cards

1. `VibeStatusViews` receives the existing `STATUS_VIEWS`, selected status,
   count callback, and `onSelect`. It renders buttons with `aria-pressed` and
   never issues list requests directly.
2. `VibeEditorToolbar` receives `saveState`, `draftVersion`, `publishedRevision`,
   and `status`. It renders facts only. The save control remains in
   `VibeEditor` so it can remain `type="submit"`.
3. `RevisionSelectionSummary`, `CurrentPointerCard`, and
   `ApplyPreflightSummary` receive plain props only. Keep their source file next
   to `apply/page.tsx` if they are used only there; do not add them to the shared
   directory prematurely.

### CS. `lib/cms/vibeListQuery.ts` — exact helper surface

Create this file before changing `VibeList.tsx`. Keep its exports deliberately
small so the UI cannot invent unsupported query values.

```ts
export const VIBE_LIST_STATUSES = ['', 'draft', 'in_review', 'published', 'archived', 'trash'] as const;
export const VIBE_LIST_SORTS = ['updatedAt', 'title', 'status'] as const;
export const VIBE_LIST_DIRECTIONS = ['asc', 'desc'] as const;

export type VibeListQuery = {
  q: string;
  status: (typeof VIBE_LIST_STATUSES)[number];
  sort: (typeof VIBE_LIST_SORTS)[number];
  direction: (typeof VIBE_LIST_DIRECTIONS)[number];
  page: number;
};
```

Implement exact functions below:

1. `parseVibeListQuery(input: URLSearchParams): VibeListQuery`
   - trim `q` and cap it at 120 characters;
   - use `''` for an unsupported status;
   - use `updatedAt` for unsupported sort;
   - use `desc` for unsupported direction;
   - parse page with `Number.parseInt(value, 10)` and return `1` unless it is a
     finite integer of at least one.
2. `serializeVibeListQuery(query: VibeListQuery): string`
   - normalize by calling the parser on its own `URLSearchParams` first;
   - write `q` only if non-empty;
   - write `status` only if non-empty;
   - omit `sort=updatedAt`, `direction=desc`, and `page=1` so canonical links
     stay short;
   - return `params.toString()` and never include `pageSize`.
3. Do not read `window`, router hooks, or environment variables in this helper.
   It must be unit-testable in Node.

### CT. Page-by-page implementation order and commits

Luna must not combine every visual change in one opaque commit. Use these
bounded packages; run only the focused tests named beside each package before
starting the next one.

| Package | Exact files allowed | Required implementation and stop condition | Focused verification |
| --- | --- | --- | --- |
| 0A | `layout.tsx`, `VibeSidebar.tsx`, `VibePageHeader.tsx`, `VibeStatusBadge.tsx`, `VibeNotice.tsx`, associated new unit tests | Add landmarks, active navigation, and passive primitives. Stop before modifying any existing route page. | sidebar/layout component tests; typecheck affected files. |
| 0B | `VibePanel.tsx`, `VibeConfirmDialog.tsx`, `VibeListToolbar.tsx`, `VibeRowActions.tsx`, `VibeStatusViews.tsx`, `VibeEditorToolbar.tsx`, tests | Implement presentational contracts from CR. Stop before wiring callers. | dialog keyboard/cancel tests; no API mocks required. |
| 1A | `lib/cms/vibeListQuery.ts`, query tests | Implement CS exactly. No `VibeList.tsx` modification until parser/serializer tests pass. | `vibe-list-query.test.ts`. |
| 1B | `VibeList.tsx`, list tests | Wire URL state, debounce, accessible table and local refresh. Preserve endpoint/query field names. | `vibe-list.test.tsx`. |
| 2A | `new/page.tsx`, creation tests | Expand then apply CI. No API contract changes. | `vibe-new-page.test.tsx`. |
| 2B | `edit/VibeEditor.tsx`, validation tests | Replace presentation containers with mounted native panels. Preserve every FormData field and PATCH body. | `vibe-editor-validation.test.tsx`. |
| 3A | `RevisionList.tsx`, revision tests | Rename republish UI and replace browser confirmation. Preserve rollback request/body. | `vibe-revisions.test.tsx`. |
| 3B | audit/taxonomy/lifecycle pages and their tests | Complete local presentation changes only. No route or lifecycle service changes. | each focused page suite. |
| 4A | `apply/page.tsx`, apply tests | Add site-specific preflight and confirmation. Preserve all URLs and body fields. | `vibe-apply.test.tsx`. |

After each package, inspect `git diff --check` and run the listed test file.
Do not reformat unrelated files, update dependencies, alter middleware, or
modify public tenant rendering as part of these packages.

### CU. Exact preservation checklist for code review

Before Luna marks any package ready, use the following literal checks against
the diff. These are code-review gates, not optional polish:

1. In `VibeList.tsx`, `GET /api/vibes` still uses `search`, `status`, `sort`,
   `direction`, `page`, and `pageSize`; only browser URL keys may use `q` and
   `dir`.
2. In `new/page.tsx`, the create JSON still includes the current `title`,
   `slug`, `description`, and preset fields. Its success route remains the
   existing edit route.
3. In `VibeEditor.tsx`, `FormData` contains every original field even after a
   native panel is closed; PATCH remains
   `/api/vibes/${vibeId}?tenantId=default` and preserves `expectedVersion`.
4. In `RevisionList.tsx`, the only rollback request remains `POST /rollback`
   with `{ revisionId, reason }`; its visible text never promises an editable
   draft or automatic site application.
5. In `apply/page.tsx`, the pointer check remains GET
   `/api/admin/sites/${siteId}/vibe?tenantId=default`; apply remains POST
   `/api/admin/sites/${siteId}/apply-vibe?tenantId=default` with `{ vibeId,
   revisionId }`.
6. No planned UI patch changes `middleware.js`, `lib/sites/tenantRouting.ts`,
   `lib/sites/siteData.ts`, `/sites/[site]/[[...path]]`, migrations, environment
   files, cron files, or package manifests.
7. Every new button has an explicit `type`; every modal supports Escape and
   cancel unless busy; every visual status also has text.

### CV. Required test cases at the line of change

Add the following cases to the named suites while the owning package is open;
do not defer them to a final testing pass.

1. **`VibeConfirmDialog` test:** render open; focus starts on Cancel; press
   Escape and expect `onCancel`; rerender with `busy`; press Escape and expect
   no cancel; click Confirm and expect `onConfirm` exactly once.
2. **`VibePanel` test:** render closed with an input child; assert the input is
   still present in the DOM; toggle summary and assert the input value survives.
3. **`VibeList` URL test:** start at `?status=draft&page=3`; change status;
   expect local page one and an URL update without the former page value.
4. **`VibeList` failure test:** mocked bulk POST rejects; assert selected IDs
   remain checked, error notice appears, and no full-page reload is invoked.
5. **New Vibe form test:** title changes update slug before manual editing;
   after editing slug once, a later title change does not overwrite it.
6. **Editor FormData test:** close Source and Typography panels, save, then
   inspect the PATCH JSON to confirm all original keys still exist.
7. **Revision test:** clicking Republish opens the dialog; empty reason cannot
   confirm; valid reason sends the unchanged rollback payload; success text says
   a new published revision was created.
8. **Apply preflight test:** successful check for Site A enables confirmation;
   changing to Site B disables it before a new check; failed apply leaves Site
   B and the last pointer visible.

### CW. Luna’s first implementation message

Luna should begin implementation with this precise scope statement:

> Implement package 0A only: add Vibe layout landmarks, exact active navigation
> matching, and the three passive display primitives. Preserve all existing
> routes, fetches, lifecycle mutations, tenant routing, and public rendering.
> Add focused tests for the changed components; then stop and report the diff
> and test output.

That narrow first package creates a stable shared vocabulary without coupling it
to a lifecycle or provisioning change.

### CX. Visual-system patch boundaries — do not modify the global application theme

The Vibe area already establishes its own light workspace in
`app/vibes/layout.tsx` line 6, while `assets/styles/globals.css` defines the
application-wide dark visual system and a universal color transition. The Vibe
work must stay isolated.

1. Do not change `assets/styles/globals.css`, `tailwind.config.js`, root
   `app/layout.tsx`, or any global CSS variable in this initiative.
2. In the three shared display primitives, use the existing local palette only:
   workspace `#f0f0f1`, ink `#1d2327`, muted ink `#50575e`, border `#c3c4c7`,
   action blue `#2271b1`, action hover `#135e96`, and sidebar hover `#2c3338`.
   Do not introduce a new color token file.
3. Apply this exact hierarchy in each migrated route:

   | Element | Required classes/behavior | Do not use |
   | --- | --- | --- |
   | Page shell | `min-h-full bg-[#f0f0f1] px-4 py-6 sm:px-8` | a second `min-h-screen` inside the Vibe layout |
   | Reading width | `mx-auto max-w-6xl` for lists; `max-w-3xl` for forms; `max-w-5xl` for preview | arbitrary route-specific widths |
   | Card | `border border-[#c3c4c7] bg-white shadow-sm` | glass, blur, gradients, or rounded-pill containers |
   | Standard control | `rounded-sm border border-[#8c8f94] bg-white px-2 py-1.5 text-sm` plus visible focus ring | `rounded-full`, scale-on-hover, or gradient action controls |
   | Primary action | `rounded-sm bg-[#2271b1] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#135e96]` | `btn-primary` or `waterlily-button` |
   | Destructive text | `text-red-700 hover:text-red-900 hover:underline` | red filled primary button until confirmation |

4. Restrict decoration to information hierarchy: borders, compact headings,
   active state, and readable tables. Do not add animated gradients, floating
   cards, or a generic site-builder canvas.
5. Where a current page already uses `rounded-lg` or `rounded-xl`, change it
   only while that page is otherwise being migrated. Do not run a global
   find/replace over the Vibe directory.

### CY. Responsive and interaction requirements at exact affected regions

#### Layout and sidebar

1. `layout.tsx` current line 11 stays `lg:flex`; do not change the breakpoint.
2. `VibeSidebar.tsx` current line 97 retains horizontal scrolling below `lg`.
   In the line-120 link class, keep `shrink-0` so a label is never compressed
   into unreadability; add focus classes from CE without removing overflow.
3. Do not implement a collapse button in package 0A. The horizontal navigation
   is the defined small-screen behavior and avoids introducing persisted state.

#### List toolbar/table

1. In `VibeList.tsx` lines 130–152, set the toolbar wrapper to
   `flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end`.
2. Make search wrapper `w-full sm:max-w-sm`; bulk controls use
   `flex flex-wrap items-center gap-2`. This keeps the search usable on a
   320px-wide viewport without requiring horizontal page scroll.
3. Wrap only the table in `<div className="overflow-x-auto">`; the page shell,
   header, and pagination must not acquire horizontal overflow.
4. Keep the checkbox column at `w-10`; title column is `min-w-56`; timestamp
   columns use `whitespace-nowrap`; this makes the scrollable table deliberate
   rather than squeezing content.
5. Row actions moved into the title cell must be visible below the slug at all
   sizes. Do not use `opacity-0 group-hover:opacity-100`.

#### Editor and creation form

1. Keep the edit grid at current lines 172–235 one column below `lg`; apply
   `lg:grid-cols-[minmax(0,1fr)_18rem]` only to the outer grid if the existing
   right publish panel remains the second child. Never reorder DOM solely for
   desktop presentation.
2. Inside every `VibePanel`, put color inputs in
   `grid gap-4 sm:grid-cols-2`; source and long text fields remain full width.
3. In `new/page.tsx`, the preset cards remain `sm:grid-cols-3`; at smaller
   widths they stack. Keep actual radio inputs as `sr-only`, not `display:none`,
   so keyboard users can select a preset.
4. When a radio label is selected, add `focus-within:ring-2` to the label so
   keyboard focus is apparent even though the input is visually hidden.

### CZ. Preview page — truthful naming and strictly presentation-only change

`app/vibes/[vibeId]/preview/page.tsx` is a server component that fetches the
saved Vibe preview. It is not a tenant-site rendering route. Keep its request
and rendering data unchanged.

**Current lines 10–15:**

1. Do not change `headers()`, origin construction, `cache: 'no-store'`, cookie
   forwarding, or `GET /api/vibes/${vibeId}/preview`.
2. Do not fetch a Site ID, tenant configuration, active pointer, or public
   tenant route in this page.

**Current line 23, unavailable branch:**

1. Replace bare paragraph styling with the shared light workspace shell and a
   `VibeNotice tone="error"` only after `VibeNotice` is available.
2. Keep this branch server-renderable: no retry button that uses client state.

**Current line 32, one-line returned main:**

1. Expand into normal JSX without changing `vars`, `theme`, `sectionStyle`,
   `primaryTone`, or the sample content data.
2. Replace title suffix from `preview` to **Vibe settings preview**.
3. Replace subtitle with **Saved draft settings shown in a representative
   layout. This does not update a tenant site.** This is accurate whether the
   Vibe is draft or published and avoids suggesting a real public preview.
4. Keep the back link to `/vibes/${vibeId}/edit` exactly.
5. Keep inline `sectionStyle`: it is the point of this settings preview. Do not
   replace Vibe tokens with shared CMS palette classes.
6. Change the sample `Ask Jamie` button to `type="button"` so it cannot become
   an accidental submit if the preview composition later changes. It remains
   intentionally non-functional; add `aria-label="Representative Ask Jamie button"`.

Add `tests/unit/vibe-preview-page.test.tsx` with three assertions: the preview
fetch has `cache: 'no-store'`; returned CSS variable values reach the preview
surface style; and the page renders the new truthful subtitle without any Site
ID input or apply action.

### DA. Source-details page and copy alignment

`app/vibes/[vibeId]/source/page.tsx` remains the read-only complement of the
editor’s Source details panel. Before Luna changes its layout, make this narrow
inspection and patch:

1. Keep the server-only access/data sequence exactly: `headers()` →
   `getVibeCmsAccess(getRequestHostFromHeaders(...))` → `params` → `connectDB()`
   → `Vibe.findOne({ vibeId, tenantId: 'default' })`. This page has no client
   fetch to retain or replace.
2. Preserve the current model selection fields
   `vibeId title name source sourceVideoPath migrationMetadata`. Do not expand
   the query merely to populate presentation fields.
3. Replace only duplicated route header markup with `VibePageHeader` using
   `backHref={`/vibes/${vibeId}/edit`}` and **Back to Vibe**.
4. Present the current available source fields—kind, URL or path, attribution,
   and ownership note—as a definition list (`<dl>`, `<dt>`, `<dd>`). Do not
   claim timestamps are available and do not make values editable in this route.
5. The existing source fallback remains:
   `vibe.source || { kind: vibe.sourceVideoPath ? 'extracted' : 'manual', path:
   vibe.sourceVideoPath || null }`. Do not remove it while extracting JSX.
6. If `source.url` is an absolute `http:` or `https:` URL, render an external
   anchor with `target="_blank" rel="noreferrer"`; otherwise render
   `source.url || source.path || 'Not recorded'` as text. Do not turn a stored
   local path into a link, repair a URL, or add a new API validation rule.
7. Extract a pure `VibeSourceDetails` component only if needed for tests. Its
   props are resolved display values, not Mongoose documents or access state.
   Test absent URL, external URL, and local-path text branches in the same
   package as this layout change.

### DB. Final per-file command sequence for Luna

For every package in CT, use this loop and stop on the first failure rather than
stacking additional changes over an unresolved result:

1. Read the full current target file and its closest existing unit test.
2. Search the file for the preservation names in CU before editing.
3. Make only the listed file changes with no generated formatting sweep.
4. Run `git diff --check` and the focused test file listed in CT/CZ/DA.
5. Inspect `git diff -- <changed-file>` for endpoint, request body, route, and
   field-name drift.
6. Commit only that package with a message of the form
   `Refine Vibe UI package <identifier>`.
7. In the handoff note, record changed files, test command/result, and any
   deliberately deferred item. Do not call a page complete if its requested
   test file has not been added or updated.

### DG. Route-contract reconciliation — corrections Luna must apply to the plan

This section is based on the current route implementations, not inferred UI
requirements. These values are authoritative for packages 1A, 1B, 3A, and 4A.

#### `app/api/vibes/route.ts`, GET lines 16–47

1. The valid stored list status is **`trash`**, not `trashed`. The helper in CS
   must contain `trash`, and list status buttons/select values must continue to
   use `trash` as they do in `VibeList.tsx` lines 27–31 and 143–149.
2. The server accepts only `updatedAt`, `title`, and `status` as sort fields at
   current line 30. Therefore CS’s `VIBE_LIST_SORTS` is exactly
   `['updatedAt', 'title', 'status']`; do not offer or serialize `createdAt`.
3. The server treats `direction=asc` as ascending and every other input as
   descending at current line 29. The client must only emit `asc` or `desc` so
   the visible direction never relies on this fallback.
4. The response deliberately selects only `vibeId`, `title`, `name`, `slug`,
   `status`, `tenantId`, `publishedRevisionId`, `authorId`, `updatedBy`,
   `updatedAt`, `createdAt`, and `taxonomyTermIds` (current line 35). Package
   1B must not add Description, source, revision number, or preview data to the
   list row without a separately authorized API change.
5. `statusCounts` aggregates all statuses for the tenant, not merely the active
   filter, at current lines 40–43. Preserve this behavior: the status-view
   counts should remain stable while a search/filter is active.
6. The GET route currently does not call `requireOperatorRouteAccess`. This UI
   plan must not change access behavior; do not add an access check as a side
   effect of list UI work.

#### `app/api/vibes/route.ts`, POST lines 49–88

1. The creation route accepts exactly `title`, `slug`, optional `description`,
   and optional preset at lines 82–87. Package 2A must preserve those four
   JSON keys and must not post the browser-only manual-slug state.
2. Valid presets are exactly `editorial` and `market-intelligence`; the preset
   card UI must continue using IDs from `VIBE_PRESETS`, not hard-coded display
   names in the request.
3. The route returns `409` with **A vibe with that slug already exists.**. The
   new-page error area should display that server message unchanged; it should
   not silently regenerate a different slug.

#### `app/api/vibes/[vibeId]/revisions/route.ts`, GET lines 10–25

1. The response is `{ revisions, publishedRevisionId }`. It does not provide a
   separate status string for every revision. Determine current published state
   only through strict ID equality:

   ```ts
   const isCurrentPublished = revision._id === publishedRevisionId;
   ```

2. Revisions are already returned in descending `revisionNumber` order at line
   22. When package 3A builds the display array, retain this order inside the
   current-published, other-published, and checkpoint groups; do not apply a
   second date sort.
3. Parent labels come from `parentRevisionId`; preserve the existing null/no
   parent display. Do not request full revision payloads for the list view.
4. This route requires operator access. UI error handling must treat 401/403 as
   a normal load failure message and must not redirect or alter access logic.

#### Site-pointer routes

1. `GET /api/admin/sites/:siteId/vibe` returns either
   `{ siteId, revision: null, appliedAt, appliedBy }` or the same shape with a
   published projection in `revision`. Current
   `lib/cms/vibeService.ts` lines 181–198 proves that projection contains
   `revisionId`, `vibeId`, `revisionNumber`, `cssVars`, and `voiceConfig`.
   Do not assume it also contains a display title, slug, author, or timestamp.
2. For the package 4A same-Vibe comparison branch, compare
   `pointer.revision?.vibeId === vibeId`. When true and the revision IDs differ,
   link to the existing same-Vibe compare route. When false, show a different-
   Vibe explanation and no compare link. A missing `vibeId` remains a safe
   no-compare state for forward compatibility.
3. `POST /apply-vibe` accepts strict JSON `{ vibeId, revisionId }` and verifies
   that the revision is published server-side. The client preflight is an
   operator safeguard; it never replaces the server validation.
4. Site pointer GET and apply require operator access. Do not turn a preflight
   401/403 into an empty-pointer state, and do not clear the typed site ID when
   those responses occur.

### DH. Exact plan edits resulting from DG

Before coding package 1A, Luna must make these literal plan/code alignments:

1. In `lib/cms/vibeListQuery.ts`, use the corrected constants from CS after
   this reconciliation: status includes `trash`; sort includes `status`; neither
   includes `trashed` or `createdAt`.
2. In `VibeList.tsx`, retain `changeSort`’s existing union
   `'title' | 'status' | 'updatedAt'`. The `VibeListQuery` sort type must match
   it exactly, avoiding a cast or a fourth UI-only sort value.
3. In `tests/unit/vibe-list-query.test.ts`, replace an imagined created-at test
   with: `sort=createdAt` parses as `updatedAt`; `sort=status` remains status.
4. In `tests/unit/vibe-list.test.tsx`, assert the fetch URL contains API names
   `search` and `direction`, even when the browser URL uses `q` and `dir`.
5. In `RevisionList.tsx`, derive `isCurrentPublished` from the returned
   `publishedRevisionId`, not `publishedAt` and not array index zero.
6. In `apply/page.tsx`, add optional `Pointer.revision.vibeId` and
   `revisionNumber`. Use the current response’s `vibeId` for the same-Vibe
   comparison branch and hide the link only if that value is missing.

### DI. Mutation-contract reconciliation — line-by-line UI preservation

#### Bulk actions: `app/api/vibes/bulk/route.ts`

1. Current schema line 9 permits only `action: 'archive' | 'trash'` and 1–50
   Vibe IDs. `VibeList.tsx` must never send a Restore, Publish, Submit, or
   arbitrary action through this endpoint.
2. Before the POST, add this UI-only guard in `runBulk`:

   ```ts
   if (selected.size > 50) {
     setError('Select no more than 50 Vibes for one bulk action.');
     return;
   }
   ```

   The normal list page cannot exceed 25 rows today, but the guard preserves the
   API limit if page size changes later. Do not slice IDs silently.
3. The request stays exactly:

   ```ts
   fetch('/api/vibes/bulk', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({ vibeIds: [...selected], action }),
   });
   ```

   Do not add `tenantId` to this URL or body; the existing default server
   behavior is part of the current contract.
4. On a `409`, keep the selected IDs and show the returned error. Do not clear
   selection, reload, or assume a partial success. The server transaction is
   all-or-nothing.
5. On success, call local `loadList()`. Its successful response clears
   selection; do not clear selection before that fetch succeeds.

Add tests for the 50-ID guard and a 409 response that retains selected rows.

#### Draft save: `app/api/vibes/[vibeId]/route.ts`, PATCH lines 25–49

1. The PATCH body schema is strict and exactly `{ draft, expectedVersion? }`.
   `saveDraft` must keep the object shape; no `status`, `vibeId`, preview data,
   UI panel state, or last-saved timestamp may be included.
2. On `400 Invalid draft payload.`, keep the form values and render the message.
   Do not reset to the server draft because the user can correct input locally.
3. On `404 Vibe not found.`, keep the readable error and expose the existing
   back/list link through the page header. Do not perform an automatic redirect.
4. On `409` with code `VIBE_DRAFT_CONFLICT`, retain the current existing
   conflict state and its reload action. A UI refresh must not retry PATCH with
   a new `expectedVersion` automatically.
5. Current editor GET and PATCH both require operator access. Leave 401/403 as
   explicit page errors; do not treat them as a blank draft or save failure that
   can be retried without reauthentication.

#### Submit: `app/api/vibes/[vibeId]/submit/route.ts`, POST lines 10–27

1. Submit has no request body. Keep the existing call as
   `fetch('/api/vibes/${vibeId}/submit', { method: 'POST' })`; do not send the
   change summary, current draft, or a revision ID.
2. A `201` returns a new submitted revision. After success, keep the existing
   `vibe-status-changed` dispatch and redirect behavior so the sidebar reloads
   status when the next page appears.
3. A `409` means the Vibe was no longer a draft. Display **Only draft vibes can
   be submitted.** and keep the user on the submit page; do not navigate to a
   presumed status route.

#### Publish: `app/api/vibes/[vibeId]/publish/route.ts`, POST lines 11–35

1. The strict body is exactly `{ changeSummary?: string }`; trim the local
   textarea value before sending but do not send an empty field unless the
   current page already does. The API accepts an omitted summary.
2. Keep the local maximum at 1,000 characters (the server schema limit). Add
   `maxLength={1000}` to the summary textarea if it is absent; this prevents a
   browser-side format error without changing server validation.
3. A `409` must display the exact returned transition message. Do not turn a
   publication conflict into a silent refresh or a new revision request.
4. A `201` creates a published revision but does not apply it to any site.
   Keep the redirect to revisions; do not redirect directly to apply.

#### Republish/rollback: `app/api/vibes/[vibeId]/rollback/route.ts`, POST lines 11–34

1. The reason is mandatory after `trim()`. In `RevisionList.tsx`, use
   `const normalizedReason = republishReason.trim()` in the dialog confirm
   handler and disable Confirm when it is empty.
2. Send exactly `{ revisionId: revision._id, reason: normalizedReason }`.
   Never send `vibeId`, parent revision, a snapshot, or a target Site ID.
3. A `201` is a newly created published revision; call `loadRevisions()` and
   show the exact outcome. Do not infer that the target site pointer changed.
4. On `404 Revision not found.` or `409 Rollback could not be completed.`, keep
   the dialog open, display the error inside it, and preserve the reason for
   correction/retry.

### DJ. Add these mutation assertions while the relevant files are open

1. In `vibe-list.test.tsx`, mock `POST /api/vibes/bulk` with `{ status: 409,
   body: { error: 'One or more selected Vibes changed before the bulk action
   completed.' } }`; select two rows; confirm action; assert both checkboxes
   remain checked and no reload occurs.
2. In `vibe-editor-validation.test.tsx`, mock PATCH `409` with
   `{ error: 'Draft changed since it was loaded.', code: 'VIBE_DRAFT_CONFLICT' }`;
   submit; assert conflict text appears, draft fields retain edited values, and
   a second PATCH is not dispatched automatically.
3. Add `tests/unit/vibe-submit-page.test.tsx`: assert POST has no `body` key;
   mock 409 and assert no redirect; mock 201 and assert status event then
   redirect to the current intended route.
4. Add `tests/unit/vibe-publish-page.test.tsx`: enter 1,001 characters and
   assert the textarea is invalid; enter valid summary; assert request JSON is
   exactly `{ changeSummary: '...' }`; mock 409 and assert no automatic apply
   request exists.
5. In `vibe-revisions.test.tsx`, mock rollback 409 after entering a reason;
   assert dialog remains visible with its input value and no pointer/apply
   endpoint was called.

### DK. Remaining route patch sheets — exact function and JSX changes

#### `app/vibes/[vibeId]/actions/page.tsx`

**Current lines 30–44, load effect:**

1. Preserve `GET /api/vibes/${encodeURIComponent(vibeId)}` and its response
   shape `payload.vibe`.
2. Keep the existing `AbortController`, but add `setError('')` immediately
   before fetch so navigating from a failed Vibe ID to a valid Vibe ID does not
   leave stale error copy.
3. Split `!vibe` rendering into loading and error branches. Add a
   `const [loaded, setLoaded] = useState(false)` next to current state lines
   23–26; set it true only after a non-aborted fetch settles. Then render
   `VibeNotice tone="error"` when `loaded && error`, otherwise loading text.
   Do not render an action card until `vibe` exists.

**Current lines 46–78, `runAction`:**

1. Keep `reason.trim().length < 3` for reject; do not change the minimum.
2. Replace only the current `window.confirm` trash branch (lines 52–54) with
   `pendingConfirmation: 'trash' | null`. Clicking Move to trash sets it;
   `VibeConfirmDialog` confirmation calls `runAction('trash')` through a
   `skipConfirmation` argument or a separate `executeAction` helper.
3. Do not open confirmation for Archive, Restore, or Return to draft in this
   package. Their existing direct action behavior remains.
4. Preserve headers/body exactly: only reject gets
   `headers: { 'content-type': 'application/json' }` and
   `body: JSON.stringify({ reason: reason.trim() })`; archive/trash/restore
   must have no JSON body.
5. Current line 70 clears `reason` after *every* successful action. Preserve
   that only for Reject; do not clear a typed reject reason following failed
   action or cancelled trash confirmation.
6. Preserve `window.dispatchEvent(new Event('vibe-status-changed'))` after
   successful response. This keeps `VibeSidebar` status synchronized.

**Current lines 90–148, JSX:**

1. Replace manually repeated cards/header with `VibePageHeader`,
   `VibeStatusBadge`, `VibePanel` only if a panel naturally groups explanatory
   content, and `VibeNotice` for errors. Do not change eligibility expressions:
   `canArchive` is draft/in_review/published; `canTrash` is
   draft/in_review/archived; Restore is only trash.
2. Keep the Reject textarea present only when status is `in_review`. Add
   `minLength={3}`, `aria-describedby="reject-reason-help"`, and a visible help
   paragraph with that ID. Keep `required` off because the button’s existing
   explicit check produces the actionable error.
3. Place `VibeConfirmDialog` as the final child inside the page shell, not inside
   the trash card. Its description must state that restoration remains possible.

#### `app/vibes/[vibeId]/submit/page.tsx`

**Current compressed lines 5–8:** expand before behavior changes. Preserve the
component name, `useParams`, `useRouter`, `vibe`, `error`, and `submitting`.

1. Replace the unguarded load chain with an AbortController effect patterned
   after `actions/page.tsx`. Check `response.ok` before parsing success data;
   on failure read JSON defensively and throw `payload.error || 'Unable to load
   vibe.'`.
2. In `submit`, call `setError('')` before setting `submitting`. Wrap the whole
   request/JSON parse in `try/catch/finally` so a network exception returns the
   button to its enabled state. Preserve no request body and `method: 'POST'`.
3. On 201, keep dispatch then `router.push(`/vibes/${encodeURIComponent(vibeId)}/edit`)`.
   Do not replace it with revisions, publish, or list navigation.
4. Current button has no explicit `type`; add `type="button"` because this page
   has no form. Leave the disabled condition
   `submitting || vibe.status !== 'draft'` unchanged.
5. Under the disabled non-draft button, add a textual status explanation only;
   do not manufacture a submit link for another status.

#### `app/vibes/[vibeId]/publish/page.tsx`

**Current compressed lines 6–10:** expand imports/state/effect/publish function
first; do not combine that reformat with a new API capability.

1. Apply the same AbortController and `response.ok` load guard as Submit.
2. In `publish`, compute `const changeSummary = reason.trim()` immediately
   before `fetch`; send `{ changeSummary }` to preserve the existing key while
   eliminating accidental leading/trailing whitespace.
3. Enclose request parsing in `try/catch/finally`; only successful 201 dispatches
   `vibe-status-changed` and redirects to revisions. A failed request keeps the
   summary in state.
4. On the textarea at current line 10, add `maxLength={1000}`,
   `aria-describedby="publish-summary-help"`, and a text help paragraph. Do
   not make the summary required.
5. Keep button disabled condition `publishing || !vibe.draftPayload`; add the
   stricter visual notice **Only an in-review Vibe can be published** when the
   loaded status is not `in_review`, but do not alter the existing server guard.

#### `app/vibes/[vibeId]/audit/page.tsx`

**Current lines 13–17:**

1. Keep route `/api/vibes/${encodeURIComponent(vibeId)}/audit`. Convert its
   fetch to AbortController, set an explicit `loading` state true before fetch,
   and ignore only `AbortError` during cleanup.
2. Delete the `links` array entirely. The contextual sidebar provides the
   workflow links; duplicating them can produce two conflicting navigation
   regions on narrow screens.
3. Derive a stable group key without mutating events:

   ```ts
   const groups = events.reduce<Record<string, AuditEvent[]>>((result, event) => {
     const key = event.occurredAt && !Number.isNaN(new Date(event.occurredAt).valueOf())
       ? new Date(event.occurredAt).toLocaleDateString()
       : 'Unknown date';
     (result[key] ||= []).push(event);
     return result;
   }, {});
   ```

4. Render `Object.entries(groups)` in existing API order. Under each date
   heading, render action, time, actor, reason; put `revisionId` and `siteId`
   inside native `<details><summary>Technical references</summary>…</details>`.
5. Use a stable key only if the API exposes an event `_id`; until then retain
   the current date/index composite key rather than inventing a hash.

#### `app/vibes/[vibeId]/compare/CompareView.tsx`

**Current lines 5–8:**

1. Keep exact endpoint query names `from` and `to` and `encodeURIComponent` for
   each value. No UI code should build a compare URL with revision numbers.
2. Add an AbortController to the effect. Before fetch, set `setError('')` and
   `setChanges(null)` so a new compare pair never displays the previous pair’s
   differences while loading.
3. In the catch handler, ignore AbortError; for all other failures set the
   existing comparison message. Do not expose raw server error details in the
   compare view.
4. Retain raw JSON `<pre>` values because compare API fields may be nested.
   Add `aria-label={`Previous value for ${change.path}`}` and
   `aria-label={`New value for ${change.path}`}` to the two pre elements.
5. When changes are empty, retain **No differences found.**; do not offer a
   republish or apply control on the compare page.

### DL. Focused tests for DK

1. `tests/unit/vibe-actions-page.test.tsx`: mock draft, review, archived, and
   trash statuses. Assert the allowed cards from current eligibility rules;
   verify only trash opens confirmation; verify reject sends trimmed JSON while
   archive/restore have no body; verify successful actions dispatch the status
   event.
2. Extend the Submit page test with a failed GET response and a rejected POST;
   assert the page displays an error and `submitting` is cleared in both cases.
3. Extend the Publish page test with a failed GET, rejected POST, 1,000-character
   valid summary, and an in-review versus draft button state assertion.
4. Add `tests/unit/vibe-audit-page.test.tsx` around a small extracted pure
   `groupAuditEvents` function. Assert malformed date becomes Unknown date,
   original ordering within a date is preserved, and technical IDs are not
   initially exposed as primary copy.
5. Add `tests/unit/vibe-compare-view.test.tsx`: render one pair then rerender
   another before the first fetch resolves; assert the first controller aborts,
   the old values disappear, and the second endpoint uses encoded `from`/`to`.

### DQ. Modern WordPress admin patterns — scoped implementation package 1C

The current WordPress list-table model uses an accessible bulk-action select,
compact Apply control, top/bottom table navigation, sortable columns, row
actions tied to the primary column, and contextual screen tools. The Vibe list
already has the required data API, so implement the interaction model without
adding preferences persistence, server-rendered PHP behavior, or a generic
administration framework. Reference: [bulk action markup](https://developer.wordpress.org/reference/classes/wp_list_table/bulk_actions/), [list-table behavior](https://developer.wordpress.org/reference/classes/wp_list_table/), and [screen options responsibilities](https://developer.wordpress.org/reference/classes/wp_screen/).

#### `app/vibes/_components/VibeListToolbar.tsx` — extend after package 1B

1. Add required prop `position: 'top' | 'bottom'`.
2. Use it only to make IDs unique:

   ```ts
   const selectId = `vibe-bulk-action-${position}`;
   const applyId = `vibe-bulk-apply-${position}`;
   ```

3. Render the select label as:

   ```tsx
   <label htmlFor={selectId} className="sr-only">
     Select bulk action
   </label>
   ```

   This retains an explicit accessible label instead of relying on the visible
   placeholder alone.
4. First option stays `value=""` with exact visible text **Bulk actions**.
   Second/third options stay `archive` / `trash`; do not create a grouped list
   until an endpoint supports additional action families.
5. Render Apply with `id={applyId}`, `type="button"`, and visible text
   **Apply**. Its disabled expression remains exactly
   `selectedCount === 0 || bulkAction === '' || bulkBusy`.
6. When `position === 'bottom'`, do not render the search control or the status
   views. It renders selection count, select, and Apply only. This mirrors the
   duplicated table-navigation control without duplicating filters.

#### `app/vibes/VibeList.tsx` — add bottom navigation after pagination work

**Current lines 196–204, pagination region after migration:**

1. Keep the existing `<nav aria-label="Vibe pagination">` and range text.
2. Immediately before that nav, render a border-top table-navigation div:

   ```tsx
   <div className="flex flex-col gap-3 border-t border-[#c3c4c7] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
     <VibeListToolbar
       position="bottom"
       selectedCount={selected.size}
       bulkAction={bulkAction}
       onBulkActionChange={setBulkAction}
       onApplyBulkAction={() => void requestBulkAction()}
       bulkBusy={bulkBusy}
       search=""
       onSearchChange={() => undefined}
     />
     <p className="text-sm text-[#50575e]">{total} {total === 1 ? 'item' : 'items'}</p>
   </div>
   ```

3. If `VibeListToolbar` cannot accept inert search props cleanly, split its
   shared bulk section into `VibeBulkControls` and make top/bottom toolbar
   wrappers. Do not duplicate select markup in `VibeList.tsx`.
4. Render bottom navigation only when `vibes.length > 0`. It must appear even
   when there is only one page so selected rows always have a second bulk-action
   control below the table.
5. Keep selection state shared between top and bottom controls. Selecting an
   action in one select updates the other; applying either calls the same
   `requestBulkAction` path.

#### Primary column and row actions

**`VibeList.tsx`, current lines 177–190 after CH migration:**

1. Make the Vibe title cell `<th scope="row">`, not `<td>`, because it is the
   table’s primary record identity. Preserve its Link to edit.
2. Render slug beneath title in muted monospace as already planned.
3. Render `VibeRowActions` below the slug with separators that are visually
   present but `aria-hidden="true"`. Each link still has its own text label.
4. Exact initial action array is:

   ```ts
   [
     { href: `/vibes/${vibe.vibeId}/edit`, label: 'Edit' },
     { href: `/vibes/${vibe.vibeId}/preview`, label: 'Preview' },
     { href: `/vibes/${vibe.vibeId}/revisions`, label: 'Revisions' },
     { href: `/vibes/${vibe.vibeId}/actions`, label: 'Status & Actions' },
   ]
   ```

   Do not add direct archive/trash links to rows; those mutations remain on the
   Status & Actions screen or through the existing bulk endpoint.
5. Remove the standalone Actions column only after all four links above render
   in the primary cell. Keep table column count and header/body alignment exact.

#### `app/vibes/_components/VibeScreenTools.tsx` — contextual help, no saved settings

Create this component only in package 1C. It is intentionally not a persisted
Screen Options clone because the current CMS has no user-preference API.

1. Props: `items: Array<{ term: string; description: string }>`.
2. Render a native `<details className="relative">` with a compact summary
   button-style label **Help** and `aria-label="Vibe screen help"`.
3. Render a positioned, bordered white `<dl>` below it with the passed items.
   Use `z-30`, `w-80`, and `max-w-[calc(100vw-2rem)]` so it stays usable on
   small screens.
4. On the list screen, pass only these facts:
   - **Status views:** filter the table by editorial state.
   - **Bulk actions:** select items, choose Archive or Move to trash, then Apply.
   - **Revisions:** published history is available from each Vibe’s Revisions link.
5. Do not add column visibility toggles, items-per-page inputs, localStorage,
   cookies, account preference writes, or a Help route. Those require a distinct
   product/data decision.

#### `VibePageHeader.tsx` integration

1. Add optional prop `tools?: ReactNode` after current `actions` prop.
2. In the header action wrapper, render `tools` before `actions` so Help sits to
   the left of **Add New** in left-to-right layouts.
3. In `VibeList.tsx`, pass `<VibeScreenTools items={listHelpItems} />` through
   `tools`. Keep the existing Add New link in `actions`.
4. Do not add Help to edit/apply/lifecycle pages in 1C. Help content must be
   contextual, not copied globally.

### DR. Modern edit-screen hierarchy — packages 2B and 3B only

The familiar edit-screen pattern is: a clear title/context, a primary save
control, compact status facts, and collapsible meta panels. Apply it with the
existing Vibe draft fields and lifecycle pages.

#### `edit/VibeEditor.tsx`, current lines 163–235

1. `VibePageHeader` uses `title={draft.title || 'Edit Vibe'}`; do not place the
   editable title input inside the page title itself.
2. Add a muted identity line directly below header description:
   `Vibe ID: <code>{vibe.vibeId}</code> · Slug: <code>{draft.slug || 'not set'}</code>`.
   This is read-only context; no new API field is required.
3. Keep the Save draft control in the right editorial panel. The title input is
   not an autosave trigger; saving stays explicit because PATCH uses version
   conflict protection.
4. `VibePanel` summaries use the exact labels **Vibe identity**, **Taxonomy**,
   **Source details**, **Colors**, **Typography**, **Layout**, and **Jamie voice**.
   Do not substitute generic terms such as “blocks,” “sections,” or “widgets.”
5. Metadata and Taxonomy default open; all remaining panels follow the defaults
   in CJ. This keeps primary editorial identity visible without overwhelming the
   first view.

#### Revisions and actions

1. Revisions page starts with current published status/badge, then chronological
   rows. The visible verbs remain **Compare**, **Republish revision**, and
   **Apply to site** (only current published). Do not make older rows appear
   editable.
2. Actions page uses status as a compact fact panel and separates the possible
   next lifecycle actions into individual cards. Do not combine publish/submit
   into the actions page; their dedicated pages explain their effects.
3. Publish page calls its final action **Publish immutable revision**. Submit
   page calls its final action **Submit for review**. These labels are accurate
   descriptions of the existing routes.

### DS. Package 1C/2B test additions

1. In `vibe-list.test.tsx`, render top and bottom bulk controls; select
   **Move to trash** in the top control and assert the bottom select reflects
   `trash`; select rows; click bottom Apply; assert the single existing bulk
   POST payload.
2. Assert the title cell is `th[scope="row"]` and includes all four expected
   row action links. Assert there is no Actions table header after migration.
3. In `vibe-ui-primitives.test.tsx`, render `VibeScreenTools`; assert Help is
   a native summary, closed initially, opens to show all passed terms, and does
   not call fetch or write localStorage.
4. In `vibe-editor-validation.test.tsx`, assert the editor header uses the
   loaded draft title and identity line while the title input remains a separate
   form control. Do not test visual color classes as a replacement for behavior.

### DT. Responsive list-table package 1D — modern small-screen behavior

Modern WordPress list tables make the primary column the portable record
summary and expose additional row details through a dedicated toggle. Implement
the same information hierarchy with native disclosure, not a client-side table
replacement. Reference: [WordPress list-table primary-row actions](https://developer.wordpress.org/reference/classes/wp_list_table/).

#### New `app/vibes/_components/VibeListRowDetails.tsx`

1. Props are exactly:

   ```ts
   type VibeListRowDetailsProps = {
     statusLabel: string;
     hasPublishedRevision: boolean;
     modifiedLabel: string;
   };
   ```

2. Render `<details className="mt-2 sm:hidden">` so it exists only as a
   small-screen control. The `summary` text is **Show details** when closed and
   **Hide details** when open only if a local `open` state is introduced. It is
   acceptable to leave summary text **Details** and rely on native open state;
   do not add script solely to swap the label.
3. Use `<dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">`
   with exactly the labels **Status**, **Revision**, and **Last modified**.
4. Revision value is **Published revision** when `hasPublishedRevision` is true;
   otherwise `—`. Do not fetch a revision number per list row.
5. This component receives strings/booleans only. It must not import routing,
   fetch, Vibe types, or status formatting helpers.

#### `app/vibes/VibeList.tsx` — lines 162–194 after CH migration

1. Keep the native `<table>` and outer `overflow-x-auto` wrapper on desktop.
2. On the Status, Revision, and Last modified `<th>` elements, add
   `className="hidden px-4 py-3 sm:table-cell"`. Keep header scope values.
3. Apply the matching `hidden px-4 py-3 sm:table-cell` class to the three body
   cells in every row. Do not hide the checkbox or primary title cell.
4. In the primary `<th scope="row">` below the title, slug, and
   `VibeRowActions`, insert:

   ```tsx
   <VibeListRowDetails
     statusLabel={statusLabel(vibe.status)}
     hasPublishedRevision={Boolean(vibe.publishedRevisionId)}
     modifiedLabel={formatModified(vibe.updatedAt)}
   />
   ```

5. Do not use CSS-only `display: none` for details that are the only source of
   status/revision/modified information on small screens; the native details
   control remains keyboard-operable and in the DOM.
6. The checkbox column remains first. Do not turn row click into a selection
   toggle; title/link and action links must retain their normal behavior.
7. Keep the action links visible immediately; the Details disclosure is for
   metadata columns only, not a menu substitute.

#### Package 1D tests

1. Add `VibeListRowDetails` tests: status, revision state, and modified label
   render after opening native details; no fetch mock is needed.
2. In `vibe-list.test.tsx`, assert secondary desktop cells carry `sm:table-cell`
   and the primary cell contains `VibeListRowDetails` data. Test semantics and
   text, not computed CSS layout.
3. Assert **Edit**, **Preview**, **Revisions**, and **Status & Actions** remain
   visible without opening Details.

### DU. Editor-toolbar package 2C — modern editor hierarchy without a block builder

The modern WordPress editor keeps document-level state and primary actions in a
stable toolbar, while advanced settings live in collapsible inspector sections;
important operations are not hidden solely in a sidebar. Reference:
[Block Editor user interface](https://developer.wordpress.org/block-editor/explanations/user-interface/),
[Panel behavior](https://developer.wordpress.org/block-editor/reference-guides/components/panel/), and
[Notice placement](https://developer.wordpress.org/block-editor/reference-guides/components/notice/).

#### `app/vibes/_components/VibeEditorToolbar.tsx`

Replace the earlier facts-only preliminary contract in CR with this final,
still-presentational contract:

```ts
type VibeEditorToolbarProps = {
  saveState: 'saved' | 'dirty' | 'saving' | 'conflict';
  draftVersion?: number;
  publishedRevision?: number | null;
  status: string;
  onSave: () => void;
  saveDisabled: boolean;
  previewHref: string;
};
```

1. Import `Link` only. Do not import `SaveState` from `VibeEditor.tsx`; the
   toolbar owns its explicit compatible string union. Do not import `useState`,
   `useEffect`, `fetch`, or `useRouter`.
2. Render `<div role="toolbar" aria-label="Vibe editor tools">` with
   `sticky top-10 z-10 flex flex-wrap items-center gap-2 border-y border-[#c3c4c7] bg-white px-3 py-2 shadow-sm`.
   `top-10` clears the existing global Vibe header height; do not make a second
   fixed header.
3. Left group renders a text status label and compact draft/published revision
   facts. It does not render icon-only controls.
4. Right group renders, in exact order: **Save draft** button, **Preview Vibe
   settings** Link, workflow Link when supplied by the parent, and revision
   history Link when supplied by the parent.
5. Save button has `type="button"`, calls `onSave`, and `disabled={saveDisabled}`.
   Its visible busy/dirty/conflict text comes from props, not a second save
   state inside this component.
6. Use normal text labels for every control. Do not create icon-only buttons,
   undo/redo controls, insertion controls, an ellipsis menu, or a settings gear;
   those would claim capabilities the Vibe editor does not have.

#### `app/vibes/[vibeId]/edit/VibeEditor.tsx` — exact wiring

**Current lines 120–160, `saveDraft`:**

1. Extract the existing FormData/save logic into `async function saveDraft()` as
   `async function saveDraft(form: HTMLFormElement)`; retain its form parameter
   and do not make toolbar buttons submit a second form.
2. Above it, add:

   ```ts
   function requestSave() {
     const form = formRef.current;
     if (!form) return;
     if (!form.reportValidity()) return;
     void saveDraft(form);
   }
   ```

3. Change the current React hook import to
   `import { useEffect, useRef, useState } from 'react';`, then add
   `const formRef = useRef<HTMLFormElement>(null);` beside current editor state.
   Add `ref={formRef}` to the existing `<form>` at current line 165.
4. Keep the form `onSubmit` handler and call the same `saveDraft`; keyboard form
   submission and toolbar Save therefore share validation and request behavior.
5. Insert `<VibeEditorToolbar ... />` inside the existing form, directly after
   `VibePageHeader` and before the outer edit grid. Pass `onSave={requestSave}`
   and `saveDisabled={saveState === 'saving' || !vibe}`. This is a toolbar
   inside one existing form, not a nested form; its Save control remains
   `type="button"`.
6. Remove the duplicated Save draft button from `PublishPanel` only after the
   toolbar button is fully wired and tested. Keep PublishPanel facts, preview,
   workflow action, and revision-history links until their equivalents have
   moved to the toolbar.
7. To avoid duplicate links, choose one owner: move Preview/workflow/revisions
   into the toolbar and leave PublishPanel as `VibeStatusSummary`, or retain
   them in PublishPanel and have toolbar render only Save/preview. Do not leave
   two controls with identical accessible names on one screen.
8. On small screens, the toolbar remains visible and wraps. The edit grid’s
   publish/status summary stacks below form panels. Do not hide Save or Preview
   behind a sidebar toggle.

#### Package 2C tests

1. Render editor, locate `role="toolbar"` by name, and assert Save draft,
   Preview Vibe settings, and lifecycle/revision controls each appear once.
2. Change Base font size to an invalid value, click toolbar Save draft, assert
   PATCH is not called and the native field remains invalid.
3. With a valid draft, click toolbar Save draft and assert the same PATCH URL,
   body fields, and `expectedVersion` as the existing form-submit test.
4. Assert toolbar has no icon-only unlabeled buttons and no block insertion or
   generic page-building controls.

### DV. Publication-flow package 3C — explicit readiness, no automatic site changes

Modern editorial flows make the final action and its outcome visible before the
operator commits it. Add a small, truthful readiness surface to Submit and
Publish, using only data those pages already load. It must not call new APIs,
perform preflight mutations, or imply that publication changes a tenant site.

#### New `app/vibes/_components/VibeReadinessChecklist.tsx`

1. Create a passive component with this exact type:

   ```ts
   type ReadinessItem = {
     label: string;
     complete: boolean;
     detail: string;
   };

   type VibeReadinessChecklistProps = {
     title: string;
     items: ReadinessItem[];
   };
   ```

2. Render a `<section aria-labelledby="vibe-readiness-title">` with the passed
   title in an `<h2 id="vibe-readiness-title">`.
3. Render an unordered list. Every list item begins with visible text
   **Ready** or **Needs attention**; do not rely on a checkmark icon or color
   alone.
4. Use a compact neutral card for ready items and amber border/background for
   items needing attention. Do not render error red unless a server request has
   actually failed.
5. The component has no buttons, links, hooks, API calls, or mutation logic.
   It explains the state provided by its parent only.

#### `app/vibes/[vibeId]/submit/page.tsx` — submit readiness insertion

**After the existing explanatory paragraph and before the error notice:**

1. Create `const isDraft = vibe.status === 'draft';` after the current loaded
   Vibe guard.
2. Render:

   ```tsx
   <VibeReadinessChecklist
     title="Ready to submit"
     items={[
       {
         label: 'Editorial state',
         complete: isDraft,
         detail: isDraft
           ? 'This draft can be submitted for review.'
           : `This Vibe is currently ${vibe.status || 'not in draft'}.`,
       },
       {
         label: 'Draft snapshot',
         complete: Boolean(vibe.draftPayload),
         detail: vibe.draftPayload
           ? 'The saved draft will be captured for review.'
           : 'No saved draft is available to submit.',
       },
     ]}
   />
   ```

3. Keep existing button disable check `submitting || vibe.status !== 'draft'`.
   Add `|| !vibe.draftPayload` only if the existing submit route/service proves
   a missing draft would fail; do not invent a browser-only prerequisite.
4. Under the button, add a static note: **Submitting creates an in-review
   snapshot. Publishing is a separate step.** Do not mention a tenant site in
   this note because submit has no site effect.

#### `app/vibes/[vibeId]/publish/page.tsx` — pre-publish insertion

**After current amber review panel and before the form:**

1. Define `const isInReview = vibe.status === 'in_review';` after the loaded
   Vibe guard.
2. Render `VibeReadinessChecklist title="Ready to publish"` with these exact
   items:

   ```ts
   [
     {
       label: 'Editorial state',
       complete: isInReview,
       detail: isInReview
         ? 'This Vibe is in review and can create a published revision.'
         : `This Vibe is currently ${vibe.status || 'not in review'}.`,
     },
     {
       label: 'Saved draft',
       complete: Boolean(vibe.draftPayload),
       detail: vibe.draftPayload
         ? 'The normalized saved draft will be frozen into a revision.'
         : 'A saved draft is required before publication.',
     },
     {
       label: 'Site application',
       complete: true,
       detail: 'Publishing does not apply this revision to any site.',
     },
   ]
   ```

3. Change the final button disabled expression to
   `publishing || !isInReview || !vibe.draftPayload`. This only mirrors the
   existing server transition/payload expectations; server validation remains
   authoritative.
4. Keep the exact POST body `{ changeSummary }`, successful status event, and
   revisions redirect from DK/DI.
5. Add a second static sentence below the form submit button: **To use a
   published revision on a site, choose Apply to site from the current published
   revision.** This points to the existing workflow without making an automatic
   apply request.

#### Notice placement on editor and lifecycle pages

1. In `VibeEditor.tsx`, render `VibeNotice` immediately below
   `VibeEditorToolbar` when `error` is non-empty. Remove the duplicate error
   paragraph from `PublishPanel` after this route-level notice exists; keep the
   conflict Reload latest draft control in the status summary.
2. In Submit, Publish, Actions, and Apply, render the page-level error/success
   `VibeNotice` immediately after the page header and before readiness/cards.
3. Do not render the same `error` string in both a notice and a card. A single
   `role="alert"` prevents duplicate screen-reader announcements.
4. Network/API error notices do not auto-dismiss. Local successful action
   notices may remain until navigation or a follow-up request replaces them;
   do not add an arbitrary timeout.

### DW. Package 3C tests and literal acceptance criteria

1. In `vibe-submit-page.test.tsx`, render draft with `draftPayload`; assert two
   Ready rows and enabled Submit. Render `in_review`; assert Needs attention,
   disabled Submit, and no submit POST after clicking.
2. In `vibe-publish-page.test.tsx`, render in-review with draft; assert all
   three readiness labels and enabled Publish. Render draft; assert Editorial
   state Needs attention, disabled Publish, and no publish POST.
3. Assert Publish readiness includes the exact text **Publishing does not apply
   this revision to any site.** and the page has no site ID input, no pointer
   GET, and no apply POST.
4. In `vibe-editor-validation.test.tsx`, cause a conflict response and assert
   only one alert contains the conflict text. Assert Reload latest draft remains
   available from the status summary.
5. Review the package diff to confirm `VibeReadinessChecklist.tsx` imports only
   React types if needed and does not import `next/*`, Vibe services, routes, or
   client hooks.

### DX. Taxonomy and source-screen package 3D — modern directory/detail treatment

This package makes the read-only supporting screens feel coherent with the
modern Vibe admin without implying that schema-owned taxonomy or source records
can be edited there.

#### `app/vibes/taxonomy/page.tsx`, current lines 1–15

1. Keep `export const dynamic = 'force-dynamic'`.
2. Replace the local Link/h1/p markup with `VibePageHeader`:

   ```tsx
   <VibePageHeader
     eyebrow="Content management"
     title="Vibe taxonomy"
     description="Controlled terms for consistent discovery and filtering."
     backHref="/vibes"
     backLabel="All Vibes"
   />
   ```

3. Replace page `<main>` with a `<div className="min-h-full ...">` because
   `app/vibes/layout.tsx` owns the main landmark after package 0A.
4. Keep `<TaxonomyDirectory />` as the only child below the header. Do not add
   an Add Term button, management action, row action, or schema mutation route.

#### `app/vibes/taxonomy/TaxonomyDirectory.tsx`, current lines 5–50

1. Keep type fields exactly `id`, `group`, `term`; do not add term descriptions,
   aliases, colors, or mutability properties that the API does not return.
2. Preserve GET `/api/vibes/taxonomy`, its AbortController, local `query`, local
   `group`, and the two existing `useMemo` computations. This directory remains
   a client-side filter over one loaded schema-owned term set.
3. Add `setError('')` immediately before fetch in the effect. Do not turn the
   one-time fetch into a URL-synchronized or paginated endpoint.
4. In the current lines 47–50 toolbar, keep Search then Group filter order.
   Change only the search class from `min-w-56 flex-1` to
   `min-w-0 w-full sm:w-64 sm:flex-none`; preserve the current accessible labels.
5. Replace current card grid at line 50 with this native table structure:

   ```tsx
   <div className="overflow-x-auto">
     <table className="w-full text-left text-sm">
       <thead>...</thead>
       <tbody>...</tbody>
     </table>
   </div>
   ```

6. The exact headers are **Term**, **Group**, and **Used by**. Term is
   `<th scope="row">`; Group/Used by are `<td>`. The row key remains `term.id`.
7. Term display remains `term.term.replace(/-/g, ' ')`; Group display remains
   `groupLabel(term.group)`; usage remains `counts[term.id] || 0`. Do not fetch
   or render names of Vibes that use a term.
8. Keep the existing footer sentence on schema ownership, but move it beneath
   the table in a muted bordered footer. It is the screen’s explicit no-mutation
   explanation and must remain visible.
9. Replace loading/error bare paragraphs with `VibeNotice`/table-shaped loading
   only after primitives exist. The empty query state retains **No taxonomy terms
   match this filter.** and does not show an empty action control.

#### `app/vibes/[vibeId]/source/page.tsx`, current lines 1–19

1. Retain imports for `headers`, `getVibeCmsAccess`,
   `getRequestHostFromHeaders`, `connectDB`, and `Vibe`. Do not convert this
   page to `'use client'` or route it through `/api/vibes/:id`.
2. Keep the `access.allowed` branch ahead of `connectDB`. For the visual
   migration, replace its inner content only; do not fetch source records for an
   unauthorized request.
3. Keep the `!vibe` 404-style branch after the query. It uses `VibeNotice` only
   if a server-compatible notice component is confirmed; otherwise retain a
   simple server-rendered message. Do not introduce client retry state.
4. Move source-detail rendering into `VibeSourceDetails` with props:

   ```ts
   type VibeSourceDetailsProps = {
     kind: string;
     url: string | null;
     path: string | null;
     attribution: string | null;
     ownershipNote: string | null;
   };
   ```

5. Implement `isExternalSourceUrl(value)` in the component file using
   `new URL(value)` in a try/catch and return true only for `http:` / `https:`.
   Do not call it on `path` and do not expose a caught URL parser error.
6. Definition terms use exact labels **Kind**, **URL or path**, **Attribution**,
   and **Ownership note**. Missing value text is **Not recorded** throughout;
   do not mix `Not provided`, `Unknown`, and em dashes on this screen.
7. External source anchor text is **Open source link**; it includes
   `aria-label={`Open ${kind} source link in a new tab`}`. Display the raw URL
   in a separate `<code className="break-all">` beneath it for auditability.
8. Local path values render only as `<code className="break-all">`; they are
   never a `Link`, a client route, or a browser navigation target.

### DY. Package 3D test requirements

1. Add `tests/unit/vibe-taxonomy.test.tsx`. Mock one taxonomy response with
   multiple groups/counts; assert search and group filters apply locally and
   only one `/api/vibes/taxonomy` request occurs. Assert Term is a row header
   and no Add/Remove/Edit term controls appear.
2. Add `tests/unit/vibe-source-details.test.tsx` for the pure detail component:
   `https://` produces the external anchor with `rel="noreferrer"`; a local
   path produces no anchor; missing values render **Not recorded**.
3. Do not add a full server-page test that mocks database/auth. The source page’s
   access/query sequence is preserved by inspection; the extracted display
   component owns UI branch coverage.
4. After package 3D, search the changed files for `POST`, `PATCH`, `DELETE`, and
   `fetch(`. Taxonomy must contain only its existing GET; Source must contain no
   client fetch/mutation additions.

### DZ. List query-state package 1E — canonical deep links and browser navigation

An established admin list keeps filters, search, sorting, and pagination in its
URL so a user can refresh, bookmark, and use Back/Forward without losing their
working context. Package 1B introduces URL state; this package makes its
two-way synchronization explicit and prevents stale state from reasserting
itself after browser navigation.

#### `app/vibes/VibeList.tsx` — replace independent list query state

**Current planned state region from CG (around lines 47–60):**

1. Replace separate `status`, `sort`, `direction`, and `page` state with one
   object state:

   ```ts
   const searchParams = useSearchParams();
   const pathname = usePathname();
   const router = useRouter();
   const queryString = searchParams.toString();
   const [listQuery, setListQuery] = useState<VibeListQuery>(() =>
     parseVibeListQuery(new URLSearchParams(queryString)),
   );
   const [searchInput, setSearchInput] = useState(listQuery.q);
   ```

2. Derive `status`, `sort`, `direction`, and `page` from `listQuery` rather
   than maintaining duplicate state variables:

   ```ts
   const { status, sort, direction, page } = listQuery;
   ```

3. Do not store `debouncedSearch` as a second query state. It is only a delayed
   bridge from `searchInput` to `listQuery.q`.

#### Synchronize URL → state first

Immediately after the state declarations, add this effect:

```ts
useEffect(() => {
  const next = parseVibeListQuery(new URLSearchParams(queryString));
  setListQuery((current) =>
    serializeVibeListQuery(current) === serializeVibeListQuery(next) ? current : next,
  );
  setSearchInput((current) => (current === next.q ? current : next.q));
}, [queryString]);
```

1. This effect is the only code path that reacts to browser Back/Forward or a
   directly opened list URL.
2. It compares serialized normalized forms, so unknown URL keys are ignored and
   equivalent default states do not create a render loop.
3. Do not put `listQuery` or `searchInput` in this effect dependency array.

#### Synchronize state → URL through one helper

Replace CG’s generic `updateQuery(next, mode)` description with this exact
helper:

```ts
function writeListQuery(next: VibeListQuery, mode: 'push' | 'replace') {
  const normalized = parseVibeListQuery(new URLSearchParams(serializeVibeListQuery(next)));
  const serialized = serializeVibeListQuery(normalized);
  const href = serialized ? `${pathname}?${serialized}` : pathname;
  setListQuery(normalized);
  if (mode === 'push') router.push(href);
  else router.replace(href);
}
```

1. All status, sort, and pagination handlers call `writeListQuery` with `push`.
2. Debounced text search calls it with `replace` so each pause in typing does
   not create a history entry.
3. Never mutate `searchParams` directly and never concatenate individual user
   values onto an existing URL.
4. Do not preserve arbitrary unknown query keys. The Vibe list owns its query
   namespace and serializer intentionally emits only `q`, `status`, `sort`,
   `dir`, and `page`.

#### Exact handler replacements

1. Replace the current search reset effect with:

   ```ts
   useEffect(() => {
     const timer = window.setTimeout(() => {
       if (searchInput === listQuery.q) return;
       writeListQuery({ ...listQuery, q: searchInput.trim(), page: 1 }, 'replace');
     }, 300);
     return () => window.clearTimeout(timer);
   }, [searchInput, listQuery]);
   ```

   The new query always returns to page one. Do not fetch based on raw
   `searchInput`.
2. Status view/select handler calls:

   ```ts
   writeListQuery({ ...listQuery, status: nextStatus, page: 1 }, 'push');
   ```

   Delete any separate `setStatus` call.
3. Sort handler keeps existing toggle semantics but calls `writeListQuery` once
   with `page: 1`. It must preserve status and normalized search query.
4. Previous/Next call `writeListQuery({ ...listQuery, page: page - 1 }, 'push')`
   or the bounded next equivalent. Delete direct `setPage` callbacks.
5. Fetch effect depends on `listQuery`, not each destructured field. Build API
   request names from the object: `q → search`, `direction → direction`, all
   other names unchanged. Keep `pageSize: String(PAGE_SIZE)` out of the browser
   URL.

#### Canonical URL cleanup

After the URL→state effect, add a separate effect that removes invalid/default
query syntax only when navigation has settled:

```ts
useEffect(() => {
  const normalized = parseVibeListQuery(new URLSearchParams(queryString));
  const canonical = serializeVibeListQuery(normalized);
  if (canonical !== queryString) {
    router.replace(canonical ? `${pathname}?${canonical}` : pathname);
  }
}, [pathname, queryString, router]);
```

1. This transforms `?status=unknown&page=0` into the canonical list URL once.
2. It does not use `writeListQuery`, so it does not push history or mutate
   component state twice.
3. It does not add a per-page setting. The API’s fixed current `PAGE_SIZE = 25`
   remains part of this UI package; a user preference would require a separate
   persistence decision.

### EA. Package 1E tests

1. In `vibe-list-query.test.ts`, assert `?status=trash&sort=status&dir=asc&page=2`
   parses and serializes unchanged except for ordering imposed by the serializer.
2. In `vibe-list.test.tsx`, mock `useSearchParams` with page 3/status draft;
   rerender it with page 1/status published; assert UI updates to Published and
   fetches `status=published&page=1` without direct user input.
3. Type a search string in three successive `fireEvent.change` calls, advance
   fake timers by 300ms, and assert one `router.replace` and one final list fetch
   using API key `search`, page 1.
4. Click a status view and then simulate Back by rerendering query params; assert
   the status button’s `aria-pressed` returns to its previous state.
5. Initialize invalid URL `?status=trashed&sort=createdAt&dir=up&page=0`; assert
   exactly one canonical `router.replace` with no query string and no list
   request using invalid API values.

### EB. Canonical Luna package sequence — supersedes earlier ordering tables

Use this list as the only execution order. Earlier CT/DM references remain
design detail, but this sequence includes the later packages added to align the
Vibe CMS with current WordPress admin patterns.

| Order | Package | Files that may change | Mandatory stop condition |
| --- | --- | --- | --- |
| 1 | 0A Foundation | `layout.tsx`, `VibeSidebar.tsx`, `VibePageHeader.tsx`, `VibeStatusBadge.tsx`, `VibeNotice.tsx`, primitive tests | Landmarks/navigation/primitives pass; no route JSX migrated yet. |
| 2 | 0B Controls | `VibePanel.tsx`, `VibeConfirmDialog.tsx`, list/status/editor helper components, primitive tests | Native disclosure/dialog behavior is tested; no API caller wired. |
| 3 | 0C Route states | `loading.tsx`, `error.tsx`, route-state tests | Segment fallback/recovery compiles; no ordinary API error handling is replaced. |
| 4 | 1A Query helper | `lib/cms/vibeListQuery.ts`, query tests | Valid API-aligned status/sort values pass parser/serializer tests. |
| 5 | 1B List core | `VibeList.tsx`, list tests | Filters, sorting, bulk local refresh, accessible base table work with unchanged API contracts. |
| 6 | 1C List tools | `VibeListToolbar.tsx`, `VibeBulkControls` only if necessary, `VibeScreenTools.tsx`, `VibePageHeader.tsx`, list/primitive tests | Top/bottom bulk controls share state; Help is local/read-only. |
| 7 | 1D List responsive | `VibeListRowDetails.tsx`, `VibeList.tsx`, list tests | Primary row keeps actions visible; secondary values are available on small screens. |
| 8 | 1E List deep links | `page.tsx`, `VibeList.tsx`, list/query tests | Direct URL, refresh, Back/Forward, canonicalization, App Router boundary, and API mapping pass. |
| 9 | 1F List resilience | `VibeList.tsx`, `VibeListEmptyState.tsx`, list tests | Empty/out-of-range pages repair via replace and offer truthful next actions. |
| 10 | 2A Create | `new/page.tsx`, creation tests | Slug/preset form is accessible and POST body/redirect are unchanged. |
| 11 | 2B Editor panels | `edit/VibeEditor.tsx`, panel/editor helpers, editor test | Every FormData input remains mounted and draft PATCH conflict behavior passes. |
| 12 | 2C Editor toolbar | `VibeEditorToolbar.tsx`, `VibeEditor.tsx`, editor test | One accessible Save/Preview/workflow control set; toolbar invokes existing form save. |
| 13 | 3A Revisions | `RevisionList.tsx`, revision tests | Republish accurately creates a published revision; Apply stays current-published-only. |
| 14 | 3B Workflow evidence | audit/actions/submit/publish/compare pages, focused tests | Existing lifecycle request bodies/routes/events are proven unchanged. |
| 15 | 3C Readiness | `VibeReadinessChecklist.tsx`, submit/publish/editor notice updates, tests | Lifecycle consequences are clear; no automatic site mutation exists. |
| 16 | 3D Supporting screens | taxonomy page/directory, source page/detail component, tests | Taxonomy remains schema-owned/read-only; Source remains server-rendered. |
| 17 | 4A Apply | `apply/page.tsx`, local apply display components, apply tests | Site-specific preflight gates existing apply POST with no route/body changes. |

**No package is complete just because the visual layout renders.** Its matching
focused test group, contract checks, and stop condition must all be satisfied
before the next package begins.

### EC. File ledger — exact ownership and forbidden cross-package edits

| File | Owning package(s) | Exact responsibility | Explicitly forbidden in this UI initiative |
| --- | --- | --- | --- |
| `app/vibes/layout.tsx` | 0A | Outer workspace landmark and utility bar semantics | Client hooks, tenant/site fetches, global header rewrite |
| `app/vibes/VibeSidebar.tsx` | 0A | Active path, static/dynamic Vibe navigation ordering, focus styles | Status route mutation, permission logic, persisted collapse state |
| `app/vibes/VibeList.tsx` | 1B–1F | Existing list GET mapping, table, bulk wiring, URL state, mobile detail placement, and valid-page recovery | API response expansion, new server filter, per-page persistence |
| `lib/cms/vibeListQuery.ts` | 1A | Parse/serialize only the five public list keys | Router hooks, fetch, environment reads |
| `app/vibes/new/page.tsx` | 2A | Slug interaction, field order, preset presentation | New create payload keys or slug auto-conflict workaround |
| `edit/VibeEditor.tsx` | 2B, 2C | Existing form fields/PATCH, panels, toolbar wiring | Draft schema changes, automatic save/retry, publish mutation |
| `revisions/RevisionList.tsx` | 3A | Presentation order and controlled republish dialog | Direct pointer apply for prior revision, snapshot mutation |
| `actions/page.tsx` | 3B | Existing status controls and trash confirmation | New lifecycle action type or endpoint |
| `submit/page.tsx` | 3B, 3C | Existing submit POST plus readiness explanation | Request body, direct publish/site apply |
| `publish/page.tsx` | 3B, 3C | Existing publish POST plus readiness explanation | Site-pointer mutation or automatic apply |
| `audit/page.tsx` | 3B | Group/read event history | Audit query/API or event persistence |
| `compare/CompareView.tsx` | 3B | Abortable existing revision comparison display | New compare data model or action controls |
| `taxonomy/*` | 3D | Read-only filter/table semantics | Term CRUD, schema updates, migration |
| `source/page.tsx` | 3D | Existing server access/query plus safe detail display | Client conversion, route API, source mutation |
| `apply/page.tsx` | 4A | Existing site pointer check/apply preflight UI | Apply endpoint/body, tenant/site routing changes |

### ED. Modern-admin acceptance rubric for final visual review

Luna must use this as a route-by-route visual review after unit tests pass. It
is intentionally observable, not subjective.

1. **List screen:** heading and Add New action share the first row; status views
   sit immediately above table controls; search, bulk select, Apply, count, and
   pagination are readable without horizontal page scroll; title is primary;
   row actions have text; top/bottom bulk controls stay synchronized.
2. **Editor:** toolbar remains visible below the Vibe utility bar; title and
   identity explain what is being edited; Save is reachable without hunting in
   a sidebar; advanced settings are collapsible while Metadata/Taxonomy start
   open; no control implies a block builder exists.
3. **Lifecycle:** Submit, Publish, Republish, and Apply explain the result
   before the final control; destructive Trash requires controlled confirmation;
   status/error feedback occurs once in a predictable page position.
4. **Supporting screens:** Taxonomy is a compact term table with visible
   read-only boundary; Source distinguishes linkable external URLs from local
   paths; Audit and Compare prioritize human-readable evidence, with technical
   detail available but not dominant.
5. **Small screens:** sidebar is scrollable rather than clipped; list primary
   cell provides essential metadata in native disclosure; editor toolbar wraps
   and primary save remains visible; nothing requires hover to discover or use.
6. **Accessibility:** keyboard focus is visible; all controls have labels;
   table headers/scopes are correct; dialogs and notices use their promised
   semantics; color is never the sole status/error signal.

### EE. Final code-review command set for the complete UI series

Run after all packages, from `apps/pulse`, without changing dependencies or
deployment settings:

```powershell
npx vitest run tests/unit/vibe-ui-primitives.test.tsx tests/unit/vibe-list-query.test.ts tests/unit/vibe-list.test.tsx tests/unit/vibe-new-page.test.tsx tests/unit/vibe-editor-validation.test.tsx tests/unit/vibe-revisions.test.tsx tests/unit/vibe-actions-page.test.tsx tests/unit/vibe-submit-page.test.tsx tests/unit/vibe-publish-page.test.tsx tests/unit/vibe-audit-page.test.tsx tests/unit/vibe-compare-view.test.tsx tests/unit/vibe-taxonomy.test.tsx tests/unit/vibe-source-details.test.tsx tests/unit/vibe-apply.test.tsx
git diff --check
rg -n "(/api/vibes|/api/admin/sites|expectedVersion|vibe-status-changed|apply-vibe)" app/vibes lib/cms/vibeListQuery.ts
```

If a named focused test file does not exist because its owning package is not
implemented, that package is incomplete—not a reason to remove the file from
the final command. The final reviewer should also inspect that no changes exist
under middleware, public tenant rendering, migrations, environment files,
package manifests, or global CSS unless independently authorized.

### EF. Exact visual contracts for shared primitives

Use these class maps verbatim for the first implementation. They establish a
compact, current admin interface while keeping Vibe status and lifecycle terms
plainly readable. Do not introduce a second styling abstraction or a global CSS
change to achieve the same result.

#### `VibeStatusBadge.tsx`

1. Define the record below immediately after props/type declarations:

   ```ts
   const statusStyles: Record<string, string> = {
     draft: 'border-[#c3c4c7] bg-[#f6f7f7] text-[#50575e]',
     in_review: 'border-[#dba617] bg-[#fcf9e8] text-[#6b4f00]',
     published: 'border-[#00a32a] bg-[#edfaef] text-[#0a5c20]',
     archived: 'border-[#8c8f94] bg-[#f0f0f1] text-[#50575e]',
     trash: 'border-[#d63638] bg-[#fcf0f1] text-[#8a2424]',
   };
   ```

2. Normalize display label with `status.replace(/_/g, ' ')`; do not capitalize
   the raw value by mutating it. Use CSS `capitalize` on the visible span.
3. Render exactly one text span:

   ```tsx
   <span className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-xs font-semibold capitalize ${statusStyles[status] || statusStyles.draft}`}>
     {label}
   </span>
   ```

4. Unknown status fallback is visual only. If a caller deliberately passes an
   unknown non-empty state, preserve that state’s readable text; do not replace
   it with Draft. An absent status may be normalized by the caller to `draft`.
5. Do not render an icon as the only identifier. Status text is the source of
   truth for every row, toolbar, revision, and action card.

#### `VibeNotice.tsx`

1. Define these tone classes:

   ```ts
   const noticeStyles = {
     info: 'border-[#72aee6] bg-[#f0f6fc] text-[#1d2327]',
     success: 'border-[#00a32a] bg-[#edfaef] text-[#1d2327]',
     warning: 'border-[#dba617] bg-[#fcf9e8] text-[#1d2327]',
     error: 'border-[#d63638] bg-[#fcf0f1] text-[#1d2327]',
   } as const;
   ```

2. Outer markup is
   `<div className={`border-l-4 p-3 text-sm ${noticeStyles[tone]}`}>`.
   Use `role="alert"` only for `error`; use `role="status" aria-live="polite"`
   for `success`; use neither assertive role for information/warning unless a
   caller needs a separate explicitly announced message.
3. Keep text in a `<div className="min-w-0 flex-1">`. Optional action lives in
   a sibling `shrink-0` container so long errors do not push the action below a
   narrow card unexpectedly.
4. Optional dismiss button uses `type="button"`, visible text **Dismiss**, and
   `aria-label="Dismiss notice"`. Do not use an unlabeled × glyph.
5. Notices do not set timers or write global state. Parent ownership of the
   notice lifecycle is required for accurate save/conflict/lifecycle behavior.

#### Shared control class constants

Create `app/vibes/_components/vibeUiClasses.ts` in package 0B only if at least
three consumers share each value. Otherwise keep values local to the primitive
that owns them. If created, export exactly:

```ts
export const vibeControlClass = 'rounded-sm border border-[#8c8f94] bg-white px-2 py-1.5 text-sm text-[#1d2327] shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-1';
export const vibeButtonClass = {
  primary: 'rounded-sm bg-[#2271b1] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#135e96] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2',
  secondary: 'rounded-sm border border-[#2271b1] bg-white px-3 py-1.5 text-sm font-semibold text-[#2271b1] hover:bg-[#f0f6fc] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2271b1] focus-visible:ring-offset-2',
  destructive: 'rounded-sm border border-[#d63638] bg-white px-3 py-1.5 text-sm font-semibold text-[#b32d2e] hover:bg-[#fcf0f1] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d63638] focus-visible:ring-offset-2',
} as const;
```

1. Use `primary` only for Save draft, Add New, Submit for review, Publish
   immutable revision, and confirmed Apply action—not for Archive or Trash.
2. Use `secondary` for Preview, Check current pointer, row-adjacent neutral
   actions, and Help triggers.
3. Use `destructive` for initiating Move to trash and dialog confirmation only
   when the action is destructive. The dialog remains the required boundary;
   styling never substitutes for confirmation.
4. Do not use `rounded-full`, gradient buttons, scaling hover effects, or
   global `.btn-primary` classes in the Vibe workspace.

#### `VibePanel.tsx`

1. Outer `<details>` class is
   `border border-[#c3c4c7] bg-white shadow-sm open:shadow-none`.
2. `<summary>` class is
   `flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-[#1d2327] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2271b1]`.
3. Add a decorative caret span with `aria-hidden="true"` and class
   `transition-transform group-open:rotate-90`. Wrap details with `group` to
   make the native open state drive the caret. Do not use a plus symbol.
4. Child content wrapper is `border-t border-[#dcdcde] px-4 py-4`. A panel
   description, when provided, appears beneath its summary title in muted text;
   do not put required field errors only inside a closed panel.

### EG. `VibeConfirmDialog.tsx` — exact focus and keyboard implementation

The dialog must be a predictable controlled confirmation surface, not a browser
`window.confirm` replacement with weaker keyboard behavior.

1. Add these imports: `useEffect`, `useId`, `useRef` from React and
   `type ReactNode` if required. Do not add a dialog package.
2. Create refs:

   ```ts
   const dialogRef = useRef<HTMLDivElement>(null);
   const cancelRef = useRef<HTMLButtonElement>(null);
   const titleId = useId();
   const descriptionId = useId();
   ```

3. Existing open effect focuses `cancelRef.current` using
   `queueMicrotask(() => cancelRef.current?.focus())` only when `open` becomes
   true. Do not focus while closing.
4. In the same effect, listen for `keydown`:
   - Escape calls `onCancel()` when `!busy`.
   - Tab/Shift+Tab cycles within focusable descendants of `dialogRef.current`.
   - Use `querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])')`.
   - If no focusables exist, prevent Tab; otherwise cycle first/last in the
     conventional direction.
   - Remove listener in effect cleanup.
5. Backdrop is a fixed `inset-0 z-50 flex items-center justify-center bg-black/40
   p-4`; clicking it must not close the dialog. The inner dialog div uses
   `ref={dialogRef}`, `role="dialog"`, `aria-modal="true"`,
   `aria-labelledby={titleId}`, and `aria-describedby={descriptionId}`.
6. Cancel button uses `ref={cancelRef}` and `disabled={busy}`. Confirm uses
   `disabled={busy || confirmDisabled}`. Add `confirmDisabled?: boolean` to the
   component props so reason-required callers do not implement fake validation.
7. While busy, render **Working…** only on the confirm button; retain the title,
   description, and child reason text for context. Do not close on pending
   network work.
8. Add tests for Escape, Tab wrap, Shift+Tab wrap, backdrop click no-op, focus
   on cancel, and `confirmDisabled` preventing the callback.

### EH. Slug identity package 2A/2B — familiar clarity without a false public permalink

The current create route (`app/api/vibes/route.ts`, POST lines 56–66) constructs
an internal `vibeId` from the default tenant and submitted slug. It does not
create a domain, a public page route, or a tenant-site path. The UI should make
slug entry easy without promising a visitor-facing URL.

#### New `app/vibes/_components/VibeSlugHelp.tsx`

1. Props are exactly:

   ```ts
   type VibeSlugHelpProps = {
     value: string;
     invalid?: boolean;
     errorId?: string;
   };
   ```

2. Render a static help paragraph with id `vibe-slug-help`:

   ```tsx
   <p id="vibe-slug-help" className="mt-1 text-xs text-[#50575e]">
     Use lowercase letters, numbers, and hyphens. This identifies the Vibe in the CMS; it does not create a public site URL.
   </p>
   ```

3. Render a second polite preview paragraph beneath it:

   ```tsx
   <p aria-live="polite" className="mt-1 text-xs text-[#50575e]">
     Vibe identifier: <code className="font-mono text-[#1d2327]">{value.trim() || 'not set'}</code>
   </p>
   ```

4. When `invalid` is true, render an error paragraph whose id is `errorId` and
   whose exact text is **Use lowercase letters, numbers, and single hyphens;
   start and end with a letter or number.** Do not use a browser route or a
   fabricated `/vibes/...` preview.
5. This component imports React types only if needed. It has no Link, fetch,
   router, tenant, or Vibe service import.

#### `app/vibes/new/page.tsx`, current form state and Slug field

1. Keep the existing controlled `slug` state. Add:

   ```ts
   const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
   const normalizedSlug = slug.trim();
   const isSlugValid = VIBE_SLUG_PATTERN.test(normalizedSlug);
   ```

   If the shared helper exports a RegExp with a global flag, use a non-global
   predicate function instead; repeated `.test()` must not depend on `lastIndex`.
2. In the form `onSubmit`, call `setHasAttemptedSubmit(true)` before `create()`.
   At the top of `create()`, return early when `!isSlugValid`; leave title and
   other field values intact.
3. On Title change, continue generating `toVibeSlug(next)` only until
   `hasManuallyEditedSlug` is true. Do not title-case, URL encode, or append a
   tenant/site string.
4. On Slug change, call `setHasManuallyEditedSlug(true)` even if the user clears
   the field. Clearing is an intentional manual edit and must not let the next
   title keystroke overwrite it.
5. The slug input keeps current `required` and pattern. Add:

   ```tsx
   aria-invalid={normalizedSlug !== '' && !isSlugValid ? true : undefined}
   aria-describedby={normalizedSlug !== '' && (!isSlugValid || hasAttemptedSubmit)
     ? 'vibe-slug-help vibe-slug-error'
     : 'vibe-slug-help'}
   ```

6. Render `<VibeSlugHelp value={slug} invalid={hasAttemptedSubmit || (normalizedSlug !== '' && !isSlugValid)} errorId="vibe-slug-error" />`
   directly after the slug input and before Description. Do not add a separate
   label to the preview.
7. The POST body remains `JSON.stringify({ title, slug: normalizedSlug,
   description, ...(preset ? { preset } : {}) })` only if this is identical to
   current optional-preset behavior. Do not send `hasAttemptedSubmit`, validity,
   or identifier-preview information.

#### `app/vibes/[vibeId]/edit/VibeEditor.tsx`, Metadata panel

1. Do not turn the existing title/slug inputs into controlled values merely to
   display the identifier preview. Add
   `const [slugPreview, setSlugPreview] = useState(draft.slug || '');` after the
   loaded Vibe/draft guard, using the latest draft value when the component
   remounts for a different Vibe.
2. On the existing slug input only, add
   `onChange={(event) => setSlugPreview(event.currentTarget.value)}`. The
   parent form’s existing `onChange` event still marks the draft dirty through
   bubbling; do not add another `setSaveState('dirty')` in this handler.
3. Keep `name="slug"`, default value, and FormData behavior unchanged. Add the
   same `aria-describedby="vibe-slug-help"` as Add New, but do not add client
   invalid-state gating to editor save until it uses the same shared validator
   and has a focused test.
4. Render `<VibeSlugHelp value={slugPreview} />` directly below the slug input.
   The editor’s static identity line can show `Slug: <code>{slugPreview ||
   'not set'}</code>`; it must not render `/vibes/${slugPreview}`.
5. Retain server PATCH validation as the source of truth for malformed saved
   slugs. On API `400 Invalid draft payload.`, show existing error/notice and
   preserve the uncontrolled input value.

### EI. Slug identity tests and review checks

1. In `vibe-new-page.test.tsx`, assert the preview uses **Vibe identifier:** and
   does not contain `/vibes/`. Assert clearing a manually edited slug prevents
   a later title change from overwriting it.
2. Assert invalid slug sets `aria-invalid="true"`, ties to
   `vibe-slug-error`, sends no POST, and leaves title/description/preset state
   intact.
3. In editor validation tests, change slug input, assert the identifier preview
   changes, submit, and confirm PATCH still gets the field under key `slug`.
4. Search every changed package file for `permalink` and `/vibes/${draft.slug}`.
   Any occurrence must be removed unless it is an explicit warning that such a
   route must not be created.

### EJ. Lifecycle vocabulary matrix — familiar actions with exact Vibe outcomes

Use this table whenever a label, confirmation message, notice, or test is added.
It prevents the interface from borrowing a familiar term while describing the
wrong state transition.

| UI location | Exact visible action | Existing endpoint/body | Required outcome copy | Never say |
| --- | --- | --- | --- | --- |
| List bulk controls | **Archive** | `POST /api/vibes/bulk` `{ vibeIds, action: 'archive' }` | “Archived N Vibe(s).” | “Deleted” |
| List bulk controls | **Move to trash** | `POST /api/vibes/bulk` `{ vibeIds, action: 'trash' }` | “Moved N Vibe(s) to trash.” | “Permanently deleted” or “Undo” |
| Status & Actions | **Archive Vibe** | `POST /api/vibes/:id/archive`, no body | “This Vibe is archived.” | “Unpublished revision removed” |
| Status & Actions | **Move to trash** | `POST /api/vibes/:id/trash`, no body | “This Vibe is in trash and can be restored.” | “Revision rollback” |
| Status & Actions | **Restore Vibe** | `POST /api/vibes/:id/restore`, no body | “The Vibe returned to its prior editorial state.” | “Restored a revision” |
| Status & Actions | **Return to draft** | `POST /api/vibes/:id/reject` `{ reason }` | “The review was returned to draft.” | “Rejected/deleted the Vibe” |
| Submit page | **Submit for review** | `POST /api/vibes/:id/submit`, no body | “A review snapshot was created.” | “Published” |
| Publish page | **Publish immutable revision** | `POST /api/vibes/:id/publish` `{ changeSummary? }` | “A published revision was created.” | “Applied to site” |
| Revisions | **Republish revision** | `POST /api/vibes/:id/rollback` `{ revisionId, reason }` | “Created a new published revision from rN.” | “Restored editable draft” or “Applied to site” |
| Revisions | **Apply to site** | no request on link; application begins on Apply page | “Open site-application preflight.” | “Published this site” |
| Apply page | **Confirm and apply revision** | `POST /api/admin/sites/:siteId/apply-vibe` `{ vibeId, revisionId }` | “Revision X applied to site Y.” | “Published revision” |

#### Exact code changes enforcing the matrix

1. In `VibeList.tsx`, after a successful `loadList()` following bulk action,
   set a `VibeNotice tone="success"` message using the Archive/Trash row above.
   Use the pre-request selection count captured in
   `const affectedCount = selected.size`; do not compute it after selection is
   cleared.
2. In `actions/page.tsx`, derive per-action success message from a
   `successMessages: Record<LifecycleAction, string>` constant. Set it only
   after `payload.vibe` is confirmed. Keep server error text as the error notice.
3. In `submit/page.tsx`, do not display a completion notice that will be hidden
   by immediate redirect. Instead, set the destination edit screen’s status via
   the existing status event and let it show its loaded status. Do not add query
   params solely to carry a success toast.
4. In `publish/page.tsx`, do not display a completion notice before redirect.
   The revisions screen renders the newly current published row; no query-based
   toast is required.
5. In `RevisionList.tsx`, construct success copy using
   `revision.revisionNumber` from the selected source revision—not the newly
   returned revision number unless the API response is intentionally displayed.
6. In `apply/page.tsx`, success may include raw revision/site IDs because the
   page is an operator verification screen. Render both values in `<code>` and
   retain current re-check of pointer after successful POST.

#### Tests for vocabulary and state distinction

1. Query text in `vibe-revisions.test.tsx` for **Republish revision** and
   assert **Restore revision** is absent.
2. Query text in `vibe-actions-page.test.tsx` for **Restore Vibe** only under
   `status === 'trash'`; assert it does not render on revisions test fixtures.
3. Publish test asserts the pre-publish checklist says it does not apply to a
   site and no apply endpoint is called.
4. Apply test asserts current revision label is application-specific and never
   reuses **Publish immutable revision** as its submit label.
5. Grep changed Vibe UI files for **Undo**, **Restore revision**, and
   **permanently deleted**. Each match must be either absent or an explicitly
   documented future non-implementation; do not ship those phrases as action
   copy.

### EK. Future structured-content discovery gate — modern editor direction, not current implementation

The current `lib/cms/vibeSchema.ts` lines 74–89 define a Vibe draft as title,
slug, text description, visual tokens, linguistic tokens, taxonomy, and source.
There is no `sections`, `blocks`, `content`, template, or page-composition field.
The current Vibe preview is a representative settings surface, and site rendering
hydrates an applied Vibe projection into a tenant site. Therefore a block-style
editor must not be added as a casual panel inside the current Vibe editor.

This follows the modern WordPress separation between document content and
settings/inspector controls: primary content operations belong in a content
surface; advanced settings live in panels and must not hide essential actions.
Reference: [Block Editor user interface](https://developer.wordpress.org/block-editor/explanations/user-interface/) and [block/editor responsibilities](https://developer.wordpress.org/block-editor/getting-started/fundamentals/block-in-the-editor/).

#### Package 5A — discovery only; no runtime code, schema, or API changes

Luna may execute this package only as an evidence document update. It must not
edit `vibeSchema.ts`, `VibeEditor.tsx`, site-rendering code, migrations, or
dependencies.

1. Inspect and record the ownership of these exact data paths:
   - `lib/cms/vibeSchema.ts` `vibeDraftSchema` and `vibeRevisionSchema`;
   - `lib/cms/vibeService.ts` `readPublishedVibeProjection` and
     `applyVibeRevisionToSite`;
   - `lib/sites/siteData.ts` active Vibe hydration;
   - `app/sites/[site]/[[...path]]/page.tsx` public tenant rendering;
   - the SiteConfig model fields read by `siteData.ts`.
2. Add a table to this plan with each existing field, owner (Vibe revision or
   tenant site), renderer, and whether a change would affect every site sharing
   a Vibe. Cite exact field names; do not write generic “content” entries.
3. Answer this explicit decision question: **Should a future section be shared
   across every site applying a Vibe, or owned by one tenant site?**
4. Mark a Vibe-owned section schema as rejected unless the product explicitly
   wants one published Vibe revision to replace page content on every consuming
   site. That is a materially different product behavior from applying colors,
   typography, and voice.
5. Do not recommend GrapeJS, Editor.js, Craft.js, or a generic drag/drop package
   before the ownership decision. A UI library cannot resolve persistence,
   preview, revision, or tenant rendering authority.

#### Candidate design only after product authorization

If the decision is **tenant-site-owned content**, the later implementation plan
must start with a new site-content schema/version and a renderer contract—not
with a draggable UI.

1. Define a closed union of supported section types in a new site-content
   schema, for example `hero`, `richText`, `cta`, and `faq`. Do not save raw HTML
   as the primary data format.
2. Each section has `id`, `type`, `props`, and optional `visibility`; props are
   validated with a type-specific schema. Reject unknown types/props rather than
   passing arbitrary JSON to the public renderer.
3. Store the section array on the tenant-site-owned record, version it with that
   site’s own content/revision model, and render it only through a closed
   React-component mapping in the tenant site route.
4. Add an editor screen separate from `/vibes/[vibeId]/edit`; the Vibe editor
   continues to own visual/editorial settings. Its existing Apply flow only
   selects the Vibe projection, not site content.
5. The first UI implementation uses Add section, edit, duplicate, remove, and
   Move up/Move down buttons. Add drag-and-drop only after keyboard reorder,
   focus movement, and revision behavior are proven.
6. Preview must resolve the same tenant-site content revision plus the selected
   Vibe projection. It must not reuse the current Vibe settings preview, which
   intentionally has no tenant site context.

#### Required authorization checklist before any Package 5B code

- [ ] Product owner has chosen Vibe-owned vs tenant-site-owned sections.
- [ ] A data owner and revision authority are named.
- [ ] Public renderer mapping and unsupported-section fallback are designed.
- [ ] Existing site rendering/active Vibe application interactions are written
  down with exact tests.
- [ ] Preview, publish, rollback, and site application consequences are agreed.
- [ ] No generic builder dependency is selected before these decisions.

Until all six are checked, modern WordPress alignment in this PR means a strong
settings/editorial experience—not a drag-and-drop page builder.

### EL. App Router boundary rules for list deep links

`app/vibes/page.tsx` is currently a server page with
`export const dynamic = 'force-dynamic'` and renders the client `VibeList`.
This is the correct boundary for the planned `useSearchParams`, `usePathname`,
and `useRouter` usage.

#### `app/vibes/page.tsx`, current lines 1–7

1. Keep the file as a server component. Do not add `'use client'`.
2. Keep `export const dynamic = 'force-dynamic'`; it is intentional because
   Vibe list data and operator context are request-time concerns.
3. Do not add `searchParams` props to `VibesPage`. `VibeList` owns validated
   browser query parsing through the helper in package 1A.
4. Add a narrow Suspense boundary around `VibeList` before package 1E imports
   `useSearchParams`. This preserves a valid route boundary if the page’s
   rendering strategy ever changes and keeps the persistent Vibe layout/sidebar
   outside the fallback. Change the file to:

   ```tsx
   import { Suspense } from 'react';
   import { VibeList } from './VibeList';

   export const dynamic = 'force-dynamic';
   export const metadata = { title: 'Vibes | Sunset Pulse', description: 'Manage published and draft vibe systems.' };

   function VibeListFallback() {
     return <div className="min-h-full bg-[#f0f0f1] px-4 py-8 text-sm text-[#50575e] sm:px-8" aria-busy="true">Loading Vibes…</div>;
   }

   export default function VibesPage() {
     return <Suspense fallback={<VibeListFallback />}><VibeList /></Suspense>;
   }
   ```

   Do not wrap `app/vibes/layout.tsx`, `VibeSidebar`, or the entire application.
5. Preserve metadata title and description. The page title displayed in the
   workspace remains **All Vibes**, supplied by `VibePageHeader` inside the
   client list component.

#### `app/vibes/VibeList.tsx` imports and navigation constraints

1. The first import line remains `'use client';`.
2. Replace its current React import with the exact named hooks required by its
   final state model: `useEffect`, `useMemo` only if needed to stabilize derived
   values, `useState`, and any type imports. Do not import server-only Next APIs.
3. Import `usePathname`, `useRouter`, and `useSearchParams` from
   `next/navigation` in one statement. Do not read `window.location.search` for
   list state; that would bypass router navigation and make tests inconsistent.
4. Do not call `router.refresh()` after search/filter/sort/pagination changes;
   the client fetch effect owns data reload. Do not call `window.location.reload()`
   after bulk actions; local `loadList` owns it.
5. Do not add `router.push` calls inside the fetch effect. Only explicit user
   handlers and canonicalization effect may write list URLs.
6. When a Vibe title Link opens Edit, preserve the regular Link navigation. Do
   not attach a return URL query parameter; Browser Back already restores the
   list query state.

#### Build/test checks for package 1E

1. Run the focused query/list tests first.
2. Run `npm run build` after package 1E because this is the first package adding
   App Router query hooks to the Vibes route. Do not alter dynamic rendering,
   cache configuration, or Next configuration to make a build warning disappear.
3. If the build reports a missing Suspense boundary after the narrow page-level
   wrapper exists, stop and record the exact message. Do not widen the boundary
   to `app/vibes/layout.tsx`, since that would turn the persistent sidebar into
   a loading fallback.
4. In component tests, mock `next/navigation` once per test module and expose
   mutable `searchParams`, `push`, `replace`, and `pathname` values. Do not
   mock browser history as a second competing source of truth.

### EM. Route-state package 0C — Vibe loading and recovery surfaces

Add route-segment loading and error files after package 0B and before any list
query work. They supply the same compact admin surface during route transitions
or unexpected render failures; they do not replace the existing client fetch,
validation, conflict, or access-error notices.

#### New `app/vibes/loading.tsx`

1. This is a server component. Do not add `'use client'`, hooks, fetch calls,
   router imports, or `VibeSidebar`.
2. Render exactly one page-shell div; `app/vibes/layout.tsx` already owns the
   workspace/sidebar landmark:

   ```tsx
   export default function VibesLoading() {
     return (
       <div className="min-h-full bg-[#f0f0f1] px-4 py-8 text-[#1d2327] sm:px-8" aria-busy="true" aria-label="Loading Vibe workspace">
         <div className="mx-auto max-w-6xl animate-pulse">
           <div className="h-8 w-44 bg-[#dcdcde]" />
           <div className="mt-3 h-4 w-96 max-w-full bg-[#dcdcde]" />
           <div className="mt-6 border border-[#c3c4c7] bg-white p-4">
             <div className="h-9 w-full bg-[#f0f0f1]" />
             <div className="mt-4 space-y-px">
               {[0, 1, 2, 3, 4].map((row) => <div key={row} className="h-12 bg-[#f6f7f7]" />)}
             </div>
           </div>
         </div>
       </div>
     );
   }
   ```

3. Skeleton geometry represents the list because it is the default Vibe route.
   It must remain generic enough for nested Vibe pages; do not branch on URL or
   add a client pathname hook.
4. Do not use a marketing animation, gradient, glass card, spinner dependency,
   or a fake progress percentage.

#### New `app/vibes/error.tsx`

1. First line is `'use client';`. This is required by the App Router error
   boundary contract because it receives `reset` and handles a button click.
2. Import `Link` from `next/link`, plus `useEffect` from React only if logging
   the caught error to an existing project observability function is already
   established. Do not create new telemetry in this UI package.
3. Use this exact prop type:

   ```ts
   type VibesErrorProps = {
     error: Error & { digest?: string };
     reset: () => void;
   };
   ```

4. Render a non-nested workspace shell with a `VibeNotice`-equivalent surface.
   Because `VibeNotice` may be a server-compatible passive component, it may be
   imported only if it supports client use. Otherwise inline the same notice
   classes/role in `error.tsx`; do not make `VibeNotice` client-only merely for
   this boundary.
5. Visible content is exactly:
   - heading: **The Vibe workspace could not be displayed**;
   - paragraph: **Try loading this screen again. If the problem continues, return
     to All Vibes and try the action again.**;
   - primary `type="button"` control: **Try again**, calling `reset()`;
   - secondary Link: **Back to All Vibes**, `href="/vibes"`.
6. Do not render `error.message` or `error.digest` as visible user copy. Do not
   add an auth redirect, site application action, or lifecycle mutation here.
7. The error component must not be used for known API response errors. Those
   remain in `VibeList`, editor, lifecycle, and apply pages as `VibeNotice`
   states, where users keep their current input and context.

#### Exact test and build checks for 0C

1. Add `tests/unit/vibes-route-error.test.tsx`. Render the error component with
   a spy `reset`; click Try again; assert the spy is called once and the Back
   link points to `/vibes`. Assert a sensitive sample `error.message` is absent.
2. Loading component test renders it and asserts `aria-busy="true"`, the
   **Loading Vibe workspace** label, and five skeleton rows. It needs no API or
   navigation mock.
3. Run `npm run build` after adding `error.tsx` because App Router requires the
   error boundary to be a client component. Do not add `global-error.tsx`; it
   would expand scope beyond Vibe CMS and must include root HTML/body semantics.
4. Add package **0C Route states** between 0B and 1A in section EB’s execution
   sequence. Its stop condition is: loading/error files compile, focused tests
   pass, and ordinary API error notices are unchanged.

### EN. List resilience package 1F — valid pages and contextual empty states

This package completes the mature list-screen behavior after 1E. It uses the
existing list response fields only; it does not add a server filter, a new list
endpoint, or a preference store.

#### `app/vibes/VibeList.tsx`, response type and `loadList`

1. Extend the local `ListResponse` type with `page?: number` and `pageSize?:
   number` because `GET /api/vibes` already returns both. Do not add response
   fields the route does not select/return.
2. In the successful `loadList` branch, calculate before setting the final list
   UI state:

   ```ts
   const nextVibes = payload.vibes || [];
   const nextTotal = payload.total || 0;
   const nextTotalPages = Math.max(1, payload.totalPages || 1);
   const resolvedPage = Math.min(Math.max(1, listQuery.page), nextTotalPages);
   ```

3. If `resolvedPage !== listQuery.page`, call
   `writeListQuery({ ...listQuery, page: resolvedPage }, 'replace')` and return
   before setting `vibes`/selection/loading success state. The following fetch
   obtains the correct final page. Do not use `router.push`; a collection change
   should not add a history step solely to repair an out-of-range page.
4. If page is valid, set `vibes`, `total`, `statusCounts`, and `totalPages` from
   the local `next*` values, clear error, and clear selection as current success
   behavior requires.
5. This handles all existing causes of a stale page: a bulk archive/trash action,
   another operator changing the collection, and a bookmarked page beyond the
   current total. Do not special-case one mutation endpoint.
6. Do not use `payload.page` as the selected page. The request URL/listQuery is
   authoritative; route response `page` is evidence only and should be covered
   by a contract test rather than silently trusted.

#### New `app/vibes/_components/VibeListEmptyState.tsx`

1. Props are exactly:

   ```ts
   type VibeListEmptyStateProps = {
     total: number;
     searchQuery: string;
     status: string;
     onClearSearch: () => void;
     onClearStatus: () => void;
     onClearFilters: () => void;
   };
   ```

2. Render a compact, centered but not marketing-style `<section>` with an `<h2>`
   and one paragraph. No illustration, gradient, or empty dashboard metric.
3. Branch in this exact order:
   - `total === 0 && !searchQuery && !status`: heading **No Vibes yet**; text
     **Create a draft to begin an editorial system.**; Link **Add New Vibe** to
     `/vibes/new`.
   - `searchQuery && status`: heading **No Vibes match these filters**; button
     **Clear filters** calling `onClearFilters`.
   - `searchQuery`: heading **No Vibes match this search**; button **Clear
     search** calling `onClearSearch`.
   - `status`: heading **No Vibes in this view**; button **Clear status filter**
     calling `onClearStatus`.
   - fallback: heading **No Vibes found**; button **Clear filters**.
4. All buttons use `type="button"` and secondary shared control classes. The
   Add New control is a Link using primary action classes. Do not make an empty
   state clear all filters automatically.

#### `VibeList.tsx`, existing empty branch around current lines 154–157

1. Replace the single bare empty paragraph with `VibeListEmptyState` only when
   `!loading && !error && vibes.length === 0`.
2. Pass `searchQuery={listQuery.q}` and `status={listQuery.status}`.
3. Implement callbacks as follows:

   ```ts
   function clearSearch() {
     setSearchInput('');
     writeListQuery({ ...listQuery, q: '', page: 1 }, 'push');
   }

   function clearStatus() {
     writeListQuery({ ...listQuery, status: '', page: 1 }, 'push');
   }

   function clearFilters() {
     setSearchInput('');
     writeListQuery({ q: '', status: '', sort: 'updatedAt', direction: 'desc', page: 1 }, 'push');
   }
   ```

4. `clearFilters` intentionally resets sorting too because it is the explicit
   all-context reset. `clearSearch` and `clearStatus` preserve remaining list
   context. Do not change sort when only one filter is cleared.
5. Keep status-view counts visible above the empty state; they explain that
   other editorial states may contain Vibes.

### EO. Package 1F tests and execution-order update

1. In `vibe-list.test.tsx`, initialize list query page 2; return a response with
   `totalPages: 1`; assert one `router.replace` to page 1 and that the second
   fetch uses `page=1`. Assert no `router.push` occurs for recovery.
2. Mock a successful bulk action that removes the only page-2 item, then return
   the reduced page response; assert selection clears only after the corrected
   page loads.
3. Test all four `VibeListEmptyState` branches. Assert a search-only empty state
   does not reset status/sort; a status-only state does not clear search; Clear
   filters resets to the known list defaults.
4. Add **1F List resilience** immediately after 1E and before 2A in section EB.
   Its stop condition is: an out-of-range list URL or post-mutation page repair
   always finishes on a valid page, and every empty state offers only a truthful
   next action.

### EP. List focus-continuity patch — preserve keyboard context after updates

Modern administration screens retain a clear working position after an action.
Implement this as a small follow-up within package 1F; do not add a focus
manager dependency.

1. In `VibeList.tsx`, add `const bulkApplyRef = useRef<HTMLButtonElement>(null);`
   beside bulk state and pass it to both bulk Apply controls only through the
   control that triggered the request. Add `trigger: 'top' | 'bottom'` to
   `requestBulkAction` so it records the initiating button.
2. After a successful bulk POST and successful `loadList` on a still-valid page,
   call `queueMicrotask(() => activeBulkApplyRef.current?.focus())`. If the page
   repair branch runs, do not focus a stale button; let the new list render.
3. In the corrected-page success branch, place `ref={listHeadingRef}` on the
   visible **All Vibes** heading with `tabIndex={-1}` and focus it after the
   replacement page finishes loading. Do not use `autoFocus`.
4. When an empty state replaces the table, focus its heading only after a user
   initiated bulk action removed the final item; do not steal focus on ordinary
   search/filter typing.
5. Add list tests for top/bottom bulk focus, corrected-page heading focus, and
   no focus movement during debounced search. Keep all links/buttons text-labeled.

### EQ. List result announcement — concise live feedback

1. In `VibeList.tsx`, after the list header and before table controls, render one
   visually hidden `<p aria-live="polite" aria-atomic="true" className="sr-only">`.
2. Its text is derived only after successful, non-loading list responses:
   **Showing {rangeStart}–{rangeEnd} of {total} Vibes**; use **No Vibes found**
   when total is zero. Do not announce while typing before debounce settles.
3. Do not place the same text in `VibeNotice`, pagination, and the live region;
   the visible range remains pagination copy and the hidden line is the sole
   announcement channel.
4. Add a list test that changes status and asserts one updated live summary;
   assert a rejected fetch does not announce a false result count.

### ER. List loading-state contract

1. In `VibeList.tsx`, keep the list `<section aria-label="Vibe list">` and add
   `aria-busy={loading ? true : undefined}`. Do not replace the section while a
   refresh runs; preserve the prior table until the new response arrives.
2. During an initial load with no rows, show the table-shaped skeleton from CH.
   During a later filter/sort/page refresh with existing rows, retain the rows
   and render a small visible **Updating list…** status beside the result count.
3. The updating text uses `role="status"`; it must disappear on success, error,
   or abort. Do not render a spinner dependency or block navigation controls
   beyond controls whose request would conflict.
4. Add tests for initial `aria-busy`, retained rows during refresh, and removal
   of **Updating list…** after successful or failed response.

### DM. Luna execution map — read and edit in this exact order

The document has accumulated detailed reference sections. This is the canonical
execution order; it prevents a later route task from creating imports for a
primitive that has not been written yet.

1. Read CC, CD, CE, CF, CR, CX, CY, and DE. Implement **0A**, then stop.
2. Read CR, DC, and CV. Implement **0B** presentational components and their
   tests. Do not modify any route page in this package.
3. Read CS, DG, DH, and CP. Implement **1A** query helper and test it with
   `tests/unit/vibe-list-query.test.ts` before importing it in `VibeList.tsx`.
4. Read CG, CH, DI bulk rules, DD list state, and DE table rules. Implement
   **1B** in `VibeList.tsx`; run its focused test.
5. Read CI, DG create rules, DC test setup, and CX/CY form layout. Implement
   **2A** new-Vibe page only.
6. Read CJ, DI draft rules, DD editor state, and DE disclosure rules. Implement
   **2B** editor only, appending cases to the existing editor-validation test.
7. Read CK, DI rollback rules, and DJ revision assertion. Implement **3A**
   revisions only.
8. Read CL, CM, DA, DK audit/compare rules, and DL. Implement **3B** one route
   at a time; do not place actions/submit/publish changes in a single file-wide
   formatting commit.
9. Read CN, DG pointer rules, DH, DI apply rules, and DD apply state. Implement
   **4A** last, because it relies on dialog primitive and established notices.

### DN. Exact import changes by file

These are the only new imports expected in each first-pass route patch. If a
file needs an additional import, Luna must explain why in the package handoff.

| Target file | Add imports | Remove imports only after replacement is used |
| --- | --- | --- |
| `app/vibes/layout.tsx` | none beyond current `Link`/`VibeSidebar` | none |
| `app/vibes/VibeSidebar.tsx` | none; `usePathname`, `useEffect`, `useState`, and icon imports already exist | none |
| `app/vibes/VibeList.tsx` | `usePathname`, `useRouter`, `useSearchParams`; `VibePageHeader`, `VibeNotice`, `VibeStatusViews`, `VibeListToolbar`, `VibeRowActions`, `VibeConfirmDialog`; query helper/types | no current import until the equivalent local JSX is removed |
| `app/vibes/new/page.tsx` | `VibePageHeader`, `VibePanel`, `VibeNotice` after normalizing existing imports | retain `Link` only if its back link remains outside header; otherwise remove it |
| `edit/VibeEditor.tsx` | `VibePageHeader`, `VibePanel`, `VibeEditorToolbar`, `VibeNotice`, `VibeStatusBadge` only where rendered | no fetch/router import changes |
| `revisions/RevisionList.tsx` | `VibeConfirmDialog`, `VibeRowActions`, `VibeStatusBadge`, `VibeNotice` | remove no lifecycle/network import |
| `actions/page.tsx` | `VibePageHeader`, `VibeNotice`, `VibeStatusBadge`, `VibeConfirmDialog` | keep `Link` only if `VibePageHeader` has not replaced its back link |
| `submit/page.tsx` | `VibePageHeader`, `VibeNotice`; `useEffect` stays | retain `Link` only when necessary after header replacement |
| `publish/page.tsx` | `VibePageHeader`, `VibeNotice`, `VibeStatusBadge`; `useEffect` stays | same Link rule |
| `audit/page.tsx` | `VibePageHeader`, `VibeNotice`; `Link` may be removed once header owns back link | delete only the local workflow-links array |
| `compare/CompareView.tsx` | `VibeNotice` | none |
| `apply/page.tsx` | `VibePageHeader`, `VibeNotice`, `VibeConfirmDialog`; local presentation components as needed | retain `Link` only if header has not absorbed back navigation |

Do not import a generic UI library, a modal dependency, a router wrapper, or a
new global utility. Every item in this table is either already in the project or
created by package 0A/0B.

### DO. Exact no-regression checks immediately before each package commit

Run these checks from `apps/pulse` after focused tests. They require no network
or production environment.

```powershell
git diff --check
rg -n "(/api/vibes|/api/admin/sites|expectedVersion|vibe-status-changed)" <changed-file>
npm run test:unit -- --runInBand <focused-test-file>
```

If this Vitest installation does not accept `--runInBand`, omit only that flag;
do not change the project test script. For packages with more than one focused
test, run the explicit Vitest files instead:

```powershell
npx vitest run tests/unit/vibe-ui-primitives.test.tsx tests/unit/vibe-list-query.test.ts
```

Then review exact diffs with this file-specific checklist:

1. **Route files:** every old endpoint string is still present or intentionally
   replaced by the same endpoint string in a helper; every JSON key from DI is
   unchanged.
2. **Forms:** each existing named input remains present in JSX; collapsed
   panels cannot conditionally omit any field.
3. **Links:** all `vibeId`, `revisionId`, and `siteId` path segments retain
   `encodeURIComponent` where the current file already uses it. Do not remove
   escaping while extracting JSX.
4. **Events:** Submit, Publish, and successful Action routes still dispatch
   `vibe-status-changed`; purely visual pages must not dispatch it.
5. **Landmarks:** after a page is migrated, it does not introduce a nested
   `<main>` under the layout main. A simple content `<div>` is the page shell.

### DP. Acceptance notes Luna must append to each implementation handoff

Use this exact mini-template rather than a narrative summary:

```md
## Vibe UI package <ID>

- Changed files: `<one file per line>`
- UI behavior completed: `<one sentence>`
- Requests preserved: `<endpoint + method + exact JSON keys, or none>`
- State/event preserved: `<status event, query state, conflict state, or none>`
- Tests: `<exact command>` — `<pass/fail and count>`
- Deferred by scope: `<none or explicit dependency>`
```

For a package that changes only shared primitives, write **Requests preserved:
none**. For a route package, never write a vague statement such as “API
unchanged”; identify the actual endpoint and body fields. This is the evidence
needed to review Luna’s work line-by-line.

### DC. Test implementation details from the existing Vitest suite

The existing editor test at
`tests/unit/vibe-editor-validation.test.tsx` establishes the local test style:
Vitest, React Testing Library, `fireEvent`, `vi.spyOn(global, 'fetch')`, and a
small `next/link` mock. Follow that style. Do not add a package just to use a
different test helper.

#### Shared test setup per new client component test

At the top of each `.test.tsx` file, use this structure, changing only imports
needed by that test:

```tsx
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
```

1. Do not import `@testing-library/user-event`; it is not an existing direct
   development dependency. Use `fireEvent.click`, `fireEvent.change`,
   `fireEvent.keyDown`, and `fireEvent.submit`.
2. For a `next/navigation` client component, add one local mock that returns
   stable `push`, `replace`, `pathname`, and a new `URLSearchParams` per test.
   Export the spies from the mock module or define them above `vi.mock`; reset
   them in `afterEach`.
3. Stub `window.confirm` only while migrating a page that still uses it. A
   completed dialog migration must assert it is not called.
4. Mock every `fetch` call by `input` URL and `init?.method`, as the existing
   editor test does. Never accept a generic success response for all routes,
   because it would hide an endpoint typo.

#### Exact new-test file ownership

| Test file | Component/files under test | Mock rule | Minimum assertion sequence |
| --- | --- | --- | --- |
| `tests/unit/vibe-ui-primitives.test.tsx` | header, notice, badge, panel, dialog | no fetch mock | Render each named export; assert roles, focus, closed-panel mounted input, Escape behavior. |
| `tests/unit/vibe-list-query.test.ts` | `lib/cms/vibeListQuery.ts` | none | Use real `URLSearchParams`; assert parse defaults and canonical serialization. |
| `tests/unit/vibe-list.test.tsx` | `VibeList.tsx`, list toolbar/actions | navigation + fetch by exact URL | Render, await list load, filter/sort/bulk, inspect URL spy and request payload. |
| `tests/unit/vibe-new-page.test.tsx` | `new/page.tsx` after component extraction only if needed | navigation + POST fetch | Type title, observe slug, manually edit, change title, submit valid form, inspect JSON. |
| existing `vibe-editor-validation.test.tsx` | `VibeEditor.tsx` | GET then PATCH exact URLs | Keep existing two cases and append panel/FormData/conflict cases. |
| `tests/unit/vibe-revisions.test.tsx` | `RevisionList.tsx` | GET revisions + rollback | Select old published row, require reason, assert unchanged rollback JSON and reordered row. |
| `tests/unit/vibe-apply.test.tsx` | `apply/page.tsx` | GET pointer + POST apply | Check A, change ID to B, verify disabled action, check B, confirm post. |

#### Route-page testability rule

`source/page.tsx` and `preview/page.tsx` are async server components. Do not
force them into jsdom by mocking database, headers, and Next server primitives
in a large unit test. Instead:

1. Keep the server page responsible for access, fetch/database work, and route
   params only.
2. Extract a pure local presentation function or component
   (`VibeSourceDetails` / `VibePreviewSurface`) into the route directory when
   the page is migrated.
3. Pass already-resolved primitive props into it.
4. Unit-test that pure component’s absent/present source and preview-copy
   branches. The server page’s request behavior is protected by existing route
   tests/manual verification, not a broad environment mock.

### DD. Exact error and busy-state decisions by route

Apply one consistent rule: disable only the control currently submitting; do
not disable navigation, editing, or inspection controls unless a request would
make their state stale.

1. **List:** `loading` disables Previous/Next and bulk Apply; search, status,
   and sort stay available. `bulkBusy` disables only bulk select/Apply and row
   selection checkboxes while its POST is pending.
2. **New Vibe:** `saving` disables the submit button only. Do not disable title,
   slug, description, or preset controls because a failed create should be
   corrected in place.
3. **Editor:** existing `saveState === 'saving'` disables the Save draft submit
   button. Do not disable individual fields; the current request is an optimistic
   snapshot protected by `expectedVersion`.
4. **Revisions:** `pendingId` disables only the republish action buttons. The
   selected revision’s compare and apply links remain navigation links.
5. **Apply:** `preflightState === 'checking'` disables Check pointer and apply
   confirmation entry; it does not clear the selected revision. Dialog confirm
   uses a separate `applying` boolean and disables Cancel/Escape only while the
   POST is running.
6. **Lifecycle pages:** retain each page’s existing busy boolean. Replace visual
   error paragraphs with `VibeNotice`, but do not change the text returned from
   an API error unless it is misleading about the completed action.

For all client pages, place the error/success notice immediately below the page
header and before the first interactive form. Use `role="alert"` only for
errors. A success notice is `role="status"` and is not auto-dismissed.

### DE. Line-specific accessibility rules Luna must verify in review

1. In `VibeList.tsx`, keep the current select-all checkbox’s checked state as
   a boolean. Add `aria-label="Select all Vibes on this page"`; never use the
   HTML `indeterminate` attribute string. If partial-selection visual state is
   desired later, set `input.indeterminate` through a ref in a separate task.
2. Each Vibe row checkbox label is `Select ${vibe.title}` (fall back to the
   stable `vibeId` only when title is empty). This is a label change, not a
   data-model change.
3. Every sortable table header is a `<button type="button">` inside `<th>`.
   Set `aria-sort` on the `<th>` to `ascending`, `descending`, or `none`; do not
   put `aria-sort` on the button.
4. `VibeStatusViews` buttons set `aria-pressed`; they are not tabs unless a
   future task also implements keyboard arrow navigation and tab panels.
5. The `<details>` summary in `VibePanel` is the accessible disclosure control;
   do not add a nested button or a duplicate `aria-expanded` attribute.
6. Dialog input error text uses a unique ID and is referenced by
   `aria-describedby` only while visible. Do not leave a dangling description
   ID on an input after the error element is removed.
7. External source links in the pure source-details component include visible
   text `Open source link` and an `aria-label` that includes the source kind;
   do not display an unbounded raw URL as the only link text.
8. The settings preview sample button is non-functional and must remain visibly
   described as representative; do not give it a fake `href` or click handler.

### DF. Explicit out-of-scope guardrails for this UI plan

The following ideas can be captured as future work but must not appear in a
Luna implementation diff for packages 0A–4A:

1. A generic drag/drop editor, block schema, HTML storage, or CSS authoring UI.
2. Wildcard DNS, TLS certificates, host parsing, middleware rewrites, or tenant
   lookup changes.
3. New persistence fields, schema migrations, database indexes, or cache-policy
   changes.
4. A permission model rewrite, authorization audit, admin route migration, or
   changes to `getVibeCmsAccess`.
5. New dependencies, package upgrades, Tailwind configuration, global styling,
   or design-system rewrites.
6. An automatic publish, automatic site application, automatic revision
   rollback, or deletion of revision history.
7. A broad reformat of compressed route files other than the route currently in
   the active package.

If a desired UI behavior cannot be implemented without one of these changes,
Luna must stop after documenting the exact dependency and defer it. Do not
silently widen the package.

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
- Show a live identifier preview (**Slug: `coastal-modern`**) and inline
  validation guidance rather than relying on the browser’s generic “match the
  requested format” message. Do not show `/vibes/coastal-modern` as a public or
  navigable route.
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
- Put title and slug identifier at the top of the canvas; surface a compact
  “Last saved” state beside the title.
- Organize current structured fields into clearly named panels: **Identity**,
  **Visual system**, **Layout**, **Taxonomy**, and **Advanced**. Panels should
  be collapsible, retain their state while editing, and describe their purpose
  in plain language.
- Keep the existing publish rail as the action authority, but present status,
  current published revision, Preview, Revisions, and the next lifecycle action
  in a stable, familiar order.
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
- Add row actions for Compare, Preview, Republish revision, and Apply to site only
  when their existing server-side rules allow them.
- Make republishing a confirmation dialog that states the result precisely:
  it creates a new current published revision; it does not apply that revision
  to a site.
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
  help and a live identifier preview; do not construct a public URL from it.
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
  available” context beside it. Use `VibePageHeader` and show the slug
  identifier directly below the title. Do not render a public permalink.
- **Line 172:** retain the `lg:grid-cols-[1fr_320px]` structure; this is already
  the desired WordPress-style canvas/rail layout. Change `gap-5` to shared
  spacing tokens only if the project already has them—do not introduce a new
  design-token system in this PR.
- **Lines 174–181 (Metadata):** use `VibePanel defaultOpen`. Keep title, slug,
  description field names and `FormData` keys unchanged. Add the same slug help
  and identifier preview used in Add New.
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
- Add assertions for the slug help/identifier preview and panel names.
- Add a test proving form field names remain present when panels collapse/expand
  and that a save produces the same normalized PATCH payload.
- Add a conflict-state test: API 409 shows reload guidance and does not mark
  the draft as successfully saved.

### 5. Revisions and audit

#### `apps/pulse/app/vibes/[vibeId]/revisions/RevisionList.tsx`

- **Lines 24 onward:** preserve the existing revision fetch, rollback endpoint,
  comparison links, and `publishedRevisionId` semantics.
- **Lines 86 onward:** retain the table but order rows/visual groups as current
  published revision, previous published revisions, then checkpoints. If the
  API ordering is not guaranteed, derive a presentational ordered array in this
  component without mutating data or changing the API.
- Rename `restoreRevision` to `republishRevision`, then replace its inline
  `window.confirm` with `VibeConfirmDialog`. Dialog copy must say: “Create a
  new published revision from this snapshot. It will not apply it to any site.”
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
### Implementation evidence — current UI pass

- Foundation landmarks, shared controls, validated query/slug helpers, list wiring, editor panels, revision confirmation, and Apply confirmation are implemented.
- Focused UI verification currently covers headers, notices, badges, panels, status views, list toolbar/row actions, editor toolbar, slug rules, Add New Vibe fields, and Apply context.
- Existing editor validation and CMS contract suites remain passing.
- No API routes, lifecycle services, tenant configuration, or public rendering were changed by this UI pass.
- Remaining follow-up: full Apply-page visual walkthrough and any broader route-level regression coverage.
- Latest verification: Add New Vibe, editor validation, Apply confirmation, and CMS contract suites pass together (14 tests); route landmarks were normalized so the shared layout owns the primary workspace landmark.

## 90% Admin-Familiarity Convergence Plan

### Objective and measurement

This is the next implementation sequence after the current UI pass. Its goal is
that a long-time WordPress editor can complete the Vibe workflow without first
learning a new screen grammar. “90% similar” means familiar placement,
density, hierarchy, keyboard behavior, and terminology—not copied branding,
WordPress packages, or WordPress data models.

Score each completed package against the following observable rubric. A package
does not count as complete if its screenshot or keyboard walkthrough cannot
demonstrate the matching behavior.

| Surface | Current estimate | 90% target |
| --- | ---: | --- |
| Workspace shell and navigation | 50% | Persistent global bar, active section, contextual submenu, compact mobile menu |
| All Vibes list table | 70% | Dense list-table anatomy, top/bottom controls, status links, hover/focus actions |
| Add New Vibe | 60% | Identity-first screen, compact title/action presentation, advanced choices secondary |
| Structured editor | 40% | Dominant editing canvas, fixed publish/status rail, document settings sidebar, compact toolbar |
| Revisions and audit | 60% | Current revision first, metadata hierarchy, concise row actions, readable activity log |
| Taxonomy and presets | 45% | List-table management surface with search/filter and usage counts |
| Apply to site | 60% | Guided preflight, clear source/destination summary, one deliberate final action |

No package may alter the Vibe API routes, draft payload shape, lifecycle
transitions, revision behavior, authentication, or site-pointer authority.

### Package 10A — Compact workspace shell and contextual navigation

**Files:**

- `app/vibes/layout.tsx`
- `app/vibes/VibeSidebar.tsx`
- `app/vibes/_components/VibePageHeader.tsx`

**Implementation:**

1. Keep the existing 40px dark utility bar, but make its layout match a compact
   admin bar: workspace identity at left; only short utility actions at right.
   Change the current oversized, pill-like Add New treatment to a small
   bordered/solid admin action that is visually subordinate to the page title’s
   Add New action.
2. Make desktop sidebar rows 32–36px high with 13–14px labels, no card spacing,
   square-to-small-radius active treatment, and a single clearly active blue
   destination. Preserve the existing icon labels; do not add new global areas.
3. Add a contextual child-nav slot beneath the active Vibes entry. It must show
   **All Vibes**, **Add New**, and **Taxonomy** on collection routes, then add
   the existing current-Vibe workflow links only on `/[vibeId]/*` routes.
4. On widths below `lg`, replace the horizontal scrolling row with a single
   labelled **Vibes menu** disclosure. Keep every link in the DOM and keyboard
   reachable; do not make navigation swipe-only.
5. Tighten `VibePageHeader`: title is 26–30px, description is secondary, and
   action buttons render alongside the title on desktop, beneath it on narrow
   screens.

**Acceptance:** a desktop screenshot reads as one connected admin workspace;
keyboard Tab reaches utility actions, active/contextual navigation, page action,
then the screen body without dead ends.

### Package 10B — Complete the All Vibes list-table posture

**Files:**

- `app/vibes/VibeList.tsx`
- `app/vibes/_components/VibeListToolbar.tsx`
- `app/vibes/_components/VibeStatusViews.tsx`
- `app/vibes/_components/VibeRowActions.tsx`
- `app/vibes/_components/VibeListEmptyState.tsx` (new)

**Implementation:**

1. Render the page title and compact outlined **Add New** action through
   `VibePageHeader`; remove the large dark list-header button.
2. Render status views directly under the title as compact text links with
   parentheses counts and separators: `All (n) | Drafts (n) | …`. Retain the
   current URL/filter state and API parameters exactly.
3. Always render top and bottom `VibeListToolbar` controls when a table is
   present. The select, Apply button, selection count, and search must retain
   their existing event/API behavior. Bottom controls mirror the top controls;
   pagination remains the final row.
4. Tighten table rows to 44–52px before title metadata expands them. Give
   checkbox, title, status, revision, and modified columns stable widths.
   Keep the existing native table and sortable header buttons.
5. At pointer/keyboard-capable desktop widths, mute row actions until row hover
   or focus-within; on touch/narrow layouts keep them visible. Never remove
   actions from tab order.
6. Replace the generic empty paragraph with `VibeListEmptyState`. It must say
   whether the empty state comes from no Vibes, a status filter, or a search;
   expose **Clear search**, **Clear filter**, and **Add New Vibe** only when
   relevant. Keep the resilient empty-response behavior already added.
7. Add an `aria-live="polite"` result summary after fetches: e.g. “12 Vibes,
   page 1 of 1” or “No Vibes match this search.”

**Tests:** add URL/filter reset and contextual-empty-state tests. Preserve
query parser, toolbar, row action, and empty-response tests.

### Package 10C — Make Add New Vibe a compact identity-first screen

**Files:**

- `app/vibes/new/page.tsx`
- `app/vibes/_components/VibePageHeader.tsx`
- `tests/unit/vibe-new-page.test.tsx`

**Implementation:**

1. Keep Title, Slug, and Description first; constrain their form width to the
   editorial canvas instead of a large promotional card.
2. Add one short help line under Title and Slug. Keep the current slug pattern,
   auto-generation, manual-slug override, create request, and error handling.
3. Convert **Starting style** into a closed-by-default details/panel section
   labelled “Optional starter style.” Opening it reveals the existing preset
   cards; no preset is automatically applied.
4. Reduce preset cards to compact selectable rows/swatch previews rather than
   three equally dominant large cards. Keep their radios and visible keyboard
   focus treatment.
5. Make the primary submit read **Save draft and continue editing** and keep it
   at the bottom of the identity form. Do not put publish/preview/apply actions
   on this screen.

**Acceptance:** title is the first focusable form control, slug guidance is
visible before submit, optional style choices do not dominate first view.

### Package 10D — Reshape the editor into canvas + document rail

**Files:**

- `app/vibes/[vibeId]/edit/VibeEditor.tsx`
- `app/vibes/_components/VibeEditorToolbar.tsx`
- `app/vibes/_components/VibePanel.tsx`
- `app/vibes/_components/VibeStatusBadge.tsx`

**Implementation boundary:** `saveDraft`, the form element, all existing input
`name` attributes, PATCH URL, `expectedVersion`, and normalized draft payload
must remain byte-for-byte behaviorally equivalent.

1. Replace the current page heading with a compact editor toolbar: back to All
   Vibes, editable draft title/slug context, save state, Preview, and Save
   draft. Toolbar height target is 48–56px on desktop.
2. Make the left/main column the editing canvas. Metadata stays first and open.
   Split current **Visual system** into three distinct panels: **Colors**,
   **Typography**, and **Layout**. Keep each panel’s child controls mounted
   when closed.
3. Keep Taxonomy open by default; make Source details and Jamie voice closed by
   default. Do not conditionally unmount controls.
4. Make the right rail sticky at desktop width and 280–320px wide. It shows, in
   this order: status badge and explanation, save/conflict state, primary next
   lifecycle action, Preview, revision history, and a compact audit link.
5. Add an editor **Settings** toggle at desktop width that collapses/expands the
   document settings column only. Publish/status rail remains available; this
   is not a new API or persistence setting.
6. Below `lg`, place the status/publish rail immediately after the toolbar and
   before the editing canvas. Panels remain in the same order.
7. Use compact admin controls: 32–36px inputs/buttons, 13–14px labels, thin
   borders, minimal rounding. Retain Sunset Pulse color and typography tokens.

**Tests:** extend editor validation to prove all field names exist while every
panel is closed, form ref Save submits once, and status conflict remains
distinct from dirty state.

### Package 10E — Revision, audit, and taxonomy management screens

**Files:**

- `app/vibes/[vibeId]/revisions/RevisionList.tsx`
- `app/vibes/[vibeId]/revisions/page.tsx`
- `app/vibes/[vibeId]/audit/page.tsx`
- `app/vibes/taxonomy/TaxonomyDirectory.tsx`

**Implementation:**

1. Keep revision history as a dense table. Present the current published
   revision first, then previous published revisions, then checkpoints. Use
   presentational sorting only if API ordering is insufficient.
2. Make revision number/title the primary cell and show status, publish date,
   author, parent revision, and change summary as secondary metadata. Keep
   Compare, Republish, and Apply in a compact action row beneath it.
3. Replace raw, all-caps audit cards with grouped date sections and concise
   action labels. Put raw IDs in a native `<details>` region named **Technical
   details**; preserve their content.
4. Change taxonomy from its directory/card presentation to a native table with
   Term, Group, and Used by columns. Add client-side search and group filter
   over the already fetched response; do not add mutations or a new API.

**Acceptance:** an editor can identify the live revision and its next actions
without reading raw IDs; a taxonomy editor can scan and filter terms in one
screen.

### Package 10F — Complete site-application decision flow

**Files:**

- `app/vibes/[vibeId]/apply/page.tsx`
- `app/vibes/_components/VibeApplyConfirmation.tsx`
- `app/vibes/_components/VibeConfirmDialog.tsx`

**Implementation:**

1. Use a single-column operator workflow with this exact visual order:
   selected revision → site selection → current-pointer check → preflight
   summary → confirm and apply.
2. Keep the revision received from Revision History as read-only context. Put
   manual revision override behind **Choose a different revision** disclosure.
3. Put disposable-run selection behind **Use a disposable verification site**
   disclosure. Manual Site ID is a second disclosure; neither is the visual
   first step when the revision is known.
4. Keep the existing `checkedSiteId` guard: changing the site clears pointer
   data and disables Apply until the exact new site is checked.
5. Present preflight as a compact two-column definition list: Vibe, selected
   revision, current pointer, new pointer, and disposable expiry warning.
6. Preserve the native confirmation dialog, unique heading ID, duplicate-click
   protection, and current apply endpoint/body unchanged.

**Acceptance:** an operator cannot mistake a draft for a revision, cannot apply
before checking the current site pointer, and sees source/destination context
in one final review surface.

### Package 10G — Visual system, responsive pass, and evidence

**Files:** all files changed by Packages 10A–10F plus Vibe unit tests.

**Implementation:**

1. Normalize density tokens in the existing Vibe component classes: admin bar
   40px, sidebar rows 32–36px, input/button controls 32–36px, table cells
   8–12px vertical padding, page gutters 16px mobile/24px desktop.
2. Remove decorative `rounded-xl`/shadow-heavy containers where they make an
   operational screen feel like a dashboard card. Retain modest rounding for
   notices, dialogs, and selected controls.
3. Verify 1440px, 1024px, 768px, and 390px layouts. At each width, no select
   option text may overlap its arrow; tables scroll horizontally rather than
   dropping operational columns; navigation must be reachable without a
   swipe-only interaction.
4. Verify keyboard operation for sidebar/menu, list filtering, row actions,
   panel toggles, Save, confirmation dialogs, and error notices.
5. Capture before/after screenshots for shell, list, Add New, editor,
   revisions, taxonomy, and Apply. Append a concise evidence block under this
   plan after each package, with changed files, tests, and remaining gaps.

### Canonical execution order

1. 10A shell/navigation.
2. 10B list table.
3. 10C Add New.
4. 10D editor.
5. 10E revisions, audit, taxonomy.
6. 10F Apply.
7. 10G responsive, accessibility, and evidence.

Do not start a later package while the preceding package has an unresolved
interaction regression. Do not substitute a block-editor framework, add
WordPress dependencies, or expand this plan into media/comments/plugins/themes.

### 90% execution manifest — current line-by-line edits

Line numbers below were captured from commit `51fe7cb1`. Reconfirm the small
local region before editing if an earlier package has changed the file. “Keep”
means preserve its network call, payload, URL, or lifecycle behavior exactly.

#### 10A — `app/vibes/layout.tsx` and navigation

| File and current lines | Exact edit |
| --- | --- |
| `layout.tsx:7–8` | Keep the outer workspace element and `min-h-screen`. Replace only the broad `bg-[#f0f0f1]` spacing treatment with compact workspace gutters supplied by each screen; do not remove the layout owner. |
| `layout.tsx:9–14` | Keep the sticky 40px header. Replace the two-item `justify-between` nav body with three semantic regions: left workspace brand, middle optional contextual breadcrumb slot, right utility action slot. Do not add data fetching or a user menu until a user source is supplied. |
| `layout.tsx:11` | Change `Vibe CMS` link from a plain link into compact admin-bar identity: 13px, 32px hit area, existing `focus-visible` classes retained. |
| `layout.tsx:12` | Keep `/vibes/new`; remove visual priority from the global Add New control by changing it to compact outlined/quiet utility styling. Page-local Add New becomes the primary action. |
| `layout.tsx:16–19` | Keep `VibeSidebar` then `<main id="vibe-workspace">` ordering. Add desktop content padding only here if all individual Vibe pages remove duplicate outer gutters in a later cleanup; do not duplicate padding in both places. |
| `VibeSidebar.tsx:27–33` | Replace the flat static collection item array with a `collectionItems` array containing All Vibes, Add New, Taxonomy. Preserve href values. |
| `VibeSidebar.tsx:45–61` | Keep `getWorkflowItems` href values/status gating. Move its output into a nested submenu below the collection list instead of a same-level navigation group. |
| `VibeSidebar.tsx:67–98` | Keep `pathname`, current-Vibe extraction, fetch URL, abort controller, and status state. Do not fetch on collection routes. |
| `VibeSidebar.tsx:100–114` | Replace the current `flex … overflow-x-auto` mobile nav with `<details className="lg:hidden">`; summary text must be `Vibes menu`, and child links must render inside the disclosure. Keep a separate `hidden lg:block` desktop vertical nav. |
| `VibeSidebar.tsx:116–129` | Keep `SidebarLink` href/active calculation. Reduce row spacing to `min-h-8 px-3 py-1.5 text-sm`; add an optional `nested` prop that applies left padding and smaller muted text for workflow links. |
| `VibePageHeader.tsx:13–26` | Keep props unchanged. Replace hero-scale title classes with `text-2xl font-semibold`/`sm:text-3xl`; render `actions` in the same flex row as title at `sm` and below it on mobile. Preserve back-link rendering and its href. |

**10A tests:** add `tests/unit/vibe-sidebar.test.tsx` cases for desktop active
collection link, nested current-Vibe workflow link, and mobile disclosure. Do
not mock or alter the status endpoint contract.

#### 10B — `app/vibes/VibeList.tsx` list-table conversion

| File and current lines | Exact edit |
| --- | --- |
| `VibeList.tsx:55–73` | Keep every existing state value. Add only UI state needed for contextual empty-state actions (none if derived directly from `search` and `status`). Do not move list data into a global store. |
| `VibeList.tsx:75–131` | Keep URL synchronization, 275ms debounce, fetch URL parameters, abort controller, and successful empty-body fallback unchanged. Add no new endpoint or client-side filtering over incomplete pages. |
| `VibeList.tsx:140–148` | Keep `POST /api/vibes/bulk`, `{ vibeIds, action }`, confirmation, success message, and refresh token unchanged. Refactor only formatting if necessary. |
| `VibeList.tsx:154–161` | Replace bespoke `<header>` and dark Add New button with `VibePageHeader`. Pass title `All Vibes`, current description, and an outlined `/vibes/new` action. Place `VibeStatusViews` directly after this header, not inside the white table surface. |
| `VibeList.tsx:160` | Keep `STATUS_VIEWS.map`, counts, `activeValue`, `setStatus`, `setPage`, and `updateQuery`. Change only `VibeStatusViews` markup/classes so it renders compact text links/counts separated by borders or `|`. |
| `VibeList.tsx:163` | Change the surface to a low-chrome table wrapper (`border bg-white`, no large shadow/radius). Keep `aria-label="Vibe list"`. |
| `VibeList.tsx:162` | Keep top `VibeListToolbar`. After the table block at current line 204, render an equivalent bottom toolbar when `vibes.length > 0`; pass the same selected/action/busy callbacks and omit search there so it does not create a second search field. |
| `VibeList.tsx:168–175` | Keep loading/error branches. Replace the current simple empty paragraph with `<VibeListEmptyState search={search} status={status} onClearSearch={…} onClearStatus={…} />`. Clear handlers must call current setters and `updateQuery({ q: '', page: 1 })` or `updateQuery({ status: '', page: 1 })` without resetting unrelated sort/filter state. |
| `VibeList.tsx:178–203` | Keep native `<table>`, columns, checkbox behavior, sort buttons, current action links, and pagination math. Add table width classes and column-specific classes: checkbox `w-10`, status `w-32`, revision `w-36`, modified `w-36`; title remains flexible. |
| `VibeList.tsx:183–192` | Add `group` to each table row. Keep title, slug, and action hrefs. Update `VibeRowActions` to be muted at desktop idle and high-contrast under `group-hover`/`group-focus-within`; keep it always visible below `md`. |
| `VibeList.tsx:206–213` | Keep previous/next handlers and page boundaries. Place pagination after bottom toolbar; do not change `updateQuery` calls. |
| `VibeListToolbar.tsx:5–10` | Split the one-line component into readable JSX only. Preserve prop signature. Render select + Apply + selection count in both positions. Render the search input only when `position === 'top' && onSearchChange`; retain existing `w-48 pr-10` select fix. |
| `VibeStatusViews.tsx:4–7` | Keep callback signature. Use `<a>`-like button styling with `aria-current={activeValue === view.value ? 'page' : undefined}` rather than a tab role. Add count formatting in this component or pass preformatted labels from `VibeList`, but not both. |
| `VibeRowActions.tsx:5–6` | Keep action array and links. Replace one-line markup with `span`/`nav aria-label` markup; separate actions with small `·` separators and add visible focus styles. |

**10B tests:** retain query/toolbar/empty-response tests; add an empty-state
test for search, a status-filter reset test, and a bottom-toolbar test proving
it has no search input.

#### 10C — `app/vibes/new/page.tsx` identity-first authoring

| File and current lines | Exact edit |
| --- | --- |
| `new/page.tsx:25–57` | Keep all state, `toVibeSlug`, `isValidVibeSlug`, POST body, router push, error text, and `finally` behavior. Do not change preset IDs or creation schema. |
| `new/page.tsx:59–62` | Keep the outer canvas and `VibePageHeader`. Reduce canvas/card visual weight by changing the form from a prominent rounded/shadow card to an editorial-width form with only a thin border or no outer border. |
| `new/page.tsx:63–68` | Keep form `onSubmit` and `create()` call. Add `aria-describedby` to slug input only if a stable help/error ID is added. |
| `new/page.tsx:70–104` | Keep Title, Slug, and Description ordering. Add concise `id="vibe-slug-help"` to the explanatory span and reference it from the Slug input. Keep `pattern`, controlled values, and manual override behavior. |
| `new/page.tsx:105–145` | Replace the always-open `fieldset` with `<details>` closed by default. Its summary must read `Optional starter style`. Render the existing radios/preset state inside the details body; do not conditionally remove the radio inputs after a style is chosen. |
| `new/page.tsx:114–142` | Change each preset label from a large equal card to compact row layout: radio/swatch at left, name/note center, typography/layout metadata right on `sm+`. Preserve `focus-within` ring and all swatches. |
| `new/page.tsx:151–157` | Keep error alert and submit behavior. Make submit compact admin primary styling; retain exact label `Save draft and continue editing`. |

**10C tests:** assert Title is before optional starter summary, starter content is
not visible before opening, selecting a preset still includes the original
`preset` POST property, and invalid slug behavior remains unchanged.

#### 10D — `app/vibes/[vibeId]/edit/VibeEditor.tsx` editor canvas and rail

| File and current lines | Exact edit |
| --- | --- |
| `VibeEditor.tsx:50–84` | Keep status labels, workflow href, preview href, revision href, and conflict reload action. Split `PublishPanel` markup into small status/action sections only; do not change button/link destinations or `window.location.reload()` conflict recovery behavior. |
| `VibeEditor.tsx:87–104` | Keep state names, fetch URL, abort controller, loading state, and error behavior. Add only `settingsOpen` UI state, initialized `true` for desktop rendering; it must not persist to API/local storage. |
| `VibeEditor.tsx:123–163` | **Frozen boundary:** do not edit `saveDraft` logic, field normalization, PATCH URL, payload shape, `expectedVersion`, conflict branch, or success state behavior. |
| `VibeEditor.tsx:168` | Keep a single `<form ref={formRef}>`; do not move any existing editable control outside it. Retain the current dirty handler and submit handler. |
| `VibeEditor.tsx:169` | Extend `VibeEditorToolbar` props with `backHref`, `settingsOpen`, and `onToggleSettings`. Keep `onSave={() => formRef.current?.requestSubmit()}` exactly. |
| `VibeEditor.tsx:171–231` | Replace the current static two-column wrapper with `lg:grid lg:grid-cols-[minmax(0,1fr)_20rem]`. Main canvas remains first in source order. Render a settings-toggle button in toolbar; its `aria-expanded` reflects `settingsOpen`. |
| `VibeEditor.tsx:173–179` | Keep Metadata panel and all controls/names. It stays open by default and becomes the first main-canvas panel. |
| `VibeEditor.tsx:181–186` | Keep Taxonomy controls/names and open default. Do not move taxonomy into the rail. |
| `VibeEditor.tsx:188–196` | Keep Source details closed by default and all child controls mounted. Only tighten panel spacing/classes. |
| `VibeEditor.tsx:198–221` | Replace the single `visual-system` wrapper with three `VibePanel` wrappers: `colors` receives only color controls; `typography` receives only typography controls including `baseFontSize`; `layout` receives only layout controls. Preserve every field’s current `name`, `defaultValue`, validation pattern, help ID, and nesting within the form. Defaults: Colors open; Typography closed; Layout closed. |
| `VibeEditor.tsx:223–225` | Keep Jamie voice controls in a closed-by-default panel; do not rename names or payload keys. |
| `VibeEditor.tsx:226–230` | Render `PublishPanel` in the sticky desktop rail. On narrow widths, render rail before canvas using CSS order, not duplicate components. Hide only the secondary settings section when toggled; publish/status must stay mounted. |
| `VibeEditorToolbar.tsx:5–9` | Replace one-line JSX with a 48–56px toolbar containing Back link, editor label/title/save state, Preview, Settings toggle, and Save. Keep `dirty`, `conflict`, `saving`, `onSave`, and `previewHref` semantics. |
| `VibePanel.tsx:9–22` | Keep `open` state and `hidden={!open}` behavior. Add `aria-controls`, an `id` on child body, and compact header styles. Do not conditionally render `{open && children}`. |

**10D tests:** existing `vibe-editor-validation.test.tsx` must pass unchanged;
add tests that toggle every panel and then submit, verify all names remain in
`FormData`, verify the Settings button only affects secondary rail content, and
verify `conflict` does not display as dirty.

#### 10E — revisions, audit, and taxonomy

| File and current lines | Exact edit |
| --- | --- |
| `RevisionList.tsx:25–49` | Keep state, `loadRevisions`, GET URL, response fields, and error handling. If presentational ordering is needed, derive `orderedRevisions` after the null/empty guards; do not mutate `revisions` or API output. |
| `RevisionList.tsx:51–80` | Keep `window.prompt`, rollback POST URL/body, confirmation dialog, reload behavior, and error/success messages unless a separate approved reason-input component replaces the prompt. Rename functions only if all internal calls update together. |
| `RevisionList.tsx:85–132` | Keep table columns and action eligibility. Make row number/title primary; move author/date/parent/change summary into muted secondary blocks. Keep current published badge and only render Apply for `isCurrentPublished`. |
| `RevisionList.tsx:126–128` | Keep Compare/Republish/Apply hrefs and handlers exactly. Wrap them in `VibeRowActions` or equivalent compact action region; do not convert the actions into a menu requiring an extra click. |
| `audit/page.tsx:13–17` | Keep fetch URL and event state. Reformat the one-line JSX into named helper functions `formatAuditAction`, `groupEventsByDate`, and a normal return tree. Remove the duplicate workflow nav because sidebar context owns navigation. |
| `audit/page.tsx:17` | Replace each raw event card with a date-grouped compact row. Render IDs only inside `<details><summary>Technical details</summary>…</details>`; preserve actor, revision, site, and reason values. |
| `TaxonomyDirectory.tsx:12–34` | Keep fetch, `terms`, `counts`, query/group states, and abort behavior. Do not add mutations. |
| `TaxonomyDirectory.tsx:47–60` | Replace cards/directory rows with native table headings Term, Group, Used by. Keep `filtered` `useMemo` result and current search/filter inputs; tighten to list-table density. |

**10E tests:** add order test for current published revision, audit grouping/details
test, and taxonomy table/search/group filtering tests.

#### 10F — `app/vibes/[vibeId]/apply/page.tsx` operator preflight

| File and current lines | Exact edit |
| --- | --- |
| `apply/page.tsx:14–46` | Keep all state names, URL query initialization, `changeSiteId`, stale-response ref checks, and pointer reset logic. Do not add browser access to seed secrets. |
| `apply/page.tsx:49–80` | **Frozen boundary:** keep `checkPointer` URL, error behavior, `checkedSiteId`, and request race guard unchanged. |
| `apply/page.tsx:82–105` | **Frozen boundary:** keep apply POST URL/body, success refresh, busy state, and endpoint authorization behavior unchanged. |
| `apply/page.tsx:108–121` | Keep heading/back link but replace generic prose with selected-revision summary first. If `revisionNumber` exists, render it as read-only context before any input. |
| `apply/page.tsx:122–148` | Move disposable run-ID controls into `<details>` whose summary is `Use a disposable verification site`. Keep exact run-ID validation regex and `changeSiteId` call. |
| `apply/page.tsx:150–174` | Move manual Site ID field into a separate `<details>` titled `Enter a site ID manually`. Keep controlled input, pointer reset, and Check button behavior. |
| `apply/page.tsx:175–218` | Render current pointer, selected revision, and preflight context as a definition list with rows Vibe, Revision, Current pointer, New pointer, Site. Keep pointer data exactly as currently displayed. |
| `apply/page.tsx:236–242` | Keep Apply disabled expression and form guard. Do not allow submission before pointer check, selected revision, and exact `checkedSiteId` match. |
| `apply/page.tsx:244` | Keep `VibeApplyConfirmation` props and `onConfirm` behavior unchanged. |

**10F tests:** retain `vibe-apply-page.test.tsx` and add assertions that both
disclosures preserve the existing fields, pointer data remains cleared after
site change, and disabled Apply cannot open confirmation.

#### 10G — required exact cleanup/review pass

1. For every Vibe `.tsx` file changed above, format multiline JSX so review
   diffs show semantic structure; do not run a repository-wide formatter.
2. Replace only Vibes-screen `rounded-xl` plus `shadow-sm` combinations with
   compact `border bg-white` surfaces where listed above. Do not modify public
   site cards or other application areas.
3. At `390px`, `768px`, `1024px`, and `1440px`, verify: toolbar select has
   `w-48 pr-10`; table uses horizontal scroll; sidebar/menu has an operable
   control; no action disappears from keyboard order.
4. Run all Vibe unit files after each package and append actual command/result
   to the evidence block. Do not remove tests merely to satisfy this plan.
### Package 10G evidence — implementation pass (2026-09-01)

The implementation pass is complete on PR #75 (`codex/cms-vertical-slice-followup`):

- `49780cc2` — compact workspace shell and responsive Vibes navigation.
- `8fd4b969` — list-table header, status views, empty state, and bulk toolbar.
- `aefc1f74` — identity-first Add New Vibe form and optional starter styles.
- `17e5af34` — editor canvas/publishing rail split and visual settings panels.
- `6862ec31` — revision history information hierarchy and responsive columns.
- `33f90509` — shared Apply page header and denser application surface.
- `af71c095` — shared taxonomy header and compact directory cards.
- `8ea18ad2` — shared audit-history header and denser event rows.
- `f94a6808` — shared source-provenance header and responsive detail surface.
- `c5a83574` — shared Submit/Publish headers and dense lifecycle forms.
- `5036da68` — shared Status & Actions header and operational panels.
- `f6557ed7` — shared Compare header and dense diff surface.
- `0881f844` — explicit accessible label and button semantics for themed Preview.
- `1235c670` — editor Settings toggle for mounted secondary panels with `aria-expanded` state.

### Follow-up phase — normalized taxonomy data model

After PR #75 manual UI verification, evaluate a relational taxonomy model with
`taxonomies`, `terms`, and `term_relationships` tables. Preserve `Vibe.taxonomyTermIds`
as the compatibility read/write surface during migration. The follow-up must add unique
indexes for taxonomy/term slugs, a Vibe-plus-term uniqueness constraint, a backfill job
with dry-run counts, dual-read comparison telemetry, and an explicit rollback switch before
changing the editor or `/api/vibes/taxonomy` response. Do not begin this migration as part
of the current UI PR.

Focused verification passed: list empty response, list toolbar, page header, Add New Vibe,
and editor validation tests (13 tests total across focused runs). No API routes, request
payloads, lifecycle behavior, or persistence contracts changed. Remaining evidence is
manual: inspect 1440px/1024px/768px/390px viewports, keyboard-tab each workflow control,
and capture before/after screenshots for the seven surfaces listed in Package 10G.

Verification follow-up: all 18 explicitly discovered Vibes unit-test files pass (37 tests)
on the implementation branch. The wildcard shell pattern was not used because PowerShell
does not expand it for Vitest; the test files were enumerated explicitly.

## Extension, theme, and editable-content execution plan

This user-approved phase supersedes the earlier instruction to defer extension work until
after PR #75 manual verification. It does not change the existing Vibe publication contract.

This phase separates four responsibilities that must not be collapsed into Vibes:
Vibes provide design and voice tokens; themes provide templates and template parts;
pages own editable structured content; plugins contribute declared editor and runtime
extensions. Runtime installation on Vercel means activating code already bundled in a
deployment. Uploading and executing arbitrary packages is explicitly deferred.

### Package E0 — contracts and activation persistence (implemented)

- Define strict namespaced plugin and theme manifests with semantic versions.
- Add a duplicate-safe bundled extension catalog with ID lookups.
- Persist plugin activation/settings per tenant and site.
- Persist one active theme pointer per tenant and site.
- Keep the initial bundled catalog empty until a block has both editor and public renderers.

### Package E1 — structured pages and revisions

- Add `CmsPage` and immutable `CmsPageRevision` models.
- Store ordered versioned block JSON; do not store editor-generated HTML.
- Add draft, preview, publish, trash, and restore services using optimistic concurrency.
- Begin with `core/heading`, `core/paragraph`, `core/image`, and `core/button` schemas.

Implementation checkpoint: the four version-1 core block contracts, page draft contract,
`CmsPage`, and immutable `CmsPageRevision` persistence models are implemented. The page
lifecycle service now provides deterministic content hashing, page creation, optimistic
draft saves, authenticated draft-preview reads, immutable transactional publication,
published-revision reads, and reversible trash/restore transitions. Saving a new draft
does not clear the last published revision, so public readers remain isolated from edits.
Tenant and site scope are mandatory on every operation. Operator page routes are now
implemented below `/api/vibes/pages`: filtered list/create, detail/draft save, preview,
publish, trash, and restore. Every route uses the existing Vibe CMS access contract,
requires an explicit `siteId`, validates JSON before calling the domain service, and maps
stale draft versions to an actionable HTTP 409 response. The public renderer and its
published-page route remain part of E2 so no draft data can accidentally become public.

### Package E2 — block registry and public rendering

- Register each block schema, editor component, public renderer, and migration function.
- Reject unknown block types on save and render an operator-visible fallback in preview.
- Resolve request host to site, site to published page, active theme, active Vibe revision,
  and active plugin set before rendering.

Implementation checkpoint: the typed block registry and the first four core renderers are
implemented. Each definition owns its schema, display title, current version, migration
function, and semantic public renderer. Duplicate block types fail at catalog construction.
Invalid, unknown, or failed-migration blocks render an operator-visible warning in preview
but are omitted from public output. Image blocks now persist intrinsic dimensions so the
renderer can use optimized images without layout shift. The first-party `sunset/core` theme
now owns the default `sunset/page` template. A server-only composition service accepts the
authoritative tenant resolver, scopes every lookup to its tenant and site identity, pins the
published page revision, resolves the active Vibe, theme, and bundled plugins, and reports
missing or version-mismatched activations without exposing draft content. The public page
entry point and concrete theme template component are now implemented. The existing tenant
subdomain rewrite remains authoritative: previously unsupported single-segment tenant paths
such as `/about` now resolve through `tenant_domains`, load the pinned published page, and
render it with `sunset/page`. Existing tenant home and property-detail behavior remains
unchanged. A published page with the conventional `home` slug can now own the tenant root;
when it is absent, the existing agent landing page remains the fallback. The `properties`
namespace is explicitly reserved for the current listing experience. Nested CMS paths,
plugin-provided block merging, and final route-level integration coverage remain in E2.

E2 completion sequence from this checkpoint:

1. Share a request-memoized host/slug resolver between metadata and page rendering.
2. Generate CMS metadata from the same pinned revision used for visible content.
3. Add explicit hierarchical path persistence and collision validation before accepting
   nested page URLs; do not infer hierarchy by concatenating mutable titles.
4. Compose plugin block definitions from active bundled plugin manifests and reject a plugin
   activation when its declared renderer is unavailable.
5. Finish E2 with route-level tests proving draft isolation, legacy fallback, reserved-route
   precedence, and metadata/content revision agreement.

Steps 1 and 2 are implemented. The shared resolver uses React request memoization so
`generateMetadata` and the page Server Component reuse the same authoritative lookup.
Metadata title, description, canonical path, and Open Graph fields come from the immutable
published snapshot; an empty excerpt receives a deterministic site-aware fallback.

### Package E3 — page editor

- Add Pages, Add New, and reusable block-editor routes to the Vibes CMS shell.
- Support insertion, selection, movement, duplication, deletion, inline text editing,
  document settings, preview, save state, publishing, and revision recovery.

### Package E4 — themes and Appearance

- Register bundled theme templates and template parts.
- Add theme browsing, preview, and explicit per-site activation.
- Apply the active Vibe revision as global style tokens inside the active theme.

### Package E5 — installed plugins

- Add Installed, Active, and Inactive views backed by the bundled catalog and site records.
- Add activate/deactivate operations, plugin settings validation, and compatibility errors.
- Implement the first complete plugin only after its editor block, public renderer, settings,
  and deactivation fallback are tested together.

### Package E6 — first vertical extension

- Build a Contact Form plugin as the proof: editor block, public renderer, validated site
  settings, submission handler, activation UI, deactivation behavior, and tests.
- Prove editable heading/paragraph text and the plugin block on a controlled test site.

### Package E7 — later ecosystem boundary

- Add signed catalog metadata and remote-service integrations only after bundled plugins work.
- Do not dynamically import uploaded server code from database or writable storage.
