# Sunset Pulse

Sunset Pulse is a real estate command center built around local TAH intelligence.

Instead of sending every task to a massive remote model, Sunset Pulse packages domain knowledge into compact `.tah` cartridges. It routes commands to targeted AI workers and keeps query memory on your local machine so future lookups remain fast and token-efficient.

## What It Does

- Gives agents specialized AI workers to run targeted tasks instead of chatting with a single generic bot.
- Uses binary `.tah` cartridges as the primary structured context layer.
- Packs large domain libraries into a 400-expert atlas for quick sub-millisecond retrieval.
- Routes commands through dedicated workers including Lead Scoring, Follow-Up Writer, Neighborhood Explainer, Comp Analysis, Local Commerce, Agent Voice, and Supervisor Check.
- Runs the Command Center engine through an observable LangGraph-style workflow with distinct stages for routing, context retrieval, planning, synthesis, supervision, local memory, and response formatting.
- Offers five distinct output modes: briefing, slideshow, puppetshow, field-board, and script.
- Includes a provenance summary on every result showing exactly where the data originated.
- Saves query memory to a local `query_memory.tah` cartridge so repeated queries reuse context automatically.
- Integrates hover definitions for acronyms and terms directly from local `.tah` cartridges.
- Shares Command Center context with Jamie so chat responses use the same background helper notes.
- Delivers image-verified MLS inventory through a shared discovery engine for Jamie and the public API.
- Features a local Play Jamie game room with complete legal chess, falling blocks, heads-up Texas Hold'em, and beach volleyball.

## Current Release

Current local release: **v0.3.0 - Research Desk**

Recent additions:
Research Desk WIP eliminates data entry bottlenecks so agents spend less time filling out web forms and more time working with clients. Instead of forcing someone to manually enter 15 fields for every prospective lead, the engine accepts unstructured text, parses it asynchronously, verifies the facts, and routes the lead to the correct pipeline stage.

Single Table Design:
The underlying schema relies on clear Enum state transitions (such as research, new, and contacted). This allows incoming leads to move seamlessly from an unverified Investigation Desk into an active sales pipeline via basic state updates while keeping attachments, property records, and notes intact.

## SaaS Agent Sites (WIP)

Sunset Pulse is expanding from an individual agent command center into a multi-tenant platform for real estate agents. New agents will be able to launch branded consumer sites with an AI assistant, fresh MLS listings, and lead capture without editing code.

### Vibe CMS review status

The first Vibe CMS vertical is implemented locally: structured drafts, immutable review revisions, publication, Launch Kit application, public visual/voice projection, lifecycle audits, and rollback. It remains pre-merge pending PR-scope disposition and deployed operator verification.

- [Luna implementation baseline](apps/pulse/docs/VIBE_CMS_LUNA_BASELINE.md)
- [Sol review and remediation report](apps/pulse/docs/VIBE_CMS_SOL_REVIEW_REPORT.md)

Target URL structure:
```text
{agent}.sunsetpulse.app
{agent}.sunsetpulse.app/properties/{mlsId}
```

Current progress:
- **Swappable agent profiles**: Loads agent names, brokerage info, licenses, market areas, photos, assistant names, and compliance text from profile records.
- **Subdomain tenant routing**: Directs traffic based on subdomains like `taz.sunsetpulse.app`.
- **Clean public shell**: Hides internal command center tools and developer utilities on public consumer pages.
- **MLS hot-list publishing**: Lets agents feature specific MLS IDs on their homepage.
- **Image validation rule**: Filters out listings with missing or broken image links so cards never render blank.
- **Branded detail pages**: Renders listing photos, price, specs, agent callouts, and disclaimers at `/properties/:id`.
- **Lead routing**: Directs inquiries to the agent's preferred contact email and phone.
- **Compliance controls**: Manages footers, MLS disclaimers, and equal-housing copy per agent profile.
- **Custom assistant branding**: Allows renaming or re-skinning Jamie for individual agent brands.
- **Supabase configuration**: Stores agent, assistant, compliance, and integration settings in structured JSON fields.
- **Seed scripts**: Includes automated scripts to insert or update agent profiles without hand-editing SQL tables.

