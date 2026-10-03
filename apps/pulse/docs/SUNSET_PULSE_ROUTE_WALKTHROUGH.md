# Sunset Pulse — presenter’s route walkthrough

Prepared October 2, 2026 from `lib/navigation/routeCatalog.ts`. This is a **spoken demo script**, not a script that opens URLs, submits forms or changes data. It covers all **134 cataloged non-API paths**: pages, contextual routes, redirects and machine-readable handlers. Internal `/api/*` endpoints are implementation interfaces, not additional visitor screens.

## Opening — read aloud

“Sunset Pulse is a shared work system with several front doors. For a realtor, the useful loop is to find a property, keep the facts and questions together, put the next work on a schedule, review what Jamie proposes, and track deadlines and recorded business results. Underneath, the same engine remembers work, pauses for human decisions, and keeps evidence. The Atlas, creative tools, local Grill and experiments are other applications around that foundation—not proof that every feature is production-ready.”

## Suggested short demo

1. Open `/`: start with the Keller / Westlake seller offer, then introduce discovery and the current visual identity. State that the form saves to the owner's inbox only when its published tenant and Supabase configuration are available; it sends no automatic email or text.
2. Open `/neighborhoods`: show the source-linked local guides and explain that property-specific school assignment, HOA costs and drive times remain to be verified.
3. Open `/seller-plan`: describe the request as human follow-up, not an instant CMA, appraisal or guaranteed price.
4. Open `/keller-westlake/market-report`: explain that only reviewed, publication-authorized figures will be shown; the current report library is empty.
5. Open `/properties`, then a real property detail: show discovery and context.
6. Sign in and open `/property-shortlist`: explain one Keller / Westlake area and facts versus unanswered questions.
7. Open `/planner` and `/today`: demonstrate a draft due date, recurrence and opted-in in-app reminders. Do not save into a real account just for a recording without permission.
8. Open `/business` and `/goals`: explain manually recorded money, broker deductions and optional progress.
9. Open `/sprints`, then an authorized workspace inbox/run: distinguish a proposal, approval, execution and its evidence.
10. Close with `/atlas` and `/llms.txt`: structured knowledge supports the work; it does not make the product only a “Wikipedia for LLMs.”

## Presenter rules

- The catalog describes entry requirements, **not live availability or an authorization audit**. Public page entry can still contain signed-in/provider-backed actions. Do not promise a role or feature based on a URL alone.
- Use a preview/local environment and authorized demonstration records. Never fabricate IDs, booking parameters, checkout sessions or signing/invitation tokens. Redact account/customer information.
- CMS WIP policy is environment-dependent and is not a promise of owner-only access. Check it before a public demo; do not weaken gates for filming.
- Real reconstruction, publication, automatic email delivery and paid-provider activation are **not** implied by previews or local tests. Experimental/game surfaces are not the core realtor acceptance claim.
- Say “implemented locally” or “this screen exists” where appropriate. Do not say “live,” “verified,” or “sent” without evidence for the selected environment.

## Complete route-by-route script

