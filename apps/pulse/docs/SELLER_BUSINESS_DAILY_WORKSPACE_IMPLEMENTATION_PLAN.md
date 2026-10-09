# Seller business + daily workspace: ordered implementation plan

Prepared October 6, 2026 for Taz. Source inspected at HEAD `5eb4d2be`, with existing uncommitted platform work present. Final reconciliation also inspected concurrently appearing seller-video publication changes; these remain someone else's working changes and were not edited for this plan. Execution follows the order below, without subagents. Re-resolve symbols and review the working diff before each packet.

### Execution status (October 6, 2026)

- P0: baseline reconciled; unrelated platform, acquisition-plan, and video-publication edits were preserved.
- P1: seller intake extraction/body limit, strict payload and retry handling, seller context, seller drafts, and contact eligibility are implemented. Targeted unit tests pass.
- P2: owner-scoped seller list/action RPC, immutable event receipts, lead revisions, stale-write rejection, seller-owner API/UI checks, action-open target validation, and the generic operator action/replay RPC are implemented. Seller and generic action replay/ownership pgTAP assertions pass in the isolated database packet.
- P3: one-time initial-response provenance, reply-linked follow-up scheduling, owner-checked planner writes, locked-time consultation appointment mode, local-time dialog, and source cancellation on archive/revocation are implemented. Consultation appointment identity preserves the confirmed UTC offset through both repeated fall-back occurrences. Targeted UI tests cover initial/reply retries and spring/fall DST conversion; the isolated planner identity database assertion and seller appointment cancellation flow pass. All five seller-specific race checks pass; broader timezone review outside those exercised cases remains outstanding.
- P4: Today has an owner-scoped bounded seller read model and activity panel; unscheduled requests open the same planner dialog. The focused panel test and targeted lint pass. The real-auth seller-business suite now exercises Today and the owner-scoped read model; the fixture-backed responsive Playwright test passes at phone, tablet, and desktop widths against both dev and production servers.
- P5: the personal context route, signed-in personal workspace gate, bounded read-only tools, redacted trace branch, response/proposal schemas, proposal confirmation cards, context switch, stable retry keys, and field-level draft edits are implemented. Edits go to the actor-bound `/api/realtor/jamie/proposals` prepare route; the client validates the new draft and keeps saving as a separate explicit confirmation. Fixture tests cover corrected-fact reprepare, editable values, tool scope, and zero save requests before confirmation. The disposable real-auth flow verifies both provider-disabled and provider-backed signed-in personal chat; the provider-backed turn used only a synthetic owner's empty workspace and confirmed no planner write.
- P6: seller acquisition week identity now uses the saved personal timezone and local Monday, requires planner setup, retains legacy ISO-week IDs, and asks for an explicit reuse decision if a UTC/local week boundary finds older tasks. The planner offers bounded unscheduled campaign tasks one at a time; the database accepts property-free links only for owner-owned open campaign backlog items. The existing Sprints video workspace remains the editor/review surface; manual publication, outcome, and attribution writes use bounded same-origin JSON and retain exact-revision approval/owner checks. Tracked destination links use the persisted campaign key and brief ID. Unit, lint, campaign-task pgTAP, and seller-video real-auth reviewer acceptance pass.
- P7: immutable contact/reply/consultation/closing capture, appointment linking with exact DST offsets, cancellation of pending linked reminders, closing correction/void, seller outcomes separate from cash, owner-local outcome scoreboard, median contact timing with denominator, campaign event/request grouping, and v2 weekly-review evidence with v1 compatibility are implemented. Focused tests, touched-file lint, schema lint, scoreboard/weekly-review pgTAP assertions, and the disposable real-auth seller lifecycle pass.
- P8: the disposable seller-business suite runs five pgTAP regressions plus real Supabase login/browser/API acceptance on a fresh local project, then removes the project and synthetic accounts. Its coverage includes owner scoping, provider-disabled and provider-backed signed-in personal Jamie chat, contact/reply/consultation/closing records, appointment/reminder cancellation, Today, scoreboard separation from cash, and v2 weekly review. The provider-backed Jamie turn uses one synthetic owner with an empty workspace and confirms no planner write. The seller-video reviewer suite passes on a disposable project. The generic concurrency harness now applies migrations in dependency order and passes end to end; it includes all five seller-specific races: consent revocation vs scheduling, site transfer vs source access, duplicate task creation, consultation cancellation vs reminder activation, and lead note/contact revision contention. Jamie fixture tests pass, the responsive Playwright spec passes against fixture-backed dev and production servers, and the bounded Groq provider smoke passes. The production build passes after correcting the CMA UI payload type to match its existing server schema and regression tests. Full repository `tsc` still reports unrelated legacy test/fixture errors. Read-only Vercel inspection resolved the local link to project `sunset-pulse`; the latest branch preview failed on that same missing `expectedPriorReviewId` client type, now fixed locally. Project environment listing is forbidden, so the preview-to-Supabase mapping is unverified, no non-production release target is selected, and a successful post-fix preview build remains outstanding.

Verification checkpoint: the P7-focused run passes 20 tests across 6 files; the Jamie personal fixture-flow run passes 8 tests across 3 files after adding draft-edit/reprepare coverage; focused ESLint, harness syntax checks, and `git diff --check` pass. The CMA private review panel/API tests pass (9 tests) after adding the already-required `expectedPriorReviewId` to the client payload type. Local Supabase schema lint reports no schema errors. Five seller pgTAP regressions, seller-business real-auth/browser acceptance, and seller-video reviewer acceptance pass on isolated disposable stacks, including cleanup; the seller-business acceptance now includes provider-disabled and provider-backed signed-in Jamie requests. The provider-backed run completed in the disposable stack, used a synthetic owner's empty workspace, asserted no planner write, and cleaned up the temporary project. The persistent local database was not reset. The full `node scripts/scheduler-concurrency-acceptance.mjs` run passes the platform workflow suite, seller-video acceptance, four realtor pgTAP files (63 assertions), financial/reminder races, and all five seller-specific races; the disposable stack cleans up. Production build passes. The responsive Playwright spec passes (1 test) against fixture-backed local dev and production servers at 390, 768, and 1440 pixels. The bounded Groq provider smoke passes. Full-project `npx tsc --noEmit` reports 33 pre-existing diagnostics in unrelated tests/fixtures; it reports none in the changed implementation files, and Next's production app type validation passes. Read-only Vercel metadata identifies project `sunset-pulse`, whose latest deployment for this branch is `ERROR`; environment-variable listing returned 403 and the local Vercel CLI is unavailable. The preview-to-Supabase mapping and non-production target remain unverified; no remote migration/deployment was performed.

The new migrations pass `supabase db lint --local` with no schema errors. Seller-business pgTAP files ran against the fresh disposable database created by the auth harness; the persistent local test database was left untouched. No migration has been applied to a remote database.

October 7 release review: the inbox now derives pipeline status from the saved lead instead of retaining an optimistic status after a rejected save. Regression tests prove that a 409 preserves the saved status and a refreshed archived lead disables contact drafting and scheduling. Both tests failed before the fix; the related unit packet now passes 14 tests across 3 files, and focused ESLint passes. A fresh production build after this fix passes compilation, app type validation, page generation, and trace collection (local build ID `Cd8ivzflsL-nvgfOJWQiP`). The release checklist now records the ordered 12-migration working-tree tail, required app/SQL combinations, shared scheduler and worker invocation paths, configured cadence, and outstanding hosted checks. `SELLER_BUSINESS_RELEASE_SOURCE_MANIFEST.json` records verified SHA256 fingerprints for those migrations and seven scheduler/configuration sources; it is a compatibility snapshot, not a complete committed candidate.

October 7 implementation follow-through: the consultation cancellation and closing correction dialog no longer infers active records from only the last 20 contact events. Forward migration `20261007180000_seller_outcome_read_models.sql` adds owner-scoped, stable active-outcome pages and a per-lead bounded recent-history read. `/api/realtor/leads/outcomes` binds cursors to the signed-in actor, lead, outcome kind, and page size. The picker supports older records, read-error recovery, and aborts stale responses; the dialog uses committed lead revisions immediately between saves. The server-rendered inbox no longer serializes event history merely to open this dialog. Today now honors its three overflow flags with destinations for the remaining work. Related unit checks pass (22 tests across 7 files), focused lint passes, and direct TypeScript review reports only the same 33 unrelated legacy diagnostics. The six-file disposable database/auth suite passes, including 16 new SQL assertions against 1,200 contact events and real owner/foreign-owner outcome reads; the stack and synthetic accounts were removed. A final database-only rerun also passes all six files after the explicit partial-index predicate was added. The compatibility manifest now captures verified fingerprints for 13 migrations and seven worker/configuration sources. The normal production build passes compilation, app type validation, page generation, and trace collection. Updated responsive browser acceptance passes at 390, 768, and 1440 pixels against a fixture-backed production server, including a five-row Today summary, overflow destination, scheduling dialog bounds, and no horizontal overflow. The temporary extended-startup runner was removed; the last fixture-mode build is test evidence, not a deployable production artifact. Hosted release still requires the selected non-production project and committed candidate described in the release checklist.

October 7 next release gate: all 33 previously recorded full-app TypeScript diagnostics are resolved in the test fixtures and mocked signatures, without excluding tests or suppressing checking. The required guide criteria, licensed workflow schedule, and test environment fields are explicit; the imported commercial lineage JSON is parsed by its schema before typed use; async browser payload capture and optional result checks retain their original assertions. The planner conflict fixture now returns the campaign-task endpoint's actual response shape and still verifies draft preservation after refresh and a rejected save. All 54 tests across the affected 14 unit files pass, focused ESLint passes across the 15 edited test files, and the direct full-app TypeScript check passes. `npm run typecheck --workspace=apps/pulse` now exposes the repeatable gate. The public-guide browser-spec change was typechecked but its browser flow was not rerun in this test-only packet. No application runtime, migration, deployment, or outbound operation changed in this packet. The non-production environment mapping is still required for hosted preflight.

October 7 executable release preflight: `npm run seller-business:preflight --workspace=apps/pulse` now verifies the complete 20-file compatibility packet against raw SHA256 fingerprints and inventories all 155 repository migrations, including legacy date-only version strings. Optional `--applied-migrations` accepts an exported JSON array and lists the entire pending migration sequence, including earlier dependencies; it rejects unknown or duplicate applied versions and gaps before a later applied migration. All nine deterministic regressions pass, and the command passes against the current source packet. Focused lint and syntax validation pass. This offline check does not execute SQL, contact a remote service, verify a complete committed application candidate, or certify hosted readiness. Target history has not been supplied; target-specific dry run and deployment remain pending. Usage and the read-only export query are recorded in the release checklist.

October 7 full unit release gate: the entire Pulse unit suite passes all 1,537 tests across 375 files (`npm run test:unit --workspace=apps/pulse`, 307.51 seconds). The first broad run exposed five checkpoint-route fixture failures and three retrieval/filesystem timeouts. The route fixture now supplies the workspace-scoped checkpoint lookup added by the seller-review integration; a new denial regression verifies a safe 403, no internal error disclosure, and no RPC write. The timed-out files pass in isolation with two workers and in the complete rerun after `vitest.config.ts` caps concurrency at two. Existing timeouts and assertions remain intact. Full TypeScript and focused lint pass. This packet only changes test configuration and fixtures; hosted preflight still requires the verified non-production environment mapping.

