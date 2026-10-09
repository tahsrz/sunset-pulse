# Seller business workspace release checklist

Status: **local feature acceptance passed; the committed candidate and hosted preflight remain incomplete.** No remote migration or deployment has been run.

## Candidate identity

- [x] Repository: SunsetPulse, branch `codex/seller-acquisition-2026q4`.
- [x] Current HEAD: `5eb4d2be50130926a893c1e09244c817cd58cec5`.
- [ ] Capture the final candidate SHA after the working changes are reviewed and committed.
- [x] Read-only project lookup resolved the local Vercel link to project `sunset-pulse`; its latest deployment for this branch is `ERROR` with `target: null`.
- [x] The deployment log identifies the failure: `CmaReviewPanel.tsx` sent `expectedPriorReviewId`, which its local `ReviewPayload` type omitted. That type was corrected locally and the production build passed; the failed deployment uses the earlier committed SHA, so it does not include the fix.
- [ ] Select and verify one actual non-production Vercel environment and its Supabase project before doing environment preflight. Vercel denied environment-variable metadata access (403), and no local Vercel CLI is installed, so the preview-to-Supabase mapping cannot be confirmed.
- [x] Latest October 7 read-only target discovery rechecked the linked project `prj_EkrxJi7uHCqq1HztPygeYTj57gYs` in team `team_nx1IWfVXcJxGdPgQyNvvYcXl`; project lookup succeeds as `sunset-pulse`, but branch-filtered environment metadata still returns `403 forbidden`. Neither a PATH Vercel CLI nor a repository-local Vercel CLI is available for the connector's suggested fallback. A non-production Vercel environment/deployment URL and its Supabase project URL/ref have been requested; no target was inferred from the local environment and no hosted operation was performed.
- [ ] After reviewing and committing the candidate, rerun the branch preview build and verify the resulting deployment; do not promote it until the non-production Vercel-to-Supabase mapping is confirmed.
- [ ] Record app, migration, and worker/handler versions that will be deployed together.
- [x] Record the working-tree migration order and shared worker compatibility sources below. Their fingerprints are captured in [SELLER_BUSINESS_RELEASE_SOURCE_MANIFEST.json](./SELLER_BUSINESS_RELEASE_SOURCE_MANIFEST.json); these identify 23 local source files, not a complete committed application candidate.

## Acceptance evidence

- [x] October 8 PR candidate preparation: the full unit sweep ran 389 files / 1,626 tests, with 1,624 passing and two failures. The missing seller inbox route-directory entry was added to the catalog, README inventory, and presenter walkthrough; the old admin reply scheduler fixture now includes the authoritative saved-task lookup before asserting the single planner write. All 18 related tests across four files then pass, along with focused lint. A fresh normal production build passes compilation, whole-app type validation, 267 static pages, optimization, and trace collection; build ID `YtUr7iZtfE0OCH3K3Zth3`. All nine preflight regressions pass. Scoped `.gitattributes` LF rules keep the 23 compatibility sources reproducible across Windows/Linux; refreshed raw hashes match all 23 staged Git blobs, with no unpinned source. The complete migration inventory remains 158 files. The latest real-auth/browser/database suite is the 206-second passing run below. No manual hosted deployment or remote migration was performed.

- [x] October 8 Today task/request navigation: 42 focused tests across eight files, full-app TypeScript, focused lint, script syntax, compatibility verification, and the complete disposable seller database/auth/browser suite pass (206 seconds). All eight SQL regression files pass. Coming up displays the stored local due time with the workspace timezone and opens each task's due-date planner. A shared validated link component exposes the seller request only when the existing server read confirms current ownership; the planner uses the same request handoff. Invalid dates fall back to the full planner, and malformed identifiers or missing ownership availability cannot produce request URLs. Real browser acceptance at 390, 768, and 1440 pixels follows both request paths; removing the synthetic website owner causes fresh Today/planner reads to remove the request links and source metadata while keeping the private planner task. A direct seller read returns no request, and navigation creates no seller events or lead revision change. Ownership is restored before the remaining lifecycle checks. Existing scheduling, reminder delivery/replay/conflict, completion, outcomes, and weekly-review checks pass. Synthetic accounts/workspaces and the disposable project were removed. Compatibility remains 23 sources and 158 migrations. No scheduler, migration, production build, or hosted deployment was added.

