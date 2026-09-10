# Homepage and theme expansion — Luna execution plan

Planning baseline: September 10, 2026. Status: proposed implementation, no application
changes made by this planning task. This document expands E4 in
`VIBE_CMS_WORDPRESS_UI_PLAN.md`; it does not supersede existing publication contracts.

## 1. Outcome and scope

Deliver a coherent public homepage, two useful bundled themes, actual theme previews,
and a practical path for an operator to build a tenant homepage with the CMS. Treat the
main `sunsetpulse.app/` homepage and tenant subdomain homepages as separate surfaces.
The main homepage is a platform entry point. Tenant homepages represent individual sites.

Planning assumption: “homepage” includes the main public homepage, with tenant homepage
editing included because it is the natural continuation of the themes work. Implementation
should begin with the existing E4 slice, then the main homepage. Do not silently replace
the main homepage with one tenant's database document.

Keep the product's local North Texas identity, explorer, property discovery, food ordering,
and Jamie paths recognizable. Preserve access to existing features when changing prominence.
The dashboard may use familiar editorial management patterns; the public page should have
its own Sunset Pulse identity.

Estimated effort: 42–62 engineering hours, including editable content storage, live preview,
focused tests, and visual checks. This replaces the earlier 26–38 hour estimate.
This is an estimate, not a completion promise. Record actual outcomes at each package.

## 2. Evidence from the current implementation

| File / anchor | Current behavior | Planned action |
| --- | --- | --- |
| `app/page.tsx`, `HomePage` | Scan actions, hero, world hub, value grid, animal feature, listings, history, info boxes, FAQ, architecture | Recompose into a clear visitor journey |
| `app/page.tsx`, `CounterScanActions` | Large first section with its own h1 and operator-dependent minimum width | Replace with a compact utility strip; retain destinations and operator visibility |
| `app/page.tsx`, `StagedPropertiesPocket` | Fetches ten listings and JSON round-trips the result | Preserve source initially; inspect the receiving contract before replacing serialization |
| `components/home/HomeDynamicSections.tsx` | Hero and world hub both use `ssr: false`; initial hero says “Initializing Hero...” | Put essential heading/copy/actions in server-rendered markup; defer optional experience |
| `app/layout.tsx` | Shared navigation, footer, providers, widgets, global CSS and market elements | Inspect actual inclusion rules; avoid duplicating shared chrome on the new homepage |
| `lib/navigation/focusedSurfaces.ts` | Prefix-based shell policy | Add a precise preview rule only after confirming how pathname reaches layout |
| `lib/cms/pages/publicPath.ts`, `cmsSlugForTenantPath` | Tenant root maps to `home`; `properties` is reserved | Keep this established homepage convention |
| `lib/cms/pages/publicPageResolver.ts` | Published CMS page resolution with legacy fallback | Preserve fallback while adding homepage tools |
| `lib/cms/themes/runtimeRegistry.tsx` | One theme runtime and fixed part references | Implement the E4 registry/preview plan first |
| `app/vibes/appearance/ThemeDirectory.tsx` | Decorative catalog cards and activation | Add actual published-page preview and robust scope state |

Use the named functions and JSX anchors above when editing. Line numbers drift between
commits; before each package, record fresh line references in its completion note. Do not
perform a blind line-number replacement against this planning baseline.

## 3. Visitor journey and final homepage structure

Proposed order, top to bottom:

1. Existing global navigation, with a compact utility strip beneath it.
2. One hero: clear headline, short explanation, primary Explorer action, secondary Properties action.
3. Four destination cards: Explore places, Find homes, Order food, Ask Jamie.
4. Curated property section, streamed independently.
5. A concise local story section that establishes place and purpose.
6. Optional interactive world preview, activated by the visitor.
7. Short FAQ answering practical questions.
8. Closing Explorer/Properties actions and the existing footer.

Draft headline: “Find your next place in North Texas.” Supporting copy should explain
the available tools in one sentence without claiming inventory freshness, coverage,
market statistics, or response times that are not established by the data.

Food ordering remains a visible one-click action in both the utility strip and destination
cards. The research desk link remains visible under the existing operator access result.
Do not remove the existing destination or broaden its visibility during this UI work.

Move the animal feature, extended architecture explanation, and long history treatment
out of the primary journey only after identifying an appropriate existing destination or
retaining a compact expandable version. Record a destination for every removed section.
Do not delete their component files simply because the homepage no longer imports them.

## 4. Visual specification