### Discover

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/` | Public entry | “This is the front door: property discovery, the Atlas, local context and the Grill share one entry point.” | Open `/`.  |
| `/explorer` | Public entry | “This is the map-led way to explore the platform and discover places and related information.” | Open `/explorer`.  |
| `/properties` | Public entry | “This is the main property browsing entry. Start here before opening a property's detail page.” | Open `/properties`.  |
| `/properties/search-results` | Public entry | “This is the focused search-results view. Explain the filters in the URL and the results actually returned.” | Open `/properties/search-results`. Uses optional search query filters. |
| `/listings` | Public entry | “This is another listing entry point. Availability depends on the configured inventory, not just the page existing.” | Open `/listings`.  |
| `/idx` | Sign-in | “This is the signed-in MLS search entry. Demonstrate the current data provider and filters without promising universal MLS coverage.” | Open `/idx`.  |
| `/tour-studio` | Public entry | “This is the presentation/tour workspace for properties. Distinguish a prepared view from verified capture of a real home.” | Open `/tour-studio`.  |
| `/scan-studio` | Sign-in | “This accepts consented private property captures for review. Real reconstruction and publication are not enabled by uploading.” | Open `/scan-studio`. Consent-first phone capture; uploads remain private until agent review. |
| `/valuation` | Public entry | “This is a human-reviewed pricing conversation entry point. There is no automated price estimate until a licensed source and reviewed CMA workflow are configured.” | Open `/valuation`; no provider call or price estimate is generated. |
| `/keller-westlake/market-report` | Public entry | “This page publishes figures only after review and publication permission; it currently contains no local market data.” | Open `/keller-westlake/market-report`; it is noindex while no report is available. |
| `/seller-plan` | Public entry | “This is a request for a human-reviewed seller conversation, not an instant CMA. Submission is saved only when the owner’s configured intake is available; no automatic message is sent.” | Open `/seller-plan`; test with local/disposable data, not a prospect's details. |
| `/neighborhoods` | Public entry | “These are reviewed Keller / Westlake guides with citations and clearly marked address-specific unknowns.” | Open `/neighborhoods`. |
| `/neighborhoods/[slug]` | Public entry | “This is one source-backed local guide; only published repository records resolve.” | Begin at `/neighborhoods`; choose a published guide slug. |
| `/contact` | Public entry | “This is where a visitor can start a conversation with the business.” | Open `/contact`.  |
| `/investors` | Public entry | “This is the investor-oriented entry point, not a promise of investment returns.” | Open `/investors`.  |
| `/properties/[id]` | Public entry | “This is one property's detail page. Open a real result so the URL carries an existing ID.” | Begin at `/properties`. Choose an existing property; requires its ID. |
| `/listings/[id]` | Public entry | “This is one listing's detail page, reached from real inventory.” | Begin at `/listings`. Choose an existing listing; requires its ID. |
| `/sites/[site]/[[...path]]` | Public entry | “This serves a particular tenant's site and nested pages. Tenant configuration controls the experience.” | Use the legitimate context/link; not a standalone entry. Use the configured tenant hostname or an existing site ID and optional page path. |

### Intelligence and chat

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/agent` | Public entry | “This is an agent console and a place to discover the app's available routes.” | Open `/agent`.  |
| `/command-center` | Public entry | “This is the command workspace: turn an intent into reviewable work. A command is not blanket permission to spend or send.” | Open `/command-center`.  |
| `/atlas` | Public entry | “This organizes available knowledge and place context visually. It is not a guarantee that every source is current or verified.” | Open `/atlas`.  |
| `/jamie-chat` | Public entry | “This is Jamie's chat workspace. Questions and proposed actions still respect the user's permissions and confirmation gates.” | Open `/jamie-chat`.  |
| `/jamie-console` | Public entry | “This is a dedicated Jamie console. Show only the tools actually enabled in the selected environment.” | Open `/jamie-console`.  |
| `/jamie-vibes` | Public entry | “This explores Jamie's Vibe-oriented interface. Separate this experience from the administrative Vibe publishing lifecycle.” | Open `/jamie-vibes`.  |
| `/sunset-chat` | Public entry | “This is the Sunset Chat experience, another conversation entry in the app.” | Open `/sunset-chat`.  |
| `/insights` | Public entry | “This is the insights surface for interpreting available information; source availability determines what can be shown.” | Open `/insights`.  |
| `/tah` | Public entry | “This is the knowledge-cartridge library. Choose an existing cartridge to inspect its contents.” | Open `/tah`.  |
| `/abidan` | Public entry | “This is the Abidan agent/character experience. Its visual identities do not prove autonomous execution authority.” | Open `/abidan`.  |
| `/abidan/war-room` | Operator | “This is the role-gated Abidan operations view, not a public control panel.” | Open `/abidan/war-room`. Middleware permits realtor, operator, or admin. |
| `/scythe` | Sign-in | “This is the signed-in Scythe workspace. Treat it as a specialist surface rather than the everyday realtor entry.” | Open `/scythe`.  |
| `/news/tah` | Public entry | “This opens news context for a supplied article. Begin with a real source link rather than an empty story.” | Open `/news/tah`. A source article query supplies the story. |
| `/tah/[slug]` | Public entry | “This opens one existing knowledge cartridge and its source context.” | Begin at `/tah`. Choose a cartridge; requires its slug. |

