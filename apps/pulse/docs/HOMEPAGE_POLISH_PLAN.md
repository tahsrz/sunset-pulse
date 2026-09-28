# Homepage polish — screenshot-led implementation and acceptance

Updated September 26, 2026. Current local UI queue requested by Taz. Preserve the dark navy/teal palette, gradients, editorial display headings, animated atlas and existing destinations. Improve readability and layout rather than redesigning the brand. Implement sequentially, without subagents.

**Review continuation, September 27:** rendered Chromium 149 screenshots now exist locally at 1920, 1280, 768 and 390 CSS pixels, with no document-width overflow in the controlled unavailable-API/reduced-motion scenario. FAQ Enter-to-expand/collapse and hidden hero inertness assertions passed. Desktop/mobile overviews were inspected. The final page-error check exposed `globe.nodes is not iterable`: `AtlasGlobeBackground` accepted an error response as data. It now checks HTTP success and required canvas data before rendering; three regressions pass. The post-fix browser rerun could not start because Docker's Linux engine pipe was unavailable. **H1 is partial, not fully accepted**: successful listing cards, public two-action mode, normal motion, actual image failures/long text, non-home shared styles and the post-fix browser error-free run remain open. The initial homepage timeout was followed by a successful render when the harness supplied disposable Mongo for legacy config/listing reads.

Evidence: ignored `.pulse-local/platform-auth-acceptance/homepage-{1920,1280,768,390}.png`, `homepage-faq-keyboard.png` and `homepage-evidence.json`. The recorded JSON honestly retains the pre-fix browser error. These screenshots are not production/live-feed evidence. The current user explicitly authorized commit/push to PR #79; older “no PR action” notes below describe the earlier pass only.

**H2 progress, September 26:** the below-fold review now covers FAQ, InfoBoxes and ArchitectureOverview. FAQ answers no longer clip at a fixed height; controls expose expanded state, panel relationships, accessible voting names and mobile-sized targets. InfoBoxes and architecture spacing/body type now follow the homepage scale; ArchitectureOverview uses a second-level heading under the page hero. `SafePropertyImage` supports a distinct fallback description, and the homepage listing card announces when its photo is unavailable. The Property Search preview now counts returned `properties`, labels them as a sample, and shows unavailable/access-required states after failed responses instead of a normal listing count. Live-feed tab switching during a pending request and recovery after a failed refresh now have controlled component coverage. The Sunset history/Grill copy is now source-checked: documented town history is separated from the present-day Valero listing, unsupported Grill-origin/menu/legend claims were removed, and its artwork is labeled as an illustration. Focused ESLint passes, changed homepage/pagination files have no TypeScript diagnostics, all four homepage regression files pass (8 tests), and the new history-source test passes (1 test). The production build now passes; browser keyboard/long-answer and preview acceptance remain pending.

Paths are relative to `apps/pulse/`. Component/symbol names are edit anchors; resolve current line numbers before editing. No deployment, production data change, ingestion, provider activation or outbound messaging is authorized by this plan.

## Implementation mapped to the seven supplied screenshots

| Screenshot / issue | Local source changes | Remaining acceptance |
| --- | --- | --- |
| 1 — banner wrapping, oversized hero and serif body text | `app/page.tsx`, `app/home.module.css`, `context/ThemeProvider.tsx`, `tailwind.config.js`, `CinematicHero.tsx`, `hero/HeroOverlay.tsx`, `home/HomeDynamicSections.tsx`: responsive banner/actions, font fallbacks, display-heading preservation and shorter hero/loading layouts. | Desktop/mobile wrapping, configured branding fonts, keyboard use and hero toggle. Shared font changes require non-home spot-checks. |
| 2–3 — cramped map shortcuts, API labels, uneven columns | `hero/HeroNewsTabs.tsx`, `world/VirtualWorldHub.tsx`: normal-flow news and shortcuts, flexible scene container, user-facing endpoint context and selected-state accessibility. | Canvas sizing/interactivity and long labels. The failed property preview seen in screenshot 2 is not a repaired backend issue. |
| 3 — oversized benefit-card text | `marketing/ValuePropositionGrid.tsx`: smaller card titles, readable labels and tighter section gaps. | Long-title wrapping and narrow-screen balance. |
| 4 — animal spotlight boxes | `animals/AnimalOfDaySection.tsx`: responsive columns/padding, wrapping metadata/statuses and supported border-opacity class. | Long scientific names and missing-count states without clipping. |
| 5 — listing zeros, squeezed actions, unrelated repeated photos | `PropertyCard.tsx`: guarded numeric rendering, separate price/amenities/location/actions and legible disclaimer text. `app/api/idx/hot-moving/route.ts`: normalize usable remote photos; otherwise use `public/images/property-placeholder.svg`. | Actual image-error fallback, long address/city/brokerage text and touch targets. Visibility rules stay unchanged. |
| 5–6 — permanently loading feed label | `marketing/UnifiedPropertyStage.tsx`, `marketing/StageSwitcher.tsx`: abortable fetch, honest loading/error/empty/count states and no stale cards after failed refresh. | Tab changes during requests and controlled failed/empty responses. |
| 6–7 — long Grill story beside an empty column | `marketing/SunsetHistorySection.tsx`: introduction beside timeline, full-width landmark row, matching DOM/reading order, Atlas and sources below. | Desktop image crop, mobile stacking and long source text. Historical claims were not fact-checked in the visual pass. |

