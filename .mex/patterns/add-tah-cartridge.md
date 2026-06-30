---
name: add-tah-cartridge
description: Import, forge, or pack TAH cartridges and wire them into worker loadouts or the segmented expert atlas.
triggers:
  - "import cartridge"
  - "tah import"
  - "pack atlas"
  - "markitdown"
  - "forge tah"
edges:
  - target: context/tah.md
    condition: before importing — understand hat/tah pair layout and on-disk paths
  - target: context/setup.md
    condition: when installing Python dependencies or running npm tah scripts
  - target: patterns/add-command-worker.md
    condition: when adding the new cartridge to a worker tahLoadout
last_updated: 2026-06-26
---

# Add TAH Cartridge

## Context

Load `context/tah.md`. Cartridges live under `apps/pulse/cartridges/`. Command Center retrieval reads the **segmented expert atlas** (`expert-atlas/segmented_expert_atlas.{hat,tah}`), not every loose `.tah` file automatically.

## Steps

1. **Choose ingestion path:**
   - Document → `npm run tah:import-doc -- -- "<path>" --title "Title" --aliases "a,b"` (requires MarkItDown Python deps)
   - Web lead intel → `POST /api/intelligence/crawl-lead` with `importToTah: true` (operator-guarded, domain allowlist)
   - Manual forge → `lib/core/tah_builder.ts` / forge routes under `/api/tah/`
2. Confirm output lands in `cartridges/imports/` (or intended subdirectory) as `*.tah` (+ optional `.source.md` audit).
3. Add filename to relevant `tahLoadout` arrays in `workerRoster.ts` if a worker should prefer this cartridge.
4. Rebuild segmented atlas: from `apps/pulse`, `npm run tah:pack-expert-atlas` (and `tah:pack-master` if master archive needs updating).
5. Optional: `npm run tah:lancedb:index` for LanceDB experiments (separate from atlas path).
6. Add glossary entry in `lib/glossary/siteGlossary.ts` if the cartridge defines public acronyms/terms.
7. Run targeted tests: `tah-packager.test.ts`, `segmented-expert-atlas.test.ts`, or `command-center.test.ts` retrieve cases.

## Gotchas

- Imported `.tah` files are gitignored by default — do not assume CI has your local cartridge.
- Import without atlas repack → worker `tahLoadout` references file but retrieve stage won't find shards — always repack atlas for Command Center retrieval.
- MarkItDown failures usually mean missing `requirements-markitdown.txt` or wrong `python` on PATH.
- Crawl4AI requires `LEAD_INTEL_ALLOWED_DOMAINS` and operator access — unlisted domains are rejected.
- Large PDFs are trimmed by `--max-chars` (default 160000) — long sources may lose tail content silently.

## Verify

- [ ] `.tah` (and `.hat` if applicable) exist at expected paths
- [ ] `segmented_expert_atlas.{hat,tah}` timestamps updated after pack script
- [ ] Command run returns `trace.selectedShards` referencing new source filename
- [ ] Glossary link resolves at `/tah/<slug>` when configured
- [ ] Cartridge not accidentally committed if gitignored

## Debug

Empty shards after import → verify atlas pack logs, run `npm run tah:lancedb:search` to confirm text indexed separately. Atlas diagnostics in API trace show `payloadReads: 0` when shards rejected by domain mask.

## Update Scaffold

- [ ] Update `.mex/ROUTER.md` "Current Project State" if what's working/not built has changed
- [ ] Update any `.mex/context/` files that are now out of date
- [ ] If this is a new task type without a pattern, create one in `.mex/patterns/` and add to `INDEX.md`