October 7 personal seller inbox follow-through: hosted release is set aside at the user's request while local product work continues. Inspection found that Today's links still opened the operator-only inbox, whose newest-100 limit could hide older seller requests. `/seller-inbox` now lives in the existing personal workspace, reads 25-request pages from the owner-scoped seller API, supports older/newest navigation and focused-request links, validates responses, and distinguishes failures from genuine empty results. It exposes native email drafts, manually recorded email-contact/customer-reply receipts, and the existing scheduler/outcome dialogs without any operator endpoint. Successful writes are followed by a fresh owner read before allowing another action; conflicts offer reload, uncertain writes reuse their request identity, refreshed closed/archived state disables contact, and loss of ownership removes the request. The six-file disposable database/auth suite passes after adding the new route's real non-operator owner/foreign-owner acceptance and responsive scheduling-dialog checks at 390, 768, and 1440 pixels. Browsing and opening drafts leave the lead revision unchanged; the temporary stack and accounts were removed (120 seconds). The fresh normal production build passes compilation, app type validation, all 267 generated pages, and trace collection. All 20 focused tests across five files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. No remote deployment or new migration is part of this packet.

October 7 saved-reply follow-through: the personal seller inbox now shows up to 20 recent recorded receipts, with owner-timezone timestamps and a follow-up scheduling entry for each customer reply. Reopening a follow-up uses the original reply receipt and the current lead revision, and performs no write until the existing scheduler is saved. Closed/archived requests and revoked requested-contact permission disable the follow-up entry. All 15 focused inbox/scheduler tests, full-app TypeScript, focused ESLint, and diff whitespace validation pass. This UI-only packet adds no migration or deployment; the prior production build and real-auth acceptance predate this change.

October 7 confirmed-consultation follow-through: the personal seller inbox now offers an explicit appointment handoff for saved confirmations. It reuses the owner-scoped paginated active-outcome picker, so older confirmations remain accessible and cancelled records are excluded by the existing read model. The picker returns the selected persisted receipt; cancellation and closing correction retain their existing actions. The scheduling handoff uses the current lead revision and the exact confirmation timestamp, preserving the established locked-time appointment and DST offset behavior. Opening the picker and appointment draft performs only reads. Closed/archived state and revoked requested-contact permission disable scheduling. All 20 focused tests across four files, full-app TypeScript, and focused ESLint pass; the inbox rerun also passes after adding disabled-state assertions. No SQL, deployment, or outbound operation changed. Production build and real-auth browser acceptance were not rerun for this UI-only packet.

October 7 scheduling eligibility reconciliation: personal inbox initial-response scheduling now requires active requested-contact permission, an open request, and no recorded initial contact, matching the existing planner source guard rather than general email-draft eligibility. Eligible reply follow-ups remain available after initial contact. Every inbox scheduling handoff uses the latest reread lead revision, avoiding an unnecessary stale-write rejection if the request advances between a reply acknowledgment and its fresh owner read. All 19 focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. Regression coverage includes contact already handled with a subsequent reply and a reply acknowledgment at revision 4 followed by a fresh read at revision 5. No migration, deployment, or outbound operation changed; production build and real-auth browser acceptance were not rerun for this focused fix.

October 7 weekly-review handoff reconciliation: the weekly business review links to the personal seller inbox instead of the operator-only route. Seller outcome reads now have a distinct loading state and an explicit retry when counts are unavailable. Retries preserve priority, next-action, and friction drafts. Closing the review aborts its request, and a delayed prior response cannot replace the newly opened review summary. Eight focused tests across two files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. Completion semantics and server-side weekly evidence remain unchanged. No migration, deployment, or outbound operation changed; production build and real-auth browser acceptance were not rerun for this UI-only packet.

October 7 weekly-review retry identity: completion now retains a request UUID for each occurrence/revision and normalized evidence payload, reusing it after an uncertain failure while assigning a different UUID when evidence changes. Successful completion clears retained identities. A synchronous in-flight guard and local saving state block parallel completion submissions even before parent busy state updates. Submission validates the current confirmations and required text before writing. Nine focused tests across two files, full-app TypeScript, and focused ESLint pass, including identical retry payload, changed-evidence identity, and parallel-submit regression coverage. No migration, deployment, or outbound operation changed; production build and real-auth browser acceptance were not rerun for this focused UI fix.

October 7 owner contact-permission handoff: the personal inbox displays whether requested-contact permission is active and exposes the existing revoke_requested_contact action through an explicit confirmation dialog. Cancelling the dialog writes nothing. The strict action payload omits contact/reply-only fields, uncertain retries preserve their request identity, and an acknowledged revocation closes pending scheduling drafts before a fresh owner read. The existing SQL receipt and source-cancellation trigger remain responsible for revocation and linked reminder cancellation; separate marketing permission is unchanged. All 21 focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. The new confirmation/retry UI regression runs against API fixtures; production build and real-auth browser acceptance were not rerun for this packet. No migration, deployment, or outbound operation changed.

October 7 cumulative real-auth verification: the disposable seller-business suite now reopens persisted reply and consultation scheduling drafts from the personal inbox, checks initial scheduling is disabled after contact, and confirms that opening these drafts leaves the lead revision unchanged. It creates a pending reply-linked reminder, cancels a revocation dialog without a write, then confirms revocation through the rendered inbox and verifies one immutable receipt, cancelled pending follow-up, and superseded reminder. All six SQL regression files and the real owner/foreign-owner lifecycle pass with mock auth disabled. The first run rejected a new test fixture because an appointment-only utcOffsetMinutes field was attached to a follow-up; removing that fixture field resolved it. The successful fresh project completed in 130 seconds, removed synthetic accounts/workspaces and the disposable stack, and restored admission. All 32 focused tests across six files pass together. Harness syntax and diff whitespace checks pass. This verification packet changes only the acceptance harness and documentation; no new production build, migration, deployment, or paid provider call was performed.

October 7 cumulative production-build gate: a fresh normal production build after all personal-inbox and weekly-review changes passes optimized compilation, app type validation, generation of all 267 pages, and trace collection. Local build ID: MI4J-SbvokcRfceIeCtTc. Focused ESLint passes across the three changed components and three related test files. Offline compatibility verification passes all 20 raw source fingerprints and inventories 155 migrations. These results supplement the preceding 32-test focused packet and six-file disposable SQL/real-auth acceptance. The build uses the normal local configuration, without fixture-mode overrides. No deployment or remote migration was performed; the compatibility manifest still does not certify a complete committed application candidate or hosted target.

October 7 inbox navigation follow-through: the personal seller inbox retains its visited cursor path and adds previous-page navigation, alongside the existing direct return to newest. A failed older-page read can be escaped one page at a time without restarting the traversal. Each return uses a fresh owner-scoped read; no private lead cache or new write endpoint is introduced. All 16 inbox tests, full-app TypeScript, focused ESLint, and diff whitespace validation pass. The new regression visits three cursor states, handles an unavailable third page, returns to the second and newest pages in order, and checks that navigation performs only reads. This UI-only change postdates the preceding production build and authenticated acceptance; those were not rerun for this packet. No migration or deployment was performed.

October 7 overdue-action planner handoff: each overdue seller action on Today retains its private lead link and now offers a direct planner link scoped to its due date. The planner page validates date query parameters and reads that one-day range, including previous-year dates, rather than dropping the user into the current-year schedule. Initial reads, stored/projection pagination, and refresh after source conflicts all retain the selected range through a shared URL builder. A visible date banner links back to the full planner. All 11 focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. Regression coverage includes a previous-year overdue action, both cursor kinds, normal-year compatibility, and invalid dates. This packet adds no SQL or deployment; production build and real-auth browser acceptance were not rerun after this handoff change.

October 8 overdue-action end-to-end acceptance: the disposable real-auth suite now creates a seller action due in the previous year, follows its rendered Today link into the date-scoped planner, and completes it through the browser. SQL confirms the correct occurrence is completed, the lead revision remains unchanged, and no contact/reply evidence is manufactured. The suite also retains saved reply/consultation handoff, contact revocation with pending reminder cancellation, owner-local scoreboard, v2 review, and foreign-owner denial coverage. All six SQL regression files and the real-auth flow pass with mock authentication disabled; the fresh project, synthetic accounts/workspaces, and stack were removed after 176 seconds. All 27 focused tests across four files pass together. Harness syntax and diff whitespace validation pass. This packet adds only acceptance coverage and documentation; it performs no new production build, remote migration, deployment, or paid provider call.

October 8 planner completion retry identity: ordinary pending planner occurrences now use PlannerCompleteAction, which retains a completion request UUID for the occurrence/revision after an uncertain result, prevents parallel submissions through a synchronous guard and local saving state, and handles rejected promises with a retryable inline message. Changed revisions use distinct identities; acknowledged success releases the retained identity. Bill-payment and weekly-review flows remain on their existing specialized controls. Eleven focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. Tests cover uncertain and rejected-promise replay payloads, changed revisions, parallel clicks, workspace interactions, and date navigation. The preceding real-auth handoff acceptance predates this UI-only change; it was not rerun and no fresh production build, SQL, or deployment was performed.

October 8 committed-response-loss acceptance: the real-auth browser suite now withholds the first successful planner completion response after the server commits it, presenting a synthetic 503 to the UI. The owner retries from the unchanged pending row. Browser payloads are byte-identical; the real API returns reused=true and the same saved revision. SQL confirms exactly one occurrence-action receipt. The dated past-year completion still creates no seller contact/reply evidence or lead revision change. All six SQL regression files and the remaining authenticated owner/foreign-owner lifecycle pass with mock auth disabled. Synthetic accounts/workspaces and the disposable project were removed after 141 seconds, with admission restored. Harness syntax and diff whitespace validation pass. This acceptance-only packet adds no production build, migration, deployment, or paid provider call.

October 8 weekly-review summary integrity: recorded seller summaries are parsed by a dedicated client-safe schema before display. All four counts must be nonnegative safe integers; optional contact timing and campaign groups are validated when present. Missing or malformed fields produce the existing unavailable/retry state instead of silently displaying zeros. Genuine explicitly recorded zero-count weeks still display zero activity. Fifteen focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. Regressions cover absent/partial counts, negative and string values, successful retry, true zero totals, versioned review completion, and existing workspace interactions. This client-read change adds no SQL or deployment; production build and real-auth browser acceptance were not rerun for this packet.

October 8 actual receipt-time capture: personal inbox email-contact and customer-reply receipts now accept an optional occurrence time in the saved workspace timezone. Blank time retains record-now behavior; expanded controls explain choosing the actual action time. Repeated fall-back hours require an earlier/later choice, nonexistent spring-gap times are rejected, and historical/future bounds match the existing SQL five-minute tolerance. Retry fingerprints include the chosen time and repeated-hour choice: unchanged uncertain saves preserve their exact payload, edited times use a new identity, and acknowledged saves clear the timing draft. Contact revocation retains its distinct server-timestamped payload. All 21 focused tests across three files, full-app TypeScript, focused ESLint, and diff whitespace validation pass. The tests cover local-time payload conversion, replay identity after uncertainty, changed time, both DST cases, and time-range rejection. No migration or deployment was performed; production build and real-auth browser acceptance were not rerun for this packet.

October 8 actual-time real-auth acceptance: contact and reply receipt setup in the disposable browser suite now uses the rendered personal inbox timing controls and record buttons. The owner selects earlier America/Chicago local times; the harness captures each real POST response and SQL verifies exact UTC equality in contact_attempted_at and responded_at. The workflow continues through consultation confirmation/cancellation, closing, scoreboard, weekly review, revocation, and foreign-owner denial. The dated planner and committed-response-loss replay checks also pass. All six SQL regressions and authenticated lifecycle checks pass with mock auth disabled. Synthetic accounts/workspaces and the disposable stack were removed after 173 seconds; admission was restored. Harness syntax and diff whitespace validation pass. This acceptance-only packet adds no migration, fresh production build, deployment, or paid provider call.

