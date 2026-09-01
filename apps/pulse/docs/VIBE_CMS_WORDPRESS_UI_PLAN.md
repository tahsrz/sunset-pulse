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
| Restore | Existing guarded restore behavior. | Confirmation copy must say it restores into the editable draft and does not apply/publish a site. |
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
| Restore revision | confirmation dialog | “Restore to editable draft; this will not publish or apply it.” |
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
| Revisions | No global primary action | Compare, Restore draft, Apply current published revision | Restore/publish for a non-current revision |
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
| Restore | “Copies this revision into the editable draft.” | Restore dialog | “Rollback” without explanation |
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
4. Editor can compare history or restore an earlier revision to the draft after
   an explicit confirmation.

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
| Restore revision | Revision-row dialog | Disable confirm; keep selected revision context | Reload revision list; success notice | Keep dialog error or return focus to trigger with notice |
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