- Canvas: warm off-white content surfaces, dark ink text, restrained sunset amber accents,
  with a dark hero or photographic panel where it supports readability.
- Layout: maximum content width approximately 1200px; 20px mobile gutters; 32px desktop gutters.
- Hero: readable text column around 36rem; desktop composition may pair text and imagery;
  mobile stacks content naturally. Avoid a mandatory viewport-height hero.
- Typography: reuse installed fonts; one h1, approximately 40–64px responsive; section headings
  approximately 28–40px; normal body copy at least 16px with comfortable line height.
- Buttons: primary filled, secondary outlined; text should describe the destination. Avoid
  all-uppercase long labels and excessive tracking. Aim for at least 44px touch targets.
- Cards: consistent radius, modest border, restrained shadow. A card has one primary link;
  avoid nested clickable containers and repeated ambiguous “Learn more” labels.
- Motion: optional decorative enhancement; respect reduced-motion preferences. Every key
  destination must remain usable before client hydration.
- Images: use repository-owned assets or approved listing imagery; reserve dimensions, supply
  appropriate alt text, and do not fetch new imagery until the asset inventory is understood.
- Keep homepage styles scoped. Shared admin controls and unrelated route typography should
  not change as a side effect of modifying `globals.css`.

## 5. Package H0 — baseline and content inventory (1–2 hours)

1. Inspect `components/CinematicHero`, `components/world/VirtualWorldHub`, Navbar, Footer,
   and every component imported by `app/page.tsx`; resolve actual filenames using `rg --files`.
2. Make a compact inventory of current headings, destinations, data fetches, media, and client
   dependencies. Identify which imports are used elsewhere before editing shared components.
3. Capture current desktop/mobile views if a local browser environment is available. Record
   viewport, route, login state, and any missing data. Do not present a fixture as production evidence.
4. Verify exact existing Jamie destination from source; do not invent `/ask-jamie` or another route.
5. Add a homepage content map with keep/move/replace decisions to this document before implementation.

Acceptance: each visible feature has a destination, the hero's current behavior is understood,
and there is a reproducible visual baseline. Existing unrelated local files stay untouched.

## 6. Package E4 completion — themes and preview (5–7 hours)

Execute the six steps already specified under “E4 next slice” in the baseline plan:
second theme, manifest-driven parts, read-only context, server-rendered preview, operator
controls, and verification. These are prerequisites for tenant homepage previews.

Add two clarifications to execution:

- The preview route's placement must be selected after inspecting shared layout behavior.
  A new route group cannot erase an ancestor layout. Reuse focused-surface conventions only
  with exact route matching so adjacent CMS screens retain their shell.
- The core and editorial designs must differ in layout and type treatment while honoring
  the same active Vibe. A color-only difference is not enough to demonstrate theme selection.

Acceptance: previewing either theme changes no database pointers; activating a theme changes
only the existing site theme authority; existing snapshots render under the new theme fallback.

## 7. Package H1 — homepage composition and content model (2–3 hours)

1. Implement the editable content contract in section 15 first. A `homeContent.ts` module may
   provide migration/starter defaults, but published visitor copy must come from the CMS.
   Do not leave production headings or action labels hard-coded after migration.
2. Add `components/home/HomeSection.tsx` with optional eyebrow, heading, description, children,
   and a bounded width treatment. Keep its API specific to homepage composition.
3. Add `components/home/HomeUtilityBar.tsx`. Move the existing `/grill`, `/explorer`, and
   operator research desk actions into it. Pass the existing `access.allowed` result from the
   server; avoid adding a second authentication request in a client component.
4. Restructure `app/page.tsx` as the orchestration layer: server access read, section composition,
   and independent Suspense boundary for listings. Remove the inline `CounterScanActions` only
   after the replacement exposes all three destinations with the same visibility rules.
5. Make the overall page expose one main landmark, accounting for any inherited layout markup.
   Keep section headings under one h1. Do not add a duplicate Navbar or Footer.

Acceptance: the page has a clear structure and all established entry points still work.

## 8. Package H2 — server-rendered hero and navigation cards (3–4 hours)

1. Add `components/home/HomeLandingHero.tsx` as a server-compatible component. Render the
   headline, explanation, links, and image directly; no loading gate around essential content.
2. Replace `<HomeHero />` in `app/page.tsx` with this component. Keep `CinematicHero` available
   for other consumers. Do not change its shared implementation solely to redesign this page.