October 8 cumulative production gate: the fresh normal production build after inbox previous-page navigation, due-date planner routing, completion retry identity, weekly summary validation, and actual receipt-time capture passes optimized compilation, app type validation, generation of all 267 pages, and trace collection. Local build ID: eFR5Ro4pXRw0Dkj2PnBLI. All 50 focused tests across 11 files pass together, and focused ESLint passes across 16 changed source/test files. Offline compatibility verification passes all 20 source fingerprints and inventories 155 migrations. The preceding 173-second disposable SQL/real-auth acceptance covers the current timestamp capture and completion replay source; all temporary accounts and the stack were removed. The build uses normal local configuration without fixture-mode overrides. No deployment or remote migration was performed; this remains local verification, not certification of a complete committed candidate or hosted target.

October 8 operating-routine handoff: Today now includes a collapsed Seller daily routine guide linking the existing personal inbox, planner, and business records. It walks request review, due work, actual contact/reply/outcome recording, and end-of-day money records, plus the existing weekly-review template. SELLER_BUSINESS_DAILY_RUNBOOK.md records the same daily/weekly sequence and the two-week friction-driven improvement checkpoint. Full-app TypeScript, focused ESLint, and diff whitespace validation pass. This static guidance adds no persistence, mutation endpoint, migration, or deployment. No extra unit tests were added for static copy and links; the production build and real-auth acceptance predate this guidance change.

October 8 outcome-dialog recovery: seller outcome writes now pause whenever the owner inbox requires a fresh request read, including after a committed save whose follow-up read fails. The dialog retains editable consultation, closing, and correction drafts and offers an owner-request reload; a successful reload resumes actions using the refreshed revision. Revision conflicts notify the inbox to require recovery, and a synchronous in-flight guard prevents overlapping outcome submissions. New unit coverage verifies paused writes, preserved drafts, refreshed revisions, conflict recovery, duplicate-submit protection, and the integrated save-success/read-failure/reload flow. All 24 focused tests across the inbox, outcome dialog, and outcome picker pass; full-app TypeScript and focused ESLint pass. No SQL or deployment changed. Production build and real-auth browser acceptance were not rerun for this packet.

October 8 seller scheduling recovery: inbox scheduling drafts now remain mounted while owner reads are pending or fail. Revision conflicts pause further writes and offer a reload that preserves date, time, timezone, and reminder choices; refreshed ownership, status, and requested-contact permission are checked before resuming. Unavailable, archived, or permission-revoked requests dismiss invalid drafts. Today shortcut conflicts link to the current owner inbox. Synchronous guards prevent overlapping saves, and Escape cannot dismiss an in-flight save. Real browser verification exposed a server-side problem: semantic seller conflicts used SQLSTATE 40001, which the local PostgREST transaction runner repeatedly retried until a 60-second failure. Forward migration 20261008100000_seller_nonretryable_conflicts.sql changes only the seller action and seller planner-source functions to PT409, preserving function ACLs and requiring the reviewed prior definitions; the shared server error mapper recognizes PT409 as a reloadable conflict. Original migrations remain unchanged. All 39 focused tests across seven files, full-app TypeScript, focused ESLint, nine preflight regressions, and diff whitespace checks pass. Offline preflight verifies 21 sources and 156 migration files. The complete disposable real-auth seller suite passes all six database files, existing lifecycle/foreign-owner/responsive flows, real stale action and planner rejection, failed-reload draft retention, and a refreshed save creating exactly one planner item without another seller receipt (158 seconds). Temporary users/workspaces and the isolated stack were removed. A focused scheduling-only harness option and bounded, redacted failure diagnostics are retained. Production build and hosted migration/deployment were not run for this packet.

October 8 saved seller-task handoff: the scheduling dialog now checks the exact owner-owned seller action before offering a new save. Existing initial responses, reply follow-ups, and consultation appointments show their saved task status and open the persisted effective date, including rescheduled dates and completed past-year work. Loading, failed, and malformed lookups block creation; retry preserves editable drafts. The authenticated route binds actor/workspace on the server, and a service-only SQL read checks current site ownership, active personal workspace, and owner membership. A forward migration adds this read without changing existing receipts. All 40 focused tests across six files, full-app TypeScript, focused ESLint, nine preflight regressions, and seven SQL regression files pass. The full disposable real-auth browser suite proves all three saved-task handoffs, foreign-owner denial, prior recovery/replay behavior, and exactly one recovery task. Synthetic accounts/workspaces and the disposable stack were removed (173 seconds). Compatibility verification now covers 22 sources and 157 migrations. The daily runbook and release checklist record the handoff and migration dependency. No fresh production build, hosted migration, or deployment was performed.

October 8 scheduling draft validation: editing a partial or invalid time zone previously threw during date formatting. The dialog now tolerates partial input and uses the existing shared dueSpecSchema to validate dates, times, and time zones before saving. Invalid fields have accessible inline messages and cannot allocate a retry identity or submit a planner write. Correcting the zone preserves the date, time, and reminder draft and sends the normalized zone through the existing planner API. Confirmed consultation offsets, stable retry identities, reminder jobs, and the shared authenticated worker remain on the established scheduling path. The user reaffirmed that existing scheduling infrastructure should be reused whenever possible; this preference is recorded under the scope constraints. All 44 focused tests across six files, full-app TypeScript, focused ESLint, nine preflight regressions, and seven SQL regression files pass. The complete disposable real-auth/browser suite verifies invalid-zone draft retention with no planner item, correction through the planner API, exactly one recovered task, existing handoffs, lifecycle, and foreign-owner denial. Synthetic accounts/workspaces and the isolated stack were removed (166 seconds). Compatibility verification remains 22 sources and 157 migrations. No new migration, fresh production build, hosted migration, or deployment was performed.

October 8 delivered reminder follow-through: Today now uses PlannerReminderActions for delivered reminders. Open reminder task validates and opens the persisted due date, including prior years, with a full-planner fallback for unavailable dates. Snooze and dismissal retain an exact operation payload for each reminder/revision/action; snooze retains its first 24-hour deadline across retries instead of recalculating it. A synchronous guard blocks overlapping actions. An uncertain response pauses the alternative action until the same request is retried or a successful fresh reminder read is obtained; failed reload preserves recovery. Refresh reads Today in place rather than unmounting the pending controls on failure. All changes use the existing reminder PATCH API, mutation receipts, event enqueue trigger, and durable scheduling contracts. The explicit Snooze 24 hours label describes the existing elapsed-time behavior. Eight new component regressions and related planner/workspace checks pass: 22 tests across five files, full-app TypeScript, focused ESLint, harness syntax, compatibility fingerprints, and whitespace checks pass. The complete disposable real-auth suite passes all seven database files and the seller lifecycle (200 seconds). Browser acceptance creates opt-in reminders through the planner API, verifies only the two synthetic event jobs are due, claims them through claim_workflow_jobs, and delivers them through the lease-fenced realtor_commit_reminder_job RPC. Their links open the previous-year task. Committed snooze/dismiss responses are withheld; byte-identical retries replay the existing revision, with one receipt and audit each. Snooze queues exactly one future job. Reminder actions manufacture no seller receipts, and task completion remains a separate operation. Temporary accounts/workspaces and the isolated stack were removed. No new migration, production build, or hosted deployment was performed; this local RPC acceptance does not prove a hosted worker invocation.

October 8 reminder conflict recovery: stale reminder writes now require a fresh read rather than offering another stale retry. The existing reminder RPC had retained SQLSTATE 40001 for business conflicts; guarded forward migration 20261008120000_realtor_reminder_nonretryable_conflicts.sql changes its single conflict site to PT409 and preserves the reviewed body, search path, and ACLs. The shared client request preserves HTTP status, while existing workspace consumers retain their boolean submit contract. Reminder controls receive a distinct conflict result, pause both actions, and offer Refresh reminders. A failed read leaves both actions paused; a fresh revision resumes with a different request identity, and an already handled reminder disappears. Uncertain network results retain the exact original retry payload and snooze deadline. All 26 focused tests across six files, full-app TypeScript, focused ESLint, nine preflight regressions, harness syntax, and whitespace checks pass. The reminder lifecycle SQL test now has 11 assertions, including PT409 rejection without a receipt, valid dismissal, and one-receipt replay. The full disposable real-auth suite passes all eight SQL files and the seller lifecycle (198 seconds). Three synthetic reminders are enqueued, claimed, and delivered through the existing scheduler RPCs. A real concurrent API dismissal makes the rendered reminder stale; the browser receives 409, retains its conflict state through a synthetic failed Today read, and removes the card after a successful owner read. Lost snooze/dismiss response checks, one future durable job, completion replay, ownership denial, and seller scheduling recovery still pass. Temporary accounts/workspaces and the disposable stack were removed. The reviewed manifest now covers 23 sources and 158 migration files. No fresh production build or hosted migration/deployment was performed.

October 8 Today seller read recovery: the seller daily summary now has a shared client/server contract that requires the four safe nonnegative counts, owner-linked bounded lists, valid dates and time zone, contact timing, campaign groups, and overflow flags. Missing lists and malformed data produce unavailability rather than false empty-work messages. The server rejects malformed RPC data before Today marks it available. The panel offers Retry seller activity and an inbox link; retries use the existing owner-authenticated Today read, update only the seller panel, block overlapping reads, and abort or ignore responses superseded by fresh parent data. A scheduling save explicitly rereads the seller summary instead of relying on router.refresh to update client state. A failed post-save read exposes recovery before showing current work. Scheduling continues through the existing planner API and reminder infrastructure. All 34 focused tests across five files and focused lint pass. The complete disposable suite passes all eight database files and the real seller lifecycle (204 seconds): malformed Today data, failed read retry preserving other panels, real owner scheduling, failed post-save read, successful recovery removing the scheduled request, and one linked planner item. The exact synthetic recovery fixture is removed before the remaining lifecycle checks; final cleanup removes accounts/workspaces and the isolated stack. The final optional-field adjustment preserves existing generated timestamps, provenance labels, and overdue planner identifiers; its unit/lint verification postdates the browser run. Offline compatibility remains 23 sources and 158 migrations. No new migration, production build, or hosted deployment was performed.

October 8 Today schedule handoff: saving a seller response from Today now uses its existing owner read to update both the seller summary and the agenda. A shared agenda contract validates the bounded occurrence/reminder lists, revisions, dates, statuses, and reminder links before applying them; source/property metadata remains intact. The parent updates only the agenda and, on explicit schedule/reminder refresh, a valid seller summary, preserving business, goals, settings, and mounted drafts. A failed post-save or agenda read keeps the previous schedule with a refresh notice and a read-only Refresh schedule action. Fresh reads clear the notice; aborted seller reads cannot apply agenda callbacks. Verification passes 38 focused tests across six files, full-app TypeScript, focused lint, compatibility verification (23 sources / 158 migrations), and the full disposable seller database/auth/browser suite (195 seconds, all eight SQL regressions). The browser confirms failed-read recovery removes the unscheduled request, displays the saved task in Coming up, and leaves exactly one linked task and one reminder through the existing planner scheduler. Reminder delivery/replay/conflict and remaining seller lifecycle checks pass; synthetic users/workspaces and the disposable stack are removed. No new scheduler, migration, production build, or hosted deployment was performed.