### Creative and spatial

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/spatial-lab` | Public entry | “This is the experimental spatial workspace. Explain the visualization separately from production property geometry.” | Open `/spatial-lab`.  |
| `/spatial-lab/deck` | Public entry | “This is the Deck Signals spatial view, a specialist presentation of signals.” | Open `/spatial-lab/deck`.  |
| `/studio` | Public entry | “This is the voice/audio studio entry. Recording and provider use require the relevant configuration and consent.” | Open `/studio`.  |
| `/reraster` | Public entry | “This is the video-oriented creative studio. A visible editor is not proof that every export/provider is enabled.” | Open `/reraster`.  |
| `/storytime` | Public entry | “This is the story-oriented creative experience.” | Open `/storytime`.  |
| `/worldoftah` | Public entry | “This explores knowledge in a world-style interface.” | Open `/worldoftah`.  |
| `/vibe-lab` | Public entry | “This is a Vibe experimentation surface, separate from applying a published revision to a live site.” | Open `/vibe-lab`.  |
| `/demo` | Public entry | “This is a demonstration surface. Label demonstration output clearly instead of presenting it as live evidence.” | Open `/demo`.  |
| `/pitch` | Public entry | “This is the pitch/presentation entry, useful for explaining the product rather than operating a private workspace.” | Open `/pitch`.  |
| `/identity-test` | Public entry | “This is a diagnostic identity screen, not a core customer workflow.” | Open `/identity-test`. Diagnostic / experimental screen. |
| `/briefing/deck/[slug]` | Sign-in | “This opens a generated briefing deck using its real link.” | Begin at `/command-center`. Open a deck generated by the command workflow. |
| `/briefing/render/[id]` | Sign-in | “This opens a previously generated rendered briefing.” | Begin at `/command-center`. Open an existing briefing from its generated link. |

### Games

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/play-jamie` | Public entry | “This is the game hub for the Jamie experiences.” | Open `/play-jamie`.  |
| `/play-jamie/chess` | Public entry | “This opens Chess with Jamie.” | Open `/play-jamie/chess`.  |
| `/play-jamie/poker` | Public entry | “This opens the poker game; do not describe it as a real-money wagering service.” | Open `/play-jamie/poker`.  |
| `/play-jamie/tetris` | Public entry | “This opens Block Drop, a lightweight game experience.” | Open `/play-jamie/tetris`.  |
| `/play-jamie/volley` | Public entry | “This opens Sunset Volley.” | Open `/play-jamie/volley`.  |
| `/beach-volleyball` | Public entry | “This is the separate beach-volleyball experience.” | Open `/beach-volleyball`.  |
| `/value-guess` | Public entry | “This is the property-value guessing game, not a valuation report.” | Open `/value-guess`.  |
| `/location-guess` | Public entry | “This is the location-guessing game.” | Open `/location-guess`.  |
| `/pulse-quest` | Public entry | “This is the Pulse Quest game/experiment.” | Open `/pulse-quest`.  |
| `/retail-clash` | Public entry | “This is the Retail Clash game/experiment.” | Open `/retail-clash`.  |

