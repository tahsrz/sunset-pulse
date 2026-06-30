---
name: Command Center
description: Deep dive into the Command Center workflow, workers, relay templates, and routing graph.
triggers:
  - "command center"
  - "worker"
  - "relay template"
  - "langgraph"
  - "route stage"
  - "command router"
edges:
  - target: context/tah.md
    condition: when retrieve stage pulls atlas shards or query memory cartridges
  - target: context/architecture.md
    condition: when understanding how Command Center connects to Jamie, TensorZero, or operator APIs
  - target: patterns/add-command-worker.md
    condition: when adding a new intelligence worker to the roster
  - target: patterns/route-command-flow.md
    condition: when modifying graph stages or routing logic
  - target: patterns/debug-command-failure.md
    condition: when a command run fails or returns unexpected worker/template output
last_updated: 2026-06-26
---

# Command Center

The Command Center (`/command-center`) is the primary agent interface. Natural-language commands enter via `POST /api/commands` and run through a **LangGraph-shaped linear graph** in `apps/pulse/lib/command-center/commandRouter.ts`, compiled from `@/lib/compat/langgraphLinear`.

## Workflow Stages

1. **route** — scores `intelligenceWorkers` in `workerRoster.ts` via `commandFit` phrases and synonym expansion (`synonyms.ts`); honors manual `selectedWorkerId` when provided; records route mode auto/manual.
2. **retrieve** — recalls prior intents from `query_memory.tah` and queries `SegmentedExpertAtlasRetriever` over `cartridges/expert-atlas/segmented_expert_atlas.{hat,tah}` with domain masks.
3. **plan** — `buildTahRelayPlan` in `relayTemplates.ts` picks one of 68 content templates and a delivery format (`briefing`, `slideshow`, `puppetshow`, `field-board`, `script`).
4. **synthesize** — assembles title, summary, action items, and deliverable frames with source anchors.
5. **supervise** — optional guardrail notes when `supervisor: true` (compliance, unsupported claims).
6. **remember** — `saveQueryMemory` writes compact `.tah` memory plus SQLSync journal rows (`upsert_command_query_memory`).
7. **respond** — returns `CommandCenterResponse` with trace payload (selected shards, atlas diagnostics, query memory trace).

Langfuse spans (when enabled): `command-center.graph` root with nested `command-center.route`, `.retrieve`, `.plan`, `.synthesize`, `.supervise`, `.remember`, `.respond`.

## Workers

Workers are **roster entries**, not separate handler modules. Each `IntelligenceWorker` in `workerRoster.ts` defines:

- `id`, `name`, `role`, `slot` (`Primary` | `Voice` | `Market` | `Supervisor`)
- `commandFit` — phrase list for `chooseWorkerForCommand`
- `tahLoadout` — cartridge filenames used in retrieve scoring
- `model` label, UI stats, sample output (arena UI in `AgentSelectionArena.tsx`)

Current specialists include Lead Scoring, Follow-Up Writer, Neighborhood Explainer, Comp Analysis, Local Commerce, Dallas Community/Safety, Texas Contracts, Pulse Architect, Security Architect, Postgres Tuner, Spatial Designer, and Supervisor Check.

## Relay Templates

Defined in `relayTemplates.ts`. Each plan includes `templateId`, delivery mode, visual motif, section instructions, source anchors, and a **final provenance screen**. Catalog documented in `apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md`. Worker-specific templates are chosen inside `buildTahRelayPlan` based on worker id + retrieved shard concepts.

## Command Post

Compact disclosure in API trace (`buildCommandPostTrace` in `app/api/commands/route.ts`) showing operator console endpoint, access mode/denial reason, master archive readiness, pending terminal intents, and `/status` probe. Access rules in `operator_access.ts` — strict on production hosts.

## Sidecars on POST /api/commands

- **VoltAgent advisor** (`voltagentCommandAdvisor.ts`) — tools: `route_command`, `list_worker_loadout`, `summarize_command_center`; standby without `GROQ_API_KEY`.
- **TensorZero evaluation** (`commandEvaluation.ts`) — records `sunset_command_center` episode metadata to local JSONL.
- **Langfuse** — `flushLangfuse()` after response assembly.

## API Surface

- `GET /api/commands` — lists relay templates and formats
- `POST /api/commands` — main workflow entry (`CommandRequestSchema`: command max 600 chars, optional context ids)
- `POST /api/jamie/chat` — Jamie alias with shared helper context via `jamieBridge.ts`

## LangGraph Adapter

`lib/compat/langgraphLinear.ts` implements `StateGraph`, `START`, `END`, and `Annotation.Root` compatible enough for the current linear workflow. Cycle detection throws at runtime. Replace with `@langchain/langgraph` only after Next production build verification.