- [x] October 8 Today schedule handoff: 38 focused tests across six files, full-app TypeScript, focused lint, compatibility verification, and the complete disposable seller database/auth/browser suite pass (195 seconds). All eight SQL regressions pass. The existing post-save seller read now also refreshes validated upcoming work and delivered reminders without replacing business/goals/settings. Failed or malformed agenda reads retain the previous schedule, show its refresh notice, and offer a read-only Refresh schedule action; successful recovery removes that notice. Superseded seller reads cannot publish an agenda update. The real browser proves a saved response appears in Coming up after failed-read recovery, with exactly one source-linked task and one reminder in SQL. Existing lease-fenced reminder delivery, conflict recovery, lost-response replay, owner/foreign-owner lifecycle, and weekly review checks pass. Synthetic accounts/workspaces and the isolated project were removed. Compatibility remains 23 sources and 158 migrations. No new migration, production build, or hosted deployment was performed.

- [x] October 8 Today seller recovery: 34 focused tests across five files, full-app TypeScript, focused lint, compatibility verification, and the disposable seller database/auth/browser suite pass (204 seconds). All eight SQL regressions pass. The server/client validate counts, owner-linked lists, dates, time zones, and overflow flags before presenting availability; malformed or missing summaries cannot imply empty work. Read-only Retry seller activity updates only the seller panel, aborts superseded reads, and recovers a failed post-save reread. Browser acceptance proves malformed data, failed retry with other panels retained, a real planner save, and exactly one linked task removed from the unscheduled list after recovery. Synthetic accounts/workspaces and the disposable stack were removed. The final optional metadata-preservation adjustment passes the focused suite and lint; the full browser run precedes that adjustment. No new migration, production build, or hosted deployment was performed.

- [x] October 8 reminder conflict recovery: 26 focused tests across six files, full-app TypeScript, focused lint, nine preflight regressions, and the complete disposable seller database/auth/browser suite pass (198 seconds). All eight SQL regression files pass, including 11 reminder lifecycle assertions. Forward migration 16 changes only the reminder business conflict from 40001 to PT409, preserving the function body and permissions. The browser proves a real concurrent dismissal returns 409 to the stale card, pauses both actions through a failed refresh, and removes the handled reminder after a fresh owner read. Uncertain snooze/dismiss responses still replay one receipt each and one future durable snooze job. Cleanup removed synthetic accounts/workspaces and the disposable stack. Compatibility verification covers 23 sources and 158 migrations. No production build or hosted migration/deployment was performed.

- [x] October 8 delivered reminder handoff and replay: 22 focused tests across five files, full-app TypeScript, focused lint, offline compatibility verification, and the full disposable seller database/auth/browser suite pass (200 seconds). All seven SQL regressions pass. Today opens each reminder's validated due-date planner; uncertain snooze/dismiss retries preserve the exact request identity and snooze deadline, block switching actions until recovery, and offer a fresh reminder read. The synthetic opt-in planner creates two event jobs; the existing bounded claim and lease-fenced reminder commit RPCs deliver them. Withheld committed snooze/dismiss responses replay one receipt and audit event each, and snooze creates exactly one future durable job. Planner completion and the seller lifecycle remain distinct from reminder actions. Synthetic accounts/workspaces and the disposable stack were removed. No migration, production build, or hosted deployment was performed.

- [x] October 8 scheduling draft validation: 44 focused tests across six files, full-app TypeScript, focused lint, nine preflight regressions, and the complete disposable seller database/auth/browser suite pass (166 seconds). All seven SQL regression files pass. Incomplete time-zone edits remain editable without a rendering crash, invalid date/time/zone fields block saves, and correction preserves date, time, and reminder choices. The real browser confirms zero planner items before correction and a normalized zone through the existing planner API afterward; conflict/reload recovery still saves exactly once. Existing response/reply/consultation handoffs and foreign-owner checks pass. The disposable stack and synthetic accounts/workspaces were removed. No new migration, production build, or hosted deployment was performed.

