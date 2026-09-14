# Keller / Westlake property sprint implementation plan

Status: proposed implementation, not deployed behavior. This is a planning deliverable; no runtime changes accompany it. The single area is `keller-westlake`. Business objective: produce useful property guidance and follow-up that leads to the owner's buyer consultations and showing appointments.

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

- `durableScheduler.server.ts`, `processQueuedWorkflowJobs`, sprint branch: proposal and item inserts are separate. A retry can hit the source-job unique index rather than recover its proposal. All historical backlinks currently exclude work, including cancelled work.
- `sprintSelection.ts`, `selectSprintBacklog`: ties use title rather than created-at/ID; exclusions are not reported. Effort capacity is not persisted or passed by the scheduler.
- `approve_sprint_with_assignments`: revision is optional, checked before repeated approval, and item editing/removal does not share the sprint lock. Assignment instructions contain only a title; approval does not dispatch workers.
- `app/api/sprints/route.ts`, `complete_assignment`: assignment, item and backlog writes are separate, and downstream errors are ignored.
- The delivery code has an `uncertain` status but does not yet implement receipt reconciliation. Do not connect this new workflow to automatic sending until that contract is complete.

## Ordered code changes, declaration by declaration

Paths below are relative to `apps/pulse`. Existing symbols are exact edit anchors; new-file steps specify code order instead of unstable future line numbers. Inspect repository instructions and existing models before implementation; reuse equivalent tables/services if present.

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

When validation is resumed, acceptance scenarios must cover: all four correct task branches; original-vs-current price handling; owner isolation; duplicate planner retries; edits racing approval; changed property facts invalidating drafts; failed workers resuming without duplicate artifacts; messages remaining unsent until their separate approval; and genuine appointment events reaching the weekly report. The user's current skip-validation instruction is retained; no acceptance result is claimed by this document.