October 8 Today task/request navigation: Coming up now opens each saved task's validated due-date planner and displays its local time with the workspace timezone. New shared `PlannerTaskLinks` exposes a seller request only from a valid identifier and explicit current-owner availability returned by the existing owned-source reader; the planner uses the same request link. Date validation preserves past-year handoffs and falls back to the full planner for malformed dates. Verification passes 42 focused tests across eight files, full-app TypeScript, focused lint, script syntax, compatibility verification, and the full disposable seller database/auth/browser suite (206 seconds, all eight SQL regression files). Real browser navigation at phone/tablet/desktop widths reaches both the due-date task and its request. Temporarily removing the exact synthetic website owner makes fresh Today/planner reads remove the request links and seller-source metadata, while retaining the actor's private planner task; the direct seller read returns no request. Ownership is restored in a finally block before remaining lifecycle checks. Navigation leaves the lead revision and seller-event count unchanged. Existing scheduler/reminder/completion/outcome checks pass, and synthetic users/workspaces and the disposable stack are removed. Compatibility remains 23 sources and 158 migrations. No new scheduler, migration, production build, or hosted deployment was performed.

October 8 PR candidate preparation: the full 389-file / 1,626-test sweep exposed the missing seller inbox catalog entry and an admin scheduler test fixture predating the saved-task lookup. Both are corrected; all 18 related tests and focused lint pass after the 1,624 passing tests in the full sweep. A fresh normal production build passes compilation, whole-app types, all 267 static pages, optimization, and traces (`YtUr7iZtfE0OCH3K3Zth3`). The app route inventory now includes the seller inbox and counts the actual 130 page patterns plus five resources. Scoped LF attributes and refreshed manifest hashes make all 23 compatibility sources match their staged Git bytes across checkouts; nine preflight regressions pass, with 158 repository migrations. The latest complete disposable seller acceptance remains the passing 206-second run. This packet is prepared for active PR #80; hosted rollout remains separate.

## 1. Outcome and scope

Connect the first two proposed directions: SunsetPulse runs Taz's seller business and becomes the daily environment for doing that work.

The first complete experience is:

1. A visitor reads a Keller / Westlake guide or seller offer and requests help.
2. The request is durably saved in the existing owned lead inbox.
3. Taz opens Today, sees the request, reviews it, and schedules the next action.
4. The existing personal planner and reminder worker surface that action.
5. Jamie reads explicitly authorized personal context and prepares editable proposals.
6. Taz records an actual contact attempt, customer reply, consultation, and later a closing when applicable.
7. A weekly review compares those outcomes with manually recorded cash and costs.

Success is a usable business routine with observable client outcomes. A public page view, opened email client, task completion, or generated script does not establish a customer reply, appointment, transaction, or deposit.

First release decisions:

- Keep the existing public routes, owned lead store, personal workspace, ledger, scheduler, and checkpoint engine.
- User preference reaffirmed October 8: use the existing scheduling infrastructure whenever possible. Seller scheduling should use the shared planner due contract, planner API, reminder jobs, and authenticated worker rather than introduce a separate timer or cron service.
- Incoming requests appear as unscheduled work through a read model. Anonymous intake does not impersonate the owner or automatically write private planner items.
- Taz explicitly chooses dates, working hours, and reminders when scheduling a lead action. First release does not invent a contact SLA or automatically enroll anyone in nurture.
- Contact and social distribution remain manual. Drafts, review decisions, recorded publication URLs, and recorded contact outcomes are distinct facts.
- Personal finances remain private to the personal workspace owner. Owning or administering a team workspace does not grant access to another person's finances.
- Use the existing configured models/providers. No SDK upgrade, model migration, new paid integration, or general autonomous executor is required for this plan.
- Real scans, reconstruction, games, grill operations, and a generic second-business platform are separate workstreams.

## 2. Inspected foundation: reuse and actual gaps

Paths below are relative to `apps/pulse/`, unless marked repository root. New paths are proposals. Existing symbols were inspected; line numbers are intentionally omitted because the working tree is changing.

| Existing file / symbol | Source evidence | Planned treatment |
| --- | --- | --- |
| `app/page.tsx`, `SellerAcquisitionHero` | Home already imports the seller hero | Verify the complete public path; do not build a replacement hero |
| `app/seller-plan/page.tsx`, `components/lead-capture/SellerPlanRequestForm.tsx` | Seller plan/pricing-review selection, explicit requested-contact checkbox, optional marketing consent, campaign fields, submission UUID | Harden retry behavior and validate browser payload against the actual schema |
| `lib/marketing/leadMagnetContract.ts`, `sellerPlanLeadSchema` | Strict version-2 contract, separate requested-contact/marketing consent, bounded campaign normalization | Reuse; keep addresses in the existing private CMA details flow |
| `app/api/lead-magnets/route.ts`, `POST` | Published-site resolution; direct `agent_site_leads` insert; fingerprint-based replay; distributed public rate limiting | Extract the current seller intake into a narrow service; stream-limit bodies; preserve save-first behavior |
| `lib/sites/siteData.ts`, `getTenantSite` | Published configuration resolves canonical `agentId` | Reuse for public intake; personal access uses explicit `site_config.owner_id`, never a default-agent fallback |
| `app/admin/agent-leads/page.tsx`, `AgentLeadActions.tsx` | Existing inbox, actions, native draft links, contact/response recording | Add seller recommendations and planner scheduling; retain existing buyer/guide behavior |
| `lib/sites/leadOperatingSystem.ts`, `deriveNextBestAction`, `generateFollowUpMessage` | Generic branches discuss home searches, hotlists, and tours | Add validated seller-specific branches before generic branches |
| `lib/sites/leadExecutionIntent.ts`, `resolveLeadExecutionIntent` | Creates `tel:`, `mailto:`, `sms:` links from recommendations | Add seller contact eligibility checks; opening a link remains telemetry only |
| `app/api/admin/agent-leads/route.ts`, `PATCH` | Reads a row then updates by ID; appends an in-memory metadata audit trail; no expected-revision contract | Add atomic revisioned action RPC and immutable seller outcome events; preserve supported legacy actions |
| `app/api/admin/agent-leads/action-events/route.ts`, `POST` | Logs action-open telemetry even when the scoped lead lookup returns no row | Return 404 on a missing owned lead; do not create an action-open event for an unavailable target |
| `lib/intelligence/agentNotificationStore.ts`, `resolveOperatorAgentId` | Can fall back to requested/default agent outside the realtor case | Do not use this resolver to authorize new personal lead reads or writes |
| `lib/realtor-workspace/store.server.ts`, `savePlannerItem` | Reuses `realtor_save_planner_item`, recurrence expansion, reminders, mutation receipts | Extend existing planner provenance rather than create a second task store |
| `lib/realtor-workspace/contracts.ts`, `plannerItemInputSchema` | Optional authorized property link and `sourceSprintTaskId` | Add a separate typed seller-lead link; preserve property-task invariants |
| `app/api/realtor/today/route.ts`, `GET` | Independently loads agenda, business summary, and goals with partial availability | Add bounded seller attention and outcome sections with the same availability pattern |
| `components/realtor/RealtorWorkspace.tsx`, `TodayView` | Business, agenda, reminders, work links, private settings | Add seller cards without rewriting planner, finance, or goal views |
| `lib/ai/jamieWorkspaceTools.ts`, `createJamiePersonalTools` | Read agenda/business and prepare planner/financial/goal tools exist | Connect them to an authenticated personal chat path |
| `app/api/jamie/chat/route.ts` | Re-exports `POST` from `app/api/chat/route.ts` | Make personal-mode changes in the real handler |
| `app/api/chat/route.ts`, `chatRequestSchema`, `POST` | No personal context field; calls `runTensorZeroJamieChat` | Add explicit context, personal access resolution, bounded private response behavior |
| `lib/tensorzero/jamieBackbone.ts`, `runTensorZeroJamieChat` | Uses existing general Jamie path and property-search execution | Add a personal-mode branch; keep private context out of public/general retrieval |
| `components/chat/JamieAssistantWorkspace.tsx`, `modelAdapter` | Sends messages/listing context and renders text; no personal context or proposal cards | Send explicit personal mode and render validated proposal results |
| `components/realtor/JamieProposalCard.tsx` | Form-based proposal preview/confirmation exists; confirm currently creates a fresh request key | Factor reusable confirmation UI and keep an operation key stable across uncertain retries |
| `lib/marketing/sellerAcquisitionWeek.ts`, `sellerAcquisitionWeek` | Six weekly backlog templates, keyed by UTC ISO week | Use saved owner timezone/local Monday; bridge selected work to Planner |
| `app/api/sprints/route.ts`, `add_seller_acquisition_week` | Idempotent per-item creation and partial-progress response already exist | Preserve partial retry semantics; fix the week key and expose unscheduled campaign tasks |
| `app/api/seller-video-briefs/route.ts`, review route | Versioned private drafts and exact-revision platform review already exist | Reuse existing storage/review and strengthen integration evidence |
| `supabase/migrations/20261005120000_seller_video_review_checkpoint.sql` | Review run pins a brief revision/hash and checks linked backlog revision | Derive review state from checkpoint/run evidence rather than trusting caller review fields |
| `app/admin/sprints/SellerVideoBriefWorkspace.tsx` | Existing workspace UI saves drafts, requests review, and now has local publication-record controls | Reuse this component; add a daily-workspace entrance instead of a competing video editor |
| `lib/marketing/videoPublicationRecordSchema.ts`, `app/api/seller-video-briefs/publications/route.ts`, migration `20261006150000_seller_video_publication_records.sql` | Appeared in the working tree during planning: schema, private endpoint, exact-approved-revision recording RPC | Reconcile and verify this implementation before proposing any new publication table, schema, or endpoint |

`lib/sites/agentLeadIntake.server.ts` does not exist in this checkout despite being proposed in the older acquisition plan. Treat the new seller intake service below as new code.

Existing plans contain dated and partly conflicting acceptance/status statements. Source inspection establishes the above wiring; it does not establish fresh browser acceptance or production readiness. This integration plan defines the order for this request. Preserve unrelated work and use earlier plans for domain contracts and dated evidence.

## 3. Build order and review units

| Packet | Result | Depends on | Suggested review unit |
| --- | --- | --- | --- |
| P0 | Reconciled baseline and deterministic pilot fixtures | — | Evidence/fixture preparation |
| P1 | Reliable seller capture and seller-appropriate drafts | P0 | Public intake + recommendation slice |
| P2 | Owned, revisioned lead actions and recorded outcomes | P1 | Lead service/SQL/API slice |
| P3 | One lead next action becomes one personal planner item | P2 | Planner provenance slice |
| P4 | Today becomes a seller-business morning view | P3 | Read model + daily UI slice |
| P5 | Personal Jamie reads context and returns confirmable drafts | P4 | Chat integration slice |
| P6 | Weekly acquisition work, review, and manual publication connect | P3; P5 for optional conversational preparation | Campaign workflow slice |
| P7 | Consultation/closing capture and weekly business review | P2, P4, P6 | Outcome/scoreboard slice |
| P8 | Complete disposable browser acceptance and release packet | All | Acceptance + rollout evidence |

P1–P4 form the minimum useful seller/daily-workspace release. P5–P7 deepen it. Complete packet exits before marking a review unit done. Local development and tests can proceed before a hosted release target is chosen.

Proposed migration names use October 7 slots to avoid the October 6 migrations already in the working tree. Check the migration tail before implementation; rename to the next free monotonic slots when necessary. Do not apply any SQL in this planning task.