These are local source changes, not shipped or visually accepted work. User screenshots show the original issues, not after-change evidence.

## Recorded evidence — September 26

- Focused ESLint passed for changed homepage components, route, theme provider and regression tests.
- `tests/unit/homepage-mls-feed.test.ts` and `tests/unit/property-card-display.test.tsx`: **2 files, 4 tests passed**. Includes photo normalization/placeholder, private/internal exclusion, zero-rate display, price precedence, monthly rates and map/detail links.
- `tests/unit/safe-property-image.test.tsx` and `tests/unit/unified-property-stage.test.tsx` add fallback alt-text and feed-state coverage; together with the earlier files, all **4 homepage regression files / 8 tests pass**.
- Vitest initially failed to start its bundler under sandbox restrictions; an approved out-of-sandbox run passed. This is not browser acceptance.
- The initial full build type-check exposed an `updatedAt` type gap in the dirty `/api/idx/hot-moving` route. The route now types and safely serializes the cached timestamp, and the subsequent full Next production build passes type-check and generates all 260 static pages. It logs a non-fatal dynamic-server diagnostic for `/api/kepler/listings` during static generation. This does not replace browser acceptance.
- `git diff --check` passed during implementation.
- Initial browser attempt hit an approval-service authentication error; the user-requested retry returned `Browser is not available: iab`. No after-change screenshots or successful mobile/browser verification are claimed.
- No commit, push, PR mutation, deployment or migration was performed for this homepage pass.

## H1 — render and compare the implemented layout

1. Restore the supported browser connection and inspect any existing local server before starting another. Do not bypass denied browser actions through alternate automation surfaces.
2. Open `/` at the supplied desktop screenshot width, then 1280, 768 and 390 CSS pixels. Record viewport/browser and after-change evidence for all seven sections.
3. Check both two-action and authorized three-action `CounterScanActions` layouts with legitimate sessions; preserve the access check.
4. Check `CinematicHero`/`HeroNewsTabs` for overlap, hidden-action focus exclusion and reachable news. Verify reduced-motion behavior without removing 3D for everyone.
5. Check `VirtualWorldHub` canvas sizing, interactions and card wrapping. If flex sizing collapses or over-stretches the canvas, give the scene wrapper an explicit responsive height, not a fixed height for the entire section.
6. Fix only observed clipping/overflow in animal, benefit, listing and history cards. Preserve disclaimers and source uncertainty rather than hiding text for equal heights.
7. Spot-check `/properties` and a signed-in personal page because `PropertyCard`, `ThemeProvider` and Tailwind fallbacks are shared.

Exit: rendered desktop/mobile/keyboard evidence. If the browser stays unavailable, mark H1 pending and continue independent work; do not endlessly rewrite CSS without evidence.

## H2 — finish states and below-fold consistency

1. **Source/tests complete:** controlled component coverage now proves live-feed tab switching during a pending request and error recovery after a successful load. No ingestion or paid calls are used.
2. **Source change complete:** `SafePropertyImage` accepts an optional fallback description, and homepage listing cards announce the unavailable photo. Other consumers retain their existing accessible text unless they opt in. Browser acceptance of an actual failed-image event is still pending.
3. **Source repair complete:** Property Search preview counts returned `properties`, labels them as a sample, hides raw API errors and distinguishes unavailable from sign-in-required states. Browser reproduction against `/api/properties?page=1&pageSize=6` remains pending; check healthy, empty, 401 and 500 responses when browser access returns.
4. **Source review complete; rendered acceptance pending:** `InfoBoxes`, `marketing/FAQSection.tsx` and `architecture/ArchitectureOverview` now follow the established spacing/type scale. FAQ expanded state, control relationships, long answers and keyboard order still need browser acceptance when available.
5. **Source-backed content pass complete:** the Handbook of Texas supports the town-history details (Sam Smith's grocery, post office naming, the 1882 railroad, incorporation vote, population estimate and market-center institutions). Valero's location listing supports the current station name/address and listed fuel/quick-service amenities. Removed unsupported claims that the modern Grill originated as an oak-fired stop, served particular food/drink, had a generational historic lineage, or hosted named community legends. The photo alt now identifies the existing art as a stylized illustration. Source links are included in the section. `tests/unit/texas-place-history.test.ts` passes (1 test). This is not a verification of the live menu or independent confirmation from the business owner.
6. **Focused verification complete:** changed homepage lint and all four homepage regression files pass; the full Next production build now passes type-check/compilation/static generation. Rendered acceptance is still open; earlier platform CI does not certify this working tree.

Exit: honest states and no hidden content. Homepage acceptance still requires H1.

## H3 — return to the realtor product queue

Resume the [reconciled realtor actions](REALTOR_PLANNER_SCOREBOARD_PLAN.md#september-26-reconciled-next-actions). Do not rebuild existing refill, correction/void/realization, progress or structured Jamie proposal features. Keep their runtime acceptance separate from new feature work.

## Release boundary

Keep changes local until a distinct PR/release action is requested. Homepage polish does not establish realtor database readiness, operational pilot completion, real scan reconstruction, paid-provider readiness or email permission. Do not assign an overall completion percentage without a stable denominator and evidence for each gate.