3. Choose an existing image after inventory. If none is appropriate, ship a deliberate graphic
   treatment using CSS and text; do not substitute a broken URL or unlicensed screenshot.
4. Add `HomeDestinationGrid.tsx` from typed data: label, explanation, href, icon. Explorer and
   properties lead; grill and Jamie remain prominent. Confirm destination routes before linking.
5. Test layout with 320px width and 200% text zoom. Avoid fixed minimum-width action groups.

Acceptance: meaningful content renders without JavaScript, main actions appear early on mobile,
and every card uses a valid destination with a visible keyboard focus state.

## 9. Package H3 — listings and supporting content (3–4 hours)

1. Keep `getTourHotList()` as the listing source. Inspect `UnifiedPropertyStage` before choosing
   between reusing its presentation and adding `HomePropertyHighlights.tsx` for this surface.
2. If a new component is required, create a typed serializable projection of the fields it uses;
   preserve listing URL rules, price formatting, and existing image validity helpers.
3. Show a bounded selection (target six listings). Confirm that reducing the query limit does
   not remove a behavior relied on by the reused stage. Keep skeleton dimensions close to the result.
4. Handle empty results with an honest message and link to Properties. Handle source failure
   within the listings section so the hero and primary navigation remain available.
5. Rework the local story using existing history content; do not invent testimonials, figures,
   or claims. Prefer one image/text pairing and a clear destination for extended material.
6. Reduce FAQ to practical visitor questions supported by current product behavior. Preserve
   accessible expand/collapse semantics. Use ordinary links in the final call to action.

Acceptance: empty/failed listing data never leaves an endless loader or broken card; the page
remains useful independently of optional data sections.

## 10. Package H4 — optional world experience and performance (2–3 hours)

1. Replace unconditional `<HomeWorldHub />` with a small client boundary,
   `HomeWorldExperience.tsx`, containing a server-visible introduction and an explicit
   “Open interactive view” action. Load the heavy world module after that action.
2. Reserve the interactive area's dimensions and provide close/retry states. An error in the
   optional module must not replace the full homepage with an error screen.
3. Inspect `HomeDynamicSections.tsx` usages before deleting any exports. Retain shared consumers.
4. Compare before/after loading with the same viewport and fixture. Record actual asset/network
   differences; aim to eliminate the initial cinematic/world JavaScript from the critical path.
5. Verify reduced motion, keyboard entry/exit, and touch behavior. Ensure the ordinary Explorer
   link remains visible when the experience is closed or unavailable.

Acceptance: visitors can use all homepage navigation without loading the world experience.

## 11. Package H5 — tenant homepage workflow (4–6 hours)

1. Keep the `home` route convention in `publicPath.ts`. Add a Homepage label to the CMS Pages
   directory row whose routePath is `home`, and an “Edit homepage” action when it exists.
2. If no homepage exists, expose “Create homepage” using the existing page creation API with
   slug `home`. Do not auto-create a page when opening Appearance or a preview.
3. Locate existing page directory/editor components before editing; extend their existing
   creation and navigation handlers. Carry site and tenant scope on every link and request.
4. Handle an existing draft or trashed homepage explicitly. Offer its existing edit/restore
   path; do not create a duplicate or implicitly replace a published page.
5. Offer a starter arrangement using only the four supported core blocks: heading, paragraph,
   image, button. Mark starter insertion as an unsaved local edit. Never publish it automatically.
6. Add a homepage-specific template only if the generic page template cannot provide the
   intended composition. Register it per theme and test fallback for pages created beforehand.
7. Reuse E4 preview with the homepage selected. Explain when no published homepage exists.
8. Keep legacy tenant rendering available when the CMS resolver returns its existing fallback.
   Retain reserved property routes and Jamie's special route handling.

Acceptance: an operator can create/edit, save, preview, and publish a homepage through the
existing lifecycle, then switch themes without rewriting the homepage snapshot.

## 12. Package H6 — final verification and handoff (3–4 hours)

Verify behavior, not CSS implementation details:

- Main homepage: one h1, functional key destinations, correct operator link visibility,
  listing empty/failure recovery, server-visible hero, and deferred interactive loading.
- Theme flow: same content in two themes, preview causes no writes, explicit activation,
  switching site while requests are in flight, and unavailable published-page messaging.
- Tenant homepage: create existing/missing/trash cases, draft versus published content,
  reserved properties path, and legacy fallback.