## P0 — Establish the baseline and pilot fixtures

1. Run `git status --short` and inspect the latest effective definitions of `realtor_save_planner_item`, planner identity triggers, `realtor_personal_access`, site ownership policies, and seller video review contracts. Do not edit the existing uncommitted `lib/platform/workflows/http.server.ts`, `runStore.server.ts`, acceptance scripts, or connector-health migrations merely to reconcile this document.
2. New `tests/fixtures/seller-business.ts`: define synthetic owner A, owner B, team-admin C, sites A/B, seller-plan and pricing-review inputs, fixed timestamps, contact revoked, archived, and legacy lead rows. Use reserved example addresses/emails. No production lead exports.
3. Record the effective route/schema contract for `/api/lead-magnets`, `/api/realtor/planner`, `/api/realtor/today`, `/api/chat`, seller-video review, and the admin lead PATCH. Note existing `{ ok, result }` versus public `{ success, accepted }` responses; avoid a broad API-envelope migration.
4. Use the root and app package scripts for acceptance. No new test framework or dependency is required. Before adding the personal AI runner, verify installed `ai` and `@ai-sdk/groq` types/docs; this plan inspected bundled docs for `generateText`, `stepCountIs`, tool results, output token limits, and abort signals.

Exit: exact prerequisites and fixture scope are known; existing source is distinguished from proposals. No new product implementation is claimed.

## P1 — Capture reliably and recommend seller actions

### P1.1 New `lib/marketing/sellerLeadIntake.server.ts`

Write in this order:

1. Import `server-only`, crypto, `supabaseAdmin`, `getTenantSite`, and the existing seller schema/campaign normalizer.
2. Define a typed result: `saved`, `replayed`, `conflict`, or `unavailable`. Do not return a public lead ID or private resource URL.
3. Export `saveSellerPlanLead(input: SellerPlanLeadInput, configuredSite: string)`.
4. Resolve the published active tenant and canonical agent ID server-side. Reject missing owner/site configuration; never accept submitted agent/workspace IDs.
5. Move normalization, fingerprint generation, scoped idempotency key, metadata construction, and lead insert from the current route into this function. Persist structured `timing` in `metadata.sellerPlan` as well as the current message; legacy missing timing remains unknown.
6. Preserve `offerVersion:'2'`, request kind, explicit requested-contact receipt, optional marketing receipt, campaign normalization, and funnel ID. Store no private address here.
7. On `23505`, read by canonical agent and idempotency key. Return replay only when the stored fingerprint matches. A changed payload using the same submission ID returns conflict.
8. Return success only after the database insert/replay is proven. This function does not call AI, a notification provider, or the personal planner.

### P1.2 Modify `app/api/lead-magnets/route.ts`, `POST`

1. Retain first-party host/origin checks, JSON content-type checks, honeypot behavior, and required distributed public rate limiting.
2. Replace `request.text()` with a route-local `readSellerRequestJson` that counts raw stream bytes, cancels the reader when more than 12,000 bytes arrive, and parses only after the limit is satisfied. Check `Content-Length` when present, but enforce the stream limit independently. The shared authenticated workflow reader has its own limit and must not be changed for this public form.
3. Call the existing Zod schema and the new service. Map saved→201, replay→200, conflict→409, unavailable→503. Preserve `{ success, accepted, duplicate }` for clients.
4. Keep `Cache-Control:no-store` for all returns. Log sanitized error classes/codes rather than request bodies or contact details.

### P1.3 Modify `SellerPlanRequestForm.tsx`, `handleSubmit`

1. Build the request from the actual schema fields only. Remove the currently unused `message: values.get('message')` field; the strict schema does not support it and the current form has no such input.
2. Keep a ref containing `{ submissionId, payloadFingerprint, payload }` for the last attempted submission. An unchanged retry reuses the exact payload and ID. An edited payload generates a new ID before sending.
3. Disable submit while sending. Display only the saved/replayed server confirmation. A 409 or network failure preserves editable values and explains the retry action.
4. Clear the retained request only after confirmed success or an explicit new request. Keep marketing consent unchecked by default.
5. Test the actual serialized payload with `sellerPlanLeadSchema.parse`, rather than only checking selected mocked fields.

### P1.4 New `lib/marketing/sellerLeadContext.ts`

Define a small strict reader for `metadata.sellerPlan`, not a second public intake schema:

```ts
type SellerLeadContext = {
  requestKind: 'seller_plan' | 'pricing_review';
  timing: SellerPlanLeadInput['timing'] | null;
  requestedContact: boolean;
  marketingOptIn: boolean;
};
// Export readSellerLeadContext(lead): SellerLeadContext | null.
// Require source === 'seller_plan'; validate fields rather than cast metadata.
```

Invalid/legacy consent is unknown. Missing timing can still produce a neutral manually reviewed task; it must not become a guessed selling date.

### P1.5 Modify `leadOperatingSystem.ts` and `leadExecutionIntent.ts`

1. Call `readSellerLeadContext` before generic buyer recommendations.
2. New seller request: recommend reviewing the requested preparation/timing plan or personally reviewed pricing conversation. Use requested email response; do not recommend a buyer search or private showing.
3. Contacted seller: recommend confirming a consultation time and the facts needed for their selected request. Later seller follow-up requires its recorded contact scope; nurture messaging requires separately granted marketing permission.
4. Archived/closed/revoked seller requests have no executable contact recommendation. An eligibility object supplies the reason; do not let the generic email/phone fallback bypass it.
5. `generateFollowUpMessage` gets seller-specific drafts. Drafts acknowledge the real request, ask about timing, and offer a consultation. They do not invent a CMA value, completed research, booked appointment, or already-sent email.
6. Keep generic buyer/TAH behavior unchanged; update `AgentLeadActions` to respect eligibility for both draft-copy buttons and native contact links.

Verification: extend `seller-plan-lead-route.test.ts`, `seller-plan-request-form.test.tsx`, `lead-execution-intent.test.ts`, `lead-correspondence.test.ts`; new `seller-lead-context.test.ts`. Cover bounded streaming, absent configuration, mismatched retry payload, unknown consent, seller-vs-buyer copy, and archived/revoked contact blocking.

Exit: a configured browser request saves once and produces a truthful seller-specific next step.

## P2 — Authorize owned lead work and record actual outcomes atomically

### P2.1 New `lib/realtor-workspace/leadContracts.ts`

Export strict schemas for seller action mutations and cursor queries. Concrete mutation design:

```ts
const common = {
  leadId: z.string().uuid(),
  expectedRevision: z.number().int().positive(),
  requestKey: z.string().uuid(),
};
export const sellerLeadActionSchema = z.discriminatedUnion('action', [
  z.object({ ...common, action: z.literal('record_contact'),
    channel: z.literal('email'), occurredAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ ...common, action: z.literal('record_response'),
    source: z.literal('customer_reply'), occurredAt: z.string().datetime({ offset: true }) }).strict(),
  z.object({ ...common, action: z.literal('confirm_consultation'),
    startsAt: z.string().datetime({ offset: true }),
    confirmationBasis: z.enum(['customer_reply', 'confirmed_booking']) }).strict(),
  z.object({ ...common, action: z.literal('cancel_consultation'),
    consultationEventId: z.string().uuid() }).strict(),
  z.object({ ...common, action: z.literal('record_closing'),
    closedOn: realtorDateSchema,
    reference: z.string().trim().min(1).max(120) }).strict(),
  z.object({ ...common, action: z.literal('void_outcome'),
    outcomeEventId: z.string().uuid(), reason: z.string().trim().min(1).max(200) }).strict(),
  z.object({ ...common, action: z.literal('revoke_requested_contact') }).strict(),
]);
```

The snippet states the proposed v1 contract. Import the existing date schema and Zod. Requested public contact is email-only; expanded channels need separately captured permission and a later contract change. Constrain impossible/future contact/response/closing dates on the server. Consultation dates may be future dates. A cancellation/void targets an owned event of the right type and cannot be counted twice.

### P2.2 New migration `20261007100000_seller_lead_actions.sql`

Ordered declarations:

1. Add `agent_site_leads.revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>0)`.
2. Add a BEFORE UPDATE revision trigger that increments once on every actual lead update, including legacy direct updates. Do not increment revision both in a caller and in the trigger. Existing rows get revision 1; do not backfill invented events.
3. Create `seller_lead_events`: UUID ID, lead FK, actor UUID, agent ID snapshot, request UUID, input hash, constrained event type, lead revision, occurred-at, recorded-at, bounded JSONB details. UNIQUE `(actor_id, request_key)`; indexes `(lead_id, recorded_at, id)` and `(agent_id, occurred_at, id)`. Store immutable response/replay fields needed to return the original result.
4. Events include contact attempted, customer replied, consultation confirmed/cancelled, closing recorded, outcome voided, requested contact revoked. `void_outcome` is a new event referencing the original; do not rewrite history.
5. Add uniqueness for one closing reference within the owning agent's business and one cancellation/void per target. Same-reference altered lead/date conflicts rather than quietly returning a different transaction. A voided closing may be replaced through an explicit corrected outcome.
6. Enable RLS. Authenticated SELECT requires the current lead to join `site_config.agent_id` with `site_config.owner_id=auth.uid()`. No browser INSERT/UPDATE/DELETE grants. Service role may execute narrowly reviewed RPCs.
7. Add `realtor_record_seller_lead_action(p_actor_id UUID, p_input JSONB) RETURNS JSONB`, SECURITY DEFINER with fixed `search_path=public,pg_temp`; revoke PUBLIC/anon/authenticated execution and grant service role.
8. RPC lock/check order: current `site_config` row by canonical lead agent `FOR SHARE`, then target lead `FOR UPDATE`; recheck owner, allowed source, and active configuration. Ownership transfer updates must take the same site row lock. A missing/non-owned lead is `P0002`.
9. After authority checks, check actor/request receipt. Identical operation/hash returns its frozen result; changed input conflicts (`23505`). Before a new mutation, compare expected revision (`40001`). Concurrent identical requests serialize on the lead row; cross-lead request-key collisions roll back.
10. Validate contact scope inside SQL for contact actions, and verify event targets. Update the lead's compatible summary fields without merging stale caller metadata. Record one event with immutable actor/time and resulting lead revision in the same transaction.
11. Confirming a seller consultation may preserve legacy `touring` compatibility, but display it as “Consultation scheduled” for a seller. A plain status change to touring is not consultation evidence. Recording a closing may set legacy status closed; arbitrary closed status is not a recorded closing.
12. Revoking requested contact replaces only the relevant nested consent receipt, adds attribution, and cancels pending seller contact/appointment occurrences and supersedes reminders under the P3 link. Preserve completed actions. Before P3 exists, define this cancellation extension in the P3 migration rather than reference missing columns.
13. Add a bounded SQL list/read function for owned seller leads with keyset ordering `(created_at,id)`. The owner comes from the authenticated server actor; input cannot select an arbitrary agent or workspace.

### P2.3 New `lib/realtor-workspace/leadStore.server.ts`

1. Export `listOwnedSellerLeads(actorId, query)`, `readOwnedSellerLead(actorId, leadId)`, and `recordSellerLeadAction(actorId, input)`.
2. Resolve all current owned agent IDs from `site_config` with explicit owner filtering; do not use the default-agent resolver. Recheck ownership inside the SQL mutation, because a TypeScript lookup does not fence transfers.
3. Select only necessary lead/consent/revision fields. Limit pages to 1–50; cursor includes owner/filter identity, creation timestamp, and UUID. Validate cursor before constructing filters. Return `items,nextCursor`.
4. Map SQL error codes through the existing realtor error wrapper. Never return provider errors/raw SQL to the customer-facing UI.

