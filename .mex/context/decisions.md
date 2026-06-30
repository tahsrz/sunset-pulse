---
name: decisions
description: Key architectural and technical decisions with reasoning. Load when making design choices or understanding why something is built a certain way.
triggers:
  - "why do we"
  - "why is it"
  - "decision"
  - "alternative"
  - "we chose"
edges:
  - target: context/architecture.md
    condition: when a decision relates to system structure
  - target: context/command-center.md
    condition: when a decision affects workflow stages, workers, or relay planning
  - target: context/tah.md
    condition: when a decision affects cartridge format, atlas packing, or retrieval policy
  - target: context/stack.md
    condition: when a decision relates to technology choice
last_updated: 2026-06-26
---

# Decisions

## Decision Log

### Use TAH binary cartridges as the primary context layer
**Date:** 2026-06-16
**Status:** Active
**Decision:** Real estate knowledge ships as `.hat`/`.tah` pairs with binary index-first retrieval, not raw PDFs or ad-hoc prompt stuffing.
**Reasoning:** Token cost and latency — Bloom filters, shard metadata, and segmented atlas rejection do heavy lifting before any model call.
**Alternatives considered:** Vector-only RAG over Markdown (rejected — higher read cost at scale); cloud knowledge base (rejected — conflicts with local operator control).
**Consequences:** New domain knowledge requires cartridge build/import scripts and atlas repack (`tah:pack-expert-atlas`) when adding to the 400-expert index.

### Route Command Center through a LangGraph-shaped linear graph
**Date:** 2026-06-16
**Status:** Active
**Decision:** Replace one flat router function with named stages (`route` → `retrieve` → `plan` → `synthesize` → `supervise` → `remember` → `respond`) in `commandRouter.ts`.
**Reasoning:** Observable stages for Langfuse tracing, unit testing, and incremental feature work (TensorZero evals per stage metadata).
**Alternatives considered:** Keep monolithic function (rejected — hard to trace and test); full LangGraph branching (deferred — workflow is linear today).
**Consequences:** Every new cross-cutting concern must land in an existing stage or extend the linear adapter in `langgraphLinear.ts`.

### Use a local LangGraph linear adapter instead of @langchain/langgraph
**Date:** 2026-06-16
**Status:** Active
**Decision:** Implement `lib/compat/langgraphLinear.ts` rather than importing `@langchain/langgraph` in Next production builds.
**Reasoning:** Upstream package barrel triggered Next.js export/build failures for this app layout.
**Alternatives considered:** Pin older LangGraph version (rejected — same export issue); eject from Next (rejected — too heavy).
**Consequences:** Adapter supports linear graphs only; cycle detection throws at runtime. Revisit when upstream path is stable.

### Store query memory locally in query_memory.tah
**Date:** 2026-06-16
**Status:** Active
**Decision:** Persist compact command memory to a local `.tah` file plus SQLSync-ready JSONL mutations, gitignored by default.
**Reasoning:** Reuse prior intents without sending full history to models; keeps operator data on-machine.
**Alternatives considered:** Server PostgreSQL memory table (rejected for Command Center v0.2 — operational coupling); no memory (rejected — repeated commands lose context).
**Consequences:** Tests must set `PULSE_QUERY_MEMORY_DISABLED` or temp paths; production paths configurable via `PULSE_QUERY_MEMORY_PATH`.

### Strict operator access for Command Post and guarded APIs
**Date:** 2026-06-16
**Status:** Active
**Decision:** Production requests cannot bypass protection with a localhost `Host` header; public dev hosts require authenticated operator/admin/realtor role or `OPERATOR_EMAIL` match.
**Reasoning:** Command Post exposes orchestrator endpoints, archive readiness, and terminal intent counts — sensitive on public deployments.
**Alternatives considered:** Open Command Post in dev (rejected — spoofing risk); hide panel entirely (rejected — operators need visibility).
**Consequences:** All guarded routes must use `getOperatorAccess` + `getRequestHostFromHeaders`; covered by `command-post-access.test.ts` and `operator-access.test.ts`.