Backlog:
- Admin UI for editing agent profiles without running database scripts.
- Custom domain mapping for agent subdomains.
- Per-agent MLS source controls and default filter settings.
- Branded lead capture forms to complement standard email and phone links.
- Automated social preview images and meta tags for listings.
- Completeness checker to prevent publishing incomplete agent profiles.

## Monorepo Layout

```text
SunsetPulse/
  apps/
    pulse/                  Next.js app for Sunset Pulse
      app/command-center/   Agent command center route
      app/jamie-chat/       Maximized assistant-ui Jamie workspace
      app/play-jamie/       Jamie game room, chess, Block Drop, poker, and volley routes
      app/api/commands/     Command router API
      app/api/agents/       AI agent framework endpoints
      app/api/sqlsync/      SQLSync-ready mutation snapshots
      app/api/tensorzero/   TensorZero evaluation and JamieChat snapshots
      app/api/kepler/       Kepler.gl dataset feeds
      app/api/properties/discover/
                            Image-qualified MLS discovery API
      app/api/intelligence/ Lead intelligence ingestion APIs
      app/api/notifications/ Novu notification workflow APIs
      app/api/jamie/chat/   Jamie chat alias wired to the shared helper route
      app/api/tah/          TAH catalog, fact, forge, and search APIs
      cartridges/           Local TAH inputs and generated archives
      components/           UI components
      components/glossary/  Shared hover/link glossary renderer
      docs/                 Pulse-specific docs
      lib/command-center/   Workers, router, synonyms, relay templates, query memory
      lib/agents/           VoltAgent and agent-framework adapters
      lib/core/             TAH, Memoria, atlas, and orchestration primitives
      lib/glossary/         Site glossary terms mapped to TAH source cartridges
      lib/observability/    Langfuse tracing helpers
      lib/sqlsync/          SQLSync-ready mutation journal helpers
      lib/tensorzero/       TensorZero-ready evaluation ledgers
      lib/lead-intel/       Crawl4AI lead intelligence ledger helpers
      lib/notifications/    Novu notification workflow helpers
      lib/data/             Canonical listing contract, repository, MLS sync, and discovery engine
      lib/jamie-games/      Local game rules, opponents, and commentary
      scripts/              TAH import, packing, and local index utilities
      tensorzero/            TensorZero gateway config stubs
      workers/lead-intel-crawler/
                               Optional Python Crawl4AI worker
  packages/                 Shared workspace packages
  assets/                   Static and generated assets
```

## Architecture

```mermaid
flowchart TD
  Agent["Real Estate Agent"] --> UI["Command Center UI"]
  UI --> API["/api/commands"]
  API --> Graph["LangGraph-Shaped Command Workflow"]
  Graph --> Route["Route Worker"]
  Graph --> Retrieve["Retrieve Context"]
  Graph --> Plan["Plan Relay"]
  Graph --> Synthesize["Synthesize Answer"]
  Graph --> Supervise["Supervisor Check"]
  Graph --> Remember["Remember Query"]
  Graph --> Observe["Langfuse Tracing"]
  API --> TZero["TensorZero Evaluation Backbone"]
  API --> Volt["VoltAgent Advisor"]
  API --> Kepler["Kepler Spatial Lab"]
  Route --> Workers["Specialized Workers"]
  Retrieve --> Atlas["Segmented Expert Atlas"]
  Retrieve --> Memory["Local query_memory.tah"]
  Graph --> Jamie["Jamie Chat Context"]
  Jamie --> TZero
  API --> Crawl4AI["Crawl4AI Lead Intel"]
  API --> Novu["Novu Notifications"]
  Agent --> Discovery["MLS Discovery API"]
  Discovery --> Listings["Canonical Supabase MLS Cache"]
  Discovery --> Jamie
  Atlas --> TAH["TAH Cartridges"]
  TAH --> Glossary["Hover Glossary + Source Links"]
  Workers --> Plan
  Plan --> Relay["Relay Template Planner"]
  Synthesize --> Output["Briefing / Slides / Puppetshow / Board / Script"]
  Relay --> Output
  Output --> Final["Final Provenance Screen"]
  Final --> Agent
```

