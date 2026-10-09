# Praxis Agent Workspace — Current Implementation Plan

Updated September 30, 2026. Owner: Taz. Implementation may be performed by Luna or the active coding agent; use one executor and no subagents.

**Current entry:** read this document's [implementation queue](#implementation-queue), then its [handoff](#137-luna-implementation-handoff). This revision replaces the conflicting September 11–29 execution orders. The complete prior document, including the user's working edits, is preserved in [the historical plan](archive/PRAXIS_AGENT_WORKSPACE_PLAN_2026-09-30.md).

Reviewed source: HEAD `d84a9091`, branch `codex/cms-vertical-slice-followup`, plus existing uncommitted scan/scheduler/artifact-store changes. The September 29 local filesystem publication repair is present. This September 30 request authorizes review and planning; defects listed here are **planned repairs, not changes already implemented**.

The [operating platform plan](SUNSET_PULSE_OPERATING_PLATFORM_PLAN.md) owns shared workspaces, JSON run state, checkpoints, capability policies, receipts and quotas. The [Keller / Westlake plan](KELLER_WESTLAKE_PROPERTY_SPRINT_PLAN.md) owns property backlog rules. This document owns the agent workspace and the capture/reconstruction client of those shared services. Homepage, Realtor Planner and Vibe retain their own queues.

**Seller acquisition priority, September 30:** Taz can spend 20–30 hours/week and wants sellers first, commercial real estate eventually, and a closing by year-end. Follow the [client acquisition plan](KELLER_WESTLAKE_CLIENT_ACQUISITION_PLAN.md) alongside this technical queue: seller checklist and personally reviewed CMA request above the fold, source-backed neighborhood guides, short videos, owned lead intake and human follow-up. Acquisition does not wait for reconstruction or full autonomous missions. Keep Praxis R1 ahead of automated marketing sends; publication, spending and provider activation retain their separate gates. The target is not a guaranteed closing.

## 1. What users should be able to do

1. Spawn a specialized worker, give it a visible assignment, type a request or explicitly enable the shared microphone, and inspect its work.
2. Save property context, questions and corrections with Jamie against the same owner-scoped property record.
3. Review weekly proposed work for the single `keller-westlake` area, approve assignments, and see persistent progress and useful sourced outputs.
4. Upload private photos/videos, inspect the exact capture, and later obtain a real model through a selected processor.
5. Review the exact email or listing derivative before sending or publishing; capture approval and sprint approval remain separate decisions.
6. Eventually leave a bounded mission running through the existing durable engine, with missing information returned to the existing checkpoint inbox.

The present client workspace does not persist live agent execution across navigation. The present scan path does not reconstruct a home. Preserve these distinctions in product copy until their corresponding implementation packets pass.

### Product decisions already settled

- One capture owner and one finalized transcript; selecting an agent panel does not control who hears eligible speech.
- Manual submission uses the visible draft. Automatic work never overwrites an edited draft.
- `workspacePolicy.ts` currently limits three agents, two simultaneous commands globally, one per agent, one coalesced automatic candidate per agent, four automatic starts/minute and twenty/hour.
- The client's five-minute capacity hold after uncertain delivery is a conservative local policy; it is not server cancellation or a durable quota.
- Weekly sprint planning defaults to Monday 08:00 in the saved timezone; the Keller / Westlake default is America/Chicago. Daily planning remains available.
- Approval creates persistent supported assignments. Creating an assignment does not demonstrate that a research executor ran.
- Email review is the default. An existing explicitly configured auto-send policy is a separate workflow policy, not authority inferred from a sprint or spoken request.
- Initial capture is uploaded photographs or videos. Camera preview does not record video; native LiDAR and Wi-Fi sensing are absent.
- A real artifact must have provenance, verified stored bytes and a current approved input. Legacy room-shell metadata remains historical.
- Private review is owner/grant scoped. `PROPERTY_SCAN_REVIEWER_IDS` is an existing environment-wide reviewer override; document and audit it rather than describing it as a per-scan grant.

## 2. Current implementation and evidence

<a id="136-remaining-roadmap-and-completion-ledger"></a>

### 13.6 Remaining roadmap and completion ledger

“Code present” means inspected declarations/callers exist. “Local evidence” means the named local fixture ran. Neither establishes hosted deployment, live provider behavior or real participant acceptance.