### Food and scheduling

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/grill` | Public entry | “This is the Grill ordering entry. Check actual menu, ordering availability and payment setup before a live demonstration.” | Open `/grill`.  |
| `/cart` | Public entry | “This is the cart review step. Reviewing a cart is separate from placing or paying for an order.” | Open `/cart`.  |
| `/counter` | Public entry | “This is the counter-facing entry. Operational actions still require their applicable permissions.” | Open `/counter`.  |
| `/grill/kds` | Staff / PIN | “This is the kitchen display, reached through the staff/PIN access flow.” | Open `/grill/kds`. Uses the existing kitchen access flow. |
| `/sms-opt-in` | Public entry | “This is explicit SMS opt-in. Visiting the page is not consent to receive messages.” | Open `/sms-opt-in`.  |
| `/grill/tracker/[orderId]` | Public entry | “This follows a real order through its tracking link. Do not invent an order or expose a customer's details.” | Use the legitimate context/link; not a standalone entry. Use the tracking link from a real order; requires its order ID. |
| `/schedule` | Public entry | “This opens tenant booking context; the tenant/site parameter matters.” | Use the legitimate context/link; not a standalone entry. Use a tenant booking link with its site query parameter. |

### Account and business

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/login` | Public entry | “This is sign-in. The current app uses Supabase sessions.” | Open `/login`.  |
| `/register` | Public entry | “This is account registration. Creating an account does not automatically grant operator or realtor permissions.” | Open `/register`.  |
| `/profile` | Sign-in | “This is the account's profile workspace.” | Open `/profile`.  |
| `/today` | Sign-in | “This is the daily starting point: deadlines, opted-in reminders, personal progress and a recorded business summary.” | Open `/today`. Private personal workspace; planner, earnings summary, goals and reminders. |
| `/planner` | Sign-in | “This is where a realtor records recurring dues, deadlines and appointments, and chooses real dates for property tasks.” | Open `/planner`. Private recurring dues, deadlines and appointments. |
| `/business` | Sign-in | “This is the private manual business ledger. Net is recorded receipts minus recorded paid expenses; it is not a tax statement.” | Open `/business`. Private manually recorded income and expenses; totals are not tax or brokerage statements. |
| `/goals` | Sign-in | “This is optional progress tracking from recorded work. Gamification must not fabricate income or punish missing historical data.” | Open `/goals`. Optional progress goals derived from manually recorded work. |
| `/dashboard` | Realtor role | “This is the realtor-role dashboard. Sign-in alone may not be sufficient.” | Open `/dashboard`. Middleware requires the realtor profile role. |
| `/collections` | Sign-in | “This is the user's collections entry for organizing saved material.” | Open `/collections`.  |
| `/properties/saved` | Sign-in | “This is the saved-property entry for the signed-in account.” | Open `/properties/saved`.  |
| `/property-shortlist` | Sign-in | “This keeps Keller and Westlake in one owner-scoped area, with property facts, questions and Jamie planning context.” | Open `/property-shortlist`. Shared owner-scoped property context for Jamie planning. |
| `/sprints` | Sign-in | “This is scheduled work planning and review. Proposed work, approved assignments and actual execution are distinct states.” | Open `/sprints`. Shared owner-scoped scheduled planning workspace. |
| `/workspaces` | Sign-in | “This selects accessible workspaces and can create a team workspace. Creation alone sends no invitation and activates no worker.” | Open `/workspaces`. Select an accessible workspace or create a team workspace; creation does not invite users or enable scheduling. |
| `/workspace-invitations/accept` | Sign-in | “This explicitly accepts a one-time email-bound invite using the invited account. Never display the raw invite token in a recording.” | Open `/workspace-invitations/accept`. Email-bound one-time invitation; fragment token is not sent in the page request; requires the invited account. |
| `/properties/add` | Sign-in | “This begins adding a property under the signed-in account.” | Open `/properties/add`.  |
| `/messages` | Sign-in | “This is the account messaging entry. A draft or preview must not be represented as a sent message.” | Open `/messages`.  |
| `/lead-gen` | Sign-in | “This is the signed-in lead-generation workspace. Do not claim unrestricted outreach or auto-send.” | Open `/lead-gen`.  |
| `/premium` | Public entry | “This presents premium-plan information. Confirm configured checkout and current terms separately before describing a paid offer.” | Open `/premium`.  |
| `/contracts/promulgated` | Public entry | “This browses promulgated contract forms and their previews. This demonstration is not legal advice.” | Open `/contracts/promulgated`.  |
| `/contracts/promulgated/templates` | Public entry | “This is the contract-template library.” | Open `/contracts/promulgated/templates`.  |
| `/contracts/promulgated/setup` | Sign-in | “This starts a signed-in contract setup with a selected form and property.” | Open `/contracts/promulgated/setup`. Choose a contract and property in the setup workflow. |
| `/contracts/representation` | Public entry | “This is the representation-agreement entry. Review the actual parties, terms and signature authority.” | Open `/contracts/representation`.  |
| `/iabs` | Public entry | “This exposes the brokerage-services disclosure.” | Open `/iabs`.  |
| `/workspaces/[workspaceId]/canvas` | Sign-in | “This is a private workspace canvas with bounded views and explicit confirmed commands.” | Begin at `/dashboard`. Private canvas with bounded workspace views and confirmed commands; requires a workspace ID. |
| `/workspaces/[workspaceId]/access` | Sign-in | “This manages workspace members and invitations under owner/admin authority.” | Begin at `/workspaces`. Owner/admin-scoped member and invitation management; requires a workspace ID. |
| `/workspaces/[workspaceId]/inbox` | Sign-in | “This is the shared human checkpoint inbox: questions, approvals and held work use the same underlying primitive.” | Begin at `/dashboard`. Authorized workspace checkpoint inbox and pinned app launch surface. |
| `/workspaces/[workspaceId]/runs/[runId]` | Sign-in | “This shows a specific run's pinned definition, history and checkpoints, rather than implying a black-box agent completed everything.” | Use the legitimate context/link; not a standalone entry. Authorized run history, pinned workflow metadata, and checkpoint responses. |
| `/contracts/promulgated/[formId]` | Public entry | “This opens the selected contract's preview/details using its real form ID.” | Begin at `/contracts/promulgated`. Choose an existing promulgated contract form; requires its form ID. |
| `/properties/[id]/edit` | Sign-in | “This edits a property the current user is authorized to change.” | Begin at `/properties`. Choose a property you can edit; requires its ID. |
| `/lead-gen/[id]` | Sign-in | “This is lead-generation context for the chosen property.” | Begin at `/lead-gen`. Choose a property in Lead generation. |
| `/sign/[token]` | Public entry | “This is a token-bound signing flow. Use only an authorized test agreement and keep the token private.” | Use the legitimate context/link; not a standalone entry. Use the signing link supplied for the agreement; never invent a token. |
| `/onboarding/site` | Sign-in | “This is a checkout return, not a standalone setup wizard.” | Use the legitimate context/link; not a standalone entry. Checkout return requires its session_id; do not open as a blank setup page. |
| `/onboarding/site/setup` | Sign-in | “This configures an already provisioned site using its proper setup link.” | Use the legitimate context/link; not a standalone entry. Use the setup link for an existing provisioned site / checkout session. |
| `/auth/success` | Public entry | “This is the post-authentication return screen, not a page to begin a session manually.” | Begin at `/login`. Authentication return screen; begin with Sign in. |
| `/auth/auth-error` | Public entry | “This helps recover from an authentication error.” | Begin at `/login`. Authentication recovery screen; begin with Sign in. |
| `/admin/sprints` | Sign-in | “This legacy address redirects to the shared Sprints workspace.” | Begin at `/sprints`. Compatibility route for the shared signed-in sprint workspace. |
| `/auth/callback` | Public entry | “This is the auth provider's callback handler, not a normal page to demo by typing a URL.” | Use the legitimate context/link; not a standalone entry. Authentication handler; requires the actual provider callback parameters. |