### P2.4 New `app/api/realtor/leads/route.ts`

1. GET uses `realtorApi`, `requirePersonalRealtorWorkspace`, cursor schema, then `listOwnedSellerLeads`. Return current ownership only.
2. POST uses the same auth/access resolution, `readRealtorBody`, `sellerLeadActionSchema`, then the atomic store. Respond with resulting revision and event ID.
3. Keep private/no-store responses. A signed-in user with no owned site gets a truthful `not_configured` read result, not a default agent's leads. Mutations require an owned target.

### P2.5 Harden existing admin paths

1. Include lead revision in `app/admin/agent-leads/page.tsx` selects and `AgentSiteLeadData`.
2. Add expected revision and stable request key to `AgentLeadActions.runAction`; retain the same key for uncertain retry. On 409, preserve the draft, reload latest state, and require a new deliberate save.
3. Seller contact/response/outcome actions call `/api/realtor/leads`; owner personal workspace setup is linked when needed. An operator viewing a foreign seller gets read-only business actions here. Administrative access must not create a private task in that operator's personal workspace for someone else's lead.
4. Preserve legacy non-seller actions, but move metadata/status writes into an `agent_apply_lead_action` SQL RPC with expected revision and frozen replay receipts. Use the existing validated operator authorization; realtor callers must match their owned agent inside the SQL transaction. Explicit admin/operator authority stays on the administrative route and never grants personal-financial access.
5. Add a narrow service module `lib/sites/agentLeadActions.server.ts` and an additive migration `20261007103000_agent_lead_action_receipts.sql`; do not replace all lead infrastructure. Mirror existing action validation, bounded metadata audit, response fields, and event logging.
6. Fix the action-open route to require the scoped lead result before logging. Action-open remains separate from attempted contact or reply.

Verification: new `seller_lead_actions.sql` under `supabase/tests/database`, `seller-lead-actions-route.test.ts`, `seller-lead-access.test.ts`; extend admin action/disposition tests. Prove owner A/B isolation, ordinary signed-in owner support, team-admin denial, transfer-vs-write race, stale revision, identical replay, changed-key content conflict, correction/cancellation, archived source, revoked consent, and missing action-open targets.

Exit: lead actions and recorded outcomes are attributable, owned, replayable, and protected from silent concurrent overwrite.

## P3 — Schedule a seller action in the existing personal planner

### P3.1 Modify `lib/realtor-workspace/contracts.ts`

Add `sellerLeadReferenceSchema` before `plannerItemInputSchema`:

```ts
export const sellerLeadReferenceSchema = z.object({
  leadId: z.string().uuid(),
  actionKey: z.string().trim().min(1).max(120),
  expectedLeadRevision: z.number().int().positive(),
}).strict();
// Add to plannerItemInputSchema:
// sellerLead: sellerLeadReferenceSchema.nullable().default(null)
```

Refine: seller links require `follow_up` or `appointment`; no simultaneous `sourceSprintTaskId` or property link in v1; recurrence must be once; no bill amount. Server recognizes only `initial-response:v1`, `reply:<owned-event-uuid>`, and `consultation:<owned-event-uuid>`. The client cannot invent an action key to bypass initial-action dedupe.

Existing item payloads default sellerLead to null. Update the RPC serialized item consistently so request fingerprints remain deterministic. Old receipts with the previous payload shape must still replay: preserve omitted-null serialization for legacy unlinked items.

### P3.2 New migration `20261007110000_realtor_seller_lead_tasks.sql`

1. Add nullable `source_lead_id UUID REFERENCES agent_site_leads(id) ON DELETE SET NULL`, `source_lead_action_key TEXT`, and `source_lead_revision INTEGER` to `realtor_planner_items`.
2. Enforce all three absent or all present, and source exclusivity with sprint/property provenance. Add a BEFORE DELETE lead trigger clearing all three provenance columns together on linked planner items, leaving a generic source-unavailable marker in safe task metadata if one is needed. The FK's SET NULL then has no surviving reference to clear. Ensure the provenance immutability trigger permits only this controlled cleanup; cover deletion in SQL tests. Do not combine SET NULL with a check that makes lead deletion impossible.
3. Add unique index `(user_id,source_lead_id,source_lead_action_key)` when source lead is non-null. An initial response schedules once even after completion; later replies/consultations have distinct event keys. Rescheduling edits the existing item rather than creating a new action.
4. Retain the effective public `realtor_save_planner_item` implementation as a renamed private helper, preserving the current property-task wrapper. Recreate the public signature as a seller-aware wrapper. The private helper remains service-only and cannot be exposed to authenticated SQL callers.
5. For seller creation, lock active personal workspace/membership and current owned site consistently, then lead, then planner resources. Reject archived/closed/contact-revoked source, stale revision, invalid action key, or event/lead mismatch. A consultation action must match its confirmed event timestamp; do not silently shift it.
6. Validate authority before replay; call the existing atomic helper using the full canonical seller payload. Link the returned item in the same transaction. Unique-index failure rolls back items, occurrences, reminders, audit, and receipts together.
7. A same-key replay returns the same item ID; two different keys attempting the same initial action produce one winner and a conflict with an authorized link to the existing item. Do not report generic success for two independently saved items.
8. Seller edit: preserve source identity and kind. Recheck current owned source and expected lead revision; update stored source revision atomically. Reschedule uses existing item ID/expected item revision and leaves immutable action key unchanged.
9. Add provenance trigger checks so generic planner edits cannot strip/change seller source or convert it to a bill/task/property action. Preserve the existing property-task identity trigger.
10. Extend the consent revoke/lead archive/consultation cancellation service to cancel the appropriate pending linked occurrences and supersede reminders in the same transaction. Lock occurrence then reminders consistently with the current reminder lifecycle routines. Keep completed history.
11. Prevent two operations from acquiring shared resources in opposite order. Add concurrency coverage against scheduler reminder delivery, occurrence completion, source revocation, and site transfer before accepting the migration.

### P3.3 Modify `store.server.ts`

1. `savePlannerItem`: pass sellerLead only when linked; expose existing occurrence-candidate construction through a narrow internal helper if needed, rather than copy recurrence/reminder code.
2. `listPlannerOccurrences` and `listTodayOccurrences`: return item-linked seller source information by bounded batched joins. Resolve current source ownership before exposing names/details; transferred/deleted source displays a generic unavailable-source label. Do not copy email, private CMA address, or consent details into planner notes/snapshots.
3. Return `sourceLeadId`, `sourceLeadActionKey`, current source revision, `sourceAvailable`, and an owned lead link alongside existing property data.

### P3.4 New `components/realtor/SellerLeadScheduleDialog.tsx`

1. Accept a validated owned lead preview, personal timezone, existing task when present, and an `onSaved` callback.
2. Initial-action preview title is “Respond to seller request”; use a live authorized display name separately. Default recurrence once; require chosen local date/time, allow reminder offset zero, and explain in-app reminder behavior.
3. Construct the existing planner save envelope with the seller link. Keep one UUID for a particular confirmed payload across retries; editing the payload creates a new operation UUID.
4. Submit to `/api/realtor/planner`, not a second task endpoint. On source/item conflict, refresh source/item and require review before retry.
5. Add “Schedule next action” to `AgentLeadActions` for owned seller rows. Reuse the dialog in Today.
6. Task completion only updates the planner. Show a separate “Record contact attempt” action that records P2 evidence after the person actually contacts the seller. Reminder dismissal remains separate.

Verification: new `realtor_seller_lead_task_identity.sql`, `realtor-seller-lead-task.test.ts`, and schedule-dialog UI tests. Prove two-click/two-session dedupe, changed-input replay, generic edit drift denial, source transfer, archived/revoked source cancellation, proper appointment time, and continued property-task behavior.

Exit: an owned seller action produces one planner item and reminders, with a durable source link and no false customer outcome.

## P4 — Turn Today into the morning seller-business view

### P4.1 New `lib/realtor-workspace/sellerDailyReadModel.server.ts`

1. Export `readSellerDailySummary(actorId, workspaceId, timeZone, now)`.
2. Compute owner-local date and Monday using `localDateInZone` and `mondayOfLocalDate` from `progress.ts`. Use a next-local-Monday half-open reporting interval; never `Date.now()-7*24h` for calendar-week metrics.
3. Read owned seller leads and linked pending actions in bounded SQL queries, not one query per lead. Provide deterministic ordering: overdue scheduled actions, pending initial responses by created time, then upcoming confirmed consultations.
4. Display up to five unscheduled requests, five overdue actions, and five consultations; return exact aggregate counts or `hasMore` where counts are not queried. Sampled lists must not become totals.
5. Counts come from persisted leads/events: new requests, unique leads with recorded customer replies, active confirmed consultations, and active recorded closings. Exclude cancellations/voids; do not infer outcomes from status strings.
6. Return period boundaries, timezone, generatedAt, availability, and data provenance labels. Legacy pre-P2 outcomes remain unknown, rather than counted as verified zero or backfilled from button clicks.
7. New migration `20261007130000_seller_daily_read_models.sql`: add scoped SQL aggregate/read functions and indexes for owner+agent joins and event reductions. Inspect query plans on synthetic 1,000+ row fixtures. Bound requested periods to 366 days and page sizes to 50.

### P4.2 Modify `app/api/realtor/today/route.ts`, `GET`

1. Add seller summary as another independent `Promise.allSettled` branch.
2. Preserve current agenda/business/goals contracts; add `seller:{status,value}`. A missing owned site is `not_configured`, a query failure is `unavailable`, and a working empty inbox is `available` with zero items.
3. Do not make lead availability a prerequisite for viewing bills or finances. Add owned lead-list and personal Jamie links.

### P4.3 New `components/realtor/SellerDailyPanel.tsx`

1. Render “Seller requests”, “Next client actions”, and “Confirmed consultations” with readable dates and meaningful empty/unavailable/configuration states.
2. Unscheduled requests open the P3 schedule dialog; existing tasks link to their planner occurrence; lead details link to the owned inbox view.
3. Show a small actual-outcomes strip with the selected local week. Label customer replies and consultations as manually recorded evidence.
4. Refresh Today only after confirmed mutations. Prevent stale responses from a previous account/context from filling current cards; abort outstanding fetches on unmount/account change.
5. `TodayView`: insert the new panel above general work links; retain money masking and existing deadline/reminder settings. Lead names are private; do not persist the response into localStorage.
6. `app/admin/agent-leads/page.tsx`: support an allowlisted `leadId` filter/deep link with exact owned lookup. A direct link to an older lead must not depend on it being in the newest page of the inbox.
7. Preserve navigation to `/planner`, `/business`, `/goals`; link the signed-in personal entrance from the existing navbar/dashboard, using their existing access patterns.

Verification: new daily-read-model/API/UI tests. Cover mixed availability, no owned site, unscheduled initial request, source archive, timezone midnight, fall DST, cancellations, old lead deep link, and two owned sites. Test 390/900/1440 widths, keyboard dialog focus, and privacy masking.

Exit: Taz can start the day on one screen and find real requests, next actions, appointments, and existing business commitments.

## P5 — Connect personal Jamie to the real chat handler

### P5.1 New `lib/ai/jamiePersonalContract.ts`