| Area | Inspected implementation | Remaining work |
| --- | --- | --- |
| P0–P2 contracts, shared capture, manual workers | `JamieAudioContext`, `AgentWorkspace`, `useAgentWorkspace`, `useAgentCommandRun`, reducer, stream reader and command endpoint | Real-device microphone matrix and account-transition behavior; keep transcript/results memory-only until a deliberate persistence feature |
| P3–P4 attention and client dispatch | Rules/semantic attention, per-agent cursor/epoch checks, local reservations, bounded assessment and command starts | Live configured semantic-provider evidence; durable server mission admission is a later shared-engine feature |
| P5–P6 UI and parity | Default `/command-center` renders the workspace; rich results, listing handoff and email draft controls exist | `?legacy=1`, `?intake=`, and `?command=` still deliberately mount the classic arena; complete equivalent entry/action parity before removing it |
| P7 verification | Workspace browser spec covers 1440/900/390px with mocked SSE and no microphone requests; focused current unit tests pass | Real authenticated microphone/capture acceptance; browser test currently tolerates shared-shell React #418, which remains a separate shell issue |
| P8 licensed communication | `AgentEmailDraft` saves a draft and explicitly approves eligible recipients; `sendRun` claims draft state and rechecks contact consent | Atomic revision claim, ambiguous delivery reconciliation and policy-pinned send evidence; no live-send acceptance is claimed here |
| Scheduled property planning | Backlog/proposals/approval/completion use the shared scheduler and existing transactional RPCs; planner handoff has dated local SQL/browser evidence | Source-backed unattended research/draft executors and real outcomes; ordinary Realtor deadline reminders are distinct from booking/showing reminders |
| S1 truthful capture capability | `reconstructionUnavailable`, disabled new LiDAR intake and legacy-demo handling exist | Preserve those boundaries in later worker/viewer wiring |
| S2 scoped review | Indexed actor-scoped detail lookup, reviewer grants and 60-second exact-asset preview exist | Queue cursor pagination, real reviewer/revocation browser acceptance, override auditing |
| S3 camera/session recovery | Camera lifecycle, saved session identity and direct-upload retry/cancel UI exist | Real-device permission, interrupted upload and renewal matrix; owner/reviewer page entry consistency |
| S4 revisioned state | Consent receipt, manifest hash, expected revisions, review events and stale/revoked artifact flags exist | Explicit consent withdrawal, stable browser reconciliation and verified result provenance |
| S5 private upload | 24 assets/session, 75 MiB/file, 300 MiB/session, two active uploads; signed reservations, content signatures/hashes and capability-aware cleanup | Account/workspace storage ceilings, deployed cleanup cadence and upload requests near capability expiry |
| S6 shared one-off jobs | Event payloads, replay identity, live leases and deferred outcomes use the existing jobs; dated disposable concurrency acceptance exists | Scan integration error isolation and eventual contract/handler admission; no second scheduler |
| S7 scan bridge | Frozen operation identity, Mongo intents, strict enqueue adapter, scheduler-tick relay, v1 receipt, revision-fenced projection, GLB-envelope verifier and local atomic artifact store exist | Hard intent bounds, consistent mock fences, verified result commit/projection, S3 adapter and real backend evidence |
| S8 reconstruction | No selected processor; production registry has no `property_scan_reconstruction` handler | Fixture orchestration first; explicit real processor selection, limits and consented actual-artifact acceptance later |
| S9 private model/publication | Property preview shows unavailable/legacy metadata; procedural component is not a live real-home viewer | Real private artifact access/viewer, separate exact-artifact publication, withdrawal and deletion |
| S10 release evidence | Dated review records and local tests exist | Current packet integration/browser evidence, actual PR checks and separate production decision |

Do not reuse the old 65% estimate as a production-readiness claim. It was an equal-weight S1–S10 source estimate, not effort remaining, and did not include these newly identified boundary repairs. Track packet exits below rather than raising a percentage whenever a helper file appears.

### September 30 verification actually performed

From `apps/pulse`, the existing artifact integrity/store/local-store/reconciler, scheduler-event/relay, agent command/race/attention and licensed-delivery unit suites passed: **10 files / 51 tests**.

The scan subset accounts for **6 files / 34 tests**. The race test confirms two local creates select one winner and preserve complete bytes; it does not simulate a process crash or prove a remote backend's conditional semantics.

Prior evidence, carried forward rather than rerun today:

- [September 26 review](LUNA_REVIEW_2026-09-26.md): four disposable Supabase Auth + Storage + Mongo cases, real byte rejection and durable cleanup recovery; nine Mongo cases in that dated run.
- Later S7 working changes add Mongo concurrent result replay/supersession evidence; their last recorded run was ten passed with four unrelated Storage cases skipped.
- September 29: local artifact/scheduler suites passed 34 tests, targeted ESLint and whitespace validation passed; elevated Docker inspection reached version 29.8.0. That observation does not prove Docker is available in a later session.
- No September 30 production build, browser rerun, disposable DB/storage run, hosted quota inspection or deployment was performed for this planning request.
- Existing user changes in scan, scheduler, Wikipedia/Docker and both plans remain local. Wikipedia ingestion/remote deletion is a separate operational task.

## 3. Review findings that change the implementation order

Line anchors below were inspected on September 30. Find the named symbol again before editing; new files in later packets are proposals.

