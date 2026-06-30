---
name: setup
description: Dev environment setup and commands. Load when setting up the project for the first time or when environment issues arise.
triggers:
  - "setup"
  - "install"
  - "environment"
  - "getting started"
  - "how do I run"
  - "local development"
edges:
  - target: context/stack.md
    condition: when specific technology versions or library details are needed
  - target: context/architecture.md
    condition: when understanding how components connect during setup
  - target: context/tah.md
    condition: when setting up Python TAH tools, MarkItDown import, or LanceDB indexing
  - target: context/command-center.md
    condition: when configuring Langfuse, VoltAgent, TensorZero, or operator access for Command Center
last_updated: 2026-06-26
---

# Setup

## Prerequisites

- **Node.js** with npm (workspaces monorepo; no pnpm/yarn lockfile at root)
- **Python 3** — required for MarkItDown import (`apps/pulse/requirements-markitdown.txt`), TAH builders, and optional Crawl4AI worker
- **.NET SDK** — only if running WorldofTah (`npm run tah:dev`)
- **Git** — clone repo; local cartridges and ledgers are gitignored

## First-time Setup

1. `npm install` from repo root (runs Prisma generate postinstall in `apps/pulse`)
2. Copy `apps/pulse/.env.example` → `apps/pulse/.env.local` and fill secrets (Groq, Supabase, Mapbox, etc.)
3. Optional Python: `python -m pip install -r apps/pulse/requirements-markitdown.txt` for document import
4. Optional atlas: from `apps/pulse`, run `npm run tah:pack-expert-atlas` if segmented atlas files are missing
5. `npm run pulse:dev` from root (or `cd apps/pulse && npm run dev`)
6. Open `http://127.0.0.1:3000/command-center` (Next may use `:3002` if 3000 is taken)

## Environment Variables

**Required for full Pulse app (`.env.local`):**
- `GROQ_API_KEY` — AI inference for workers and VoltAgent advisor
- `MONGODB_URI` — legacy Pulse data paths
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — session auth
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase backend
- `NEXT_PUBLIC_MAPBOX_TOKEN` — maps / Spatial Lab

**Required if payments/maps/email features used:**
- `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
- `CLOUDINARY_*`, `RESEND_API_KEY`, `REPLIERS_API_KEY`, `ATTOM_API_KEY`

**Conditional — Command Center observability:**
- `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` (optional) — enables graph tracing when both set
- `VOLTAGENT_COMMAND_MODEL`, `VOLTAGENT_COMMAND_ADVISOR_ENABLED` (optional) — advisor model; standby if `GROQ_API_KEY` missing

**Conditional — local ledgers (defaults work out of the box):**
- `PULSE_QUERY_MEMORY_DISABLED`, `PULSE_QUERY_MEMORY_PATH`
- `PULSE_SQLSYNC_JOURNAL_DISABLED`, `PULSE_SQLSYNC_JOURNAL_PATH`
- `TENSORZERO_*` — evaluation/feedback/JamieChat JSONL paths
- `LEAD_INTEL_*` — Crawl4AI allowlist and worker paths
- `NOVU_*` — notification workflow; queues locally without `NOVU_SECRET_KEY`

**Operator access:**
- `OPERATOR_EMAIL` or `ADMIN_EMAIL` — authenticated operator bypass on non-local hosts

## Common Commands

- `npm run pulse:dev` — Next dev server for Pulse app
- `npm run pulse:build` — Prisma schema generate + Pulse production build
- `npm run test:unit` — Vitest unit suite in `apps/pulse`
- `npm run test:e2e` — Playwright e2e in `apps/pulse`
- `npm run tah:import-doc -- -- "<path>" --title "Title"` — MarkItDown → `.tah` import
- `npm run tah:lancedb:index` / `tah:lancedb:search -- --query "..."` — local cartridge search index
- `npm run scheduling:dev` — Cal.com scheduling web app (separate workspace)
- `npm run tah:dev` — .NET WorldofTah watch mode

## Common Issues

**Wrong port in curl/tests:** Next auto-picks another port when 3000 is busy — check terminal output; README examples use `127.0.0.1:3002`.

**Command Center retrieve returns empty shards:** Segmented atlas missing — run `npm run tah:pack-expert-atlas` from `apps/pulse` and confirm `cartridges/expert-atlas/segmented_expert_atlas.{hat,tah}` exist.

**MarkItDown import fails:** Python dependency not installed — run `pip install -r apps/pulse/requirements-markitdown.txt` and ensure `python` is on PATH (override with `--python` flag).

**VoltAgent advisor always standby:** Set `GROQ_API_KEY` and `VOLTAGENT_COMMAND_MODEL=groq/llama-3.1-8b-instant`; or force off with `VOLTAGENT_COMMAND_ADVISOR_ENABLED=false`.

**Unit tests pollute local cartridges:** Tests expect env isolation — set `PULSE_QUERY_MEMORY_DISABLED=true` and temp `PULSE_QUERY_MEMORY_PATH` (see `command-center.test.ts`).