1. Define `chatContextSchema = z.enum(['general','personal_realtor'])` and a bounded personal response schema.
2. Response keeps `{role:'assistant',content}` and adds a `personal` block with a validated proposal array, context type, and optional availability flags. No submitted owner IDs, arbitrary endpoints, raw SDK tool traces, or workspace credentials.
3. Define a shared discriminated proposal schema for existing `planner_proposal`, `financial_proposal`, and `goal_proposal` results. Reconcile with the actual outputs in `jamieProposals.server.ts`; include proposal ID, missing fields, editable fields, target revision, intended action, and nullable payload.
4. Endpoint mapping is a local constant keyed by proposal kind. Browser code never fetches an endpoint supplied by an AI string. Strictly validate preview and payload shapes.

### P5.2 Modify `app/api/chat/route.ts`, `chatRequestSchema`, `POST`

1. Add `context:chatContextSchema.default('general')`. Continue accepting existing general clients unchanged.
2. Personal branch explicitly calls `requireSignedInUser(req)` and `requirePersonalRealtorWorkspace(access.user.id)`. Use `access.user.id` from this resolver, not a submitted actor or the general session's display structure.
3. Personal requests require same-origin/streamed bounded JSON writes. Factor a chat-local bounded reader if needed; do not modify the user's in-flight platform HTTP changes for convenience.
4. Reject personal mode with listing context rather than combining public/property and personal contexts implicitly. Never use `memoryContext` or submitted `agentId` as personal authorization.
5. Pass a server-only `{actorId,workspaceId,timeZone}` context and `req.signal` to the backbone. Add private/no-store headers to personal successes and errors.
6. Map SETUP_REQUIRED/forbidden/invalid personal context to meaningful existing error responses. Do not fall back to general Jamie after a failed private authorization check.

### P5.3 New `lib/ai/jamiePersonal.server.ts`

Use the existing SDK personal tools and a bounded SDK call. The following call shape was checked against the installed `ai` documentation and existing `publicGuide.ts`; it is an implementation specification, not already-installed new code:

```ts
import 'server-only';
import { generateText, stepCountIs } from 'ai';
import { groq } from '@ai-sdk/groq';
import { resolveJamieGroqModel } from '@/lib/ai/modelDefaults';
import { createJamiePersonalTools } from '@/lib/ai/jamieWorkspaceTools';

// Inside runPersonalJamie(input), after personal access is revalidated:
const result = await generateText({
  model: groq(resolveJamieGroqModel(process.env.JAMIE_GROQ_MODEL)),
  system: personalSystemPrompt,
  messages: input.messages.filter(m => m.role === 'user' || m.role === 'assistant'),
  tools: createJamiePersonalTools(input.actorId),
  stopWhen: stepCountIs(3),
  maxOutputTokens: 1200,
  abortSignal: AbortSignal.any([input.signal, AbortSignal.timeout(20_000)]),
});
```

Ordered implementation:

1. Use existing model defaults and credentials; if configuration is unavailable, return personal-mode unavailable with direct planner links. Do not emit made-up agenda/financial results.
2. Server prompt describes private scope, saved timezone, required missing fields, manual records/before-tax totals, and draft-only tools. Tool authority lives in server code, not the prompt.
3. Revalidate personal access before the run and inside each existing read/proposal helper. Add bounded seller attention read tool only after P4 exists; return redacted summaries, not private address documents or raw CRM metadata.
4. Collect prepared proposals from successful allowlisted `result.steps[*].toolResults`, validating each output with the shared schema. Cap proposals at three. Do not parse executable proposal JSON from assistant prose.
5. Preserve textual `content` compatibility through `sanitizeJamieReply`. Explain incomplete proposals as needing facts; confirmable cards require validated payloads. Model text must not claim writes/sends happened.
6. Return controlled failures when tool/model budgets expire. Mutations remain absent from the tool set; no tool calls a save endpoint, sends messages, or records an outcome.

### P5.4 Modify `lib/tensorzero/jamieBackbone.ts`

1. Extend its input with optional server-resolved personal context and signal; add the personal branch before public knowledge retrieval or general Jamie execution.
2. Personal mode calls `runPersonalJamie`; general mode retains the current behavior.
3. Record redacted metadata with `recordTensorZeroJamieTurn`: counts, kind names, timings, token usage as supported, and success/failure. Pass no agenda rows, private financial amounts, client names, addresses, or full proposal payloads into traces.
4. Ensure diagnostic/telemetry failures do not turn a successful draft response into false save failure. Never cache private results across users.

### P5.5 Reuse proposal editing/confirmation

1. New `components/realtor/PreparedJamieProposalCard.tsx`: factor the existing review/edit/confirm behavior from `JamieProposalCard`, accepting one validated prepared proposal.
2. If edited, call the existing `/api/realtor/jamie/proposals` prepare endpoint again; discard the previous preview. Require all missing fields resolved before confirmation.
3. Create one stable mutation request UUID when the confirmed payload is finalized. Reuse on transport uncertainty; generate a new key only after an edit/new proposal. Apply this repair to the existing form-based card too.
4. Confirm through `/api/realtor/planner`, financial records, or goals by the hardcoded kind mapping. Server revalidates owner/revision; conflict requires review of latest state. Success wording appears only after a successful mutation response.
5. `JamieAssistantWorkspace.tsx`: add explicit `context` prop, send it, validate returned personal response, and preserve proposals in message metadata. Add `components/chat/JamiePersonalProposalList.tsx` using assistant-ui's existing message custom metadata access; consult installed assistant-ui types before choosing the render hook.
6. `app/jamie-chat/page.tsx`: allowlist `?context=personal_realtor`; guard this mode server-side before rendering. General remains the default. Provide a visible “Personal workspace” indicator and an explicit general/personal switch.
7. `TodayView`: link to `/jamie-chat?context=personal_realtor`. Changing context remounts the chat runtime and clears its message/proposal state; do not carry private messages into the public/general thread.
8. Keep the minimized global Jamie widget general in v1; its broader integration can follow after this complete path works.

Verification: extend `jamie-chat-route.test.ts`, `jamie-tensorzero-backbone.test.ts`, `jamie-workspace-tools.test.ts`; new personal runner and proposal-rendering tests. Use mocked language-model results, with real authorization acceptance separately. Prove anonymous denial, owner isolation, setup required, revoked access, tool allowlist, deadline budget, private trace redaction, stable retry keys, edited proposal re-prepare, and no mutation before confirmation.

Exit: “What needs attention?” reads authorized actual context; “Add my annual dues” produces an editable draft and saves only after Taz confirms.

## P6 — Connect weekly acquisition work, content review, and manual distribution

### P6.1 Fix owner-local weekly campaign identity

1. `sellerAcquisitionWeek.ts`: export `sellerAcquisitionWeekForLocalDate(localDate:string)`; validate a real calendar date, derive local Monday, and key tasks as `seller-acquisition:<monday>:<topic-slug>`.
2. `app/api/sprints/route.ts`, `add_seller_acquisition_week`: read saved personal timezone; missing setup returns setup required. Pass the owner-local date, not an unqualified UTC `Date`.
3. Preserve the existing created/reused/processed partial-progress response. Retrying resumes by stable topic identity.
4. Preserve compatibility with existing UTC ISO-week keys: for each local Monday/topic, recognize the corresponding old ISO-week key before insertion. A week straddling the old UTC boundary needs an explicit duplicate-resolution preview; do not silently create both task sets.

### P6.2 Generalize the existing backlog-to-planner bridge narrowly

1. `contracts.ts`: admit `sourceSprintTaskId` without a property only when the server-resolved task is a seller-acquisition backlog item. Existing campaign tasks are `source_type='manual'` with a `source_id` beginning `seller-acquisition:`; there is no seller-acquisition SQL source-type enum today. Maintain the requirement for a property on property-shortlist tasks; the TypeScript schema alone cannot establish the source identity.
2. New migration `20261007150000_realtor_seller_campaign_tasks.sql`: extend the effective sprint-task identity wrapper to recognize property-shortlist tasks and manual tasks whose source IDs parse as known seller campaign week/topic keys. Use the six allowlisted template topic slugs and validated local-Monday or legacy ISO-week keys. Do not admit arbitrary manual tasks or introduce an unnecessary new source-type enum. The current wrapper supports property tasks only; preserve its checks.
3. Validate task owner, source identity, status, and revision. Keep the one-planner-item-per-source-task unique index. Campaign items remain kind task and cannot acquire property/lead identity through generic edits.
4. Add optional expected source task revision to the save contract with legacy-compatible serialization. Campaign creation requires it; existing property task behavior keeps its current input/property revision checks.
5. New `/api/realtor/planner/acquisition-tasks/route.ts`: read bounded owned unscheduled acquisition tasks. Reuse current `property-tasks` pattern; support a validated cursor and current task revision.
6. New `components/realtor/AcquisitionWeekPanel.tsx`: “Prepare this week's work” creates/reuses backlog templates; selecting a task opens a schedule preview and saves through the existing planner. Do not schedule all six tasks at arbitrary times.
7. Show conditional tasks such as open-house preparation as waiting for listing authorization; let the person choose whether they apply. Completing a personal task does not automatically complete its source backlog item.

### P6.3 Expose the existing video draft/review workflow

1. Existing `app/admin/sprints/SellerVideoBriefWorkspace.tsx`: reuse its draft/save/review UI. Add any missing fields from `videoBriefSchema`, current evidence/permission messages, and appropriate owner/member/reviewer controls. First inspect its full current diff because it was changing during planning.
2. New `components/realtor/SellerContentPanel.tsx`: provide bounded summaries and a link to the existing draft workspace, or factor its reusable content only if the current component supports embedding without duplicating state. Operate in an explicitly selected authorized platform workspace. Personal financial scope is not inferred from workspace ownership. Confirm the existing component's actual parent route before adding navigation; do not invent a second route just to host another editor.
3. Add an additive hardening patch to seller-video save/review routes: use bounded same-origin body reading, preserve response envelopes, and ensure private no-store errors. Do not change the general workflow adapter's current user edits.
4. Review state is derived from persisted platform run/checkpoint evidence. The saved brief's draft `reviewStatus` is not authoritative proof of approval.
5. Disabled workflow admission displays “Review workflow unavailable” and preserves the draft. Local admission is changed only by disposable acceptance harnesses and restored afterward. Hosted activation belongs in P8's environment release packet.

### P6.4 Record manual publication of an approved revision

1. Existing local `lib/marketing/videoPublicationRecordSchema.ts`: reuse its workspace/brief/revision/platform/publicUrl/publishedAt/requestKey schema. The current server derives the approved checkpoint; do not add a caller-selected approval identity. Review platform hostname/path validation without fetching arbitrary URLs.
2. Existing local migration `20261006150000_seller_video_publication_records.sql`: reuse its private receipt table and exact revision/platform identity. The current RPC `platform_record_seller_video_publication` already checks owner/admin role, approval/run/checkpoint/hash, successor drafts, permissions, and linked backlog revision. Verify complete race/replay behavior; add only a forward repair migration if tests expose a defect. Do not create `seller_content_publications` alongside it.
3. Review lock order against existing draft save, checkpoint response, successor creation, and workspace revocation. Store a manual attestation, never a platform-delivery receipt. Preserve workspace/request replay semantics and one receipt per exact brief revision/platform; differing URL/time content must conflict.
4. Existing local `app/api/seller-video-briefs/publications/route.ts`: add bounded same-origin POST handling and keyset GET pagination as needed; retain `artifact:record_publication` policy in `lib/platform/contracts/identity.ts`. Complete owner/member/reviewer/foreign tests and continue the existing in-progress acceptance script. Do not replace someone else's uncommitted publication work.
5. Generate campaign links from the persisted campaign key with `URL`/`URLSearchParams`: source channel, medium organic-video, campaign key, and content brief ID. Keep P1 campaign normalization compatible; no contact details in URLs.
6. UI presents “Record published link” after eligible approval. Count this as an operator-recorded publication; do not claim the platform posted or independently verified delivery.