| ID | Source anchor | Observed gap | Repair packet |
| --- | --- | --- | --- |
| F1 / high | `hotlistEmailWorkflow.server.ts:178`, `sendRun` | Checks expected revision in memory, then claims only by ID and draft status. An edit can win between those operations and a send can claim a newer, unreviewed body. | R1 |
| F2 / high | `propertyScanStore.ts:553`, `listPendingPropertyScanReconstructionIntents` | Mongo limits session documents, then flattens all their pending intents without a final limit. Ten sessions can produce up to 200 intents; mock mode slices actual intents. | R2 |
| F3 / high | `durableScheduler.server.ts:45`; worker route `GET` | Due-schedule processing awaits the optional Mongo relay; its enumeration failure bubbles after schedule writes. Upload cleanup is also awaited before processing jobs, so a cleanup enumeration failure can skip otherwise runnable work. | R2 |
| F4 / medium | `propertyScanStore.ts:500,574`; reconciler `isStillApproved` | Mock intent creation omits the real path's current-manifest comparison. Acknowledgement filters a pending operation but does not atomically recheck its owner/approved source. Worker-side revalidation is still essential if input changes after enqueue. | R2 |
| F5 / high before remote storage | `propertyScanArtifactStore.server.ts:15`; local adapter `read/delete` | Store interface has unconditional deletion and unbounded reads. Local maximum bytes are checked only on writes; a larger existing file is read in full. The coordinator correctly avoids deletion on verification failure. | R3 |
| F6 / high before viewer | `propertyScanArtifactIntegrity.server.ts:34` | Verifier checks size/hash, the GLB header and first JSON asset version. It does not validate every chunk, geometry usability, resource counts or external resource references. | R3/R7 |
| F7 / high before worker | `propertyScanStore.ts:607`, `projectPropertyScanReconstructionResult` | Accepts schema-valid receipt metadata without reading storage or proving a completed, live-lease-committed scheduler receipt. It is currently scaffolding, not a trusted worker result boundary. | R5 |
| F8 / medium | `propertyScanStore.ts:112,123`; owner/admin list routes | Real lists stop at 50/default bounded rows and expose no continuation; owner mock list is unbounded. Indexed deep-link reads are implemented, so do not describe all S2 pagination as complete. | R6 |
| F9 / high before publication | Consent/model/store and `/preview` page | No owner consent-withdrawal/retention flow or exact-artifact publication service exists. Preview currently consumes legacy `reconstruction`, not verified `artifactRefs`. | R6–R8 |
| F10 / dependency | `workflowRegistry.server.ts:39`; event migrations | Scan enqueue wrapper exists, but handler and database event admission do not. Enabling just the event contract would create unsupported work. | R5 |
| F11 / dependency | `useAgentCommandRun.ts:12`; `SubmissionScheduler` | Command abort and budgets are client-local. Reusing these hooks for an unattended mission would lose authoritative state on navigation. | R9 |
| F12 / release gap | `scanAccess.server.ts`; review `PATCH` | Review acknowledgement is a user assertion, not server proof that every exact media object was inspected. Configured reviewer IDs bypass per-scan grants. | R6 |

F1–F4 can be repaired without selecting a storage vendor or paying for a processor. R3–R4 can use synthetic, disposable local data. Production storage limits and actual provider activation do not block those independent implementation tasks.

<a id="implementation-queue"></a>

## 4. Implementation queue

<a id="september-16-review-and-renewed-five-hour-plan"></a>
<a id="135-line-by-line-implementation-sequence"></a>

### 13.5 Line-by-line implementation sequence

Read one packet and its direct source/callers. Complete its required boundary before continuing. “Line-by-line” below means exact declaration/edit order, with current source anchors where useful; it does not mean applying stale line numbers mechanically.

Order: **R1 → R2 → R3 → R4 → R5 fixture orchestration → R6 private review/recovery → R7 real processor/viewer → R8 publication → R9 durable property missions**. Original command-workspace parity is a parallel bounded packet R10. Property research does not require geometry; R9 may start earlier once its shared capability/artifact dependencies exist.

### R1 — Atomically claim the exact approved email revision

Purpose: preserve the user's existing review-before-send requirement under concurrent edits.

1. `lib/autonomous-workflows/hotlistEmailWorkflow.server.ts`, immediately above `sendRun`: add a narrow typed draft-conflict error that routes can distinguish from transport/provider failures.
2. At the start of `sendRun`, set `approvedRevision = expectedRevision ?? run.revision`; reject missing/invalid revision, and retain the early comparison for readable feedback.
3. In the claim query at lines 181–187, retain `id` and `status='draft'`, add `revision=approvedRevision`, and apply the run's explicit owner scope. For an intentional null-owner local path use `.is('user_id', null)`; do not accidentally drop scope.
4. Use only the returned claimed row's frozen subject/body/audience/idempotency key throughout delivery. A zero-row claim must not read the newer draft and send it.
5. Keep an already-sent replay successful only when its pinned revision and logical delivery identity match the approved request. Otherwise return conflict.
6. `app/api/admin/automations/hotlist-email/route.ts`, send/retry branches: map the typed conflict to 409, preserve the current draft in the UI, and require re-review of the latest revision.
7. `tests/unit/licensed-hotlist-delivery.test.ts`: assert the revision/owner predicates and no provider call on a lost claim. Add a disposable SQL race where an edit wins after initial read and before approval claim.
8. Keep the current consent recheck and per-batch identity. Ambiguous provider receipts need the separate R9 effect work; this packet must not claim exactly-once delivery.

Exit: concurrent edit and approval cannot send a draft revision that the user did not approve. Provider transport stays stubbed for acceptance.

### R2 — Bound scan work and isolate its failures in the shared scheduler

Purpose: optional capture work must consume a predictable budget and preserve scheduler availability.