### Vibe CMS

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/vibes` | CMS WIP policy | “This lists Vibes: editable design/content configurations with a separate revision lifecycle.” | Open `/vibes`.  |
| `/vibes/new` | CMS WIP policy | “This creates a draft Vibe, not an automatic live-site update.” | Open `/vibes/new`.  |
| `/vibes/taxonomy` | CMS WIP policy | “This organizes Vibe taxonomy and classification.” | Open `/vibes/taxonomy`.  |
| `/vibes/[vibeId]/edit` | CMS WIP policy | “Edit the working draft; it is separate from the published snapshot.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/preview` | CMS WIP policy | “Preview the draft without changing a live site's applied revision.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/source` | CMS WIP policy | “Inspect the Vibe's source representation.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/revisions` | CMS WIP policy | “Inspect immutable published revisions and their lineage.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/compare` | CMS WIP policy | “Compare selected revisions before deciding what to apply.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/actions` | CMS WIP policy | “Review available lifecycle actions; demonstrate only approved changes.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/submit` | CMS WIP policy | “Submit a draft for review rather than publishing it silently.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/publish` | CMS WIP policy | “Publish an immutable revision; that is still separate from applying it to a site.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/apply` | CMS WIP policy | “Review the exact site, current pointer and proposed revision before applying. Use only a controlled disposable site.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |
| `/vibes/[vibeId]/audit` | CMS WIP policy | “Inspect who changed the Vibe and its recorded lifecycle history.” | Begin at `/vibes`. Choose a Vibe first. Lifecycle, revision, and site context may also be required. |

