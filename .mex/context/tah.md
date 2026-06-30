---
name: TAH & Memoria
description: TAH binary intelligence format, atlas packing, retrieval, import scripts, and query memory cartridges.
triggers:
  - "tah"
  - "cartridge"
  - "expert atlas"
  - "memoria"
  - "lancedb"
  - "query memory"
  - "markitdown import"
edges:
  - target: context/command-center.md
    condition: when cartridges feed the retrieve stage or worker tahLoadout lists
  - target: context/architecture.md
    condition: when understanding how TAH fits into the broader Pulse monorepo
  - target: patterns/add-tah-cartridge.md
    condition: when importing, forging, or packing new cartridges into the atlas
  - target: context/setup.md
    condition: when installing Python dependencies or running index/search scripts
last_updated: 2026-06-26
---

# TAH (Tactical Atlas & Heuristics)

TAH is a binary knowledge cartridge format for token-efficient retrieval. Each knowledge unit is a pair:

- **`.hat` (Header Atlas)** — in-memory index: Bloom filter, shard index (80-byte entries per `tah_entry_layout.ts`), source registry.
- **`.tah` (Tactical Data)** — payload bytes; only ranges referenced by the hat are read.

Shard entries store tag, offset, length, source ID, region ID, surgical hash, complexity/relevance floats, ingestion timestamp, and a local 288-bit Bloom filter for sub-keyword matching.

## On-Disk Layout (Pulse app)

```text
apps/pulse/cartridges/
  expert-atlas/segmented_expert_atlas.{hat,tah}   # 400-expert segmented index
  query_memory.tah                                 # local command memory (gitignored)
  imports/                                         # MarkItDown / lead-intel forged cartridges
  sqlsync/command-journal.sqlsync.jsonl
  tensorzero/*.tensorzero.jsonl
  lead-intel/crawl-results.jsonl
```

First-party capsules referenced by workers include `agent_brand.tah`, `lead_history.tah`, `listing_context.tah`, `neighborhood_context.tah`, `comps_context.tah`, `objection_scripts.tah`, `local_business_context.tah`, `market_rules.tah`, plus domain packs (`dallas_community_intel.tah`, `texas_contracts_expertise.tah`, etc.).

## Builder & Pack Scripts

**Python (repo `builder/` and Pulse scripts):**
- `builder/memoria_builder.py`, `segmented_expert_atlas.py`, `memory_forge.py` — compile and pack atlases
- `apps/pulse/scripts/pack-segmented-expert-atlas.ts`, `pack-atlas-master.ts` — npm entry points

**TypeScript retrieval:**
- `lib/core/tah_retriever_v3_6.ts` — v3.6 shard reads
- `lib/core/segmented_expert_atlas.ts` — middle-out disqualification for Command Center retrieve stage
- `lib/core/tah_master.ts` — master archive search/list/fact APIs backing `/api/tah/*`

## Import Pipelines

- **MarkItDown** — `npm run tah:import-doc -- -- "<path>" --title "..."` writes to `cartridges/imports/` (requires `requirements-markitdown.txt`).
- **Crawl4AI lead intel** — `POST /api/intelligence/crawl-lead` with `importToTah: true` writes `.source.md` audit + forged `.tah` under `cartridges/imports/lead-intel/`.

## LanceDB Local Index

Experimental BM25-style search over `.tah` files:

- Index: `npm run tah:lancedb:index` → `apps/pulse/.lancedb/`
- Search: `npm run tah:lancedb:search -- --query "seller pricing comps"`

Does not replace segmented atlas retrieval in Command Center — used for operator experiments.

## Query Memory

After each command, `queryMemory.ts` appends compact records (intent, worker, template, sources, concepts, recap) to `query_memory.tah`.

- Disable: `PULSE_QUERY_MEMORY_DISABLED=true`
- Custom path: `PULSE_QUERY_MEMORY_PATH`
- SQLSync mirror: `upsert_command_query_memory` rows via `lib/sqlsync/commandJournal.ts`

## Glossary & Provenance

Glossary terms in `lib/glossary/siteGlossary.ts` map acronyms (CCS, MLS, TREC, pgvector) to source cartridges; rendered by `components/glossary/GlossaryText.tsx` on Command Center answers, TAH pages, and Jamie chat. Every relay includes source anchors linking shards back to cartridge filenames.

## Binary Index First

Retrieval rejects shards via Bloom/domain masks before payload IO. Command Center trace exposes `atlasDiagnostics` (visited/rejected segments, payload reads) for tuning retrieval policy without reading raw `.tah` bytes in logs.