1. `lib/scans/propertyScanStore.ts`, before pending/cleanup list helpers: add a shared finite-integer batch-limit parser. Default invalid/non-finite input; clamp actual work to 1–100. Apply it consistently to real and mock paths.
2. In `listPendingPropertyScanReconstructionIntents` at line 553, preserve owner/operation identities and sort pending intents stably; add a final actual-intent bound after flattening. Do not rely on a session-document limit as a work limit.
3. If a cursor/due-time field is introduced for fairness, persist it per intent and use bounded candidate documents. Do not keep processing the same disabled/poisoned oldest record indefinitely. Avoid converting one packet into an unbounded aggregate across all owners.
4. `models/PropertyScanSession.ts`, reconstruction intent declarations: add only the retry/due metadata required by the chosen fairness implementation. Add a pending-state/due query index based on the actual query; inspect multikey behavior before choosing compound fields.
5. `persistPropertyScanReconstructionIntent`: make the mock path require the same current hash, approved revision and valid consent receipt as the real path; preserve the existing maximum twenty historical intents and replay identity.
6. `resolvePropertyScanReconstructionIntent`: replace unscoped acknowledgement arguments with a typed frozen-input object including owner, operation and approved source. Its conditional mutation must recheck the still-approved hash/revision when acknowledging. Stale resolution may retain historical evidence.
7. `scanJobReconciler.server.ts`: revalidate immediately before enqueue, bound enumeration and database request time, distinguish contract-disabled from retryable storage faults, and acknowledge through the frozen-input mutation. If acknowledgement loses to input replacement, report stale/superseded work and retain the event identity for recovery.
8. `durableScheduler.server.ts`, after recurring dispatch: isolate the scan relay result. Return sanitized `disabled/unavailable` status and counts when its optional boundary fails; do not throw away the successful recurring-dispatch response. Genuine recurring SQL failures still fail normally.
9. `app/api/admin/automations/hotlist-email/worker/route.ts`: isolate upload-cleanup enumeration errors so processing available jobs can continue. Keep bounded cleanup metrics and a visible warning. Honor the route's 60-second runtime budget.
10. Add focused regressions to `property-scan-job-reconciler.test.ts` and `durable-scheduler-scan-relay.test.ts`: ten sessions with multiple intents, non-finite limits, failed Mongo enumeration, disabled admission, stale acknowledgement and immutable event replay.
11. Add a disposable Mongo race for input replacement during enqueue/acknowledgement. Add a worker-route regression proving cleanup failure still reaches shared job processing.

Exit: a requested batch of N processes at most N intents; a scan outage does not prevent unrelated scheduler clients from progressing. Already-admitted stale events remain subject to R5 worker revalidation.

### R3 — Make private artifact policy and storage contracts enforceable

Purpose: close the contract before adding a remote backend.

1. New `lib/scans/propertyScanArtifactPolicy.server.ts`: declare a strict parsed policy with maximum object bytes, read timeout, bounded resource counts and approved backend identifier. Disposable fixtures may use the existing 1 MiB test limit; production values must come from reviewed settings.
2. `scanJobs.server.ts`, v1 receipt at line 37: preserve v1 deserialization. Define a versioned verified-storage receipt for new worker output rather than silently changing old receipts' meaning.
3. Add a deterministic artifact-ID helper based on frozen operation identity and output digest. Retries of identical output must derive the same UUID/private key; competing changed output for one operation is a conflict.
4. `propertyScanArtifactStore.server.ts`, interface at line 15: make reads accept a maximum byte count and abort signal. Return bytes plus opaque storage object identity sufficient for guarded access/cleanup.
5. Remove unconditional `delete(objectKey)` from the worker's minimum store interface. Define a separate guarded-removal capability requiring a backend-enforced object version or ETag condition. A backend lacking atomic conditional removal returns unavailable; do not emulate it with HEAD followed by unconditional DELETE.
6. In `writeAndVerifyPropertyScanArtifact`, enforce the selected byte ceiling before allocation/write and during read-back. Preserve its current behavior of retaining objects after an uncertain create/read.
7. `localPropertyScanArtifactStore.server.ts`: retain staged write, sync and atomic hard-link publication. Read through a bounded file handle; enforce actual bytes read, not only a pre-read stat. Close handles on every path.
8. Resolve filesystem paths under an explicitly trusted private root; reject symlink/reparse escapes where the platform supports the check. State the trusted-root requirement for local development. Do not claim the present lexical prefix check fences a hostile filesystem.
9. Clean staging handles/files after close/link errors. Staging garbage collection must be limited to an acceptance-owned directory or a maintenance period with writers excluded; no sweeping active objects from a read-back error.
10. `propertyScanArtifactIntegrity.server.ts`: walk the entire GLB chunk structure with boundary/alignment checks, one first JSON chunk and bounded supported binary content. Reject incomplete/trailing malformed data.
11. Parse and inspect resource references before viewer admission: reject external buffer/image URLs and unsupported extensions, bound arrays/accessors/textures, and classify empty fixture geometry as fixture evidence. SHA-256 and a valid header do not establish an actual home model or accurate measurements.
12. Extend the existing integrity/store/local-store suites with oversize pre-existing reads, aborts, malformed later chunks, external references, concurrent identical output and guarded-removal capability denial.

