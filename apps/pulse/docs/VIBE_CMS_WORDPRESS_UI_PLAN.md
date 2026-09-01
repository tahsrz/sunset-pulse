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
| Restore | Existing guarded rollback behavior. | Confirmation copy must say it creates a new published revision from the selected snapshot and does not apply it to a site. |
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
- Slug is a primary identity field. Show a live non-authoritative permalink
  preview, then validate again on the server when saved.
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

- Browser-facing navigation uses the Vibe title first, then the slug/permalink
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
| Slug | “The URL-safe name, for example `coastal-modern`.” | Under the slug field | “Must match the requested format” alone |
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
| Revision page exposes state but raw revision context dominates. | It takes extra work to identify live versus historical revision. | Status-first row hierarchy, readable metadata, explicit restore outcome. | `RevisionList.tsx` lines 86 onward | Apply only current published revision; restore endpoint behavior. |
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
│ ADD NEW       │ /vibes/coastal-modern                      │ Published revision   │
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
│   ├── back link / current title / permalink
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
4. Vibe slugs are editorial identifiers/permalink context, not DNS labels and
   not a substitute for tenant identity.
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

If a proposed named test file has not yet been created, omit it rather than
making the command fail artificially. Browser checks come after the relevant
focused unit tests; they do not replace them.

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
- [ ] Put title, slug, help, permalink preview, description, and submit before
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
- [ ] Replace the current header with title, permalink context, saved/unsaved
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
3. Render fields in this order: Title → Slug → permalink preview → Description
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
**Edit Vibe**. Render a secondary `/vibes/${draft.slug || vibe.vibeId}`
permalink context only; do not change route identity.

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
export const VIBE_LIST_STATUSES = ['', 'draft', 'in_review', 'published', 'archived', 'trashed'] as const;
export const VIBE_LIST_SORTS = ['updatedAt', 'title', 'createdAt'] as const;
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
  Dialog copy must say: “Create a new published revision from this snapshot. It
  will not apply it to any site.”
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