Verification: update seller-acquisition-week tests for Chicago Sunday/Monday and DST; campaign source-task SQL assertions; video editor/API tests; publication authorization/replay/stale-approval tests; continue existing seller-video real-auth acceptance.

Exit: weekly acquisition work can be scheduled, a video draft can be reviewed through the existing engine, and manual distribution has a source-linked record.

## P7 — Record consultations/closings and review the business weekly

### P7.1 Extend seller action UI with P2 evidence

1. New `components/realtor/SellerOutcomeDialog.tsx`: separate consultation confirmation/cancellation, closing record, and correction/void forms; existing engagement receipts record attempts and replies. Each action uses expected lead revision and a stable request key.
2. Consultation confirmation records time and confirmation basis first; then offers an explicit P3 appointment preview keyed to that event. If scheduling fails, keep the recorded consultation and show “Add to Planner”; retry cannot duplicate the outcome.
3. Cancellation records the event and cancels pending linked appointment/reminders transactionally. It does not erase the fact that a consultation had been confirmed.
4. Closing requires actual closing date and stable transaction reference. Marking a lead closed in the old status dropdown cannot satisfy this form's evidence.
5. No automatic financial record is created from a closing. Offer “Record deposit received” linking to the existing Business flow, with stable closing reference `seller:<lead-id>:<transaction-reference>` if bounded. The user supplies amount, mode, deductions when relevant, and received date.

### P7.2 Add weekly outcomes alongside existing financial totals

1. Extend `components/realtor/SellerDailyPanel.tsx`: show requests received, unique replying leads, active confirmed consultations, and recorded seller closings for explicit owner-local periods.
2. Add median time from request to first recorded contact only for leads with actual attempts. Show the denominator/sample size and label operator-recorded timestamps. No contact event means unknown/unanswered, not zero response time.
3. Campaign summaries group bounded normalized campaign keys. Show unattributed/unknown separately. Requests and outcomes are tied to lead IDs/events; existing publication receipts are separate metrics. Do not attribute every weekly closing to content posted that week.
4. Keep campaign-period request cohort metrics distinct from occurrence-period outcomes. If cohort rates are displayed, use the same request cohort for numerator/denominator and label the observation window. First release can show counts without conversion percentages.
5. Add a read-only seller outcome section to Today/Business; existing `readBusinessSummary` remains the source of received cash and paid costs.
6. Existing financial `closingCount` is derived from commission records/reference IDs, not confirmed seller outcomes. Label it as commission-linked closings in the relevant UI; display recorded seller closing outcomes separately. Do not merge the two counts or change goal progress silently.
7. Financial realization/corrections/voids remain through existing APIs. Never sum `agent_site_leads.closed_revenue` into the cash ledger or deduct gross-mode broker fees twice.

### P7.3 Extend weekly review without breaking prior evidence

1. Extend `contracts.ts`: define version-2 completion evidence with existing date/expense confirmations and priority, plus reviewed seller outcomes, chosen next action, optional bounded friction note, and server-generated owner-local week key/timezone.
2. `WeeklyReview.tsx`: show actual current counts, link to open seller actions and missing finance entries, and ask for the next chosen action. Preserve one review completion per local week.
3. `contracts.ts`, `progress.ts`, and `store.server.ts`: accept/read both v1 and v2 review evidence; old records retain their meaning. Sanitize UI input before server canonicalization, never trust submitted week keys.
4. New migration `20261007170000_realtor_weekly_business_review_v2.sql`: extend `realtor_validate_weekly_review_evidence` for v2, preserving v1 and the one-per-local-week index. Keep the current completion/reopen/reschedule logic.
5. Friction is optional and bounded. Do not install passive time tracking or claim measured preparation savings without a baseline.

Verification: pure aggregation tests, `seller_outcome_scoreboard.sql`, weekly-review v1/v2 SQL/API/UI regression, consultation scheduling recovery, cancelled appointments, duplicate closing reference, multiple payments sharing a reference, and financial corrections/voids.

Exit: weekly business review compares actual seller outcomes, real pending actions, and private manual cash records with clear provenance.

## P8 — Prove the complete flow and prepare a concrete release

### P8.1 Disposable integration and browser suite

1. New `tests/seller-business-daily-workspace.spec.ts`: use disposable Supabase auth/database and synthetic site/lead records. Test anonymous seller request → durable owned row → signed-in Today → schedule first response → existing reminder visible → manually recorded contact/reply → confirmed consultation → appointment → cancellation/correction.
2. Fixture tests now cover agenda reads bound to the signed-in owner, draft-only preparation, corrected-fact reprepare, no write request before confirmation, and same-key retry after an uncertain response. Add the personal-context browser/auth and configured-provider smoke cases; verify that no owner B data appears.
3. Add campaign draft/review/publication-record cases with the provider/posting transports absent. Worker admission is enabled only in the fixture environment and restored in finally cleanup.
4. Add ledger scenario with gross commission/deductions and one net deposit, expected-income realization, correction/void, export, and private money masking. Show seller closing outcomes independently from financial references.
5. Extend the existing disposable acceptance harness with a `seller-business` suite; it currently allowlists `realtor`, `scans`, and `seller-video-briefs`. Add temporary generated site config and synthetic lead rows; retain unique project IDs, local target validation, credential suppression, account/row cleanup, and no production environment discovery.
6. Complete: `scripts/scheduler-concurrency-acceptance.mjs` now calls `scripts/seller-concurrency-acceptance.mjs` inside the existing disposable realtor harness. All five races pass: source revocation vs scheduling/reminder cancellation; site transfer vs source read/write; duplicate task creation; consultation cancellation vs reminder activation; and lead note/contact concurrent update.
7. Add app script `test:seller-business:auth` calling `node scripts/platform-disposable-auth-acceptance.mjs --suite seller-business`.

### P8.2 Commands and evidence

From repository root, after implementation:

```powershell
npm run test:unit --workspace=apps/pulse -- tests/unit/seller-plan-lead-route.test.ts tests/unit/seller-plan-request-form.test.tsx tests/unit/lead-execution-intent.test.ts tests/unit/lead-correspondence.test.ts tests/unit/seller-lead-context.test.ts
npm run test:unit --workspace=apps/pulse -- tests/unit/seller-lead-actions-route.test.ts tests/unit/seller-lead-access.test.ts tests/unit/realtor-seller-lead-task.test.ts
npm run test:unit --workspace=apps/pulse -- tests/unit/jamie-chat-route.test.ts tests/unit/jamie-tensorzero-backbone.test.ts tests/unit/jamie-workspace-tools.test.ts tests/unit/realtor-jamie-proposal-input.test.tsx
npm run test:unit --workspace=apps/pulse -- tests/unit/seller-acquisition-week.test.ts tests/unit/seller-video-briefs-route.test.ts
npm run test:seller-business:auth --workspace=apps/pulse
npm run test:db:concurrency --workspace=apps/pulse
npm run test:e2e --workspace=apps/pulse -- tests/seller-business-daily-workspace.spec.ts
npm exec --workspace=apps/pulse -- tsc --noEmit
npm run build --workspace=apps/pulse
git diff --check
```

The responsive browser check lives in `tests/seller-business-daily-workspace.spec.ts`; its APIs are fixture-backed, and its assertions cover 390px, 768px, and 1440px including the seller response dialog. The app build must complete before Playwright can execute it. Run remaining packet tests as each slice lands, keep targeted ESLint and the changed TSX review, and distinguish known baseline typecheck/build errors from introduced errors. Docker SQL acceptance must include the SQL tests, not just unit mocks.

Browser fixtures must be local and deterministic. Real model-provider acceptance is a separate bounded smoke check when the provider is configured; mocked runner tests do not prove model quality. Do not describe passed unit tests as a deployed client routine.

### P8.3 Operational release packet

New `docs/SELLER_BUSINESS_RELEASE_CHECKLIST.md`, completed with concrete evidence after implementation:

1. Record exact branch/SHA, migrations, app build, worker/handler compatibility, selected environment/project, and rollback version.
2. Read-only preflight confirms the configured `KELLER_WESTLAKE_AGENT_SITE` resolves to the intended active published site, current `site_config.owner_id` matches the owner, and the distributed public limiter is available. Do not create a substitute owner ID to satisfy configuration.
3. Confirm the existing reminder scheduler has a deployed invocation cadence and visible failure monitoring. A SQL row due for delivery is not proof the hosted worker runs. Reuse the existing authenticated worker; no second cron service.
4. Keep generic platform/provider admission disabled unless the exact worker/contract and required seller video review path are ready for this environment. Prepare any enablement as a separate concrete configuration change, with rollback to disabled.
5. Verify owner login, intake save, owner inbox, schedule, reminder cadence, and no foreign read in the actual selected non-production environment. Review public seller identity/notices and sourced guide availability using the existing domain release requirements.
6. Prepare migration/deployment/config changes and their evidence for the final release decision. This plan authorizes no production migration, outbound send, social posting, paid provider activation, or production deployment by itself.
7. Rollback disables newly activated admissions and reverts app/worker to compatible versions. Preserve lead/outcome/publication/financial receipts; do not propose destructive table drops as routine rollback.

Exit: a reviewed end-to-end release candidate exists with actual environment evidence and a clear final release action.

## 4. Suggested execution cadence

These are planning windows, not completion guarantees. Move forward on packet acceptance rather than calendar promises.

| Window | Implementation focus | Daily business use |
| --- | --- | --- |
| First 3–5 working days | P0–P2: capture, seller drafts, owned revisioned actions | Review seller requests and record actual replies manually |
| Next 3–5 working days | P3–P4: source-linked tasks and Today | Open Today each morning; schedule the next real client action |
| Following 3–5 working days | P5–P6: personal Jamie and acquisition/content work | Prepare tasks with Jamie; schedule selected weekly recording/research work |
| Following 2–4 working days | P7–P8: weekly outcomes, integration acceptance, release evidence | Review consultations, open actions, cash records, and friction weekly |

After the released routine has been used for two weeks, evaluate: actual requests/replies/consultations, unanswered requests, overdue next actions, self-reported preparation/follow-up time, and the most repeated manual handoff. Select the next code change from that evidence. A customer-acquisition target is not a software acceptance test or a guaranteed result.

## 5. Completion criteria

- A real configured request is saved once, survives notification/provider unavailability, and appears only to the correct owner.
- Seller copy and next actions match seller intent and captured contact scope.
- One source action schedules once with durable provenance; edits/retries cannot silently create duplicate tasks or overwrite current records.
- Today shows client work alongside existing deadlines, reminders, goals, and private finances, with usable empty/error states.
- Explicit personal Jamie reads actual authorized context, returns validated drafts, and performs no save before confirmation.
- Weekly content work can be planned, reviewed at an exact revision, and recorded as manually published without claiming automated delivery.
- Replies, consultations, cancellations, closings, and corrections have immutable event evidence; money comes from the existing financial ledger.
- Disposable browser/database/race checks pass, public/mobile/private behavior is reviewed, and actual deployment/worker evidence is recorded separately.

Implementation starts with P0/P1. Avoid reopening completed planner, scan, or generic-platform packets unless a concrete dependency in this plan exposes a defect.