Exit: an adapter cannot bypass byte policy, a malformed resource cannot reach the viewer, and worker code has no unconditional object-delete primitive.

### R4 — Prove the contract against disposable S3-compatible storage

Purpose: use real storage semantics without consuming hosted Supabase capacity.

1. `infra/local/compose.yaml`, next to existing acceptance services: add an `artifact-store-test` service, acceptance profile, loopback-only ephemeral port, tmpfs object data, memory limit, pinned reviewed image and health check. MinIO is a candidate for this disposable backend, not a production vendor selection.
2. Do not attach application env files or the development Mongo/Wikipedia volumes. Generate fixture credentials in the runner; use only a private fixture bucket.
3. `scripts/docker-acceptance.mjs`, `withDockerService`: extend its explicit acceptance-service allowlist. Preserve unique project IDs, service-only startup, finally cleanup and remaining-container checks.
4. New `lib/scans/s3PropertyScanArtifactStore.server.ts`: accept explicit client/endpoint/bucket/policy; default-deny public ACLs; implement conditional PUT `If-None-Match: *` and bounded GET.
5. Treat a failed precondition as an existing object to verify. Treat transport uncertainty as uncertainty; a conditional-operation conflict may require bounded retry/read. Never blindly label every 409 as successful create.
6. Use backend object versions/ETags as opaque identity, not a SHA-256 substitute. Advertise guarded removal only after this backend actually proves its atomic condition.
7. Reuse an installed compatible S3 library if available. If one is needed, add one direct dependency and its lockfile in this packet; do not invent custom signing or add unrelated provider packages.
8. New `scripts/scan-artifact-acceptance.mjs`: call the existing Docker helper, resolve the generated loopback endpoint, create a private fixture bucket and run the new integration suite. Validate all supplied acceptance endpoint/database targets and never discover an arbitrary running Supabase container.
9. New `tests/integration/property-scan-artifact-s3.test.ts`: prove write/read-back, two concurrent conditional creates, anonymous read denial, same-key replay, lost-create-response retry, missing/truncated/tampered read-back and scoped cleanup.
10. Add controlled client/transport fault injection for transient versus permanent failures and label it as injected. Never claim a mocked error proves a backend behavior the backend was not made to exercise.
11. `apps/pulse/package.json`: add `test:scans:artifacts`; `infra/local/README.md`: document its temporary resources and exact cleanup.
12. After the runner succeeds locally, add the relevant CI invocation using the existing Docker acceptance conventions. Record that service/schema/dependency support was verified against the pinned version.

Exit: the actual coordinator works against a private disposable S3 service and all invocation-owned resources are removed. The persistent Supabase stack and hosted quota are outside this fixture.

### R5 — Close the durable worker/result boundary with fixtures

Purpose: complete S7's orchestrator before paying for geometry.

1. New `lib/autonomous-workflows/propertyScanReconstructionWorkflow.server.ts`: implement the existing `WorkflowHandler` signature. Parse strict event payload; verify `job.user_id`, event key, operation key and pinned processor version.
2. Resolve the current capture through the owner-scoped store; require current approval/consent and exact input hash/revision before every external submission, poll and final commit.
3. Define an injected processor contract with submit/poll/cancel-or-unavailable outcomes. Persist the processor's stable external operation reference and immutable input identity through the existing intent/effect evidence services. Scheduler status remains the job authority.
4. A claimed handler performs bounded submission/polling, then returns the existing `defer` outcome. Do not run a multi-minute reconstruction inside the current 60-second HTTP worker. Respect the existing deferred poll/time budget and live lease checks.
5. Lease/cancel authority must be checked before external admission and before durable completion. Persist provider admission/receipt identity so a lost response cannot silently submit a second paid operation. An unknown effect goes to the existing recovery/checkpoint path.
6. `workflowRegistry.server.ts`: extend the result union with a private scan-result type and add the handler only alongside a supported implementation. The production event contract remains disabled during fixture testing.
7. Forward migration, proposed suffix `property_scan_result_receipts.sql`: extend the existing shared result receipt with a strict versioned private scan payload/projection metadata and service-only mutation. Reuse `workflow_results` and live-lease completion; do not introduce a second run/job/step queue.
8. Freeze result UUID, operation, owner, input revision/hash, verified object identity, content hash/bytes, processor and fixture-versus-real provenance. Bind the completion RPC to the exact claimed job, workflow and user.
9. Commit the durable verified result through live-lease SQL **before** making Mongo output current. Mongo and Postgres are not one transaction; document and test the crash boundaries explicitly.
10. `propertyScanStore.ts`, `projectPropertyScanReconstructionResult`: accept only the trusted verified/committed receipt path, compare its frozen source and operation, preserve stale/revoked history, and make duplicate projection idempotent.
11. Add bounded receipt-to-Mongo reconciliation on the existing worker/tick path. If completion committed and Mongo failed, the next invocation projects the same immutable receipt. Keep delivery/projection acknowledgement separate from immutable receipt contents.
12. Replaying an old receipt after source invalidation may acknowledge historical delivery, but cannot restore current status. A different object/ID/hash for the same operation is rejected.
13. `startPropertyScanReconstruction` and reconstruct `POST`: once fixture orchestration exists, add a revision/hash request contract and owner/reviewer scope to intent persistence. Return 202 only for durably persisted accepted work; explain “awaiting dispatch” separately from “processor running”. Keep 503 when no permitted processor is configured.
14. Add a forward disabled event-contract row only with handler/version support. Acceptance may enable it inside a generated disposable database; production enablement is a later explicit release operation.
15. Acceptance covers crash after enqueue, after provider admission, after storage create, after SQL completion and before Mongo projection; lease expiry; cancellation; replaced consent/input; concurrent receipt replay; inaccessible media and provider errors.

