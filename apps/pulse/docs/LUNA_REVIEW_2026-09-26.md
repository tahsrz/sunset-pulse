# Luna working-tree review — September 26, 2026

Scope: source changes on `codex/cms-vertical-slice-followup` relative to `9290e536232f3913e402a2360efe116b63af6d9f`, including Luna's uncommitted homepage, realtor, scheduler, scan, tests and documentation work. Existing PR: [#79](https://github.com/tahsrz/sunset-pulse/pull/79). This is a review of the changed surface, not a new audit of every historical line in that large PR.

Reviewed boundaries: public homepage rendering/feed/image states and shared typography; personal auth/owner/workspace scoping; realtor schemas, APIs, money/recurrence/projections, reminder/refill workers and SQL transactions; financial corrections/void/realization; property-task provenance and stale drafts; Jamie structured preview/confirmation; scan signing/finalization/cancellation/cleanup; disposable test isolation and cleanup. No subagents were used.

## Findings repaired

| Priority | Finding and repair | Evidence |
| --- | --- | --- |
| P1 | A cancelled signed upload could recreate deleted bytes while its token remained valid. Persist server-issued capability expiry before returning the token; retain cleanup intent through expiry, then acknowledge only an eligible successful deletion. Legacy missing expiry is conservatively delayed. | Real Storage replay/recreation and final cleanup, changed-byte rejection and failed-delete recovery; Mongo and focused tests. |
| P1 | Voiding a bill payment reopened its occurrence, but blanket uniqueness blocked repayment. A partial unique index now permits one active payment and retains voided records. | Financial SQL includes void-and-repay plus concurrent duplicate payment rejection. |
| P2 | Strict reminder action parsing included `reminderId`, rejecting valid dismiss/snooze requests. Parse the action separately from its resource ID. | Three route regressions. |
| P2 | Distant one-time deadlines could produce a reversed 90-day expansion interval. Expand once through its actual anchor. | Planner projection unit regression. |
| P2 | Rescheduled or finished occurrences outside the viewed effective-date window could appear again as projected originals; broad row limits could silently truncate dedupe. Look up candidate immutable occurrence keys in scoped batches. | Projection regression, including a moved occurrence. |
| P2 | The UI ignored stored-occurrence pagination and hid an empty projected page's continuation. Add bounded load-more controls and dedupe stored IDs. | Planner interaction regression; financial pagination separately passes real-auth acceptance. |
| P2 | Planner cursor fields entered PostgREST without typed validation. Validate UUID/date/status fields before query construction; batch property-task scheduling lookups rather than relying on a server row cap. | Source boundary review plus unit/full route coverage. |
| P2 | Future-only items could keep refill deferring; editing recurrence retained obsolete coverage. Match candidate eligibility to the horizon and reset coverage on due-spec changes. | 13 refill SQL assertions. |
| P2 | Rescheduling/reopening removed reminders without replacement; opt-in after disabled delivery did not requeue. Regenerate versioned reminders on pending occurrence revision changes and requeue only current scheduled reminders on opt-in, preserving dismissed/superseded evidence. | Six new reminder-lifecycle SQL assertions. |
| P2 | Reminder worker locked reminder before occurrence, opposite owner mutations. Match occurrence-before-reminder ordering. Linked sprint tasks could also drift to another property/kind on edit; guard those provenance fields. | Source review and migration replay; existing concurrent reminder race. No dedicated deadlock-stress or provenance-edit race claimed. |
| P2 | Async section fetches or Jamie previews could overwrite newer UI input; invalid partial money input could throw during typing. Fence stale results, keep partial values editable, and display save errors. Support properly grouped USD input shown in placeholders; reject malformed grouping. | Money/input/interaction regressions; rendered realtor save/conflict coverage. |
| P2 | Explicit placeholder URLs retained misleading real-photo alt text. Treat explicit and error-triggered fallback sources consistently. | Three fallback image tests. |
| P2 | Rendered error-state testing found the hero passing failed Atlas JSON into its canvas (`globe.nodes is not iterable`). Check HTTP success and canvas data before rendering; keep the visual fallback on failure. | Three new Atlas background regressions pass; post-fix browser rerun blocked by Docker availability. |
| P2 | New server-only workflow imports broke the scheduler registry unit suite. Isolate handlers in registry tests and assert their dispatch registration. | Registry suite and complete unit run. |

## Acceptance evidence

- Full unit baseline after first repairs: **339 files / 1,365 tests passed**. A later high-concurrency run had two unrelated 5-second timeouts in Atlas/Abidan tests; both passed in a bounded-worker rerun. Final totals are recorded below when the final run completes.
- `npm run test:db:concurrency`: **passed** after the review migration. Realtor assertions: property identity **22**, financial lifecycle **22**, planner refill **13**, reminder lifecycle **6**, plus seven independent-session mutation races and the shared scheduler/platform suites. Initial stale runner counts and a migration-comment syntax error were corrected before the passing run.
- `npm run test:db:mongo`: **9 passed**; the four Storage cases intentionally skip in this Mongo-only command.
- `npm run test:scans:storage`: **4 passed** against real disposable Supabase Auth/Storage and Mongo. Test-only transport failure injection exercises durable retry without a production fault switch. Cleanup expiry is advanced only on disposable fixture records; this does not test an actual two-hour wall-clock wait.
- Disposable realtor browser acceptance: real password login/cookies, anonymous denial, personal setup, saved bill, property-task handoff, stale-source rejection/draft preservation, ledger pagination/summary/CSV **passed**. Mock auth is disabled.
- Homepage: four widths captured in Chromium 149 with no document-width overflow; FAQ keyboard and hero inertness assertions passed. Final error-free assertion failed on the Atlas response bug, now repaired and unit-tested. Docker became unavailable before a post-fix rendered rerun. H1 remains partial; never infer complete browser acceptance from unit/build passes.