### Operations

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/admin/research-desk` | Operator | “This is the operator research desk for inspecting work and context.” | Open `/admin/research-desk`.  |
| `/admin/lead-drafts` | Operator | “This is where an operator reviews lead drafts before any separately authorized delivery.” | Open `/admin/lead-drafts`.  |
| `/admin/lead-engine` | Operator | “This is the lead-engine operations entry; configuration and review remain separate from outbound execution.” | Open `/admin/lead-engine`.  |
| `/admin/agent-leads` | Operator | “This is the operator view of agent lead queues.” | Open `/admin/agent-leads`.  |
| `/admin/launch-kit` | Operator | “This manages site launch-kit configuration. Use a controlled test site when demonstrating changes.” | Open `/admin/launch-kit`.  |
| `/admin/site-reviews` | Operator | “This is the site-review operations surface.” | Open `/admin/site-reviews`.  |
| `/admin/hot-list` | Operator | “This manages the configured hot list. Changing it can affect public presentation, so use a test target.” | Open `/admin/hot-list`.  |
| `/admin/property-scans` | Operator | “This reviews consented private captures. Review approval does not mean a real 3D processor has run.” | Open `/admin/property-scans`. Review consented private captures before 3D reconstruction. |
| `/admin/orchestrator` | Operator | “This is the orchestration operations surface. Available controls are not permission to activate every provider.” | Open `/admin/orchestrator`.  |
| `/admin/profit` | Operator | “This is the operator profit-control surface, separate from a realtor's private manual business ledger.” | Open `/admin/profit`. Realtor role alone is not sufficient. |
| `/admin/intelligence` | Admin | “This is administrative intelligence configuration, not ordinary visitor search.” | Open `/admin/intelligence`.  |
| `/admin/prompts` | Admin | “This is administrative prompt configuration. Do not expose secrets or private prompts in a public recording.” | Open `/admin/prompts`.  |
| `/admin/marketing` | Admin | “This is the administrative marketing surface. Demonstrate drafts, not unapproved sends.” | Open `/admin/marketing`.  |
| `/admin/pulse` | Admin | “This is administrative Pulse operations.” | Open `/admin/pulse`.  |
| `/admin/cms` | Admin | “This is the store/POS controller, not the Vibe CMS editor.” | Open `/admin/cms`. Store controller console, not the Vibe editor. |
| `/admin/cms/setup` | Admin | “This configures the store/POS CMS.” | Open `/admin/cms/setup`.  |
| `/admin/scheduling` | Staff / PIN | “This is staff scheduling operations, distinct from personal realtor deadlines.” | Open `/admin/scheduling`. Existing staff workflow; excluded from the middleware admin sign-in redirect. |
| `/admin/property-scans/[scanId]/preview` | Operator | “This opens an approved scan's available manifest preview. Do not describe the synthetic shell as a measured real-home model.” | Begin at `/admin/property-scans`. Choose an approved property scan with a completed manifest preview. |
| `/admin/branding` | Operator | “This legacy address redirects to Launch Kit; it does not represent a second branding system.” | Begin at `/admin/launch-kit`. Redirects to Launch Kit; no separate branding console. |

### Machine-readable resources

| Path | Entry requirement | Say this | How to open / caution |
| --- | --- | --- | --- |
| `/llms.txt` | Public entry | “This is a machine-readable guide to the site, one interface for automated consumers rather than the whole product.” | Begin at `/llms.txt`. Text response, not a UI page. |
| `/tah/index.json` | Public entry | “This provides the knowledge library index as JSON.” | Begin at `/tah/index.json`. JSON resource, not a UI page. |
| `/tah/headless` | Public entry | “This exposes the headless knowledge-library response.” | Begin at `/tah/headless`. Headless library response. |
| `/tah/[slug]/headless` | Public entry | “This exposes one real cartridge to a headless consumer.” | Begin at `/tah`. Choose a real cartridge slug before requesting its headless response. |

## Closing — read aloud

“The main value is continuity: a property, deadline, question, decision and result stay connected. The scheduler makes work repeatable, and human checkpoints keep us in control. The next proof is not more screens—it is reliable outcomes in a real, permissioned pilot, with costs and support effort measured.”

## Keep the script accurate

When adding or renaming a route, update the route catalog, root README inventory and this script together. The route-catalog test checks coverage. Refer to [the review and remaining gates](LUNA_REVIEW_2026-09-26.md) before claiming a feature is shipped. No URL in this script was treated as proof of production health.
