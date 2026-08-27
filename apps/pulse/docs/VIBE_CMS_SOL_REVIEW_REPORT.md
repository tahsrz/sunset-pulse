# Vibe CMS — Sol Review Report

Date: 2026-08-27  
Branch: `codex/vibe-cms-baseline`  
Scope: first Vibe CMS vertical milestone and its Launch Kit/public-runtime integration

## Executive decision

The CMS feature implementation is code-complete for the planned vertical milestone. The branch is ready for Sol’s implementation review. It is not yet merge-complete because two release gates remain: the PR must be accepted as a CMS-scoped diff, and the deployed operator-to-public verification record must be completed.

## Decisions made, line by line

1. Vibe content is represented as structured draft data rather than an unbounded document. This keeps visual tokens, voice configuration, and source metadata addressable and testable.
2. Draft edits remain mutable only in the draft payload. Published revisions are immutable snapshots.
3. Submission creates a new immutable `VibeRevision`, records its revision number, and moves the Vibe to `in_review`.
4. Submission stores `submittedRevisionId` on the Vibe so publication cannot silently choose a different draft.
5. Publication requires the Vibe to be `in_review` and requires the submitted revision to exist and be unpublished.
6. Publication creates the published snapshot and updates the Vibe’s published pointer in the same Mongo transaction as the `published` audit event.
7. Saving after publication returns the Vibe to a mutable draft state while preserving the existing published revision and live-site pointer.
8. A later editorial cycle therefore cannot mutate or retroactively rewrite the prior live revision.
9. Site application accepts only a published revision and writes the active site pointer plus actor and timestamp.
10. Public site hydration resolves the final site row through the shared Mongo/Supabase freshness policy. This prevents a stale Supabase projection from masking a newer Mongo application pointer.
11. A focused dual-store test documents the case where both stores contain the same site and Mongo has the newer applied pointer.
12. Public hydration maps published CSS variables into the site runtime and maps the published primary voice tone into the assistant profile.
13. The operator apply screen requires an explicit site ID and revision ID and displays the current application result.
14. Preview remains authenticated and draft-only; the server-side request forwards the operator cookie context to the protected preview endpoint.
15. Create, reject, archive, trash, and restore now write their lifecycle audit event in the same Mongo transaction as the state mutation.
16. Conflict responses are preserved when a concurrent state change prevents the expected transition.
17. Rollback creates a new revision derived from an older snapshot; it does not mutate historical revisions.
18. Deferred expansion remains out of scope: taxonomy growth, media management, scheduling, webhooks, import/export, block composition, and broad security redesign.

## Relevant local commits

- `12350905` — operator site application screen
- `127b1702` — public site pointer resolution and dual-store coverage
- `57778476` — transactional archive audit
- `6d084930` — transactional reject/trash/restore audits
- `7f5d25c1` — transactional Vibe creation audit
- `154d98db` — baseline release-status context
- `375cadd4` — release evidence handoff fields
- `25312c1e` — Sol review gate

## Review questions for Sol

1. Is the existing PR diff acceptable, or must unrelated historical changes be isolated before merge?
2. Does the freshness rule represent the intended production datastore authority, or should one store become the sole writable authority?
3. Do the transaction boundaries preserve the existing route contracts and deployment capabilities?
4. Does the manual verification evidence satisfy the first vertical milestone?

## Required production evidence

Record the PR head SHA, disposable Vibe ID, site ID, submitted revision ID, published revision ID, pre- and post-apply pointers, applying actor/timestamp, public `data-vibe-revision-id`, computed CSS variables, assistant tone, second-cycle revision IDs, rollback revision ID, and restored original pointer. Include deployed URL, UTC timestamps, and pass/fail results for every checklist step.

## Known verification limits

Automated checks previously passed, but the local focused Vitest invocation encountered an environment access/config-resolution error. No production session is available to this review, so deployed preview, public hydration, second-cycle isolation, rollback, and restoration remain manual gates.

## Recommendation

Sol should review this report together with `VIBE_CMS_LUNA_BASELINE.md`. Approve implementation scope only after the four review questions are answered. Merge only after the PR diff decision and the complete production evidence record are attached.

## Luna Remediation Execution Plan

Execute these tickets in order. Keep every commit narrowly scoped and remain on the current PR branch. Do not add unrelated security, platform, taxonomy, media, scheduling, or CI work.

### L1 — Make publication authorization atomic

Files: `lib/cms/vibeService.ts`, `app/api/admin/vibes/[vibeId]/publish/route.ts`, focused CMS service tests.