- [x] October 8 saved seller-task handoff: 40 focused tests across six files, full-app TypeScript, focused lint, nine preflight regressions, and the complete disposable seller database/auth/browser suite pass (173 seconds). All seven SQL regression files pass. Existing response, reply, and consultation tasks open their persisted dates, including completed past-year tasks; foreign owners receive no link. A failed or malformed lookup blocks creation and supports a draft-preserving retry. Synthetic accounts/workspaces and the disposable stack were removed. Manifest verifies 22 sources and 157 repository migrations. Production build was not rerun for this packet.

- [x] October 8 scheduling recovery and non-retryable seller conflicts: 39 focused tests, full-app TypeScript, focused lint, nine preflight regressions, and the complete disposable seller database/auth/browser suite pass (158 seconds). Real stale seller action and scheduling writes return 409; failed reload retains the draft, fresh owner revision saves exactly one linked planner item, and cleanup removes synthetic accounts/workspaces and the disposable stack. Manifest now verifies 21 sources and 156 repository migrations. Production build was not rerun for this packet.

- [x] Seller-business disposable database/auth/browser suite passed and cleaned up its fresh local project and synthetic users.
- [x] Six seller pgTAP regression files passed, including active outcome reads; local schema lint reported no schema errors in the earlier integration packet.
- [x] Seller-video reviewer acceptance passed on a disposable local project.
- [x] Full scheduler/concurrency acceptance passed, including five seller races; disposable stack cleaned up.
- [x] Jamie focused fixture tests pass (8 tests across 3 files); lint and changed-file TypeScript review pass.
- [x] One bounded Groq request succeeded using the local `.env.local` key. This proves provider connectivity only.
- [x] Responsive Playwright test at 390, 768, and 1440 pixels passed (1 test) against the fixture-backed local development server.
- [x] Production build passed after correcting the CMA client payload type to include the server schema's `expectedPriorReviewId` field; the CMA panel/API regression tests pass (9 tests).
- [x] Full app repository TypeScript check passes with zero diagnostics after fixing all 33 test/fixture errors. Use `npm run typecheck --workspace=apps/pulse` from the repository root. Repairs update required fixture fields, preserve narrow literals through schema parsing, type mocked call signatures, import Vitest helpers, and guard optional results. No application TypeScript checking was excluded or suppressed.
- [x] The affected 14 unit files pass all 54 tests, and focused ESLint passes across all 15 edited test files. The planner conflict fixture now returns a campaign-task response for that endpoint and still verifies the property draft survives a refresh and rejected save. The public-guide browser-spec payload capture was also corrected for TypeScript; its browser flow was not rerun in this test-only packet.
- [x] Signed-in personal Jamie route against a disposable authenticated workspace with the provider disabled; response schema is valid and planner rows remain unchanged.
- [x] One provider-backed signed-in Jamie turn against a synthetic owner's empty disposable workspace; response schema is valid, no planner row was written, and the temporary project was removed. This proves one bounded route flow, not model quality across other intents.
- [x] October 7 inbox regression: rejected pipeline updates keep the persisted seller status; refreshed archived status disables the seller contact actions. Both regressions were reproduced before the fix. Related unit checks pass (14 tests across 3 files), and focused ESLint passes.
- [x] Fresh October 7 production build after the inbox fix passed compilation, app type validation, static page generation, and trace collection. Local Next build ID: `Cd8ivzflsL-nvgfOJWQiP`. This identifies the local build only; the committed candidate and hosted deployment IDs remain pending.
- [x] Active consultation/closing pagination and bounded per-lead history pass 22 related unit tests and focused lint. The new 16-assertion SQL regression covers 1,200 contact events, equal-timestamp pages, reversal filtering, and ownership changes. The updated seller-business suite passed all six pgTAP files and real authenticated owner/foreign-owner outcome reads, then removed the disposable project and accounts.
- [x] Fresh production build after the outcome pagination and Today overflow changes passed compilation, app type validation, page generation, and trace collection.
- [x] Updated responsive browser acceptance passed at 390, 768, and 1440 pixels against the fixture-backed production server: five-row Today overflow destination, scheduling dialog bounds, and no horizontal overflow. A temporary runner timeout was increased to accommodate the full fixture build, then removed. The fixture-mode build is browser-test evidence, not a deployable production artifact.
- [x] Final database-only rerun passed all six pgTAP files after the active-outcome partial-index predicate was made explicit; the disposable stack was removed.
- [x] Offline release preflight verifies all 20 compatibility source fingerprints and the complete 155-file repository migration inventory, including the five legacy date-only versions. All nine preflight regressions pass; focused lint and script syntax checks pass. No target migration history has been supplied yet.
- [x] Full Pulse unit suite passes: 375 files and 1,537 tests in 307.51 seconds using `npm run test:unit --workspace=apps/pulse`. The initial unrestricted run had five checkpoint-route failures caused by a stale scoped-lookup mock and three retrieval/filesystem timeouts. The fixture now models the current question-checkpoint lookup; a new regression verifies that a denied lookup returns a safe 403 and performs no RPC write. `vitest.config.ts` caps workers at two; the existing timeouts and assertions were retained. The three timed-out files pass both in the focused rerun and the full suite. Full TypeScript and focused lint also pass. This packet changes tests and test concurrency, not application runtime behavior.
- [x] Personal seller inbox at `/seller-inbox` uses the existing owner-scoped API with 25-request pages, older/newest controls, focused-request links, validated read results, and read-error recovery. Today and the personal navigation now open this inbox rather than the bounded operator inbox. Contact/reply receipts use stable retry identities; a saved or conflicted request must be reloaded before another write, and lost ownership removes the request. Scheduling and outcomes reuse their existing dialogs and owner-checked APIs; no new SQL migration or operator permissions are required.
- [x] The disposable real-auth seller suite passed all six database regressions and the seller lifecycle after adding owner-inbox browser acceptance. A non-operator owner opens the new inbox and scheduling drafts at 390, 768, and 1440 pixels without horizontal overflow; browsing and draft opening leave the lead revision unchanged. An unrelated authenticated owner sees the unavailable-request message and no seller details. The disposable project and accounts were removed (120 seconds).
- [x] Fresh normal production build after adding the personal seller inbox passed compilation, app type validation, generation of all 267 pages, and trace collection. All 20 focused tests across five files, full-app TypeScript, focused ESLint, and diff whitespace validation pass.

