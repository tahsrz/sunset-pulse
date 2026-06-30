---
name: debug-command-failure
description: Diagnose Command Center failures across route, retrieve, plan, and API boundary.
triggers:
  - "command failed"
  - "debug command"
  - "empty shards"
  - "wrong worker"
  - "command center error"
edges:
  - target: context/command-center.md
    condition: when tracing which graph stage failed
  - target: context/tah.md
    condition: when retrieve returns empty shards or atlas diagnostics look wrong
  - target: patterns/route-command-flow.md
    condition: when fixing graph stage logic after diagnosis
  - target: patterns/add-command-worker.md
    condition: when mis-routing is caused by roster commandFit overlap
last_updated: 2026-06-26
---

# Debug Command Failure

## Context

Load `context/command-center.md` and `context/setup.md`. Failures surface as HTTP 400 (Zod validation), HTTP 500 (`Command execution failed`), or HTTP 200 with weak answers (wrong worker, empty context, missing provenance).

## Steps

1. **Reproduce minimally** with curl against the actual dev port:
   ```bash
   curl -X POST http://127.0.0.1:3000/api/commands \
     -H "Content-Type: application/json" \
     -d "{\"command\":\"Explain the community and nearby shops\",\"relayMode\":\"briefing\",\"supervisor\":false}"
   ```
   Set `PULSE_QUERY_MEMORY_DISABLED=true` in server env to isolate memory side effects.
2. **Check validation (400)** — `CommandRequestSchema` in `app/api/commands/route.ts`: command 1–600 chars, relay mode enum, optional context ids. Read `issues` in response body.
3. **Inspect worker (route stage)** — response `worker.id` vs expectation; run `chooseWorkerForCommand` in a unit test or REPL; dump `expandCommandTerms(command)`.
4. **Inspect retrieve** — `trace.selectedShards` length and `trace.atlasDiagnostics`:
   - `payloadReads: 0` → missing/outdated atlas or domain mask rejection
   - Confirm `cartridges/expert-atlas/segmented_expert_atlas.{hat,tah}` exist (run `tah:pack-expert-atlas` if not)
5. **Inspect plan/synthesize** — `result.relayPlan.templateId`, `deliverable.mode`, frames array; empty frames often mean zero shards + generic template fallback.
6. **Check sidecars** — `trace.commandPost.access` denied does not block main answer; VoltAgent `standby` is normal without Groq key.
7. **Server logs** — `[COMMAND_CENTER_API] Command execution failed` stack trace points to thrown stage errors (graph cycle, missing node).
8. **Langfuse** (if configured) — open `command-center.graph` trace and identify first red stage observation.

## Gotchas

- Wrong port (3000 vs 3002) produces connection errors mistaken for app bugs.
- Tests polluting `query_memory.tah` — always use temp `PULSE_QUERY_MEMORY_PATH` in unit tests.
- Manual `selectedWorkerId` bypasses phrase routing — remove to test auto route.
- Supervisor stage adds notes but does not change HTTP status on soft failures.
- TensorZero/SQLSync write failures may log but not fail the request — check JSONL paths separately.

## Verify

- [ ] Minimal curl returns 200 with expected `worker.id` and non-empty `result.summary`
- [ ] `trace.selectedShards` contains relevant sources for the command domain
- [ ] Unit test repro added to `command-center.test.ts` or atlas tests to prevent regression
- [ ] Fix confirmed with `npm run test:unit` green

## Debug

If failure persists after atlas repack, run `npm run tah:lancedb:search -- --query "<terms>"` to confirm cartridge text exists independently of atlas segmentation. Compare worker `tahLoadout` filenames to actual files on disk (case-sensitive on Linux CI).

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
