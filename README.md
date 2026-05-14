# Sunset Pulse

Sunset Pulse is a Next.js 14 real estate intelligence platform for property discovery, lead engagement, valuation workflows, and operational analytics. The application combines a customer-facing property experience with internal intelligence tools for market analysis, lead scoring, automation, and visual content workflows.

## Current Status

- Application framework: Next.js 14 App Router with React and TypeScript
- Data services: Supabase, MongoDB-backed property models, and local mock data for development and testing
- Test coverage: Vitest unit tests and Playwright browser tests
- Primary focus: property search, lead intelligence, Jamie assistant workflows, valuation tools, and internal operations dashboards

## Core Capabilities

- Property browsing, search, saved listings, and listing detail pages
- Lead capture, re-engagement, scoring, and pipeline intelligence
- Jamie assistant workflows for market research, messaging support, and site operations
- Valuation and market intelligence modules for property-level analysis
- Admin tools for branding, prompts, render queues, acquisition workflows, and audit actions
- Visualization components for maps, 3D property views, intelligence dashboards, and interactive demos

## Technology Stack

- **Frontend:** Next.js, React, TypeScript, Tailwind CSS
- **Visualization:** Three.js, React Three Fiber, D3, Mapbox, Google Maps integrations
- **Data:** Supabase, MongoDB/Mongoose, local JSON fixtures, external real estate data adapters
- **Testing:** Vitest, Testing Library, Playwright
- **Payments and messaging:** Stripe, Twilio, Telegram integrations IAP WIP
- **Media workflows:** FFmpeg-oriented render pipeline, local visual assets, and segmentation support

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