## Repeatable local release preflight

From the repository root:

```powershell
npm run seller-business:preflight --workspace=apps/pulse
npm run test:seller-business:preflight --workspace=apps/pulse
```

The first command verifies the raw-byte fingerprints of the migration/shared-worker packet and checks that all repository migration versions are unique. It reports `LOCAL_COMPATIBILITY_VERIFIED` when those local checks pass. It does not check the rest of the app candidate, rerun acceptance, certify hosted readiness, or execute SQL. Missing or modified sources fail the check; do not regenerate the reviewed manifest merely to make an unexpected difference pass.

After selecting and verifying the actual non-production target, export its applied versions with this read-only query in that project's SQL console:

```sql
SELECT COALESCE(jsonb_agg(version ORDER BY version), '[]'::jsonb)
FROM supabase_migrations.schema_migrations;
```

Save the result as a JSON array of strings, then use an absolute path to that file:

```powershell
npm run seller-business:preflight --workspace=apps/pulse -- --applied-migrations "C:\path\to\applied-migrations.json"
```

This compares the entire repository history, not only the 16-file compatibility tail. Unknown applied versions, duplicate versions, or gaps before a later applied migration fail the check and require history reconciliation. The output lists the pending files in order, including earlier dependencies when present. An empty pending list means the supplied history already includes the repository migrations; it does not prove the export came from the intended target. Without an export, `pendingMigrations` remains null and `migrationHistoryCompared` remains false. The command always leaves hosted preflight pending and makes no network requests or database/deployment changes.

## Migration and worker compatibility packet (October 8)