## Graph-Derived Code Map

The map below was verified against a local Codebase Memory index on August 13, 2026. The fast index found 47,186 nodes and 192,852 relationships across TypeScript, JavaScript, Python, CSS, SQL, YAML, C#, and supporting files. It recognized 435 route nodes and 481 HTTP call relationships.

The repository also contains substantial scheduling and shared platform code under `apps/scheduling`, `apps/api/v2`, and `packages`. Those systems dominate repository-wide hotspot rankings, so Sunset Pulse product analysis should normally begin with the scoped `apps/pulse` domains below.

```mermaid
flowchart LR
  Surfaces["Product surfaces<br/>Command Center / Jamie / Agent Leads / Atlas"]
  Routes["Next.js API boundary<br/>apps/pulse/app/api<br/>176 route files"]
  Command["Command orchestration<br/>lib/command-center<br/>306 nodes / 996 edges"]
  Intelligence["Jamie and TAH intelligence<br/>lib/ai<br/>461 nodes / 1,183 edges"]
  Core["Shared runtime and security<br/>lib/core<br/>708 nodes / 1,719 edges"]
  Listings["Canonical listing data<br/>lib/data<br/>253 nodes / 689 edges"]
  Storage["Supabase / Mongo / local TAH<br/>cartridges and event ledgers"]
  Workers["Specialized workers<br/>retrieval / synthesis / supervision"]

  Surfaces --> Routes
  Surfaces --> Command
  Surfaces --> Intelligence
  Routes --> Core
  Routes --> Command
  Routes --> Intelligence
  Routes --> Listings
  Command --> Workers
  Command --> Intelligence
  Command --> Listings
  Intelligence --> Core
  Intelligence --> Listings
  Core --> Storage
  Listings --> Storage
```

High-value graph entry points:

| Domain | Entry points and hotspots |
| --- | --- |
| Command Center | `runCommandCenterCommand`, `retrieveContextNode`, `applyTahRetrievalPolicy`, `buildCommandDeliverable` |
| Jamie | `getJamieResponse`, `runPublicJamieGuide`, `sanitizeJamieReply`, `resolveJamieListingContext` |
| TAH and Atlas | `listPulseCartridges`, `pulse_search`, `getCartridgeMetadata`, `getTahIndices` |
| Listings | `normalizeListing`, `searchListings`, `getListingById`, `discoverListings` |
| Security and APIs | `requireOperatorRouteAccess`, `getSessionUser`, `errorResponse`, `successResponse` |
| Agent operations | `AgentConsole`, `AgentSelectionArena`, `AgentLeadActions`, `trackAgentConsoleEvent` |

### Local Code Graph

Codebase Memory is an optional local engineering tool. Its executable and generated graph are intentionally excluded from Git:

```text
.local-tools/codebase-memory-mcp/
.codebase-memory/
```

With the verified executable installed at the ignored local path, refresh the fast index:

```powershell
.\.local-tools\codebase-memory-mcp\app\codebase-memory-mcp.exe cli --progress index_repository --repo-path "C:\Users\Taz\SunsetPulse" --mode fast --name SunsetPulse --persistence false
```

Query a product domain:

```powershell
.\.local-tools\codebase-memory-mcp\app\codebase-memory-mcp.exe cli get_architecture --project SunsetPulse --path apps/pulse/lib/command-center --aspects overview
```

Start the persistent local graph application and open `http://127.0.0.1:9749`:

```powershell
.\.local-tools\codebase-memory-mcp\app\codebase-memory-mcp.exe daemon start
```

Fast mode intentionally excludes tests and other filtered files. Treat graph absence as provisional until `check_index_coverage` and direct source inspection confirm the relevant paths.

## MLS Discovery Engine

