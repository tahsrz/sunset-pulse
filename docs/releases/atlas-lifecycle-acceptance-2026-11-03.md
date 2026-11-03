# Atlas Recovery and Lifecycle Acceptance

Branch: `codex/atlas-lifecycle-acceptance`, stacked on [PR #98](https://github.com/tahsrz/sunset-pulse/pull/98) at `2816bc53`. This delivery follows the existing release plan's Atlas lifecycle checks. It does not activate a provider, change a hosted flag, apply a migration or deploy the application.

## Defects Reproduced and Fixed

The homepage's module-level `React.lazy` component retained a rejected import. After a controlled failure of the actual production Atlas chunk, restoring network access and closing/reopening Atlas still showed the error. Each explicit launch or retry now creates a new lazy attempt and remounts the error boundary. The loader remains deferred until launch; ordinary renders do not reset the active component. A late import resolution after closing cannot reopen Atlas.

The error surface adds **Retry Atlas View** and retains its separate `/atlas` link. Closing returns keyboard focus to **Open Atlas View**. The existing Close and Hide Interface controls overlapped across the entire 40-by-40-pixel Hide target on mobile. Close now occupies the opposite corner, with browser checks for separate hit areas at 390px and 1440px.

## Local Reproduction

Use a checkout without runtime `.env` files. The existing production runner refuses those files and constructs a child environment with loopback databases, non-working provider placeholders and mock/auth fixtures disabled. It starts its own localhost production server and an empty disposable Mongo service, then removes those resources. Docker and installed Playwright Chromium are required.

From the repository root:

```powershell
node apps/pulse/scripts/production-build-acceptance.mjs
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Taz/AppData/Local/ms-playwright'
npm run test:atlas:release --workspace=apps/pulse
```

On another machine, use its Chromium cache. Always rebuild after changing application source before running browser-only acceptance. The Atlas suite uses the real local `/api/tah/atlas/globe` response and a 2D canvas, so it needs no Mapbox key. This build omits that key; it does not replace PR #98's separately recorded real-Mapbox verification. News is deliberately returned as unavailable during these checks, preventing unrelated external-news reads. Supabase is intentionally unavailable. No local production credentials are loaded.

The existing runner accepts `--atlas-only` with `--browser-only`, and optional `--grep` selects one check. Atlas-only rejects fixture-only mode. Output stays in ignored `.pulse-local/production-acceptance/` directories; canvas PNGs and JSON measurements are local review evidence, not public property assets.

## Acceptance Scope

Five production Chromium cases cover four open/close cycles at alternating 390px/1440px widths in normal and reduced-motion modes, temporary chunk failure recovered by reopen or explicit retry, and cancellation of an unfinished globe read. The lifecycle cases verify deferred chunk loading, actual painted canvas pixels, non-overlapping controls, Hide/Show operation, restored focus, removed canvas, returned animation/listener counts and no dedicated workers or page exceptions.

The browser instrumentation counts pending native animation callbacks and reduced-motion listeners without changing their timing. CDP collects post-close DOM/listener/heap diagnostics after garbage collection. Stable listener counts across four cycles support this bounded lifecycle check; they do not prove the absence of every possible memory leak. The current homepage uses `AtlasGlobeCanvas`, not the separate Three.js scene. No unused scene or worker architecture was changed.

The paint budget is 30 seconds in software-rendered Chromium. An earlier five-second probe timed out even though subsequent diagnostics found a rendered globe, a live canvas context and no page exception. Full-document captures also proved unsuitable for this measurement. The suite instead saves actual canvas PNGs after recording click-to-painted-center timing. That timing includes automation, application/data loading and readback overhead; it is not a hosted performance target or a before/after improvement claim.

## Results

The optimized build passed with mock mode disabled in 206 seconds. All five production browser cases passed in 4.1 minutes; the full server phase took 259 seconds. The runner stopped its server and removed its generated Mongo fixtures. The launcher, existing motion behavior and background read tests passed: 10 tests across three suites.

| Motion | Widths in order | Click-to-painted-center seconds | Post-close listeners | Post-close DOM nodes |
| --- | --- | --- | --- | --- |
| Normal | 390, 1440, 390, 1440 | 4.95, 26.05, 8.93, 28.30 | 375 each cycle | 779 each cycle |
| Reduced | 390, 1440, 390, 1440 | 2.19, 2.32, 1.56, 1.71 | 393 each cycle | 1,234 each cycle |

Each close returned pending animation callbacks and tracked motion listeners to zero. Both modes finished with no page exceptions or remaining canvas, and no dedicated workers remained at any sampled close. Post-GC heap readings ranged from 6.64 to 7.26 MiB in the normal run and 7.18 to 7.39 MiB in the reduced run. These are diagnostics from four cycles, not a memory guarantee. Full TypeScript validation, focused ESLint, Node syntax and whitespace checks passed.

The normal-mode desktop timings are slow. This machine used software rendering and canvas readback, and static validation also ran during part of the acceptance phase. Treat these measurements as functional diagnostic evidence, not a controlled performance benchmark. Performance acceptance remains open. In particular, these results do not establish a user-facing improvement over PR #98 or normal production response times.

## Remaining Release Work

Keep PR #98's Explorer results separate from this Atlas run. A same-profile performance comparison, original hosted exception trace if it recurs, approved publication assets, deployed non-production acceptance, operator publication walkthrough and human/physical-device review remain open. Pending hosted CI is not polled by this delivery.