The base commit is the HEAD recorded above; the app version is `property-pulse@0.2.0`. The candidate remains in the working tree. Compare the selected database's applied migration history with the entire repository history before preparing its pending migration list. The order below records the currently uncommitted migration tail; it does not replace prior planner, lease-fencing, permission, or seller-video review migrations. The two connector-health migrations and publication-record migration were existing working changes, and are recorded as dependencies without claiming ownership of their implementation.

| Order | Migration | Result |
| --- | --- | --- |
| 1 | `20261006130000_platform_connector_health_job_read_model.sql` | Connector-health job read model |
| 2 | `20261006140000_platform_connector_health_audit_read_model.sql` | Connector-health audit read model |
| 3 | `20261006150000_seller_video_publication_records.sql` | Exact-review publication receipts used by outcomes and attribution |
| 4 | `20261007100000_seller_lead_actions.sql` | Owned seller reads, revisions, immutable outcome receipts |
| 5 | `20261007103000_agent_lead_action_receipts.sql` | Replay-safe generic inbox actions sharing lead revisions |
| 6 | `20261007110000_realtor_seller_lead_tasks.sql` | Planner source identity, consultation links, cancellation triggers |
| 7 | `20261007120000_seller_video_publication_outcomes.sql` | Manual publication outcome receipts |
| 8 | `20261007130000_seller_daily_read_models.sql` | Initial owner-scoped seller summary |
| 9 | `20261007140000_seller_lead_publication_attributions.sql` | Lead-to-publication attribution receipts |
| 10 | `20261007150000_realtor_seller_campaign_tasks.sql` | Planner wrapper for owner-owned campaign backlog tasks |
| 11 | `20261007160000_seller_outcome_scoreboard.sql` | Replaces the initial summary with timing and campaign outcomes |
| 12 | `20261007170000_realtor_weekly_business_review_v2.sql` | Weekly-review v2 evidence with v1 read compatibility |
| 13 | `20261007180000_seller_outcome_read_models.sql` | Owner-scoped active outcome pagination and bounded history per lead |
| 14 | `20261008100000_seller_nonretryable_conflicts.sql` | Seller action and planner source conflicts return PT409 without PostgREST serialization retries |
| 15 | `20261008110000_seller_planner_link_read.sql` | Exact owner-scoped saved seller task lookup with persisted due date and status |
| 16 | `20261008120000_realtor_reminder_nonretryable_conflicts.sql` | Stale reminder actions return PT409 without transaction retries, preserving existing RPC definition and permissions |

The scheduling dialog requires migration 15 for its read-before-save check; delivered reminder conflict recovery requires migration 16; the app's seller planner writes require migrations 4, 6, 10, and 14; seller action conflict recovery also requires 14; Today requires 8 and 11; weekly-review v2 writes require 12; the updated seller list API and active consultation/closing picker require 13. Publication outcomes and attribution require 3 before 7 and 9. Treat the pending SQL and the app as one reviewed candidate. Deploy server support for PT409 before applying migrations 14 or 16; legacy conflict-code mapping remains supported. A target-specific dry run, backup reference, and actual deployment identity remain pending.

The existing shared worker supplies the reminder and refill handlers. `workflowRegistry.server.ts` registers `realtor_reminder` and `realtor_planner`; `realtorReminderWorkflow.server.ts` validates the versioned event payload and commits through the lease-fenced `realtor_commit_reminder_job` RPC; `realtorPlannerRefillWorkflow.server.ts` processes the existing owner-local refill schedule. The manifest also fingerprints `durableScheduler.server.ts`, both invocation routes, and `vercel.json` so the reviewed source is identifiable.

| Invocation | Repository schedule | Hosted evidence still required |
| --- | --- | --- |
| `GET /api/admin/automations/hotlist-email/cron` | Hourly (`0 * * * *`); dispatches due shared workflow schedules | Authenticated successful invocation and next-run advancement |
| `GET /api/admin/automations/hotlist-email/worker` | Every five minutes (`*/5 * * * *`); processes due shared jobs | Authenticated invocation, a due reminder becoming visible, and a recorded job result |

