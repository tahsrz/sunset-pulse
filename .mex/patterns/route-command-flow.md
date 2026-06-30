---
name: route-command-flow
description: Modify Command Center graph stages, stage order, or core routing/retrieve/plan behavior in commandRouter.ts.
triggers:
  - "graph stage"
  - "command router"
  - "langgraph"
  - "retrieve stage"
  - "routing logic"
edges:
  - target: context/command-center.md
    condition: before editing — understand stage names and sidecar integrations
  - target: patterns/add-command-worker.md
    condition: when stage changes affect worker selection or roster scoring
  - target: patterns/debug-command-failure.md
    condition: when graph changes cause runtime or trace failures
last_updated: 2026-06-26
---

# Route Command Flow

## Context

Load `context/command-center.md` and `apps/pulse/lib/command-center/commandRouter.ts`. The graph uses `@/lib/compat/langgraphLinear` (`StateGraph`, `START`, `END`). Stages execute linearly — no branching nodes today.

## Steps

1. Locate graph construction in `commandRouter.ts` — nodes registered with `.addNode(stageName, handler)` and `.addEdge` chain ending at `END`.
2. For a **new stage**: implement handler returning `Partial<CommandState>`, insert node name in edge chain, add Langfuse observation via `annotateLangfuse` / `traceLangfuse` matching existing stage names.
3. For **route changes**: edit logic inside the route node (worker selection, manual override, atlas domain mask) — prefer extending `chooseWorkerForCommand` or synonym maps before inlining string checks.
4. For **retrieve changes**: adjust `SegmentedExpertAtlasRetriever` options, domain masks (`domainMaskForLabel`), or query memory recall in the retrieve handler; preserve `atlasDiagnostics` trace fields.
5. For **plan/synthesize changes**: coordinate with `relayTemplates.ts` — template selection stays out of API route handlers.
6. Update `apps/pulse/tests/unit/command-center.test.ts` and any atlas tests if retrieve diagnostics or response shape changes.
7. Run `npm run test:unit` with memory disabled env (see existing test setup).

## Gotchas

- `langgraphLinear.ts` throws on cycles — keep the graph strictly linear.
- Do not import `@langchain/langgraph` barrel in files consumed by Next client bundles — stay on the local adapter.
- Langfuse span names are contractual (`command-center.retrieve`, etc.) — TensorZero and docs reference them.
- `flushLangfuse()` is called in `app/api/commands/route.ts`, not inside individual stage handlers.
- Changing response shape breaks Jamie bridge (`jamieBridge.ts`) and TensorZero fingerprinting — update those callers if needed.

## Verify

- [ ] `runCommandCenterCommand` smoke test passes with `PULSE_QUERY_MEMORY_DISABLED=true`
- [ ] Trace payload includes expected stage outputs (`selectedShards`, `relayPlan`, `queryMemory` when enabled)
- [ ] Langfuse observations appear for each stage when keys configured (optional manual check)
- [ ] `npm run pulse:build` succeeds — catches LangGraph/import bundling regressions
- [ ] Unit tests in `command-center.test.ts` updated and green

## Debug

Stage failures log as `[COMMAND_CENTER_API] Command execution failed` from the API route. Inspect partial state by temporarily extending trace output in tests. See `patterns/debug-command-failure.md` for stage-by-stage isolation.

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
