---
name: architecture
description: How the major pieces of this project connect and flow. Load when working on system design, integrations, or understanding how components interact.
triggers:
  - "architecture"
  - "system design"
  - "how does X connect to Y"
  - "integration"
  - "flow"
edges:
  - target: context/command-center.md
    condition: when modifying the Command Center workflow, workers, relay templates, or routing graph
  - target: context/tah.md
    condition: when working with cartridges, expert atlas retrieval, query memory, or LanceDB indexing
  - target: context/stack.md
    condition: when specific technology details are needed
  - target: context/decisions.md
    condition: when understanding why the architecture is structured this way
last_updated: 2026-06-26
---

# Architecture

## System Overview

Real estate agent → Command Center UI (`/command-center`) or Jamie Chat (`/jamie-chat`) → `POST /api/commands` (or `/api/jamie/chat`) → LangGraph-shaped workflow in `commandRouter.ts` → stages: `route` (pick worker from `workerRoster.ts`) → `retrieve` (recall `query_memory.tah` + segmented expert atlas shards) → `plan` (select relay template from `relayTemplates.ts`) → `synthesize` (build deliverable frames) → `supervise` (optional guardrails) → `remember` (write local query memory + SQLSync journal rows) → `respond` (assemble JSON with provenance) → UI renders answer, glossary terms, and Command Post disclosure. Sidecars on the same POST: VoltAgent advisor trace, TensorZero evaluation row, Langfuse graph observations (when keys present).

## Key Components

- **Command Center router** (`apps/pulse/lib/command-center/commandRouter.ts`) — runs the linear LangGraph workflow; depends on `workerRoster`, `relayTemplates`, `queryMemory`, and `SegmentedExpertAtlasRetriever`.
- **Intelligence worker roster** (`apps/pulse/lib/command-center/workerRoster.ts`) — declarative worker catalog with `commandFit` phrases, `tahLoadout`, and slot metadata; routing is phrase-scored, not per-worker handler modules.
- **Segmented expert atlas** (`apps/pulse/lib/core/segmented_expert_atlas.ts`) — middle-out shard rejection over `cartridges/expert-atlas/segmented_expert_atlas.{hat,tah}`; feeds retrieve stage with domain masks and payload reads.
- **Relay template planner** (`apps/pulse/lib/command-center/relayTemplates.ts`) — 68 content templates × 5 delivery formats; every response includes a final provenance screen.
- **Operator access layer** (`apps/pulse/lib/core/operator_access.ts`, `routeAuth.ts`) — gates Command Post and guarded APIs; denies localhost Host spoofing on production hosts.
- **Jamie bridge** (`apps/pulse/lib/command-center/jamieBridge.ts`) — shares Command Center helper context with `/api/jamie/chat` and `/api/chat` TensorZero backbone.
- **Cal.com scheduling fork** (`apps/scheduling/web`, `packages/*`) — separate Next.js workspace in the monorepo; not on the Command Center critical path.

## External Dependencies

- **Groq / Ollama (via env keys)** — model labels on workers; VoltAgent advisor uses `GROQ_API_KEY` + `VOLTAGENT_COMMAND_MODEL` when enabled.
- **Langfuse** — optional Command Center graph tracing; activates only when `LANGFUSE_PUBLIC_KEY` and `LANGFUSE_SECRET_KEY` are set.
- **Supabase + Prisma** — auth/session and property data for the broader Pulse app; Command Center can attach `leadId` / `listingId` context.
- **MongoDB** — legacy Pulse data paths (`MONGODB_URI`); coexists with Supabase/Prisma depending on feature.
- **Stripe** — payments for grill/commerce flows in Pulse; separate from Command Center routing.
- **Novu** — notification workflow triggers with local JSONL ledger fallback when `NOVU_SECRET_KEY` is absent.
- **TensorZero** — local evaluation/feedback JSONL ledgers; gateway URL optional for live routing experiments.
- **LanceDB** — local full-text index over `.tah` files for retrieval experiments (`.lancedb/` under `apps/pulse`).

## What Does NOT Exist Here

- No separate `lib/command-center/workers/` handler modules — workers are roster entries plus shared graph stages, not isolated microservices.
- No cloud-only query memory — `query_memory.tah` and SQLSync journal files are local-first and gitignored by default.
- No mandatory TensorZero Gateway — ledgers record metadata locally; live gateway is optional.
- OpenLIT observability is on the integration roadmap but not implemented yet (per README integration sequence).