Both routes require the configured `CRON_SECRET` bearer token. Their source definitions prove the configured cadence, not actual hosted execution or an exact-time delivery guarantee. Monitor failed invocations, oldest due queued jobs, expired leases, and reminder/job completion in the selected environment. Do not call either shared route against an unverified project: it can process other queued workflows.

For rollback, record a verified prior app/worker deployment before the release action. Keep seller receipt tables and data, preserve the narrowed owner permissions, and disable only separately enabled admissions. Restoring an earlier app can hide newly added seller controls; verify that behavior against the forward schema rather than assuming rollback compatibility.

## Non-production preflight (requires a selected target)

- [ ] Confirm the intended active published site resolves from `KELLER_WESTLAKE_AGENT_SITE` and its `site_config.owner_id` matches the real owner.
- [ ] Confirm the distributed public rate limiter and existing authenticated reminder scheduler are available; verify invocation cadence and failure monitoring.
- [ ] Keep generic platform/provider admission disabled unless the selected worker, contract, and seller-video review path are ready. Record a separate enablement change and rollback to disabled.
- [ ] Verify owner login, intake save, owner inbox, schedule, reminder cadence, Today/business read surfaces, and foreign-owner denial using real accounts in this non-production project.
- [ ] Review public seller identity/notices and sourced seller-guide availability using existing domain release requirements.
- [ ] Record migration dry-run/order, backup/rollback references, build artifact, environment IDs, and reviewer sign-off before release.

- [x] Cumulative local acceptance after personal-inbox handoffs: 32 focused tests across six files and six SQL regressions pass; real non-operator owner reopens saved reply/consultation drafts, cancels a revocation dialog without a write, and confirms contact revocation that cancels a pending reply task/reminder. Foreign-owner denial passes. The fresh disposable stack and synthetic accounts were removed (130 seconds). This does not verify a hosted target or replace a fresh production build.

- [x] Fresh normal production build after the reply/consultation handoffs, scheduling eligibility, weekly-review retry/read handling, and contact-revocation UI passes compilation, type validation, all 267 generated pages, and traces. Local build ID: MI4J-SbvokcRfceIeCtTc. Focused lint and offline 20-source compatibility verification pass. No hosted deployment was performed.

- [x] October 8 real-auth overdue-action handoff: Today opens the previous-year due-date planner and browser completion persists the correct occurrence without seller receipts or lead revision changes. All six SQL regression files, the owner/foreign-owner lifecycle, and 27 focused tests pass. Synthetic accounts and the disposable stack were removed (176 seconds). No new production build or hosted deployment was performed.

- [x] October 8 completion-response-loss acceptance: after a real committed completion response is withheld, the browser retries the identical payload and the API replays its existing receipt at the same revision. SQL confirms one completion receipt. Six database regressions and the full real-auth seller lifecycle pass; synthetic accounts and the disposable stack were removed (141 seconds).

- [x] October 8 actual-time real-auth acceptance: owner records earlier contact/reply times through inbox controls; SQL confirms exact persisted UTC instants. Six SQL regressions and the complete owner/foreign-owner seller lifecycle pass, including completion-response replay. Synthetic accounts and disposable stack were removed (173 seconds). No fresh production build or hosted deployment was performed.

- [x] October 8 cumulative production gate: compilation, type validation, all 267 pages, and traces pass after the latest planner/inbox/review changes. Local build ID: eFR5Ro4pXRw0Dkj2PnBLI. All 50 focused tests across 11 files, lint across 16 files, and 20-source compatibility checks pass. The current source also has disposable real-auth receipt-time and completion-replay acceptance. No hosted deployment was performed.

## Release and rollback decision

- [ ] After all checks above pass, prepare a separate reviewed deployment action for the selected non-production target. This checklist does not authorize production migration, external messaging, social posting, paid provider activation, or production deployment.
- [ ] Rollback disables newly activated admissions and restores compatible app/worker versions. Preserve lead, outcome, publication, and financial receipts; do not drop tables as a routine rollback.

Detailed implementation and acceptance history: [SELLER_BUSINESS_DAILY_WORKSPACE_IMPLEMENTATION_PLAN.md](./SELLER_BUSINESS_DAILY_WORKSPACE_IMPLEMENTATION_PLAN.md).
