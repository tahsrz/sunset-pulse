# Explorer Search and Map Recovery

Prepared October 28, 2026. Branch: `codex/explorer-recovery`. Base: PR #89 at `36a138e6`. This is the next focused delivery after the marketing administration and Zod migration PRs.

## Source Findings and Changes

The public listing contract permits a listing without coordinates, while the property marker previously dereferenced coordinates unconditionally. Invalid or absent points are now omitted from map geometry and markers. Listings without coordinates remain available in the list, with a property link and an explicit location message.

Explorer previously issued competing initial and area-search requests, accepted malformed response objects as listings, and treated the search API's HTTP 200 unavailable envelope like a successful empty result. One typed read boundary now handles the existing list, detail and search shapes. It imports a pure public contract, without importing the database repository into the browser. Deep links and drawn selections are validated and encoded. Each new query aborts the old request and rejects late results even if a transport ignores the abort. Loading clears old results; empty, invalid and unavailable states have distinct messages. Retry Search repeats the current query.

The custom GeoJSON worker invented values, rents, yield and trend weights. It is removed. One pure builder processes at most 500 public records, includes only usable points and stable IDs, and projects only map fields. Sale asking prices and actual monthly rents stay separate. Missing amounts remain unknown. Listing density uses the count of returned listings, including cluster counts. Valuation markers remain separate from that density. The unused synthetic neighborhood fill is no longer mounted by Satellite.

The list sits outside a map-specific error boundary. Chunk import, renderer, Mapbox and asynchronous control errors have a map fallback and Retry Map action. Chunk retry issues another import instead of remounting a rejected lazy component. Retrying the map retains the current search and results. The route also has a generic recovery page. Controls and named draw listeners are removed on unmount or map failure; pending imports and callbacks check that their map is still mounted. Draw callbacks use the latest page callback after navigation. Clear Area also clears drawn geometry. Valid detail and coordinate deep links position the map using available coordinates.

Controls are positioned inside their map container rather than fixed to the viewport. Explicit E2E mode is required to use the browser fixture renderer; merely running a browser under automation no longer silently bypasses Mapbox. Fixture mode displays only supplied usable listings and never manufactures a missing detail record. The valuation hook now treats a non-array response as unavailable marker data rather than calling array methods on it.

## Verification

Follow-up: [production build and Explorer acceptance](./production-explorer-acceptance-2026-10-28.md) runs the fixture suite and actual Mapbox rendering under production CSP. It isolates the legacy routing bundle's template-evaluation failure and records live-map, retry, homepage/KCD and current-build baseline evidence. The original hosted exception is still not proven to have the same cause.

All 66 focused tests across seven suites passed. They cover the public API shapes, invalid input, missing coordinates, bounded geometry, price intent, stale responses, aborts, search retry, rejected chunk retry, renderer and asynchronous control failures, draw-listener cleanup, navigation callback freshness, and list survival. Existing listing-contract, discovery and read-surface suites are included as regressions. Map lifecycle checks render the real ExplorerMap component with a mocked Mapbox adapter; they do not verify a live WebGL renderer.

Next route type generation, full application TypeScript, focused ESLint on every changed TypeScript/TSX source and test, and `git diff --check` also passed.

The Playwright Explorer suite now uses controlled public responses and the current UI. It covers list rendering, radius queries, detail links, layer toggles, invalid links and search retry. It was rewritten but not run in this delivery. Its explicit fixture renderer is not evidence of working Mapbox tiles, WebGL or geographical positioning.

Verification commands from `apps/pulse`:

```powershell
node ../../node_modules/vitest/vitest.mjs run tests/unit/explorer-public-search.test.ts tests/unit/explorer-search-races.test.tsx tests/unit/explorer-recovery.test.tsx tests/unit/explorer-map-lifecycle.test.tsx tests/unit/listing-read-surfaces.test.ts tests/unit/listing-contract.test.ts tests/unit/listing-discovery.test.ts
node ../../node_modules/next/dist/bin/next typegen
node --max-old-space-size=6144 ../../node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
# ESLint was run on all changed TypeScript/TSX source, fixture and test files.
```

Final results are recorded in the PR description. No production build, deployed browser review, database mutation, migration, provider activation or scheduling change was performed. Pending hosted CI was not polled or awaited.

## Manual Acceptance Before Release

1. Use a normal browser with E2E mode disabled and a valid Mapbox token. Open `/explorer` at mobile and desktop widths. Confirm the controls stay inside the map and property links remain usable.
2. Open a real public property detail deep link and a latitude/longitude link. Confirm actual marker positioning, area requests and coordinates. A listing without coordinates must remain in the list without breaking the map.
3. Draw two different areas quickly. Confirm the second area's results win. Clear Area, then navigate to another Explorer URL and draw again. Confirm the current URL's selection handler receives the new area.
4. Toggle Listing Density, Satellite and Nearby Places. Nearby Places is available on the street map. Confirm density contains returned properties, with valuation markers separate, and no fabricated yield or trend numbers.
5. Block a map chunk or Mapbox request in browser developer tools. Confirm the list remains usable. Unblock it and click Retry Map. Confirm the current search remains selected. Independently fail the listing request, then verify Retry Search.
6. Open and close the map repeatedly and inspect workers, listeners and console errors. Record the exact browser stack if the earlier hosted crash recurs. The earlier crash has not been reproduced or identified from an exception trace; this source hardening must not be presented as proof of its root cause.

## Next Delivery

Implement the operator's content-publication readiness view. Publishing a real seller introduction and neighborhood photography still depends on approved content. Consultation booking remains conditional on confirming the real scheduling authority and reservation invariant. Reuse the existing scheduler and reminder infrastructure when that work begins.