- Visual checks: desktop, tablet, narrow phone, long copy, text zoom, reduced motion,
  keyboard navigation, and no duplicate global header/footer in preview.
- Metadata: review homepage title/description and canonical behavior in `app/page.tsx` and
  `app/layout.tsx`; use route-specific metadata where needed and preserve tenant metadata behavior.

Run focused existing tests around changed behavior, then add only the missing behavioral
coverage. Record existing unrelated failures separately; do not delete tests to claim success.
Do not declare visual verification complete based on unit tests alone.

Update the README with what visitors and operators can actually do. Add screenshots or
an explicit visual-verification gap to the handoff. Keep screenshots out of unrelated source
directories. A completion note must include changed files, tests, remaining limitations,
and any manual steps; it must not call planned items implemented.

## 13. Commit boundaries and execution order

Recommended sequence: H0 → E4 completion → C1/C2/C3 in section 15 → H1 → H2 → H3 → H4 → H5 → H6.
Use separate reviewable commits for theme rendering, preview behavior, main homepage
composition, supporting content, deferred world loading, and tenant homepage workflow.
Follow the current branch/PR instructions at execution time; this document does not authorize
merging or production content changes. Avoid sweeping formatting across unrelated files.

No new plugin marketplace, arbitrary code upload, billing flow, domain provisioning, data
provider migration, or global application redesign is needed for this deliverable.

## 14. Completion ledger

| Package | Status | Evidence needed |
| --- | --- | --- |
| H0 inventory | Planned | Content destinations, route map, visual baseline |
| E4 theme/preview | Planned | Two runtimes, real preview, activation tests |
| H1 composition | Planned | Updated orchestration and utility strip |
| H2 hero/cards | Planned | Server markup and responsive navigation |
| H3 supporting content | Planned | Listing failure/empty evidence and content review |
| H4 world/performance | Planned | Deferred loading and comparable measurements |
| H5 tenant homepages | Planned | Existing lifecycle and scope behavior |
| H6 verification | Planned | Focused tests, visual evidence, README/handoff |

Update each row only after its acceptance criteria are met. The plan is ready for
implementation under the user's requested direction; code has not changed here.

## 15. Required amendment — all authored text editable, real-time draft preview

User requirement: all text must be editable and previews must update in real time.
This section overrides earlier suggestions to ship static homepage copy or rely solely on
published-page previews. E4's published-content preview remains useful for theme comparison;
the editor additionally needs a live preview of unsaved changes.

### Content ownership and editable surface

Every piece of authored visitor-facing copy on the redesigned main homepage and tenant
homepages needs an editor field: utility text, site name/tagline, navigation labels, hero,
eyebrows, headings, paragraphs, card titles/descriptions, button labels, image alt/caption,
listing-section introduction and empty/error messages, story copy, interactive-view prompts,
FAQ questions/answers, closing actions, footer links/text, and page SEO title/description.
Include screen-reader-only authored labels and meaningful image descriptions.

Listing prices, property facts, generated status values, and account-specific names remain
derived from their existing authorities. Edit surrounding labels in the CMS; do not silently
overwrite MLS/property records through the homepage editor. Existing legal notices retain
their current ownership and editing rules. Inventory these exceptions explicitly and link
to their source editor where one exists rather than presenting a fake editable field.

Application management UI strings are outside the public-page content model. Navigation and
footer edits require explicit scope: page-specific override versus site-wide content. Show
'Used across this site' before editing shared text; do not change all sites from one draft.

### C1 — content schema, scope, and migration (5–8 hours)

1. Extend `lib/cms/pages/pageSchema.ts` with structured homepage sections. Prefer typed
   section blocks with stable IDs for hero, destinations, FAQ, story, and closing actions;
   retain existing core blocks. Specify bounds and defaults for each user-editable field.
2. Extend the block registry and editor together. Do not persist new block types that the
   editor or public renderer cannot understand. Inspect schema-version migration before
   changing discriminated unions; preserve existing four-block snapshots without conversion.
3. Add page metadata fields with backward-compatible defaults for old snapshots. Map them
   in `metadataForCmsPage()` while preserving existing fallback title/description rules.
4. Resolve an explicit platform-owned site scope for the main homepage from existing site
   identity configuration. If none exists, define an idempotent provisioning/migration command
   for a dedicated platform site; do not reuse an arbitrary tenant or invent its production ID.
5. Move homepage-specific content into that scope's CMS page. Seed existing copy into an
   unpublished draft via an explicit operator operation. Preview and publish through the
   established lifecycle. The old homepage is the initial fallback until a valid published
   replacement exists; migration must not silently activate content.