Exit: fixtures prove one logical operation can recover all cross-store boundaries. Fixture geometry remains visibly fixture-only and cannot be published.

### R6 — Finish review, consent withdrawal and usable queues

Purpose: make the private workflow manageable by the owner and assigned reviewer.

1. `propertyScanStore.ts`, list helpers: add bounded keyset pages sorted by `(updatedAt, scanId)`; bind cursor to owner/actor scope. Make mock limits, ordering and continuation match real behavior.
2. Owner/admin list routes: accept validated cursor/limit and return `nextCursor`; preserve indexed deep-link reads. Mark queue summary counts page-local or use a separate scoped total.
3. `app/scan-studio/page.tsx`: move interactive code into `ScanStudioWorkspace.tsx` when introducing an authenticated server shell; keep a typed shared DTO rather than importing server-only stores into the client.
4. `app/admin/property-scans/page.tsx` and `ScanMediaGallery`: retain actual image/video inspection, editable feedback, no autoplay and renewal of exact asset URLs. Bind acknowledgement to the displayed manifest revision/hash and keep failed/inaccessible media visibly blocking review.
5. `scanAccess.server.ts`: document the configured global override, record its use with safe actor/scan audit metadata, and preserve explicit-grant checks. Grant/revoke remains owner revision checked.
6. New owner consent-withdrawal route: same-origin authenticated mutation, expected revision and consent-policy version. Atomically invalidate capture approval/artifacts, close new signed-link issuance and mark pending work cancelled/stale.
7. Reconcile any already-admitted scheduler operation through its existing cancellation API; handler revalidation prevents further admission. Already-issued URLs can remain valid until their documented expiry.
8. Store a retryable deletion/retention intent covering capture objects, derivatives and provider copies. A provider cancellation/deletion without confirmed evidence remains pending/unknown.
9. Integration/browser evidence: signed-in owner resume, assigned reviewer, unrelated realtor, configured override audit, expired renewal, revoked grant, stale approval and consent withdrawal while a job is pending/running.
10. Mobile evidence includes first camera permission, denied/late permission, background/foreground cleanup and per-file retry/cancel/finalize failures. Do not credit fake MediaStream tests as this real-device acceptance.

Exit: the owner can find old captures, correct information, revoke access/consent and understand pending cleanup.

### R7 — Select a real processor, then display its actual private model

Dependencies: R3–R6 and the operating platform's real capability/effect/cost controls.

1. Record a concrete processor choice, accepted capture input, private processing region/retention, polling/cancellation semantics and cost ceiling. Choose local self-hosted or hosted execution from actual compatible options when implementation begins.
2. Reuse shared `quotaBudget.server.ts`, provider quota and effect admission services. Add transactional storage-byte exposure for raw captures and derivatives alongside existing economic controls; do not treat per-session limits as the account's total storage budget.
3. Resolve owner/personal-workspace mapping through existing workspace access services before linking any shared reservation. Preserve a stable reservation identity across Mongo/Postgres handoff and reconcile orphaned holds.
4. Bound maximum open captures, aggregate stored/reserved bytes, output bytes, concurrency, estimated/actual cost and run duration. Production ceilings/retention are reviewed settings; test-only ceilings are not silently copied to production.
5. Implement the selected adapter against R5's submit/poll outcomes; download only pinned allowlisted provider output under byte/time limits; verify through R3/R4.
6. Run one explicitly consented real sample through the actual processor; record private result provenance, coverage/scale limitations, latency and cost. A valid empty GLB is not a successful home reconstruction.
7. New private artifact access route: resolve stored scan/artifact IDs and actor authority, require real current verified receipt, issue bounded private access and no-store response. Accept IDs, never a caller-supplied object path or URL.
8. Replace the preview page's legacy-only DTO with separate current real artifact, stale history and legacy demo views. Keep genuine unavailable/error states.
9. Implement/dynamically load a real GLB viewer with actual model bounds, reset/pan/zoom, request cancellation, geometry/texture disposal and WebGL/mobile fallback. Reject external texture/buffer fetches and resource-budget overflow.
10. Verify second-user denial, expired/revoked access, source replacement during load, actual mesh display, mobile memory/cleanup and inaccessible-output recovery.

Exit: one real privately stored model is inspectable under the current capture authority with actual economic evidence.

### R8 — Separate publication, withdrawal and retention

