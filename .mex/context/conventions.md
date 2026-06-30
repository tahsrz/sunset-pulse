---
name: conventions
description: How code is written in this project — naming, structure, patterns, and style. Load when writing new code or reviewing existing code.
triggers:
  - "convention"
  - "pattern"
  - "naming"
  - "style"
  - "how should I"
  - "what's the right way"
edges:
  - target: context/architecture.md
    condition: when a convention depends on understanding the system structure
  - target: context/command-center.md
    condition: when extending workers, relay templates, or graph stages
  - target: context/tah.md
    condition: when naming or placing cartridge files and atlas segments
  - target: patterns/INDEX.md
    condition: when starting a repeatable task — check for a matching pattern first
last_updated: 2026-06-26
---

# Conventions

## Naming

- **Worker IDs** — kebab-case slugs in `workerRoster.ts` (`lead-scoring`, `dallas-community`, `pulse-architect`); must match `selectedWorkerId` in API requests.
- **TAH cartridges** — snake_case filenames (`lead_history.tah`, `dallas_community_intel.tah`); concept slugs for imports use kebab-case URLs (`/tah/dallas-community-intel`).
- **Relay template IDs** — kebab-case strings in `relayTemplates.ts` (`sunset-pulse-command-map`, `postgres-query-plan`); paired with `TahRelayMode` enum values (`briefing`, `slideshow`, `puppetshow`, `field-board`, `script`).
- **API routes** — Next App Router folders under `apps/pulse/app/api/`; Command Center entry is `app/api/commands/route.ts`.
- **Env flags for local ledgers** — `PULSE_*`, `TENSORZERO_*`, `LEAD_INTEL_*`, `NOVU_*` prefixes; disable switches end in `_DISABLED`.

## Structure

- **Command Center logic** lives in `apps/pulse/lib/command-center/` — routing, synonyms, relay plans, query memory; not in React components except display (`components/command-center/`).
- **TAH core** lives in `apps/pulse/lib/core/` (`tah_retriever_v3_6.ts`, `segmented_expert_atlas.ts`, `tah_master.ts`); cartridges on disk under `apps/pulse/cartridges/`.
- **API handlers** validate with Zod, call lib functions, attach traces (Langfuse flush, TensorZero record, Command Post snapshot), return `NextResponse.json`.
- **Unit tests** live in `apps/pulse/tests/unit/` mirroring feature areas (`command-center.test.ts`, `segmented-expert-atlas.test.ts`); isolate side effects with temp env paths in `afterEach`.
- **Monorepo scripts** at repo root delegate to workspaces (`npm run pulse:dev` → `apps/pulse`).

## Patterns

Always gate operator-only surfaces through `getOperatorAccess` — never expose Command Post internals on denied hosts:

```typescript
// Correct — check host + session before returning operator details
const access = await getOperatorAccess(getRequestHostFromHeaders(request.headers));

// Wrong — assuming localhost Host header on a public deployment
if (request.headers.get('host')?.includes('localhost')) { /* allow */ }
```

Extend workers by adding roster entries + relay template mappings — do not create standalone worker handler files:

```typescript
// Correct — add to intelligenceWorkers[] with commandFit + tahLoadout
{ id: 'school-district', commandFit: ['school district', 'zoning'], tahLoadout: ['school_district_intel.tah'], ... }

// Wrong — new lib/command-center/workers/school-district.ts with its own HTTP entry
```

Disable local mutation side effects in tests via env, not mocks of fs global:

```typescript
process.env.PULSE_QUERY_MEMORY_DISABLED = 'true';
process.env.PULSE_QUERY_MEMORY_PATH = path.join(os.tmpdir(), `pulse-query-memory-${Date.now()}.tah`);
```

## Verify Checklist

Before presenting any Command Center or TAH change:

- [ ] Worker `commandFit` phrases cover realistic user commands (see `command-center.test.ts` routing examples)
- [ ] New relay templates have provenance/source anchor fields and a delivery mode from the five supported modes
- [ ] Operator-guarded routes call `getOperatorAccess` / route auth helpers — no production localhost bypass
- [ ] Local ledger writes respect `*_DISABLED` env flags and use gitignored paths under `cartridges/`
- [ ] API schemas use Zod with explicit max lengths and enum constraints matching `CommandRequestSchema`
- [ ] Unit tests restore env vars in `afterEach` when touching query memory, SQLSync, or TensorZero paths
- [ ] Langfuse observations use redacted metadata helpers in `langfuseTracing.ts`, not raw command text in spans
