# Keller / Westlake property sprint implementation plan

## September 16 review checkpoint — current execution entry

Use the [renewed five-hour plan](PRAXIS_AGENT_WORKSPACE_PLAN.md#september-16-review-and-renewed-five-hour-plan). It supersedes the September 15 status below. Docker now supports disposable Postgres and real Mongo acceptance, plus a persistent local-development Mongo service; see [Docker runbook](../../../infra/local/README.md). The previous Docker/Postgres-unavailable blocker is resolved. S6's deferred-outcome core passes isolated Docker acceptance, including poll-budget, pause and cancellation fences. S5 reservation, signed-capability, finalize-integrity and bounded-cleanup code passes local/unit/Mongo acceptance; real Supabase storage/auth replay remains open.

Repairs from review: event retries preserve an omitted schedule time; worker terminal writes require a live lease even before recovery; deferred scheduler polls are bounded and fenced; rejected/changed scans invalidate current artifacts while preserving revoked records; concurrent command-to-backlog insertion reuses the winning row; sprint item drafts keep the revision originally opened for editing. The isolated scheduler test now proves transaction overlap without claiming jobs in the developer's Supabase database. Nine real Mongo cases exercise revision conflicts, reviewer revocation, stale/revoked artifact behavior and upload reservation contention/finalization.

Next property deliverable after the shared foundation: complete real Supabase Storage/Auth acceptance for S5, then preserve assignment description, property/source revision, dependencies and worker choice; registered executors must save research/draft artifacts for owner/Jamie review. Keep unresolved property identities as tasks, not fabricated facts. Keep one `keller-westlake` area, weekly Monday 08:00 America/Chicago proposals and distinct email approval. S5 private uploads and S6 deferral precede the S7 scan outbox; property research itself need not wait for a reconstruction engine. The declaration plan below remains the implementation specification; use the renewed plan for sequencing and evidence.

Earlier status notes below are historical. Their unavailable-Docker, stalled-build and unverified-browser statements describe earlier runs, not the current environment. The earlier browser pass used test operator access and does not establish real owner/reviewer login acceptance.

Status: partially implemented, not accepted as a stable runtime foundation. September 15 source review at `50aa53b2` found committed compatibility repairs, RPC-backed atomic proposals, revision-checked review/schedule mutations and transactional assignment completion. These supersede the September 14 missing-code findings, but do not establish current database/CI acceptance. The single area remains `keller-westlake`. Business objective: produce useful property guidance and follow-up that leads to the owner's buyer consultations and showing appointments.

Current execution priority: [September 16 review and renewed five-hour plan](PRAXIS_AGENT_WORKSPACE_PLAN.md#september-16-review-and-renewed-five-hour-plan). Luna packets L1–L3 and the L4/S4 foundation are implemented locally: the property route no longer fabricates a ready model, new LiDAR intake is disabled, legacy synthetic metadata is labelled as non-property data, scan access is actor-scoped, exact private asset preview is available behind the new route, scan-studio camera/session recovery is wired with upload retry state, the heavy properties link avoids eager prefetch from Scan Studio, consent/revision/hash checks now protect manifest and review mutations, review approval requires an explicit media-inspection acknowledgement, ambiguous listing references remain unlinked unless exactly matched to one owner-scoped shortlist record, mock-parity revision races are covered, and S5 now has reservation quotas, deterministic signed paths, finalize-time byte/signature/SHA-256 validation, bounded rejected/expired cleanup, and direct-upload progress/retry/cancel outcomes. Local production build, full unit suite, scheduler Docker acceptance and 9-case Mongo acceptance pass. Remaining acceptance is real Supabase Storage/Auth policy and browser evidence, CI/PR evidence and the later S7 outbox bridge. Keep one `keller-westlake` area, weekly Monday 08:00 America/Chicago proposals and distinct email approval. The S6/S7 steps specify how one-off reconstruction jobs reuse the shared scheduler; property research itself need not wait for a reconstruction engine. Do not rebuild scheduler/proposal repairs already present, and do not treat the declarations below as proof that research workers already execute.

Luna implementation entry point: [section 13.7 handoff and checkpoint](PRAXIS_AGENT_WORKSPACE_PLAN.md#137-luna-implementation-handoff). Follow its small dependency-ordered packets; do not create a separate property-specific scheduler or a competing progress ledger here.

Collaboration rule: the owner and Jamie work from the same property record. The owner can add facts, corrections, and questions; Jamie can add sourced research context through the server service. Every note keeps its author type and optional command ID. Notes inform proposed tasks, but do not silently confirm facts, change ownership, approve assignments, or authorize delivery.

## First sprint tailored to the four shortlisted properties

| Property | First task | Dependent output | Completion evidence |
| --- | --- | --- | --- |
| 1612 Fair Oaks Drive, MLS 21316041 | Confirm price/status and source date; collect HOA and school eligibility sources | Buyer brief emphasizing five bedrooms, lot, garage and outdoor amenities; reviewed showing invitation | Dated source references, saved brief, draft ID |
| 2021 Granada Trail, parcel 42110341 | Resolve city/MLS ID, current price, size and official bedroom count | Luxury buyer brief with sourced features; separate questions about taxes, HOA and school eligibility | Resolved identity and missing-field checklist; saved brief |
| West Bursey Ranch Add, parcel 05812143 | Resolve street address/MLS ID, current price, beds/baths and living area | Residential buyer brief and shortlist email draft after identity resolution | Verified identity and dated facts; draft ID |
| Old Town Keller land, parcel 03061485 | Resolve identity and zoning discrepancy; assemble questions about access, utilities, setbacks and parking | Land opportunity brief separating supplied marketing claims from confirmed permitted uses | Source-backed answers or explicit unresolved questions |

No supplied original list price becomes a current asking price automatically. Missing information creates research work, not invented facts. The potential fifth Granada bedroom stays a conversion idea. Keller and Westlake share one sprint, with property-specific tasks and audiences. Client matching uses stated budget, property type, features and timing, never inferred demographics.

## Intended execution sequence

1. Owner saves properties to the shared shortlist.
2. Weekly Monday 08:00 America/Chicago scheduler creates one proposed sprint from current property snapshots, open inquiries and unfinished work.
3. Owner reviews task scope and approves the sprint.
4. Approved research and drafting assignments run through registered workers. Unsupported work is visibly unassigned; missing evidence blocks dependent tasks.
5. Drafts and research artifacts return to the review queue with their property and source revision.
6. Owner approves an exact message and audience before delivery. This property workflow starts with automatic sending disabled regardless of unrelated hotlist settings.
7. Actual inquiries and appointments create follow-up tasks. Task completion alone never counts as a lead or appointment.

## Existing code gaps to repair first

September 15 reconciliation of the earlier findings:

- Proposal persistence now lives in the registry's manual/property planner services and calls `persist_scheduled_sprint_proposal` / `persist_property_sprint_proposal`. Preserve those transactions; verify retries, rollback, property revision checks and concurrent selection rather than restoring separate inserts.
- `sprintSelection.ts`, `selectSprintBacklogReport`, now sorts by priority/created-at/ID and reports exclusions. Verify effort limits and complete occurrence snapshots through the actual scheduled path; helper behavior alone is not acceptance.
- `approve_sprint_with_assignments` and `remove_sprint_item` now share revision/locking logic in `20260915030000_sprint_review_locking.sql`. Approval still creates assignments, not proof of executed research. Rich, revision-bound instructions and worker evidence remain necessary.
- `app/api/sprints/route.ts`, `complete_assignment`, now calls `complete_sprint_assignment`; preserve that transaction and prove assignment/item/backlog consistency under failure and replay.
- Schedule saves now call `save_sprint_planner_schedule`, and the UI retains dirty drafts. The paused save button still says “Enable planning” despite pause-preserving semantics; fix the label and verify owner/refresh/conflict behavior.
- Delivery receipt reconciliation and separate send approval remain acceptance gates. No scan or sprint action implicitly enables automatic sending.

## Ordered code changes, declaration by declaration

Paths below are relative to `apps/pulse`. Existing symbols are exact edit anchors; new-file steps specify code order instead of unstable future line numbers. Inspect repository instructions and existing models before implementation; reuse equivalent tables/services if present.

Historical declaration plan: several files labelled “new” below now exist. Apply only their remaining contract/acceptance work. Use the reconciled status above and the main plan's section 13 ledger to avoid duplicate tables, services, or schedulers.

### 1. Structured property contract — new `lib/property-sprints/contracts.ts`

1. Export `AREA_KEY = 'keller-westlake'` and property kinds `residential` and `land`.
2. Define a property identity schema: internal UUID, optional address/city/MLS ID, county and parcel. Require at least one usable source identifier; do not merge solely by street text.
3. Define fact records with `field`, typed `value`, `sourceId`, `observedAt`, and `verificationStatus` (`supplied`, `confirmed`, `conflicting`). Keep original price and current asking price distinct.
4. Define `PropertySnapshot` with owner, property revision, identity, facts, unresolved questions and active/archived shortlist state. Unknown fields remain null.
5. Define `PropertyTaskKind`: `resolve_identity`, `verify_facts`, `research_constraints`, `draft_buyer_brief`, `draft_outreach`, `follow_up_inquiry`.
6. Define task input/output schemas with property ID/revision, source references, dependencies, worker key, estimated effort and artifact references. Reject unknown fields in execution inputs.

### 2. Persistence — new forward migration after the latest repository migration

1. Create owner-scoped `property_shortlist_entries` with area key, identity fields, revision, archival state and timestamps. Add owner/MLS uniqueness when supplied and owner/county/parcel uniqueness when supplied; support conflict reporting during import.
2. Create `property_sources` and `property_facts` with owner/property references, source text or URL, observation time and verification state. Preserve supplied text as evidence, not executable instructions.
3. Extend backlog provenance to allow `property_shortlist`; add property reference, task kind, input revision, deduplication key and structured task payload.
4. Add matching property/task snapshot fields to sprint items and assignments. Use composite ownership constraints so cross-owner property, item and assignment references fail in the database.
5. Add assignment artifact storage with output kind, content, source references, input revision and review status. Add attempt/lease metadata needed by the assignment executor.
6. Store schedule settings for enabled property planning, max items and capacity minutes. Keep one area configuration per owner and preserve existing generic planning behavior.
7. Enable RLS and create policies consistent with the existing access model. Restrict service-only transaction RPC execution to service_role.

### 3. Shortlist intake — new `lib/property-sprints/shortlist.server.ts` and `app/api/property-shortlist/route.ts`

1. Service exports `listEntries(ownerId)`, `saveEntry(ownerId, input, expectedRevision)` and `archiveEntry(ownerId, id, expectedRevision)`.
2. Save identity, source and facts in one transaction; increment revision on material changes. Return conflicts instead of silently overwriting newer facts.
3. GET resolves the signed-in identity server-side and returns only that owner's shared area entries.
4. POST validates input, calls the service, and returns saved revision plus unresolved fields. No caller-supplied owner is trusted.
5. Prepare an explicit import preview from `KELLER_SHORTLIST.md` for the four existing entries. Persist only through owner-authenticated confirmation; do not seed another user's records through a public migration.
6. Keep Markdown as the research record. Runtime planning reads structured database records, not a Markdown parser on each scheduler tick.
7. Expose property notes in the same response. `POST action=add_note` accepts owner input; the public route forces `authorType=user`. Jamie writes `authorType=jamie` through the server service with a command ID.
8. Preserve note history instead of overwriting it. A note can propose a correction or question; only a verified fact update increments the property revision.

### 4. Deterministic task builder — new `lib/property-sprints/buildPropertyBacklog.ts`

1. Export pure `buildPropertyBacklog({ properties, existingTasks, inquiries, occurrenceAt })` returning tasks and exclusion reasons.
2. For unresolved identity, emit `resolve_identity` first and block publishing/delivery tasks that need it.
3. For stale or conflicting facts, emit `verify_facts`; land additionally receives `research_constraints` for unresolved development questions.
4. Once prerequisites are satisfied, emit `draft_buyer_brief`, followed by `draft_outreach` only when an owner-authorized audience exists. Without contacts, report an audience gap rather than inventing recipients.
5. Give each task a stable key from owner, property, task kind, material input revision and relevant inquiry ID. Recurring refresh tasks use a defined refresh window; unchanged drafts do not regenerate weekly.
6. Exclude active duplicates and already completed work for the same input. Allow cancelled tasks to be deliberately reopened and material fact changes to create a new revision of work.
7. Return exact reasons for excluded/blocked tasks. Default initial proposal to at most 10 tasks and 180 estimated owner minutes; these are editable starting settings, not claimed measurements.

### 5. Proposal service — new `lib/property-sprints/planPropertySprint.server.ts`

1. Load owner-scoped shortlist snapshots, relevant inquiries, active task links and planning settings.
2. Call the pure task builder and selection helper; preserve source snapshots in every selected item.
3. Call a single proposal RPC with job ID, owner, occurrence, task payload and exclusion summary. Validate job ownership and lease before writes.
4. Inside the RPC, reuse the existing proposal for the same job; otherwise insert backlog additions, sprint and items atomically. Return the same result ID on retries.
5. In `durableScheduler.server.ts`, replace inline sprint writes with a planning service dispatch based on saved mode (`manual_backlog` or `property_shortlist`). Add a handler registry and extract the API-route import into a server service.
6. Complete the job and generic result in one lease-checked transaction. Do not build a second cron or a separate property scheduler.
7. Load user and Jamie notes into task instructions as context with author labels. Keep source references and unresolved questions visible to the owner for review.

### 6. Selection and approval repairs

1. In `sprintSelection.ts`, accept maxItems/capacityMinutes explicitly; sort by priority, created_at and ID; accumulate only selected work and return selected items, used effort and exclusions. Unknown estimates require an explicit policy.
2. Extend the approval request with required expected revision for first approval. Under the sprint lock, validate item ownership/dependencies, create unique assignments, copy complete task snapshots and link assignment IDs back to items.
3. Record the approved revision so replaying the same approval returns the same assignments, while approval of a different draft revision conflicts.
4. Route item edit/removal through RPCs taking the same sprint lock and incrementing its revision. Changes after approval require a new review cycle.
5. Replace `complete_assignment` multi-write code with one transaction that checks allowed transition, stores artifact evidence, and updates assignment/item/backlog together. Cancelled assignments cannot be marked done by an old worker.

### 7. Actual assignment execution — new `lib/property-sprints/workers.server.ts`

1. Define `PropertyWorker.execute(context, input)` and register only available implementations by worker key.
2. Dispatch approved assignments through the existing worker infrastructure with atomic claim, bounded attempts and lease fencing; complete scheduler foundation repairs before enabling unattended runs.
3. Research workers return sources, resolved facts and unanswered questions. If no authorized research connector exists, leave the assignment unassigned with a concrete reason.
4. Draft workers use the repository's existing generation service and validated property snapshots; output a saved brief or email draft. They cannot call email delivery.
5. Treat listing copy and fetched documents as source material; they cannot alter worker instructions, audience scope or approval policy.
6. Recheck the property revision before accepting an output; changed facts mark output stale for regeneration/review.
7. Store useful output and its review state before completing the assignment. A created assignment record is not execution success.

### 8. Property review interface

1. Add a signed-in shortlist view showing all four properties under Keller / Westlake, source dates, missing fields and planning controls.
2. Extend `app/admin/sprints/SprintsWorkspace.tsx` to load planning mode/settings and show the next occurrence in the saved timezone. Preserve failed edits and report API errors.
3. Extend `SprintCard.tsx` with property label, task purpose, prerequisites, assignment worker/state, output link and revision. Show blocked/unassigned work explicitly.
4. Add an artifact review screen with source evidence and edit/approve/reject actions. “Approve sprint” authorizes task work; “Approve email” authorizes an exact reviewed message and audience.
5. Reuse existing email review/delivery services after their integrity repairs. Do not treat all properties as appropriate for every contact; offer reviewed audience-specific messages.
6. Expose the experience from the shared route catalog and ordinary signed-in navigation; retain existing admin routes as compatibility entry points.

### 9. Business outcome tracking

1. Link property inquiry intake to owner, property, source page/campaign and contact preferences.
2. Create follow-up work from actual inquiries with a stable event ID; duplicate submissions do not create duplicate assignments.
3. Record consultation/showing requested, booked and completed as distinct events from authoritative booking state or explicit owner updates.
4. Weekly output summarizes property briefs completed, drafts awaiting review, real inquiries and appointments, and next follow-ups. Do not infer success from emails sent or AI task counts.

## Implementation order and acceptance boundary

Deliver shortlist persistence/intake and the four-entry import first; then task builder and atomic proposal/approval repairs; then bounded research/draft execution and review; finally inquiry/booking feedback. Existing Packages A–D remain prerequisites where their contracts are reused.

Acceptance scenarios must cover: all four correct task branches; original-vs-current price handling; owner isolation; duplicate planner retries; edits racing approval; changed property facts invalidating drafts; failed workers resuming without duplicate artifacts; messages remaining unsent until their separate approval; and genuine appointment events reaching the weekly report. Earlier implementation proceeded with validation deferred. The revised five-hour plan reserves a verification budget because migration failure is now confirmed; no acceptance result is claimed by this document, and any skipped checks must remain explicitly unverified.
