# Sunset Pulse platform baseline

Recorded: September 17, 2026. This is a source-inspection baseline for OP00; it is not a production-health report.

Historical snapshot: the OP labels below refer to the archived plan. For current implementation status, use the [three-phase plan](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md) and [updated capability matrix](PLATFORM_CAPABILITY_MATRIX.md). The September 18 Core slice adds `platform_run` to the existing registry, JSON run state and unified checkpoints; it does not enable general tool execution.

## Repository and runtime

- Primary app: `apps/pulse`, Next.js 15.5.x, React 19, TypeScript, App Router.
- Root npm workspace: only `apps/pulse`; other application/package directories are not automatically installed by the root workspace.
- Primary deployment configuration: `apps/pulse/vercel.json`; it currently contains recurring cron routes for billing, notifications, profit, tenancy projection, hotlist scheduling and the worker.
- Data boundaries: Supabase/PostgreSQL for authenticated application and scheduler state; Mongo/Mongoose for property scan sessions; private object storage for uploads; local TAH/LanceDB artifacts for retrieval projections; Prisma for a separate scheduling-oriented schema.
- Local infrastructure: `infra/local` supports loopback Mongo development and disposable Mongo/Postgres acceptance; this is not production worker hosting.

## Shared execution currently present

- `lib/autonomous-workflows/durableScheduler.server.ts` claims one job at a time, leases for a bounded period, supports retries/recovery and deferred outcomes, and caps one invocation at ten jobs.
- `lib/autonomous-workflows/workflowRegistry.server.ts` registers `hotlist_email` and `sprint_planner`. It is not a generic capability registry.
- `lib/autonomous-workflows/schedulerEvents.server.ts` has service-only, versioned, owner/event-key dedupe for registered event workflows.
- `lib/command-center/commandRouter.ts` performs route → retrieve → plan → synthesize → supervise → remember → respond. It produces structured command results; its worker roster is not proof that each named worker has an unattended executor.

## Domain boundaries to preserve

- Properties and sprints use owner-scoped PostgreSQL records and revision-aware RPCs.
- Vibe uses draft/review/immutable-revision/site-application boundaries.
- Email uses separate draft, audience, approval and delivery/reconciliation logic.
- Scans use Mongo sessions plus private storage; reconstruction is unavailable and must not be represented as a real model.
- Tenant domain resolution and billing/publication state are already distinct from the future universal workspace concept.

## Current worktree and acceptance limits

The worktree already contains user changes to the Praxis/Keller plans, scan store/model/configuration and untracked scan job helpers/tests. Preserve those changes. The operating-platform plan is newly added. This packet adds the first additive platform workspace migration, server access service, workspace route, identity tests and this baseline/matrix.

The focused route-catalog test previously passed 4/4. The full unit, database, authenticated browser, CI and deployment gates remain separate evidence. No production migration, backfill, email, billing, scan processing, or autonomous external effect is enabled by this baseline. OP02 now includes `scripts/platform-scope-backfill.ts`, which is dry-run only and rejects `--write` until a mapping table, resumable transaction, rollback and production approval exist.

OP01 verification update: the focused platform suite passed 5/5 tests; the production build passed with the existing nonfatal Kepler dynamic-usage warning; disposable scheduler/Postgres acceptance replayed the new migration and passed the personal-workspace idempotency assertion plus the existing scheduler contention/deferral groups. The full unit run completed 284 files / 1,134 tests with 1,131 passing and three timeout failures in existing `abidan-tah`, `agent-console-shell`, and `pulse-remote-hydration` tests. The live OP02 dry-run reached the configured Supabase endpoint but returned `Invalid API key`; it performed no writes and produced no production mapping report.
