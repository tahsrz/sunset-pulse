# Production Build and Explorer Acceptance

Branch: `codex/production-explorer-acceptance`, based on PR #97 at `599d480c`. This delivery verifies the optimized application locally and separates controlled listing/fixture tests from actual Mapbox rendering.

## Failure Found in the Production Browser

The real map fetched its style and tiles successfully, then entered the map fallback. Redacted diagnostics identified a CSP exception while the legacy Directions bundle initialized: string evaluation requires `unsafe-eval`, which the production policy does not allow. The package compiles Lodash templates at runtime. Development permits evaluation, and fixture maps never execute the real control, so those checks did not expose this failure.

Explorer previously imported drawing and directions together during every map load. It now initializes drawing independently. The legacy property-search routing control loads only for an explicit selected routing destination. A routing error leaves the map and list available and offers **Open driving directions** for that destination. The external link contains validated destination coordinates and does not embed the visitor's location. Pending imports and geolocation callbacks check that their route/map is still active; cleanup removes the routing control separately.

The production CSP is unchanged. A browser assertion checks that the response does not permit `unsafe-eval`. In-map directions still depend on a legacy package that is incompatible with this policy; the external link is its recovery path. This is evidence for the reproduced local failure, not proof that it caused the earlier unidentified hosted crash.

Map failure diagnostics include only a bounded message, redact access keys/tokens, and omit SDK event targets. Their redaction and the isolated routing failure have focused regression coverage.

## Reproduce Locally

Use this worktree or another checkout without `.env`, local, development, test or production runtime env files. The runner refuses those files so Next cannot load hosted credentials behind its sanitized child environment. It forwards OS settings, supplies loopback backend URLs and non-working provider placeholders, and disables mock mode for the optimized build. It does not deploy or write to a hosted database.

From the repository root on this machine:

```powershell
node apps/pulse/scripts/production-build-acceptance.mjs --public-map-env C:/Users/Taz/SunsetPulse/apps/pulse/.env.local
$env:PLAYWRIGHT_BROWSERS_PATH='C:/Users/Taz/AppData/Local/ms-playwright'
node apps/pulse/scripts/production-build-acceptance.mjs --public-map-env C:/Users/Taz/SunsetPulse/apps/pulse/.env.local --browser-only
```

The optional public-map argument extracts only `NEXT_PUBLIC_MAPBOX_TOKEN`; no other value from that file enters the build or browser server. On another machine, point it to an existing public-map configuration and use the installed Chromium cache. Without that key, real-map tests are explicitly skipped, which does not establish map readiness. Rebuild after changing application code or public build settings before using `--browser-only`.

Browser acceptance requires Docker and Chromium. It uses the existing disposable Mongo service with an empty generated database, starts its own production server on localhost port 3187, then a separate explicit-fixture development server on 3188. Matching the server's localhost bind to Next's local tenant rewrite avoids an IPv4-only listener receiving an IPv6 proxy connection. It refuses occupied ports and stops only its own server process trees and generated Mongo service. The fixture server uses `.next-e2e`; it does not overwrite the production `.next` build. `--production-only`, `--fixture-only` and an optional `--grep` support focused diagnosis. Logs and screenshots remain in the ignored `.pulse-local/production-acceptance/` directory, with separate Playwright output directories for the two modes.

The KCD publication flag is enabled only in the local child server. Its check uses `kcdgroup.localhost`, preserving the tenant-header routing guard; a direct visit to `/sites/kcdgroup` correctly returns not found. No hosted flag is changed.

## Scope and Limits

Listing API responses are controlled fictional samples. Mapbox styles, tiles, drawing controls and the production CSP are real. The browser uses Chromium software WebGL; this verifies behavior rather than physical-device GPU performance. Mapbox telemetry requests are intercepted. Optional database/provider reads fail locally or return controlled public responses; passing layout checks do not establish their hosted availability.

The suite covers phone/desktop map and list usability, coordinate links, polygon search and clearing, layer controls, map-request failure with list survival, retry, homepage/KCD layout and the supplied KCD property photo. It records the current production navigation/resource baseline without claiming improvement over a prior build. A same-profile comparison, repeated Atlas/worker lifecycle measurements, deployed acceptance, publication content and physical microphone review remain separate work.

## Results

- The final optimized production build passed in 162 seconds with mock mode disabled, framework type validation enabled and all 213 static pages generated. Initial verification also built successfully before browser diagnosis; build success alone did not establish working map controls.
- All four production Chromium checks passed: actual Mapbox rendering/drawing/layers under CSP, failed-map request/retry with list survival, homepage at 390px/1440px, and the KCD subdomain/property photo at both widths. The production browser phase took 77 seconds including server startup. A focused 6.3-second KCD follow-up also verifies the real street-map style and address popup before taking its screenshots.
- All six existing explicit-fixture Explorer checks passed in 15.5 seconds. Their separate server phase took 30 seconds. Both server process trees and the generated Mongo service were removed afterward.
- All 69 focused tests across eight suites passed, including the new bounded diagnostics and routing-isolation regression. Focused ESLint, Node syntax, whitespace checks and production framework type validation passed.
- The current-build homepage baseline recorded 53/54 same-origin resources and approximately 524/586 KiB transferred at 390px/1440px. DOMContentLoaded was about 21.3 seconds in this intentionally unavailable-Supabase environment. These figures include backend fallback delays and software-rendered browser conditions; they do not measure normal hosted backend performance or prove a performance improvement.

The first polygon test left drawing mode active while software WebGL had not painted the closing vertex's hit target. It now explicitly finishes the polygon with Enter, then observes the real polygon search request and clears the area through the UI. The KCD test uses hostname routing; internal-route access remains protected. These were acceptance-driver corrections, distinct from the production CSP defect above.
