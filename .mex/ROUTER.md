---
name: router
description: Session bootstrap and navigation hub. Read at the start of every session before any task. Contains project state, routing table, and behavioural contract.
edges:
  - target: context/architecture.md
    condition: when working on system design, integrations, or understanding how components connect
  - target: context/command-center.md
    condition: when working on Command Center workflow, workers, relay templates, or API routes
  - target: context/tah.md
    condition: when working with cartridges, atlas packing, import scripts, or query memory
  - target: context/stack.md
    condition: when working with specific technologies, libraries, or making tech decisions
  - target: context/conventions.md
    condition: when writing new code, reviewing code, or unsure about project patterns
  - target: context/decisions.md
    condition: when making architectural choices or understanding why something is built a certain way
  - target: context/setup.md
    condition: when setting up the dev environment or running the project for the first time
  - target: patterns/INDEX.md
    condition: when starting a task — check the pattern index for a matching pattern file
last_updated: 2026-06-26
---

# Session Bootstrap

If you haven't already read `AGENTS.md`, read it now — it contains the project identity, non-negotiables, and commands.

Then read this file fully before doing anything else in this session.

## Current Project State

**Working:**
- Command Center v0.2.0 — LangGraph-shaped workflow with 20+ intelligence workers, 68 relay templates, 5 delivery modes, provenance screen
- Segmented 400-expert atlas retrieval, local `query_memory.tah`, SQLSync journal staging, TensorZero eval/feedback ledgers
- Jamie Chat at `/jamie-chat` sharing Command Center helper context via `/api/jamie/chat`
- VoltAgent advisor sidecar, Langfuse graph tracing (when keys configured), semantic glossary with TAH source links
- MarkItDown import, LanceDB local search, Kepler/deck.gl Spatial Lab, Crawl4AI lead-intel route, Novu notification ledger
- Pulse Quest satirical JRPG at `/pulse-quest` — party workers, encounters, live `/api/commands` puppetshow turns

**Not yet built:**
- OpenLIT OpenTelemetry integration (queued on integration roadmap)
- Live TensorZero Gateway routing for all Jamie/Command Center traffic (local JSONL ledgers only today)
- Full SQLSync reducer/coordinator — journal contract exists, sync engine not wired
- WorldofTah .NET app integration beyond `tah:dev` watch entry

**Known issues:**
- `@langchain/langgraph` package barrel breaks Next production build — linear adapter required until upstream fix verified
- Next dev may bind to `:3002` when `:3000` busy — breaks hardcoded localhost URLs in docs/scripts
- React version split: Pulse on React 19, `@calcom/web` pinned to React 18.2 via root overrides
- Missing segmented atlas files cause empty retrieve results until `tah:pack-expert-atlas` is run locally

## Routing Table

Load the relevant file based on the current task. Always load `context/architecture.md` first if not already in context this session.

| Task type | Load |
|-----------|------|
| Understanding how the system works | `context/architecture.md` |
| Command Center workflow, workers, relay templates | `context/command-center.md` |
| TAH cartridges, atlas, import, query memory | `context/tah.md` |
| Working with a specific technology | `context/stack.md` |
| Writing or reviewing code | `context/conventions.md` |
| Making a design decision | `context/decisions.md` |
| Setting up or running the project | `context/setup.md` |
| Any specific task | Check `patterns/INDEX.md` for a matching pattern |

## Behavioural Contract

For every task, follow this loop:

1. **CONTEXT** — Load the relevant context file(s) from the routing table above. Check `patterns/INDEX.md` for a matching pattern. If one exists, follow it. Narrate what you load: "Loading architecture context..."
2. **BUILD** — Do the work. If a pattern exists, follow its Steps. If you are about to deviate from an established pattern, say so before writing any code — state the deviation and why.
3. **VERIFY** — Load `context/conventions.md` and run the Verify Checklist item by item. State each item and whether the output passes. Do not summarise — enumerate explicitly.
4. **DEBUG** — If verification fails or something breaks, check `patterns/INDEX.md` for a debug pattern. Follow it. Fix the issue and re-run VERIFY.
5. **GROW** — After completing the task:
   - If no pattern exists for this task type, create one in `patterns/` using the format in `patterns/README.md`. Add it to `patterns/INDEX.md`. Flag it: "Created `patterns/<name>.md` from this session."
   - If a pattern exists but you deviated from it or discovered a new gotcha, update it with what you learned.
   - If any `context/` file is now out of date because of this work, update it surgically — do not rewrite entire files.
   - Update the "Current Project State" section above if the work was significant.
