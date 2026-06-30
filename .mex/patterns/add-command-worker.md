---
name: add-command-worker
description: Add a new intelligence worker to the Command Center roster with commandFit routing and relay template mapping.
triggers:
  - "add worker"
  - "new worker"
  - "intelligence worker"
  - "worker roster"
edges:
  - target: context/command-center.md
    condition: before editing — understand workflow stages and roster shape
  - target: context/tah.md
    condition: when selecting tahLoadout cartridges for the new worker
  - target: patterns/route-command-flow.md
    condition: when routing logic or relay template selection also needs changes
  - target: patterns/debug-command-failure.md
    condition: when verifying the new worker end-to-end
last_updated: 2026-06-26
---

# Add Command Worker

## Context

Load `context/command-center.md` and `context/conventions.md`. Workers are entries in `apps/pulse/lib/command-center/workerRoster.ts` — there is no `workers/` handler directory. Routing uses `chooseWorkerForCommand` phrase scoring plus `synonyms.ts` expansion.

## Steps

1. Add an `IntelligenceWorker` object to `intelligenceWorkers[]` in `workerRoster.ts` with unique kebab-case `id`, human-readable `name`, `commandFit` phrases (lowercase, multi-word), `tahLoadout` cartridge filenames, `slot`, Lucide `icon`, and arena UI fields (`stats`, `sampleOutput`).
2. Confirm cartridges in `tahLoadout` exist under `apps/pulse/cartridges/` or document import/pack steps if new.
3. Extend `buildTahRelayPlan` in `relayTemplates.ts` if the worker needs a dedicated `templateId` (follow existing worker-specific branches like `pulse-architect` → `sunset-pulse-command-map`).
4. Add routing assertions to `apps/pulse/tests/unit/command-center.test.ts` — mirror patterns for `dallas-safety`, `local-commerce`, etc.
5. If VoltAgent should recommend the worker, update tool descriptions in `lib/agents/voltagentCommandAdvisor.ts` (`route_command` / `list_worker_loadout`).
6. Run `npm run test:unit -- --testPathPattern=command-center` from repo root (or `npm run test:unit` in `apps/pulse`).

## Gotchas

- Overlapping `commandFit` phrases steal routes from existing workers — test ambiguous commands ("market movement" vs "seller update").
- Workers with `status: 'Needs listing'` or `'Needs lead'` still route by text; context ids in API body are optional enrichments, not blockers.
- Missing `tahLoadout` files do not crash routing but produce empty retrieve shards — pack or import cartridges first.
- Arena UI reads `stats` and `accent` — invalid Lucide import breaks the Command Center page build.

## Verify

- [ ] `chooseWorkerForCommand('<sample command>').id` returns the new worker in unit test
- [ ] `runCommandCenterCommand` with `PULSE_QUERY_MEMORY_DISABLED=true` returns expected `worker.id` and non-empty `relayPlan.templateId`
- [ ] `buildTahRelayPlan` assigns a template with provenance/source anchors
- [ ] No duplicate `id` in `intelligenceWorkers`
- [ ] Conventions checklist in `context/conventions.md` passes

## Debug

If the wrong worker wins, dump expanded terms via `expandCommandTerms(command)` and compare scores — adjust `commandFit` weights or add synonym entries in `synonyms.ts`. See `patterns/debug-command-failure.md`.

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