Sunset Pulse serves property search queries from a local canonical MLS cache. This avoids making slow external API calls during page loads. Both Jamie and the public discovery API rely on this shared engine:

```text
GET /api/properties/discover
```

A property listing is eligible for discovery only when it meets four strict criteria:
- Sourced from active MLS sync data.
- Explicitly marked active, non-demo, and approved for public display.
- Updated within the designated freshness window (30 days by default).
- Accompanied by at least one valid HTTPS photo URL.

Query parameters:

| Parameter | Purpose |
| --- | --- |
| `location`, `city`, `zipcode` | Address or market text match |
| `propertyType`, `propertyTypes` | One or more types; repeat or comma-separate values |
| `priceMin`, `priceMax` | Inclusive price range (`minPrice` and `maxPrice` are aliases) |
| `bedsMin`, `bedsMax`, `bathsMin`, `sqftMin` | Minimum or maximum property attributes |
| `bounds=west,south,east,north` | Map viewport filter, including antimeridian-aware bounds |
| `center=longitude,latitude` + `radiusMiles` | Radius filter and distance calculation |
| `sort` | `newest`, `price_asc`, `price_desc`, or `distance` |
| `page`, `pageSize` | Page controls (capped at 100 per page) |
| `maxAgeHours` | Override default freshness window up to 8760 hours (one year) |

Example query:

```bash
curl "http://127.0.0.1:3000/api/properties/discover?city=Frisco&propertyType=Single%20Family&priceMin=500000&priceMax=900000&bedsMin=4&pageSize=12"
```

Key code files:
```text
apps/pulse/lib/data/listingDiscovery.ts
apps/pulse/lib/data/listingRepository.ts
apps/pulse/lib/data/listingContract.ts
apps/pulse/app/api/properties/discover/route.ts
apps/pulse/lib/ai/jamieTools.ts
```

Run database migrations before launching:
```text
apps/pulse/supabase/migrations/20260704000000_listing_discovery_indexes.sql
```

## Integration Roadmap

The app combines five core technology integrations:

1. **deck.gl**: High-performance WebGL layers for mapping listings, leads, and market signals.
2. **VoltAgent**: Typed agent runtime for managing Command Center tools.
3. **SQLSync**: Offline-first synchronization for local query memory and operator state.
4. **TensorZero**: Model gateway, evaluation framework, and prompt iteration tools.
5. **OpenLIT**: OpenTelemetry observability for tracking model and app performance.

Status update:
- deck.gl is live at `/spatial-lab/deck`.
- VoltAgent runs at `/api/agents/voltagent/command-advisor`.
- SQLSync is integrated at `/api/sqlsync/command-journal`.
- TensorZero records metrics at `/api/tensorzero/command-evals`.
- OpenLIT tracing is queued for upcoming work.

Read the stack documentation at [apps/pulse/docs/AI_INTEGRATION_STACK.md](apps/pulse/docs/AI_INTEGRATION_STACK.md).

## TAH Intelligence Layer

TAH files store focused domain knowledge. The system comes pre-loaded with several built-in cartridges:

- `agent_brand.tah`
- `lead_history.tah`
- `listing_context.tah`
- `neighborhood_context.tah`
- `comps_context.tah`
- `objection_scripts.tah`
- `local_business_context.tah`
- `market_rules.tah`

You can also bundle broader context libraries into a master atlas:

```text
apps/pulse/cartridges/expert-atlas/segmented_expert_atlas.hat
apps/pulse/cartridges/expert-atlas/segmented_expert_atlas.tah
```

The expert atlas index allows the retriever to jump to relevant segments instantly and filter out non-matching shards based on domain masks, density scores, and concept links.

## Command Center

Web interface:
```text
/command-center
```

API routes:
```text
GET  /api/commands     # Get available templates and output formats
POST /api/commands     # Route a command through worker logic and TAH retrieval
POST /api/jamie/chat   # Send chat queries using shared Command Center context
```

Example request:
```bash
curl -X POST http://127.0.0.1:3002/api/commands \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"Explain the community and nearby shops\",\"relayMode\":\"slideshow\",\"supervisor\":true}"
```

