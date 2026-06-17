# Changelog

## v0.2.0 - TAH Command Center

Date: 2026-06-16

This release refactors Sunset Pulse around a TAH-powered command center for real estate agents.

### Added

- Command Center route at `/command-center`.
- Smash-inspired professional worker selection UI.
- Command API at `POST /api/commands`.
- Relay catalog API at `GET /api/commands`.
- Specialized command-center workers:
  - Lead Scoring
  - Listing Summary
  - Neighborhood Explainer
  - Buyer Intent
  - Follow-Up Writer
  - Comp Analysis
  - Local Commerce
  - Agent Voice
  - Market Movement
  - Supervisor Check
  - Objection Scripts
  - Listing Spark
- First-party TAH loadout capsules:
  - `agent_brand.tah`
  - `lead_history.tah`
  - `listing_context.tah`
  - `neighborhood_context.tah`
  - `comps_context.tah`
  - `objection_scripts.tah`
  - `local_business_context.tah`
  - `market_rules.tah`
- Segmented expert atlas support for 400 shard experts.
- Metadata, density, vitality, and recursive concept-link retrieval policy.
- Synonym expansion for command routing and shard matching.
- TAH Fact of the Day endpoint and UI.
- Relay template system with 68 content templates.
- Delivery modes:
  - briefing
  - slideshow
  - puppetshow
  - field-board
  - script
- Final provenance screen for every relay plan.
- Local query memory via `query_memory.tah`.
- Documentation:
  - `apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md`
  - `apps/pulse/docs/TAH_QUERY_MEMORY.md`
  - `apps/pulse/docs/releases/v0.2.0-tah-command-center.md`

### Changed

- README now reflects Sunset Pulse as a TAH-powered agent command center.
- Command routing now prefers real TAH loadout capsules over virtual placeholders.
- Command outputs now include relay plans and local query-memory trace data.
- `.gitignore` now allows the first-party command-center `.tah` capsules while keeping generated and local memory cartridges ignored.

### Verification

- TypeScript check:
  - `npx tsc -p apps/pulse/tsconfig.json --noEmit --pretty false`
- API smoke tests:
  - command routing
  - relay catalog
  - slideshow mode
  - puppetshow mode
  - query-memory save and recall
- Browser smoke:
  - `/command-center` loads
  - delivery controls render
  - developer tools and memory panel render