All runtime evidence above is local. Remote CI and deployment acceptance are separate. Logs/screenshots are in ignored `apps/pulse/.pulse-local/`; no credentials or account-bearing logs are committed.

## Compute/isolation decision

The dedicated runner makes sense for this workload: it uses local Docker rather than a hosted Supabase project. It generates a unique project ID, temporary copied config/migrations and loopback ports; starts only required services; disables analytics/mail; and verifies generated containers/volumes are removed. Storage acceptance includes Mongo, and the homepage option includes disposable Mongo for legacy config/listing reads. The existing persistent Supabase stack is neither reset nor migrated.

The four-case Storage run took **166 seconds** while other checks ran. The end-of-run service snapshot totaled approximately **1 GiB** (not peak memory; excludes the host Next process and the already-running persistent stack). These are measurements from this machine, not a capacity guarantee. Run suites serially with Next builds because they share `.next`. Prefer targeted local runs; do not provision another hosted project or claim the user's hosted bill was inspected.

## Remaining findings and release gates

1. **P2, financial export snapshot consistency:** multi-page CSV reads check counts but do not provide an immutable transaction-wide snapshot. Same-count corrections that reorder effective dates during export could omit/duplicate a row. Follow up with a stable snapshot/export RPC or revision fence plus a concurrent-edit regression; until then treat export as a best-effort view, not an accounting close.
2. **P2, optional financial property metadata:** commission/expected-income contracts accept a property reference, but their save adapters do not persist that link. Current forms submit null. Add ownership-validated persistence or reject non-null input rather than promising financial property attribution.
3. Homepage acceptance must retain explicit coverage gaps: real successful/empty/error feed rendering, all seven supplied sections, image failures/long labels, two-action public versus legitimate three-action operator banner, normal/reduced motion and non-home shared-style checks. Controlled local browser evidence does not certify live data.
4. Signed-capability cleanup still needs operational cadence and a real provider upload-duration/expiry boundary test, including requests admitted just before expiry. Do not claim immediate server-side token revocation.
5. Actual deployed reminder cadence, real participant/team privacy and economic pilot evidence remain open. No hosted migration, deploy, merge, paid model call, email send or publication was performed.
6. S7 event/worker/result projection is next for reconstruction; S8 processor and S9 real publication are unbuilt. Vibe authorized target discovery/full lifecycle remains unfinished despite existing expiry code.

The PR is an implementation/review update, not a blanket merge-ready or production-ready recommendation. Findings 1–2 and outstanding rendered/operational gates remain explicit next work.

## Plan reconciliation

- Keller: personal task handoff is locally database/browser accepted; source sprint status remains unchanged. Autonomous research is a different unfinished workflow.
- Praxis: equal-packet source coverage is **6.5/10 ≈65%**, not the stale 40–45%. This credits S5/S6 and partial S7, not real geometry or publication. No aggregate production percentage.
- Auth transition: historical proposal marked superseded; real SSR/password-cookie evidence does not certify hosted OAuth/user migration.
- Vibe: expiry is implemented; phase 10 is partial rather than entirely absent. Explicit equal-phase source denominator gives about **71%**, not release readiness.
- Platform/homepage/realtor and README point to current evidence and separate outstanding gates. The original architecture and scheduler remain shared.

## Final verification

September 27 continuation: the bounded-worker full-suite rerun was interrupted across the session transition and has no completion summary; it is **not counted as passed**. The last completed broad run remains 338 passed / 2 timed-out files (1,372 passed / 2 timed-out tests), following the earlier 339-file/1,365-test green run. Both timeout cases subsequently passed focused reruns. Final Atlas/Jamie/catalog regression run: **3 files / 8 tests passed** before adding the walkthrough coverage assertion. Focused review-path ESLint and `git diff --check` pass. Build and the final documentation coverage result are recorded in the commit handoff after completion.

The user additionally requested a script explaining every accessible path. `SUNSET_PULSE_ROUTE_WALKTHROUGH.md` supplies spoken narration for all **130** cataloged non-API paths, with entry requirements and honest scope boundaries. Both READMEs link to it; the catalog unit test protects its route coverage. Final route/README/walkthrough plus pilot-document tests: **2 files / 7 tests passed**.

The September 27 post-fix homepage rerun stopped before application startup because Docker's Linux engine named pipe was absent. It does not supersede the earlier successful SQL/Storage/realtor evidence, and no post-fix rendered pass is claimed. The final `npm run build` **passed compilation, type checking, all 260 static pages and trace collection**. It retains the pre-existing non-fatal `/api/kepler/listings` dynamic-server diagnostic. Remote CI must still certify the pushed commit.
