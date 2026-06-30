---
name: agents
description: Always-loaded project anchor. Read this first. Contains project identity, non-negotiables, commands, and pointer to ROUTER.md for full context.
last_updated: 2026-06-26
---

# Sunset Pulse

## What This Is

A real estate agent command center monorepo that routes narrow natural-language commands through specialized workers backed by local TAH intelligence cartridges.

## Non-Negotiables

- Never bypass operator access checks (`getOperatorAccess`) on Command Post or guarded APIs — no localhost Host spoofing on production
- Never commit secrets, `.env.local`, or local intelligence files (`query_memory.tah`, JSONL ledgers, imported `.tah` drafts)
- Extend Command Center workers via `workerRoster.ts` + relay templates — do not add parallel router entry points
- Keep Command Center side effects behind env disable flags (`PULSE_QUERY_MEMORY_DISABLED`, `TENSORZERO_*_DISABLED`, etc.) in tests
- Validate API inputs with Zod schemas matching existing route constraints (command max 600 chars, relay mode enum)

## Commands

**Pulse (primary):** `npm run pulse:dev` · `npm run pulse:build` · `npm run test:unit` · `npm run test:e2e`

**TAH tooling:** `npm run tah:import-doc` · `npm run tah:lancedb:index` · `npm run tah:lancedb:search`

**Other workspaces:** `npm run scheduling:dev` · `npm run tah:dev`

## Scaffold Growth
After every task: if no pattern exists for the task type you just completed, create one. If a pattern or context file is now out of date, update it. The scaffold grows from real work, not just setup. See the GROW step in `ROUTER.md` for details.

## Navigation
At the start of every session, read `ROUTER.md` before doing anything else.
For full project context, patterns, and task guidance — everything is there.