Supported relay modes:
- `briefing`
- `slideshow`
- `puppetshow`
- `field-board`
- `script`

## LangGraph Workflow

The command router uses a LangGraph node graph to keep execution transparent and testable. Each step handles a specific responsibility:

- `route`: Selects the appropriate worker and routing style.
- `retrieve`: Reads local query memory and pulls TAH context from the expert atlas.
- `plan`: Chooses the relay template and presentation format.
- `synthesize`: Generates the structured answer.
- `supervise`: Runs compliance and quality checks.
- `remember`: Writes the result to local query memory.
- `respond`: Formats the final JSON response payload.

Implementation:
```text
apps/pulse/lib/command-center/commandRouter.ts
apps/pulse/lib/compat/langgraphLinear.ts
```

## Command Post

The Command Post panel provides quick links back to the operator console without cluttering the main UI.

Monitored telemetry:
- Operator console endpoint status.
- Access modes and permission checks.
- Master archive readiness.
- Pending task counts.
- Command router state.
- Health check results from `/status`.

Security rules:
- Production instances block header spoofing attempts.
- Development servers enforce host authorization.

Code references:
```text
apps/pulse/components/command-center/AgentSelectionArena.tsx
apps/pulse/lib/core/operator_access.ts
apps/pulse/lib/core/routeAuth.ts
apps/pulse/app/api/admin/orchestrator/
```

## VoltAgent Advisor

A VoltAgent command advisor assists with worker routing and tool selection.

Endpoints:
```text
GET  /api/agents/voltagent/command-advisor   # View advisor status and available tools
POST /api/agents/voltagent/command-advisor   # Execute advisor logic directly
```

Available tools:
- `route_command`: Matches incoming prompts with the right worker.
- `list_worker_loadout`: Returns active TAH cartridges for a worker.
- `summarize_command_center`: Reports system coverage and active worker slots.
- `evaluate_worker_fit`: Calculates confidence scores for potential worker choices.

Enable model-backed recommendations:
```bash
VOLTAGENT_COMMAND_MODEL=groq/llama-3.1-8b-instant
GROQ_API_KEY=your_groq_key_here
```

Turn off the advisor:
```bash
VOLTAGENT_COMMAND_ADVISOR_ENABLED=false
```

## Relay Templates

Relay templates guide how retrieved TAH information is transformed into final deliverables.

The catalog includes 68 content templates and 5 output formats. See [apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md](apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md) for complete details.

Each plan configures:
- Content template and delivery format.
- Visual layout and formatting rules.
- Wording guidelines and section notes.
- Source anchors and provenance details.

## Semantic Glossary

Acronyms and industry terms automatically display hover definitions powered by TAH cartridges.

Glossary features:
- Displays a short definition on hover or focus.
- Preserves original text formatting in the document.
- Maps terms to their source `.tah` cartridge.
- Links terms directly to dedicated cartridge pages.

Supported glossary locations:
- Command Center answers and excerpts.
- TAH library pages.
- Master search results.
- Jamie chat messages.

Code paths:
```text
apps/pulse/lib/glossary/siteGlossary.ts
apps/pulse/components/glossary/GlossaryText.tsx
```

## Local Query Memory

Sunset Pulse records query details locally after every command execution:

```text
apps/pulse/cartridges/query_memory.tah
```

This file stays on your local machine and is excluded from Git.

Stored fields:
- Prompt text, intent, and selected worker.
- Relay template and display mode.
- Source TAH files used in the response.
- Key concepts, summary notes, and suggested actions.

Disable memory saving:
```bash
PULSE_QUERY_MEMORY_DISABLED=true
```

Set a custom memory location:
```bash
PULSE_QUERY_MEMORY_PATH=C:\path\to\query_memory.tah
```

Read the guide at [apps/pulse/docs/TAH_QUERY_MEMORY.md](apps/pulse/docs/TAH_QUERY_MEMORY.md).

## SQLSync Journal