6. Inspect existing shared navigation/footer storage. Reuse it if it supports scoped revisions.
   Otherwise specify a small site-content revision model for shared copy, with draft version,
   immutable published snapshot, and published pointer. Pin the selected shared revision in
   preview context. Avoid duplicating shared copy into every page and presenting it as global.
7. Create an editable-copy inventory mapping visible strings to schema paths and editor fields.
   Completion requires every authored string to have an owner, editable location, and preview.

### C2 — shared rendering and real-time preview transport (5–8 hours)

1. Extract pure theme/block presentation from database readers. The same presentation functions
   must serve the public page, server-rendered theme preview, and live editor canvas.
2. Define a serializable preview input: page draft, selected theme ID, resolved Vibe variables,
   shared header/footer draft, and read-only listing data. Do not serialize registry functions,
   database documents, or server credentials to the browser.
3. Keep live preview isolated in an iframe using the same CSS assets and presentation modules
   as public rendering. Supply a client-only bundled registry of presentation components;
   keep database, filesystem, activation, and server service imports out of that bundle.
4. Implement an initial ready handshake and a monotonically increasing update sequence between
   editor and frame. Restrict messages to the expected window and origin. On ready/reload, send
   the newest complete preview state; discard stale updates. These are transport correctness
   requirements, not a separate security-audit project.
5. Update preview from local editor state immediately after each keystroke/field change.
   No Save, Publish, iframe reload, or server fetch should be needed for a normal text edit.
   Coalesce visual updates at most once per animation frame. Target visible updates within
   100ms under the normal test fixture; measure rather than promise this for arbitrary devices.
6. Theme, viewport, colors, and shared copy changes also update the local preview. Do not
   activate a theme when selecting it for preview. Pause media and suppress forms/navigation
   that would execute real actions from the editing frame.
7. Keep invalid intermediate input visible in its editor field. Render a safe last-valid
   preview for that field with a clear validation hint; never silently discard typed text.
8. Reuse one bounded listing snapshot while editing. Typing must cause zero property queries;
   an explicit refresh can reload dynamic content independently.

### C3 — editor experience and persistence (6–8 hours)

1. Add an Edit/Preview split workspace with desktop, tablet, and phone widths, a full-preview
   toggle, and persistent Save draft/Publish controls. On narrow screens use edit/preview tabs
   that preserve the same local state rather than mounting a fresh draft on every switch.
2. Make text in the canvas selectable for editing. Clicking a rendered heading/button/FAQ
   opens and focuses its corresponding field. Use plain-text inputs or the existing structured
   text approach; do not introduce arbitrary raw HTML editing to make text appear editable.
3. Add dedicated controls for shared navigation/footer and metadata. Shared edits display
   their site scope and have an explicit save/publication boundary.
4. Keep current optimistic version checks. Save persists the local draft; publish uses the
   confirmed saved version. On conflict preserve typed changes and show reload/reconcile choices.
5. Autosave is optional for this slice; real-time preview is mandatory. If autosave is added,
   debounce persistence separately from rendering, serialize saves, and update expectedVersion
   only from successful responses. Never POST on every keystroke.
6. Add undo/redo for local text and section edits with bounded history. Mark unsaved changes,
   retain local state on failed saves, and warn before leaving a dirty editing session using
   the existing navigation convention.
7. Clearly label previews 'Unsaved draft' or 'Saved draft' as appropriate. Public visitors
   continue seeing the published revision until explicit publication completes.

### Additional acceptance tests and completion criteria

- Change every category of authored text in the inventory and observe the preview without saving.
- The exact changed copy survives Save/reload and appears publicly only after Publish.
- Rapid typing, switching themes, and resizing do not reset selection or restore older content.
- Reloading the frame restores the newest unsaved draft through the ready handshake.
- A failed save/conflict leaves local text and live preview intact.
- Draft preview uses the same block/theme presentation as published rendering, including
  shared parts and dynamic-content layout; compare screenshots with identical inputs.
- No per-keystroke database traffic. No activation or publication request from preview selection.
- Verify both the platform homepage scope and a controlled tenant scope without cross-site edits.
- Audit the final rendered authored strings against the editable-copy inventory before marking done.

Add C1, C2, and C3 to the completion ledger as Planned. H1 cannot be marked complete until
its production content is backed by these contracts. An editable hero alone does not meet
the all-text requirement.
