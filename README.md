# Sunset Pulse

Sunset Pulse is a real estate platform for property discovery, agent operations, and AI-assisted research. The main application combines public property browsing and Jamie chat with internal command tools, a Vibe editing workspace, and tenant-site workflows.

The codebase also includes scheduling, food-service operations, games, and visualization experiments. These surfaces share a repository, but they do not all have the same configuration requirements or release maturity.

## Start here

- **Explore the app:** [Sunset Pulse](https://www.sunsetpulse.app/), [Agent Console](https://www.sunsetpulse.app/agent), or [Command Center](https://www.sunsetpulse.app/command-center).
- **Find a screen:** use the [app path directory](#app-paths-and-command-navigation) below.
- **Run it locally:** follow [local development](#local-development).
- **Use Docker:** [local Mongo, isolated database tests, and real local Supabase authentication](infra/local/README.md). Start with `npm run docker:status`; acceptance uses `npm run docker:test`.
- **Find the code:** see [architecture and repository layout](#architecture-and-repository-layout).
- **Make a change:** see [commands](#commands), [verification](#verification), and [contributing](#contributing).
- **Continue a feature:** consult the [plans and runbooks](#plans-and-runbooks), then confirm the current implementation in source.
- **Continue platform work:** start with the [current ledger](apps/pulse/docs/SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md#current-ledger-and-next-session) and [next-week implementation handoff](apps/pulse/docs/PLATFORM_WEEK_2026-09-21.md). Praxis and Keller / Westlake remain domain specifications, not competing platform backlogs.

This README is the repository entry point, not a live deployment report. A route in source, a completed planning checkbox, or a passing local test does not establish production availability.

## App paths and command navigation

Open **Browse all app paths** in Agent Console (`/agent`) or Command Center (`/command-center`). Where the global navbar is present, **Ctrl/Cmd+K** searches the same catalog by feature, path, section, and access note.

The inventory covers **109 page route patterns and 5 non-API handlers**. It excludes APIs under `/api/*`, static assets, and framework metadata endpoints. Parallel slots under `/jamie-vibes` and the intercepted TAH modal reuse their parent or canonical URLs; they are not additional paths.

How to read the directory:

- **Public entry** means the screen can be opened, not that every action is anonymous.
- Account, operator, realtor, administrative, and staff/PIN checks still apply. Vibe WIP access is controlled separately by `VIBE_CMS_PUBLIC_WRITE_WIP`.
- Paths containing parameters such as `[id]`, `[slug]`, `[token]`, or `[vibeId]` require a real record or workflow link. The console opens a selection screen when one exists; otherwise it shows **Context required**.
- Checkout returns, signing links, tenant URLs, and booking links must come from their actual workflows. The catalog does not generate placeholder IDs or tokens.

<!-- app-route-catalog:start -->
<details>
<summary>Discover</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/` | Home | Public entry |
| `/explorer` | Explorer | Public entry |
| `/properties` | Properties | Public entry |
| `/properties/search-results` | Property search results | Public entry; Uses optional search query filters. |
| `/listings` | Listings | Public entry |
| `/idx` | IDX Search | Sign-in required |
| `/tour-studio` | Tour Studio | Public entry |
| `/scan-studio` | 3D Scan Studio | Sign-in required; Consent-first phone capture; uploads remain private until agent review. |
| `/valuation` | Property valuation | Public entry; Account-backed actions may require sign-in. |
| `/contact` | Contact | Public entry |
| `/investors` | Investors | Public entry |
| `/properties/[id]` | Property details | Public entry; Choose an existing property; requires its ID. Entry: `/properties`. |
| `/listings/[id]` | Listing details | Public entry; Choose an existing listing; requires its ID. Entry: `/listings`. |
| `/sites/[site]/[[...path]]` | Tenant site pages | Public entry; Use the configured tenant hostname or an existing site ID and optional page path. |

</details>

<details>
<summary>Intelligence and chat</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/agent` | Agent Console | Public entry |
| `/command-center` | Command Center | Public entry |
| `/atlas` | Atlas | Public entry |
| `/jamie-chat` | Jamie Chat workspace | Public entry |
| `/jamie-console` | Jamie Console | Public entry |
| `/jamie-vibes` | Jamie Vibes | Public entry |
| `/sunset-chat` | Sunset Chat | Public entry |
| `/insights` | Jamie Insights | Public entry |
| `/tah` | TAH library | Public entry |
| `/abidan` | Abidan | Public entry |
| `/abidan/war-room` | Abidan War Room | Operator access; Middleware permits realtor, operator, or admin. |
| `/scythe` | Scythe | Sign-in required |
| `/news/tah` | News TAH | Public entry; A source article query supplies the story. |
| `/tah/[slug]` | TAH cartridge | Public entry; Choose a cartridge; requires its slug. Entry: `/tah`. |

</details>

<details>
<summary>Creative and spatial</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/spatial-lab` | Spatial Lab | Public entry |
| `/spatial-lab/deck` | Deck Signals | Public entry |
| `/studio` | Voice Studio | Public entry |
| `/reraster` | Reraster video studio | Public entry |
| `/storytime` | Storytime | Public entry |
| `/worldoftah` | World of TAH | Public entry |
| `/vibe-lab` | Vibe Lab | Public entry |
| `/demo` | Demo | Public entry |
| `/pitch` | Pitch | Public entry |
| `/identity-test` | Identity test | Public entry; Diagnostic / experimental screen. |
| `/briefing/deck/[slug]` | Briefing deck | Sign-in required; Open a deck generated by the command workflow. Entry: `/command-center`. |
| `/briefing/render/[id]` | Rendered briefing | Sign-in required; Open an existing briefing from its generated link. Entry: `/command-center`. |

</details>

<details>
<summary>Games</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/play-jamie` | Play Jamie | Public entry |
| `/play-jamie/chess` | Chess with Jamie | Public entry |
| `/play-jamie/poker` | Poker with Jamie | Public entry |
| `/play-jamie/tetris` | Block Drop | Public entry |
| `/play-jamie/volley` | Sunset Volley | Public entry |
| `/beach-volleyball` | Beach Volleyball | Public entry |
| `/value-guess` | Value Guess | Public entry |
| `/location-guess` | Location Guess | Public entry |
| `/pulse-quest` | Pulse Quest | Public entry |
| `/retail-clash` | Retail Clash | Public entry |

</details>

<details>
<summary>Food and scheduling</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/grill` | Grill ordering | Public entry |
| `/cart` | Cart | Public entry |
| `/counter` | Counter | Public entry |
| `/grill/kds` | Kitchen display | Staff / PIN; Uses the existing kitchen access flow. |
| `/sms-opt-in` | SMS opt-in | Public entry |
| `/grill/tracker/[orderId]` | Order tracker | Public entry; Use the tracking link from a real order; requires its order ID. |
| `/schedule` | Schedule | Public entry; Use a tenant booking link with its site query parameter. |

</details>

<details>
<summary>Account and business</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/login` | Sign in | Public entry |
| `/register` | Register | Public entry |
| `/profile` | Profile | Sign-in required |
| `/dashboard` | Realtor dashboard | Realtor role; Middleware requires the realtor profile role. |
| `/collections` | Collections | Sign-in required |
| `/properties/saved` | Saved properties | Sign-in required |
| `/property-shortlist` | Keller / Westlake shortlist | Sign-in required; Shared owner-scoped property context for Jamie planning. |
| `/sprints` | Sprints | Sign-in required; Shared owner-scoped scheduled planning workspace. |
| `/workspaces/[workspaceId]/inbox` | Workspace inbox | Sign-in required; Authorized workspace checkpoint inbox and pinned app launch surface. Entry: `/dashboard`. |
| `/workspaces/[workspaceId]/runs/[runId]` | Workspace run detail | Sign-in required; Authorized run history, pinned workflow metadata, and checkpoint responses. Entry: `/workspaces/[workspaceId]/inbox`. |
| `/properties/add` | Add property | Sign-in required |
| `/messages` | Messages | Sign-in required |
| `/lead-gen` | Lead generation | Sign-in required |
| `/premium` | Premium plans | Public entry |
| `/contracts/promulgated` | Promulgated contracts | Public entry |
| `/contracts/promulgated/[formId]` | Promulgated contract form | Public entry; Choose an existing promulgated contract form; requires its form ID. Entry: `/contracts/promulgated`. |
| `/contracts/promulgated/templates` | Contract templates | Public entry |
| `/contracts/promulgated/setup` | Contract setup | Sign-in required; Choose a contract and property in the setup workflow. |
| `/contracts/representation` | Representation agreement | Public entry |
| `/iabs` | Brokerage services disclosure | Public entry |
| `/properties/[id]/edit` | Edit property | Sign-in required; Choose a property you can edit; requires its ID. Entry: `/properties`. |
| `/lead-gen/[id]` | Property lead generation | Sign-in required; Choose a property in Lead generation. Entry: `/lead-gen`. |
| `/sign/[token]` | Sign agreement | Public entry; Use the signing link supplied for the agreement; never invent a token. |
| `/onboarding/site` | Site checkout return | Sign-in required; Checkout return requires its session_id; do not open as a blank setup page. |
| `/onboarding/site/setup` | Site setup | Sign-in required; Use the setup link for an existing provisioned site / checkout session. |
| `/auth/success` | Authentication success | Public entry; Authentication return screen; begin with Sign in. Entry: `/login`. |
| `/auth/auth-error` | Authentication error | Public entry; Authentication recovery screen; begin with Sign in. Entry: `/login`. |
| `/auth/callback` | Authentication callback | Public entry; Authentication handler; requires the actual provider callback parameters. |

</details>

<details>
<summary>Vibe CMS</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/vibes` | All Vibes | CMS WIP policy |
| `/vibes/new` | Add Vibe | CMS WIP policy |
| `/vibes/taxonomy` | Vibe taxonomy | CMS WIP policy |
| `/vibes/[vibeId]/edit` | Vibe edit | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/preview` | Vibe preview | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/source` | Vibe source | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/revisions` | Vibe revisions | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/compare` | Vibe compare | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/actions` | Vibe actions | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/submit` | Vibe submit | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/publish` | Vibe publish | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/apply` | Vibe apply | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |
| `/vibes/[vibeId]/audit` | Vibe audit | CMS WIP policy; Choose a Vibe first. Lifecycle, revision, and site context may also be required. Entry: `/vibes`. |

</details>

<details>
<summary>Operations</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/admin/research-desk` | Research Desk | Operator access |
| `/admin/lead-drafts` | Lead drafts | Operator access |
| `/admin/lead-engine` | Lead Engine | Operator access |
| `/admin/agent-leads` | Agent lead queues | Operator access |
| `/admin/launch-kit` | Launch Kit | Operator access |
| `/admin/site-reviews` | Site reviews | Operator access |
| `/admin/hot-list` | Hot List | Operator access |
| `/admin/property-scans` | Property scan review | Operator access; Review consented private captures before 3D reconstruction. |
| `/admin/property-scans/[scanId]/preview` | Property scan 3D preview | Operator access; Choose an approved property scan with a completed manifest preview. Entry: `/admin/property-scans`. |
| `/admin/orchestrator` | Orchestrator | Operator access |
| `/admin/profit` | Profit controls | Operator access; Realtor role alone is not sufficient. |
| `/admin/intelligence` | Intelligence configuration | Administrative screen |
| `/admin/prompts` | Prompt configuration | Administrative screen |
| `/admin/marketing` | Marketing | Administrative screen |
| `/admin/pulse` | Pulse operations | Administrative screen |
| `/admin/cms` | Store / POS CMS | Administrative screen; Store controller console, not the Vibe editor. |
| `/admin/cms/setup` | Store / POS setup | Administrative screen |
| `/admin/scheduling` | Scheduling operations | Staff / PIN; Existing staff workflow; excluded from the middleware admin sign-in redirect. |
| `/admin/sprints` | Sprints (legacy redirect) | Sign-in required; Compatibility route for the shared signed-in sprint workspace. Entry: `/sprints`. |
| `/admin/branding` | Branding (legacy redirect) | Operator access; Redirects to Launch Kit; no separate branding console. Entry: `/admin/launch-kit`. |

</details>

<details>
<summary>Machine-readable resources</summary>

| Path | Screen / resource | Access and entry requirements |
| --- | --- | --- |
| `/llms.txt` | LLM site guide | Public entry; Text response, not a UI page. |
| `/tah/index.json` | TAH index JSON | Public entry; JSON resource, not a UI page. |
| `/tah/headless` | TAH headless library | Public entry; Headless library response. |
| `/tah/[slug]/headless` | TAH headless cartridge | Public entry; Choose a real cartridge slug before requesting its headless response. Entry: `/tah`. |

</details>

<!-- app-route-catalog:end -->

The shared source of truth is [routeCatalog.ts](apps/pulse/lib/navigation/routeCatalog.ts). [CommandRouteDirectory.tsx](apps/pulse/components/command-center/CommandRouteDirectory.tsx) and [GlobalCommandPalette.tsx](apps/pulse/components/GlobalCommandPalette.tsx) consume it. Directory links do not prefetch every screen.

[The catalog test](apps/pulse/tests/unit/app-route-catalog.test.ts) compares the registry with page files and non-API route handlers, checks concrete entry links, and verifies that every catalog path appears in this README.

## What It Does

| Area | Main entry points | Purpose |
| --- | --- | --- |
| Property discovery | `/`, `/properties`, `/explorer`, `/listings` | Browse property inventory, search, and open listing details. Inventory depends on configured data sources. |
| Agent operations | `/agent`, `/dashboard`, `/command-center` | Work with leads, commands, research, and operational tools. Access varies by screen and action. |
| Jamie and knowledge tools | `/jamie-chat`, `/atlas`, `/tah` | Chat, inspect retrieval, and work with local knowledge cartridges and supporting services. |
| Vibe CMS | `/vibes`, `/vibes/new`, `/vibes/taxonomy` | Create structured drafts, manage taxonomy, preview, review revisions, publish, and apply a revision through a separate site workflow. |
| Tenant sites | `/sites/[site]/[[...path]]`, `/admin/launch-kit` | Render configured sites and manage their provisioning and presentation. Existing site and account context may be required. |
| Additional workspaces | `/tour-studio`, `/spatial-lab`, `/play-jamie`, `/grill`, `/schedule` | Explore creative tools, maps, games, food operations, and scheduling. These are separate feature areas, not prerequisites for property browsing. |

### Vibe editing and live sites

Vibe is a structured content and presentation workflow: editable drafts, taxonomy, visual and voice settings, preview, immutable revisions, lifecycle history, and site application.

The important distinction is **draft → revision → site application**. Editing a draft is not the same operation as changing a live site. Publishing and application have separate UI and service paths; use the existing workflow and record the target site and revision when testing.

This does not imply arbitrary plugin installation or that every public homepage element is CMS-editable. Check the current renderer and editor for the fields they actually support. The Vibe plans describe additional scope as well as implemented work.

Use the [UI checklist](apps/pulse/docs/VIBE_CMS_UI_MANUAL_VERIFICATION.md) for screen-level testing and the [production verification record](apps/pulse/docs/VIBE_CMS_PRODUCTION_VERIFICATION.md) for controlled end-to-end evidence.

### TAH and retrieval

TAH is the application's cartridge-based knowledge layer. Local `.tah` files, retrieval helpers, and query memory support the command and assistant workflows. Optional LanceDB indexing supports local search.

Local knowledge storage is not a guarantee of offline operation: model providers, listing data, authentication, and other integrations may still require network access and credentials. Generated indexes and runtime memory are not substitutes for the authoritative application stores.

### Shared operating platform

The platform reuses the durable scheduler for workspace-scoped JSON workflow runs and a single checkpoint API for questions, approvals, and effect gates. The backend includes cursor pagination, cancellation, blocked-run recovery, immutable prior answers on supersession, pinned JSON app installs, a shared workspace inbox, and run details. Connector health checks record fixture-based status, immutable history, idempotent receipts, and bounded audit events through the same scheduler.

The reviewed manifests are currently **human-input intake workflows**, not autonomous property research or content publication. Provider capability dispatch and external effects remain unavailable, and `platform_run` admissions default to disabled. Team-aware planning and resource-bound launches remain open; existing owner-only planners reject unsupported team/mixed scopes. A checkpoint decision is not a delivery receipt or permission to send, publish, or transact.

Use the [capability matrix](apps/pulse/docs/PLATFORM_CAPABILITY_MATRIX.md) for implementation boundaries and the [dated verification record](apps/pulse/docs/PLATFORM_VERIFICATION_2026-09-18.md) for test evidence. Neither implies production rollout.

## Architecture and repository layout

The primary application uses **Next.js 15, React 19, and TypeScript**. Its UI lives in App Router pages and shared components; route handlers and domain services implement application behavior. Supabase/PostgreSQL, MongoDB, and local artifacts serve different parts of the system. Prisma generates a PostgreSQL client for its schema.

```text
SunsetPulse/
  apps/
    pulse/                         Main Next.js application; root npm workspace
      app/                         Pages, layouts, and route handlers
        api/                       Application APIs
        vibes/                     Vibe list, creation, taxonomy, and record workflows
        sites/                     Tenant-site rendering
      components/                  Shared UI and feature components
      lib/
        navigation/                Shared app route catalog
        command-center/            Command orchestration and knowledge workflows
        platform/                  Workspace access, JSON runs/checkpoints, app manifests
        autonomous-workflows/      Shared durable scheduler and existing domain workers
        property-sprints/          Keller / Westlake shortlist and sprint adapters
        ai/                        Assistant and retrieval integrations
        data/                      Listing contracts, repositories, and discovery
        cms/                       Vibe schemas, presets, services, and workflows
        sites/                     Site configuration and provisioning services
        tenancy/                   Tenant resolution helpers
        notifications/             Notification delivery
        observability/             Tracing helpers
      prisma/                      Prisma schema
      supabase/migrations/         SQL migrations
      cartridges/                 Knowledge inputs and generated cartridges
      scripts/                    Imports, indexes, seeds, and operational utilities
      tests/                      Unit and browser tests
      docs/                       Feature plans, verification records, and runbooks
    scheduling/                    Additional scheduling codebase
    api/                           Additional backend code
    WorldofTah/                    Separate .NET application
  packages/                        Shared/platform package sources
  infra/                           Local Docker acceptance/services and OpenRESync
  docs/                            Cross-feature plans and operating documents
  .github/workflows/              CI definitions
```

The root [package.json](package.json) currently declares **only `apps/pulse` as an npm workspace**. A root install does not set up every other application in the repository.

Useful implementation entry points:

| Concern | Source |
| --- | --- |
| Public homepage | [app/page.tsx](apps/pulse/app/page.tsx) |
| Page and API routes | [app/](apps/pulse/app/) |
| Navigation inventory | [lib/navigation/routeCatalog.ts](apps/pulse/lib/navigation/routeCatalog.ts) |
| Commands and retrieval | [lib/command-center/](apps/pulse/lib/command-center/), [lib/ai/](apps/pulse/lib/ai/) |
| Platform contracts, access, and runs | [lib/platform/](apps/pulse/lib/platform/), [workspace APIs](apps/pulse/app/api/workspaces/) |
| Shared scheduler and property planning | [lib/autonomous-workflows/](apps/pulse/lib/autonomous-workflows/), [lib/property-sprints/](apps/pulse/lib/property-sprints/) |
| Listing data | [lib/data/](apps/pulse/lib/data/) |
| Vibe screens and site services | [app/vibes/](apps/pulse/app/vibes/), [lib/cms/](apps/pulse/lib/cms/), [lib/sites/](apps/pulse/lib/sites/) |
| Database definitions | [Prisma schema](apps/pulse/prisma/schema.prisma), [Supabase migrations](apps/pulse/supabase/migrations/) |
| Deployment configuration | [apps/pulse/vercel.json](apps/pulse/vercel.json) |

## Local development

Run the commands below from the repository root unless a step says otherwise.

### 1. Prerequisites

- Node.js and npm with workspace support. The repository's [.node-version](.node-version) selects **Node 22**; the checked-in [CI workflow](.github/workflows/ci.yml) currently uses **Node 20**. These are not yet aligned, so record your runtime when reporting a failure.
- Access to the development services needed by the feature you are working on.
- Python only for Python-backed tools such as document import or crawlers.
- Docker Desktop with its Linux engine running for disposable Postgres/Mongo acceptance, local Mongo, or a local Supabase stack. Basic UI work does not require these services; see the [Docker runbook](infra/local/README.md).
- A .NET SDK only if working on `apps/WorldofTah`.

### 2. Configure the app environment

Use [apps/pulse/.env.example](apps/pulse/.env.example) as a starting point for `apps/pulse/.env.local`. Preserve an existing local configuration.

PowerShell:

```powershell
if (-not (Test-Path -LiteralPath "apps/pulse/.env.local")) {
    Copy-Item -LiteralPath "apps/pulse/.env.example" -Destination "apps/pulse/.env.local"
}
```

Review the copied URLs and replace placeholders with development values. The example is not a complete, preconfigured development environment; some features require variables defined in their own services or runbooks.

| Feature | Configuration to inspect |
| --- | --- |
| Authentication and Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-side Supabase settings, and the configured authentication provider/redirects |
| Mongo-backed services | `MONGODB_URI` |
| Prisma-backed features | `DATABASE_URL`, referenced by the Prisma schema |
| AI providers | Feature-specific provider keys such as `GROQ_API_KEY` or `OPENROUTER_API_KEYS` |
| Maps and geocoding | `NEXT_PUBLIC_MAPBOX_TOKEN` and the geocoding integration used by the screen |
| Listing ingestion | The selected MLS provider or OpenRESync configuration |
| Checkout and provisioning | Stripe configuration and the [site provisioning runbook](apps/pulse/docs/STRIPE_SITE_PROVISIONING_RUNBOOK.md) |
| Email, scheduled work, and tracing | Notification settings, `CRON_SECRET`, and optional Langfuse settings |

Keep server credentials out of `NEXT_PUBLIC_*` variables, commits, screenshots, and documentation. Do not copy production values into a local test setup by default.

### 3. Install and start

```powershell
npm install
npm run pulse:dev
```

Open [localhost:3000](http://localhost:3000), [Agent Console](http://localhost:3000/agent), or [Vibes](http://localhost:3000/vibes).

The Pulse postinstall script generates its Prisma client and copies PowerSync browser assets. Installing packages does **not** apply database migrations or provision external services.

If port 3000 is already occupied, stop the old server or choose a port explicitly:

```powershell
npm run dev --workspace=apps/pulse -- -p 3001
```

### Optional mock-mode UI work

For local UI exploration without relying on every live integration:

```powershell
$env:NEXT_PUBLIC_MOCK_MODE = "true"
npm run pulse:dev
```

Mock mode changes application behavior and the root layout, including omission of the global navbar. It is not a full offline environment and does not verify authentication, live data, checkout, site application, or production navigation.

After stopping the server, clear the flag before starting a normal session:

```powershell
Remove-Item Env:NEXT_PUBLIC_MOCK_MODE -ErrorAction SilentlyContinue
```

## Commands

All examples in this section run from the repository root. Root wrappers are defined in [package.json](package.json); app-specific scripts are in [apps/pulse/package.json](apps/pulse/package.json).

| Task | Command |
| --- | --- |
| Start the Pulse development server | `npm run pulse:dev` |
| Build Pulse | `npm run pulse:build` |
| Serve a completed production build locally | `npm run start --workspace=apps/pulse` |
| Lint Pulse | `npm run lint --workspace=apps/pulse` |
| Run unit tests | `npm run test:unit` |
| Run unit tests in watch mode | `npm run test:unit:watch --workspace=apps/pulse` |
| Inspect local development Mongo | `npm run docker:status` |
| Start local development Mongo | `npm run docker:up` |
| Run disposable scheduler/platform and Mongo acceptance | `npm run docker:test` |
| Run only disposable scheduler/platform acceptance | `npm run docker:test:scheduler` |
| Exercise real local Supabase login and platform APIs | `npm run test:platform:auth --workspace=apps/pulse -- --stack "<local-stack-id>"` |
| Check commercial inventory truth | `npm run test:inventory-truth` |
| Run browser tests | `npm run test:e2e` |
| Open the Playwright test UI | `npm run test:e2e:ui --workspace=apps/pulse` |
| Evaluate retrieval fixtures | `npm run atlas:evaluate-retrieval --workspace=apps/pulse` |
| Regenerate the Prisma client | `npm run prisma:generate --workspace=apps/pulse` |
| Restore PowerSync browser assets | `npm run powersync:assets --workspace=apps/pulse` |
| Start the separate .NET app | `npm run tah:dev` |

The build script uses `next build --no-lint`; **a successful build does not mean lint passed**. Run lint separately.

### Optional knowledge tools

Document import uses Python MarkItDown and writes draft cartridges under `apps/pulse/cartridges/imports` by default:

```powershell
python -m pip install -r apps/pulse/requirements-markitdown.txt
npm run tah:import-doc -- "C:\path\to\market-report.pdf" --title "Market report"
```

Replace the example path with a local document. Review imported content before treating it as trusted knowledge. See [the import script](apps/pulse/scripts/import-doc-to-tah.ts) for supported options.

Build and search the local LanceDB index:

```powershell
npm run tah:lancedb:index
npm run tah:lancedb:search -- --query "pricing comps" --limit 5
```

Indexing writes local artifacts and overwrites the configured index table; it is not a read-only verification command. Consult [the index script](apps/pulse/scripts/tah-lancedb.ts) before changing its paths or table settings.

For MLS ingestion infrastructure, follow [the OpenRESync pilot guide](infra/openresync/README.md) before running `npm run openresync:up`, `openresync:doctor`, or `openresync:normalize`. Normalization and seeding are data-writing operations, not basic setup checks.

## Verification

Choose checks that match the change. These commands describe available verification, not a claim that the current branch passes all of it.

### Navigation and README changes

```powershell
npm run test:unit -- tests/unit/app-route-catalog.test.ts tests/unit/command-route-directory.test.tsx tests/unit/global-command-routes.test.tsx
git diff --check
```

The route inventory test must stay in sync with both the route registry and the marked inventory near the top of this file.

### Application changes

```powershell
npm run lint --workspace=apps/pulse
npm run test:unit
npm run test:inventory-truth
npm run pulse:build
```

For an independent TypeScript check, run from the application directory:

```powershell
Push-Location apps/pulse
npx tsc --noEmit
Pop-Location
```

Report the command, runtime, and actual result. Distinguish failures caused by the change from existing failures; do not turn old test counts into permanent release claims.

### Browser checks

Install the configured browser once, then run the desired suite:

```powershell
npx playwright install chromium
npm run test:e2e --workspace=apps/pulse -- tests/jamie-public-guide.spec.ts
```

[Playwright configuration](apps/pulse/playwright.config.ts) targets `http://localhost:3000`, uses Chromium, and normally builds and starts the app with test fixtures and mock-mode flags. Outside CI it can reuse an existing server. Stop an incompatible server first so the test does not silently run against the wrong environment.

Mock browser tests do not establish live provider, billing, or database correctness. Vibe production verification additionally needs a controlled non-customer site, real revision IDs, before/after pointers, and cleanup evidence; follow the dedicated runbooks.

### Platform database and real-session checks

`npm run docker:test` creates disposable databases and removes only its own test projects. It does not validate a deployed database or real Auth/Storage configuration. `scheduler-db` CI separately replays Supabase migrations and database tests.

The `test:platform:auth` command above uses an existing **local** Supabase stack. Replace `<local-stack-id>` with the suffix of its `supabase_db_...` container; follow the [real-session runbook](infra/local/README.md#real-local-supabase-authentication-acceptance) for ports and prerequisites. It creates temporary real users, logs in through the browser, exercises run/checkpoint APIs, checks foreign-user isolation, and cleans up its fixtures. This is not yet acceptance of a generic inbox UI.

The optional `--apply-local-migrations` flag writes reviewed missing migrations to that local stack and retains them. Without it, the stack must already be migrated. Do not run this harness alongside another build/dev server sharing `apps/pulse/.next`. Never substitute a production database or credentials.

## Data, costs, and operations

- **Respect the existing storage boundaries.** Supabase, MongoDB, and local TAH/index files are not interchangeable. Follow the domain service for the feature rather than introducing another source of truth.
- **Keep listing data truthful.** Use the listing repository and discovery contracts; empty inventory is not permission to substitute fabricated commercial listings.
- **Keep quota impact visible.** The [Supabase egress plan](docs/supabase-egress-reduction-plan-2026-08-26.md) records the rationale for reducing repeated reads and unnecessary cache traffic. Revisit it before adding polling, broad queries, or new persistence layers.
- **Separate development from operational writes.** Database migrations, seeds, publishing, site application, checkout, and billing workers have effects beyond rendering a page. Follow their runbooks and target the intended environment.
- **Treat local artifacts as local.** Query memory, LanceDB indexes, crawler checkpoints, and generated analysis tools should not be committed unintentionally. Check [.gitignore](.gitignore) and the relevant script's output paths.
- **Use evidence for release decisions.** Source inspection and local checks do not confirm deployed configuration, tenant routing, or production data.

Deployment and cron definitions live in [apps/pulse/vercel.json](apps/pulse/vercel.json); CI commands live in [.github/workflows/ci.yml](.github/workflows/ci.yml). Check those files rather than copying an old schedule or deployment status from a planning document.

## Plans and runbooks

These documents contain implementation detail and historical decisions. Some include older completion claims or future scope; read them alongside the current code.

| Topic | Documentation |
| --- | --- |
| Active platform roadmap and next work | [Three-phase plan and ledger](apps/pulse/docs/SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md), [September 21–25 handoff](apps/pulse/docs/PLATFORM_WEEK_2026-09-21.md) |
| Platform scope and evidence | [Capability matrix](apps/pulse/docs/PLATFORM_CAPABILITY_MATRIX.md), [September 18 verification](apps/pulse/docs/PLATFORM_VERIFICATION_2026-09-18.md) |
| Domain specifications | [Praxis workspace](apps/pulse/docs/PRAXIS_AGENT_WORKSPACE_PLAN.md), [Keller / Westlake property sprints](apps/pulse/docs/KELLER_WESTLAKE_PROPERTY_SPRINT_PLAN.md) |
| Local infrastructure and acceptance | [Docker and real local Auth runbook](infra/local/README.md) |
| Vibe implementation baseline | [Luna baseline](apps/pulse/docs/VIBE_CMS_LUNA_BASELINE.md) |
| Vibe UI design and execution | [UI plan](apps/pulse/docs/VIBE_CMS_WORDPRESS_UI_PLAN.md), [manual UI verification](apps/pulse/docs/VIBE_CMS_UI_MANUAL_VERIFICATION.md) |
| Vibe vertical slice and handoff | [Vertical-slice plan](apps/pulse/docs/VIBE_CMS_VERTICAL_SLICE_PLAN.md), [Luna-to-Sol handoff](apps/pulse/docs/VIBE_CMS_LUNA_TO_SOL_HANDOFF.md), [Sol review](apps/pulse/docs/VIBE_CMS_SOL_REVIEW_REPORT.md) |
| Vibe production evidence | [Production verification record](apps/pulse/docs/VIBE_CMS_PRODUCTION_VERIFICATION.md) |
| Site provisioning and disposable test sites | [Stripe site provisioning runbook](apps/pulse/docs/STRIPE_SITE_PROVISIONING_RUNBOOK.md) |
| Original Vibe design | [Vibe dictionary plan](docs/vibe-dictionary-wordpress-plan-2026-08-25.md) |
| AI integrations | [AI integration stack](apps/pulse/docs/AI_INTEGRATION_STACK.md) |
| Command outputs and memory | [Relay template catalog](apps/pulse/docs/TAH_RELAY_TEMPLATE_CATALOG.md), [query memory](apps/pulse/docs/TAH_QUERY_MEMORY.md) |
| Local news ingestion | [Local news signals](apps/pulse/docs/LOCAL_NEWS_SIGNALS.md) |
| Point-of-sale CMS bridge—not the Vibe editor | [CMS USB bridge](apps/pulse/docs/CMS_USB_BRIDGE.md) |
| MLS ingestion pilot | [OpenRESync guide](infra/openresync/README.md) |
| Supabase usage reduction | [Egress reduction plan](docs/supabase-egress-reduction-plan-2026-08-26.md) |
| Profit and revenue workflows | [Profit sprint](docs/profit-sprint-2026-08-24.md), [outcome revenue plan](docs/luna-outcome-revenue-plan-2026-08-24.md) |
| Shadow operations and evidence | [Operations runbook](docs/luna-shadow-operations-runbook.md), [evidence log](docs/luna-shadow-evidence-log.md) |
| Historical changes | [Changelog](CHANGELOG.md), [Pulse app notes](apps/pulse/README.md) |

## Contributing

1. Start with the relevant domain's code and plan. Confirm what exists before extending a historical checklist.
2. Keep changes scoped and preserve unrelated work. A navigation or documentation task should not alter the public homepage renderer or deployment defaults.
3. When adding, removing, or renaming a screen, update the route catalog and the marked README inventory together. Use real selection workflows for dynamic routes.
4. Add focused tests for changed behavior and run the appropriate checks above. Describe anything not verified.
5. Keep this README useful to the next developer: update setup, commands, entry points, and documentation links. Put dated execution logs, PR-specific status, benchmarks, and manual evidence in the appropriate feature documents.