Command Center mutations are logged to a SQLSync mutation journal. This provides an offline-first contract for future data synchronization.

Journal endpoint:
```text
GET /api/sqlsync/command-journal
```

Supported mutation actions:
- `upsert_command_query_memory`
- `upsert_command_action_memory`

Journal path:
```text
apps/pulse/cartridges/sqlsync/command-journal.sqlsync.jsonl
```

Environment settings:
```bash
PULSE_SQLSYNC_CLIENT_ID=sunset-pulse-local
PULSE_SQLSYNC_JOURNAL_DISABLED=false
PULSE_SQLSYNC_JOURNAL_PATH=C:\path\to\command-journal.sqlsync.jsonl
```

## TensorZero Evaluations and Feedback

The app logs evaluation data and user feedback for every Command Center query and JamieChat turn.

Endpoints:
```text
GET /api/tensorzero/command-evals
GET /api/tensorzero/jamie-chat
GET /api/tensorzero/feedback
POST /api/tensorzero/feedback
```

Tracked functions:
- `sunset_command_center`
- `jamie_chat`

User feedback triggers:
- Copying an answer records usefulness.
- Clicking an action item records actionability.
- Manually changing workers records a routing correction.
- Re-running a command signals that the answer needed improvement.

Config files and ledgers:
```text
apps/pulse/cartridges/tensorzero/command-evaluations.tensorzero.jsonl
apps/pulse/cartridges/tensorzero/command-feedback.tensorzero.jsonl
apps/pulse/cartridges/tensorzero/jamie-chat.tensorzero.jsonl
apps/pulse/tensorzero/tensorzero.toml
```

## Crawl4AI Lead Intelligence

An operator endpoint allows crawling approved real estate pages to create structured TAH cartridges for lead scoring.

Endpoints:
```text
GET  /api/intelligence/crawl-lead
POST /api/intelligence/crawl-lead
```

Setting `importToTah: true` generates both a human-readable audit file (`.source.md`) and a binary `.tah` cartridge under `apps/pulse/cartridges/imports/lead-intel/`.

Install crawler dependencies:
```bash
python -m pip install -r workers/lead-intel-crawler/requirements.txt
python -m playwright install chromium
```

## Novu Notifications

Sunset Pulse uses a unified Novu notification adapter to send lead alerts, scheduling updates, and system events.

Endpoints:
```text
GET  /api/notifications/novu
POST /api/notifications/novu
```

If `NOVU_SECRET_KEY` is not provided, events are safely queued to a local ledger file (`apps/pulse/cartridges/notifications/novu-events.jsonl`) for inspection during development.

## Langfuse Observability

You can trace Command Center runs to Langfuse by setting your API keys in the environment.

Each request generates a root `command-center.graph` trace containing sub-spans for every stage of execution. Trace payloads record execution metrics, worker choices, and diagnostic data without exposing private prompt text or model outputs.

Environment configuration:
```bash
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_BASE_URL=https://us.cloud.langfuse.com
LANGFUSE_TRACING_ENVIRONMENT=development
LANGFUSE_RELEASE=local
```

## Kepler Spatial Lab

An interactive Kepler.gl lab enables visual analysis of property listings and market trends.

Access the workspace at `/spatial-lab`. Data is loaded from `/api/kepler/listings?limit=140`.

Exposed fields:
- Geographic coordinates (latitude and longitude).
- List price, original price, valuation, and price deltas.
- Days on market, square footage, beds, baths, and year built.
- Image quality score, listing status, neighborhood, and brokerage.

## deck.gl Signal Map

The native deck.gl signal map provides a custom WebGL mapping surface for real estate signals at `/spatial-lab/deck`.

Active map layers:
- Market state point markers.
- Price-weighted heatmap visualization.
- Days-on-market radius indicators.
- Interactive hover cards showing price, specs, and photo quality.

## Play Jamie

Play Jamie features deterministic, offline games that require no external API keys or token costs.

