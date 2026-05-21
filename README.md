# Sunset Pulse

Sunset Pulse is a Next.js 14 real estate intelligence platform for property discovery, lead engagement, valuation workflows, and operational analytics. The application combines a customer-facing property experience with internal intelligence tools for market analysis, lead scoring, automation, and visual content workflows.

## Current Status

- **Status:** 🟢 Alpha Maturation // Supabase Hegemony
- **Application framework:** Next.js 14 App Router with React and TypeScript
- **Data services:** Supabase (Consolidated Property Grid), MongoDB, and local mock data.
- **Test coverage:** Vitest unit tests and Playwright browser tests.
- **Primary focus:** TAH Memory Forge, Sigmoid Lead Maturation, and Ozriel Protocol integration.

## Core Capabilities

- Property browsing, search, saved listings, and high-performance IDX sync via Repliers.io.
- Authenticated Matrix IDX access through `/idx` and the embedded Jamie tab MLS drawer.
- Lead capture, re-engagement with Sigmoid velocity scoring, and Jamie AI hooks.
- Neighborhood Recon & Budget Delta analysis for hyper-personalized interactions.
- TAH Expertise retrieval (Makiel, Gadrael, etc.) from Supabase Cloud-Native storage.
- Visualization components for maps, 3D property views, and D3.js velocity trajectories.

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Visualization:** Three.js, React Three Fiber, D3, Mapbox, Google Maps integrations
- **Data:** Supabase, MongoDB/Mongoose, local JSON fixtures, external real estate data adapters
- **Testing:** Vitest, Testing Library, Playwright
- **Payments and messaging:** Stripe, Twilio, Telegram integrations IAP WIP
- **Media workflows:** FFmpeg-oriented render pipeline, local visual assets, and segmentation support

## MLS / IDX Access

Sunset Pulse exposes MLS search through an authorized NTREIS Matrix IDX iframe:

- The standalone MLS route is `/idx`.
- `/idx` is server-gated with Supabase auth through `getSessionUser()`.
- Anonymous users are redirected to `/login?redirect=/idx`.
- Jamie's docked tab can also show the Matrix IDX iframe in-place through the `MLS` control.
- The Jamie MLS drawer does not change the user's current page.
- The Jamie MLS drawer renders the iframe only for authenticated users.
- Anonymous users see a login prompt inside Jamie instead of the MLS iframe.
- Jamie must not automatically navigate users to `/idx`; MLS access should be an explicit user action.

This keeps Matrix/IDX access close to the assistant while preserving a clear login boundary around listing data.

## TAH API

Sunset Pulse exposes the local cartridge brain through `/api/tah`:

- `GET /api/tah` returns endpoint status and the queryable cartridge catalog.
- `GET /api/tah?q=Dallas&limit=5` runs a quick cartridge search.
- `POST /api/tah` accepts `{ "query": "Dallas zoning", "limit": 10, "sync": false }`.
- `sync: true` attempts a Supabase cartridge sync before searching.
- `/api/tah/eval` remains the advanced S-expression evaluator for internal workflows.
- `GET /api/tah/master` inspects the local `atlas_pulse_master.hat/.tah` Memoria pair when it has been generated.
- `GET /api/tah/master/search?q=Atlas%20Pulse&limit=5` searches only the local master archive.
- `POST /api/tah/master/search` accepts `{ "query": "Deep Ellum", "limit": 5 }`.
- `GET /api/tah/master/sources` pages through the master archive provenance manifest.
- `GET /api/tah/master/places` extracts Atlas Pulse place bindings from the packed master payload.
- `/tah` and `/tah/[cartridge]` expose crawlable HTML context pages for robots and agents.
- `/tah/index.json` exposes a dynamic, machine-readable catalog rebuilt from the cartridge directories on request.
- `/tah/headless` and `/tah/[cartridge]/headless` expose plain-text scraper views with backend-oriented labels.
- `/llms.txt`, `/robots.txt`, and `/sitemap.xml` advertise the TAH archive as a stable context surface.
- `/tah` includes explicit AI-agent crawl guidance and preferred query patterns.
- Abidan judge context is routed through `lib/ai/brain/abidan_tah.ts`, which supports both indexed `.tah` cartridges and split Memoria `.hat`/`.tah` pairs before adding broad Pulse matches.
- `TAH_MEMORIA_V4_SPEC.md` defines the draft super-cartridge direction for packaging existing cartridges into a high-capacity, provenance-aware Memoria pair.
- `npm run tah:pack-master` packages the current cartridge catalog into a local `cartridges/master/atlas_pulse_master.hat/.tah` pair with a provenance manifest.
- `lib/core/memoria_v4.ts` contains the first Memoria v4 superblock and section-directory reader prototype.
- `/admin/orchestrator` is the local/operator control room for Telegram routing, model-network status, guarded tools, process grouping, and browser-style checks.
- `/api/admin/orchestrator/command` runs the same command router from the web console.
- `/api/admin/orchestrator/terminal-intents/[id]` approves, rejects, or runs queued terminal intents. Low-risk commands can run directly, medium-risk commands require approval first, and high-risk commands are manual-only.
- Queued terminal intents persist to `/.orchestrator/terminal-intents.json` by default. Set `ORCHESTRATOR_COMMAND_QUEUE_PATH` to move the local queue store.
- `/api/telegram/webhook` accepts Telegram updates, authorizes `AUTHORIZED_USER_ID` or `TELEGRAM_OPERATOR_CHAT_ID`, and routes `/commands`, `/status`, `/sessions`, `/tah`, `/places`, `/check`, `/cancel`, `/pack_master`, and guarded `!command` terminal intents.

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Start the development server with mock-mode data integrations:

```bash
npm run dev:mock
```

Open the application at `http://localhost:3000`.

## Environment Configuration

The application can run with partial configuration for local UI work, but production-like workflows require service credentials.



Use `NEXT_PUBLIC_MOCK_MODE=true` when running local tests or development flows that should avoid live data providers.

## Testing

Run the Vitest unit suite:

```bash
npm run test:unit
```

Run the Playwright browser suite:

```bash
npm run test:e2e
```

The Playwright configuration excludes `tests/unit` so Vitest-specific files are not loaded by the browser test runner. The Playwright web server also starts with `NEXT_PUBLIC_MOCK_MODE=true` to reduce dependence on live provider availability during local test runs.

## Build

Create a production build:

```bash
npm run build
```

Start the production server after building:

```bash
npm run start
```

## Project Structure

- `app/` - Next.js routes, API handlers, and page-level modules
- `components/` - Shared UI, property, admin, visualization, and workflow components
- `lib/` - Core business logic, data adapters, AI workflows, security utilities, and visualization engines
- `hooks/` - Reusable React hooks for properties, telemetry, studio workflows, and intelligence features
- `models/` - Mongoose models and domain entities
- `tests/` - Playwright specs and Vitest unit tests
- `scripts/` - Operational scripts, data seeding, sync tools, and verification utilities
- `supabase/` - Supabase migrations and edge functions
- `public/` - Static assets, images, models, audio, and videos

## Development Notes

- Keep live-service integrations behind environment checks or mock-mode fallbacks where practical.
- Prefer focused unit tests for deterministic business logic and Playwright tests for user-facing workflows.
- Keep README updates factual and operational so new contributors can understand the system without needing internal shorthand.

## License

See [LICENSE.md](./LICENSE.md).

SunsetPulse 2026