1. Add a strict publication contract containing exact artifact ID/hash/input revision, verified listing identity, audience and consent-policy version. Intake's `publicListingApproval` boolean remains legacy capture data and cannot satisfy it.
2. Reuse `platform_checkpoints` with an approval/effect-gate discriminant. Add the business adapter for exact artifact publication; do not create a parallel scan-approval subsystem.
3. At approval and final publication admission, re-read owner authority, current artifact, publication hash, listing mapping and policy. Persist immutable decision/effect receipt identity.
4. Publish only the explicitly approved derivative through existing listing/tour services. Keep raw captures private.
5. Implement unpublish/withdrawal and new-link denial; document already-issued URL/cache expiry. Mark revoked artifacts permanently ineligible for automatic republication.
6. Execute retention using R3's conditional removal and audited tombstones; confirm raw, derivative and provider-copy disposition separately. Retain minimal decision evidence without keeping interiors by accident.
7. Acceptance: owner inspection → separate approval → publication → withdrawal, plus stale artifact, duplicate effect, foreign owner, failed removal and unknown provider receipt.

Exit: a real listing derivative has a separate, recoverable publication decision and owner-controlled withdrawal.

### R9 — Useful durable property missions and communication recovery

This packet develops the original autonomous property vision. It may proceed alongside scans once shared capabilities/artifacts are supported; reconstruction is not a prerequisite for a research brief.

1. `lib/property-sprints/buildPropertyBacklog.ts` and `contracts.ts`: retain assignment kind, immutable property/source revision, supplied facts, missing fields and dependencies. Do not infer zoning/current price/property identity from advertising prose.
2. Add a reviewed declarative property-mission manifest using the existing app manifest/install services. Start with supported intake/question steps while `capabilities` remains restricted to an empty array.
3. Ask the operating platform capability executor to support the first approved sourced-research/draft tool through its existing policy/effect/receipt path before expanding manifest capability schemas. Do not bypass `z.array(z.never())` with casts.
4. `planPropertySprint.server.ts` and `sprintPlannerWorkflow.server.ts`: bind approval to frozen property revisions and existing transactional assignment creation. Queue only supported executors; unknown kinds remain visible and blocked.
5. Dispatch an assignment using the existing scheduler/run services and stable assignment-operation key. The browser's `SubmissionScheduler` stays an interactive limiter.
6. Store bounded research artifacts with source URL/date/provenance and uncertainty. Re-read property revision before projection; changed inputs make the output stale.
7. Use the existing checkpoint question API for missing facts. Jamie reads and proposes through shared services; the user can answer/edit against the same property record. Chat does not mint approval.
8. Show persistent assignment/run/artifact/checkpoint links on the shortlist and sprint card, with accepted output and failure states instead of a generic “agent assigned” completion claim.
9. Integrate agent email drafting with saved content/audience revision and R1's atomic claim. For paid/external send, connect existing effect receipts and recover an accepted-but-unrecorded provider result before retry.
10. Manual retries retain operation/provider idempotency identity. “Send to all eligible” presents the frozen eligible audience and exclusions; consent or policy change requires renewed approval.
11. Only after that acceptance add booking-backed showing reminders. Realtor dues/deadline reminders already have a different domain handler and do not prove booking create/reschedule/cancel behavior.
12. Measure an explicitly bounded two-workflow pilot: accepted briefs/drafts, questions resolved, response time, costs, support overhead and actual inquiries/bookings. Add GitHub/CRM backlog sources after ownership and import idempotency are accepted.

Exit: an approved property mission survives navigation and returns usable sourced work/questions for owner/Jamie review. Approval and cost evidence remain visible.

### R10 — Close original agent-workspace parity

1. `command-center/page.tsx`: inventory classic `intake` and `command` entry contracts. Keep the fallback until equivalent workspace behavior is accepted.
2. `useAgentCommandRun.ts`: preserve immutable retry requests and uncertain-delivery messaging; use server operation identity if the command backend later provides it.
3. `AgentResults` and extracted command-result components: verify sources, deliverables, listing edits/handoff, supervisor feedback, supported actions and trace export per selected run. Reuse existing handlers rather than duplicating them.
4. `JamieAudioContext` and workspace hooks: confirm account change/removal/pause/TTS/late permission cannot start an obsolete command or leak another account's settings.
5. Extend the existing browser spec at 1440/900/390px with entry/action parity and unsaved draft restoration. Its mocked SSE remains transport/UI evidence.
6. Record real-device microphone and signed-in user acceptance separately. Do not remove the classic surface or globally silence hydration failures as a shortcut.

Exit: the default workspace supports the retained workflows and ordinary users can understand where unattended missions versus interactive commands live.

## 5. First next implementation timebox

Five hours is a working allocation, not a commitment to complete every later packet.

| Time | Work | Evidence |
| --- | --- | --- |
| 00:00–00:20 | Confirm branch, current uncommitted files, reviewed declarations and target tests | Preserved baseline and packet-specific scope |
| 00:20–01:20 | R1 exact-revision email claim and conflict handling | No-provider regression plus overlapping edit/claim database evidence |
| 01:20–02:50 | R2 actual-intent bound, mock parity, stale acknowledgement and shared failure isolation | Multiple-intent limit and optional-outage regressions; Mongo race |
| 02:50–04:15 | R3 bounded-read/cleanup contract and full-envelope validation | Oversize/error/replay/conditional-capability regressions |
| 04:15–05:00 | Review affected callers, run focused checks and update the one handoff | Exact exits, carryover and next dependency-ready packet |