Game routes:
```text
/play-jamie         # Game catalog
/play-jamie/chess   # Complete chess game
/play-jamie/tetris  # Falling block puzzle game
/play-jamie/poker   # Heads-up Texas Hold'em
/play-jamie/volley  # Beach volleyball arcade game
```

Available games:
- **Chess**: Fully compliant moves, castling, en passant, promotion, and checkmate powered by `chess.js`. Includes three Jamie difficulty levels, move undo, captured pieces display, and local win tracking.
- **Block Drop**: Seven-piece randomizer, wall kicks, ghost piece previews, touch controls, and high scores.
- **Texas Hold'em**: 52-card deck, virtual chip bets, hand evaluation, opponent AI, and match history logs.
- **Volleyball**: Physics-based rallies, jump timing, collision detection, and score tracking to 7 points.

## Getting Started

Install dependencies:
```bash
npm install
```

Start the development server:
```bash
npm run pulse:dev
```

Open the command center in your browser:
```text
http://127.0.0.1:3000/command-center
```

## Useful Commands

Root scripts:
```bash
npm run pulse:dev
npm run pulse:build
npm run test:unit
npm run test:e2e
```

App-specific scripts (`apps/pulse`):
```bash
npm run tah:import-doc -- -- ./path/to/source.pdf --title "Imported Source"
npm run tah:lancedb:index
npm run tah:lancedb:search -- --query "pricing comps"
npm run lead:intel:crawl -- --url https://example.com --mode both --hints "{}"
npm run tah:pack-expert-atlas
npm run tah:pack-master
npm run test:unit
npm run build
```

## Importing Documents Into TAH

Convert PDFs, spreadsheets, forms, and presentations into TAH cartridges using MarkItDown:

```bash
python -m pip install -r apps/pulse/requirements-markitdown.txt
npm run tah:import-doc -- -- "C:\path\to\market-report.pdf" --title "Market Report" --aliases "market, comps, pricing"
```

Output files are stored under `apps/pulse/cartridges/imports/`.

## Local LanceDB Search

Index TAH cartridges locally for fast BM25 search testing:

```bash
npm run tah:lancedb:index
npm run tah:lancedb:search -- --query "seller pricing comps"
```

The database index is stored locally at `apps/pulse/.lancedb/`.

## Verification

Run local build and test checks:
```bash
npx tsc -p apps/pulse/tsconfig.json --noEmit --pretty false
npm exec --workspace apps/pulse -- vitest run tests/unit/listing-discovery.test.ts tests/unit/listing-read-surfaces.test.ts tests/unit/jamie-tools.test.ts
npm run test:unit
npm run security:audit:prod
npm run build --workspace apps/pulse
npm run tah:pack-expert-atlas --workspace=apps/pulse
```

Test endpoints:
```bash
curl "http://127.0.0.1:3000/api/properties/discover?city=Frisco&pageSize=6"
curl -X POST http://127.0.0.1:3002/api/commands \
  -H "Content-Type: application/json" \
  -d "{\"command\":\"Give me a valuation using recent sales\",\"relayMode\":\"slideshow\",\"supervisor\":true}"
```

## Documentation Links

- [apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md](apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md)
- [apps/pulse/docs/TAH_QUERY_MEMORY.md](apps/pulse/docs/TAH_QUERY_MEMORY.md)
- [apps/pulse/docs/CMS_USB_BRIDGE.md](apps/pulse/docs/CMS_USB_BRIDGE.md)
- [apps/pulse/docs/LOCAL_NEWS_SIGNALS.md](apps/pulse/docs/LOCAL_NEWS_SIGNALS.md)

## Untracked Artifacts

The repository untracks large generated binaries by default. Keep these local paths out of Git:
- `apps/pulse/cartridges/query_memory.tah`
- `apps/pulse/cartridges/expert-atlas/segmented_expert_atlas.hat`
- `apps/pulse/cartridges/expert-atlas/segmented_expert_atlas.tah`
- `apps/pulse/.lancedb/`

## Project Status

Sunset Pulse prioritizes local-first architecture and small, affordable models paired with private TAH context over heavy remote infrastructure.
