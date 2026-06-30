---
name: stack
description: Technology stack, library choices, and the reasoning behind them. Load when working with specific technologies or making decisions about libraries and tools.
triggers:
  - "library"
  - "package"
  - "dependency"
  - "which tool"
  - "technology"
edges:
  - target: context/tah.md
    condition: when working with TAH binary format, Python builders, or LanceDB indexing scripts
  - target: context/command-center.md
    condition: when working with LangGraph workflow, VoltAgent, Langfuse, or TensorZero integrations
  - target: context/decisions.md
    condition: when the reasoning behind a tech choice is needed
  - target: context/conventions.md
    condition: when understanding how to use a technology in this codebase
last_updated: 2026-06-26
---

# Stack

## Core Technologies

- **npm workspaces monorepo** (`sunset-pulse-monorepo`) — root orchestrates `apps/pulse`, `apps/scheduling/web`, `apps/api/v2`, and many `packages/*` Cal.com forks.
- **Next.js 15.5** + **React 19** — primary Pulse app (`apps/pulse`); App Router with `app/api/*` route handlers and `export const runtime = 'nodejs'` on Command Center routes.
- **TypeScript 6** — Pulse app; `strict: false` in `tsconfig.json`; path alias `@/*` maps to `apps/pulse/*`.
- **.NET (WorldofTah)** — `apps/WorldofTah`; started via `npm run tah:dev` (`dotnet watch`).
- **Python 3** — TAH builders, MarkItDown import, Crawl4AI lead-intel worker, Memoria forge scripts under `apps/pulse/scripts/` and `builder/`.
- **Prisma 6** + **Supabase** — Pulse data layer; `postinstall` runs `prisma generate`.

## Key Libraries

- **`@/lib/compat/langgraphLinear.ts`** (not `@langchain/langgraph` barrel in production) — minimal linear `StateGraph` adapter used by Command Center because upstream LangGraph triggers Next.js build export issues.
- **`@langfuse/tracing` + `@langfuse/otel`** — Command Center stage observations via `lib/observability/langfuseTracing.ts`.
- **`@voltagent/core`** — typed Command Center advisor with `route_command`, `list_worker_loadout`, `summarize_command_center` tools.
- **`@lancedb/lancedb`** — local BM25-style cartridge search experiments (`tah:lancedb:index` / `search` scripts).
- **`@assistant-ui/react` + `ai` SDK** — Jamie Chat maximized workspace at `/jamie-chat`.
- **`kepler.gl` + `@deck.gl/*` + `mapbox-gl`** — Spatial Lab geospatial layers (`/spatial-lab`, `/api/kepler`).
- **Vitest** (not Jest) — unit tests in `apps/pulse/tests/unit/`; Playwright for e2e.
- **Zod** — API request validation (e.g. `CommandRequestSchema` in `app/api/commands/route.ts`).

## What We Deliberately Do NOT Use

- **`@langchain/langgraph` package barrel in Next production builds** — replaced by the local linear adapter until upstream export path is stable.
- **Redux for Command Center state** — Command Center is server-orchestrated; Redux remains for unrelated Pulse UI surfaces only.
- **Committed local intelligence files** — `query_memory.tah`, SQLSync/TensorZero/Novu ledgers, and imported `.tah` drafts stay gitignored/local unless explicitly unignored.
- **Direct Novu calls without operator guard + ledger** — notifications go through `lib/notifications/novu.ts` with local audit fallback.

## Version Constraints

- Root `package.json` overrides pin React 19 for Pulse but keep `@calcom/web` on React 18.2 — do not bump scheduling workspace React without checking Cal.com packages.
- Command strings are capped at **600 characters** in `CommandRequestSchema`.
- Pulse dev server defaults to port 3000 but Next may auto-select 3002 if busy — README curl examples use `127.0.0.1:3002`.