1. Change `publishVibeRevision` to accept the expected submitted revision ID rather than accepting an arbitrary draft from the route.
2. Inside the existing Mongo transaction, load the Vibe and require `status === 'in_review'`.
3. Inside that transaction, require `vibe.submittedRevisionId` to equal the expected revision ID.
4. Load the submitted revision by `_id`, `vibeId`, and `tenantId` using the same session.
5. Reject missing, already-published, or mismatched submitted revisions.
6. Parse the snapshot and run publish validation inside the service boundary.
7. Create the published revision, audit event, and Vibe pointer update in the same transaction.
8. Update the route to pass only the expected submitted revision ID, actor, and change summary.

Acceptance: a save, reject, or second submission occurring between the initial request and transaction cannot cause an obsolete snapshot to publish. Add success, stale-ID, wrong-status, and missing-revision tests.

### L2 — Establish one active-pointer authority

Files: `lib/cms/vibeService.ts`, `lib/sites/siteConfigStore.ts`, `lib/sites/siteData.ts`, `lib/sites/launchKit.ts`, focused site-store tests.

1. Treat Mongo `SiteConfig.activeVibeRevisionId` and its applied metadata as authoritative for Vibe application unless Sol explicitly selects Supabase instead.
2. Add a focused read helper that resolves the active Vibe pointer from Mongo by canonical agent ID.
3. Continue using the freshest complete row for general Launch Kit fields, but overlay the authoritative Mongo Vibe pointer and applied metadata before public hydration.
4. Do not let a newer unrelated Supabase `updated_at` replace an existing authoritative Mongo pointer.
5. Preserve fallback behavior when Mongo is unavailable or has no pointer.
6. Keep Supabase serialization compatible, but do not create a second independently writable pointer authority.

Acceptance: tests cover Supabase-newer/Mongo-pointer-present, Mongo-newer, Mongo-pointer-absent, and Mongo-read-failure cases. In every successful authority case, public hydration resolves the expected published revision ID.

### L3 — Complete the operator application UI

Files: `app/admin/vibes/[vibeId]/apply/page.tsx`, supporting admin APIs or server components, revision/status endpoint tests.

1. Load the current Vibe and its published revisions from authenticated server-side data.
2. Replace free-form revision entry with a selection limited to published revisions belonging to the route’s `vibeId` and tenant.
3. Load or explicitly confirm the target Launch Kit site through the authorized site-status endpoint.
4. Before confirmation, display Vibe title/ID, revision number/ID, site ID, current pointer, current applying actor, and current timestamp.
5. After application, display the returned pointer, actor, and timestamp from the server response rather than constructing a success string locally.
6. Add a direct workflow link from the editor or published revision history.
7. Preserve keyboard labels, alert/status roles, loading state, and mobile layout.

Acceptance: an operator cannot select a revision belonging to another Vibe, and the complete apply flow requires no browser-console request or copied hidden ID.

### L4 — Make rollback publication and auditing atomic

Files: `lib/cms/vibeService.ts`, `app/api/admin/vibes/[vibeId]/rollback/route.ts`, focused rollback tests.

1. Add a dedicated rollback service method rather than calling the normal publication service and writing a second audit afterward.
2. In one Mongo transaction, verify the source revision belongs to the Vibe and tenant, validate its snapshot, allocate the next revision number, create the new published revision, update the Vibe published pointer/status, and create both required audit semantics.
3. Record the source revision ID and required reason in rollback metadata/audit data.
4. Return success only after the entire transaction commits.

Acceptance: simulated audit failure leaves no new revision and no changed Vibe pointer; successful rollback produces an immutable new revision and traceable source ID.

### L5 — Reconcile the PR diff

Do not delete or rewrite unrelated work blindly. Produce a reviewed changed-file inventory against `origin/main` and classify every file as CMS-required, explicit compatibility dependency, documentation, or unrelated. Present the unrelated set to Sol/Taz for a branch-history decision. Only isolate or revert files after that decision.

Acceptance: every retained file has a written justification tied to the first vertical milestone; the 353-file diff is either reduced or explicitly accepted by the product owner.

### L6 — Verification and handoff

Run focused unit/type checks for L1–L4, then execute the existing production evidence checklist. Record exact revision IDs, site pointers, actors, timestamps, CSS variables, assistant tone, second-cycle isolation, rollback, and restoration. Update this report with pass/fail evidence and the final PR head SHA.

Acceptance: all automated focused checks pass, the production checklist is complete, the controlled site is restored, and Sol has no unresolved P0/P1 finding.

### Luna completion rule

Do not declare the CMS merge-ready after code changes alone. Completion requires L1–L6, a clean working tree, a reviewed PR file inventory, and recorded production evidence. Stop for a product decision only at L2 pointer authority or L5 unrelated-diff disposition.