If real database acceptance cannot run, continue independent source correctness and record the specific unrun gate. The next packet after those fixes is R4's concrete disposable service and adapter, not another plan rewrite.

## 6. Verification and integration discipline

Existing commands from `apps/pulse`:

```powershell
npm run test:unit -- tests/unit/local-property-scan-artifact-store.test.ts tests/unit/property-scan-artifact-store.test.ts tests/unit/property-scan-artifact-integrity.test.ts tests/unit/property-scan-job-reconciler.test.ts tests/unit/scheduler-events.test.ts tests/unit/durable-scheduler-scan-relay.test.ts
npm run test:unit -- tests/unit/agent-workspace-command.test.tsx tests/unit/agent-workspace-races.test.tsx tests/unit/agent-workspace-attention.test.ts tests/unit/licensed-hotlist-delivery.test.ts
npm run test:db:concurrency
npm run test:db:mongo
npm run test:scans:storage
git diff --check
```

- `test:scans:artifacts` and the new S3 suite are proposed in R4; do not execute/claim them before adding them.
- Run relevant build/type validation for source/DTO/registry changes. A docs-only review does not require a production build.
- Keep DB/Storage acceptance in generated disposable projects. Do not reset/migrate the persistent local Supabase stack to obtain test results.
- Browser and Next build runs share build artifacts; serialize conflicting commands. Capture exact authenticated success/error paths, not a loading screenshot.
- Use the existing route-catalog/README tests if adding routes. Update access labels and accessible-path documentation together.
- Distinguish simulated transport/provider faults from actual backend races and live provider results.
- Scan/request error mapping: malformed request 400; inaccessible/foreign object 404; stale revision 409; absent capability 503; unexpected errors sanitized. Apply no-store to private responses.
- Production migrations, provider credentials/spend, publication, email sends, merge and deployment use their explicit operational authority. Routine local implementation and disposable fixtures do not need another product decision.

## 7. Production decisions to prepare concretely

Prepare reviewable adapters/configuration/evidence before requesting activation. These decisions do not block R1–R6 fixture work:

| Decision | Information required before activation |
| --- | --- |
| Private production artifact backend | Actual conditional-create/read/removal support, private-access design, costs, region, durable hosting and backup/restore |
| Storage allowance | Raw + derived + reserved-byte ceilings per workspace/owner and whole account; maximum object/open captures; no assumption that the existing 1 GB hosted allowance can support unlimited sessions |
| Processor | Supported capture geometry, privacy/retention, operation identity, timeout/cancellation, output limitations and a real consented sample |
| Economic ceilings | Concurrent operations, per-run duration/cost, workspace exposure and actual cost settlement |
| Retention/deletion | Raw/derivative/provider-copy periods, owner withdrawal behavior, guarded removal and recoverable evidence |
| Publication/audience | Exact derivative/listing/consent binding and authorization for the actual external action |

Existing capture bucket MIME and 75 MiB policy does not admit GLB. Any future bucket/policy change is separately reviewed; local disposable storage testing needs no hosted expansion.

## 8. Implementation handoff

<a id="137-luna-implementation-handoff"></a>

### 13.7 Luna implementation handoff

| Field | Current value |
| --- | --- |
| Review date / baseline | September 30, 2026; `d84a9091` plus the existing dirty working tree |
| Current request delivered | Code/plan review and revised plan; complete prior document archived with relative links rebased |
| Next authorized implementation slice when requested | R1 → R2 → R3 in the first timebox; then R4 disposable S3 acceptance |
| Fresh evidence | 10 existing focused unit files / 51 tests passed; `git diff --check` passed; current-plan local links/anchors checked |
| Current source risk | F1 draft approval revision race; F2 actual-intent bound; F3 optional scan error propagation; F4 stale/mock acknowledgement; F5–F7 artifact trust boundary |
| Storage/processor state | Local artifact adapter exists; no S3 adapter or disposable S3 harness; no active reconstruction processor/event handler/admission |
| Output status | Real reconstruction, current private model viewing and separate publication remain unimplemented |
| Git / release | This review is local and uncommitted; no PR mutation, live migration, provider call or deployment |
| Next checkpoint contents | Packet, changed source symbols, exact acceptance commands/counts, remaining gaps and next packet; replace this row/table in place |

Ready-to-use implementation instruction:

> Read this plan's current handoff and R1–R3, plus their direct source/callers. Preserve the working tree. Repair atomic email revision claiming, bound/isolate the scan relay, and strengthen the artifact storage/read/validation contract. Run the packet's meaningful existing and new regressions, record real fixture evidence separately, then continue with R4's isolated S3 acceptance when dependency-ready. Reuse the current scheduler, JSON run/checkpoint services and approval boundaries. Keep fixture output labelled and production processor/event/publication activation subject to their explicit decisions. Do not spawn subagents or reimplement accepted S5/S6 foundations.
