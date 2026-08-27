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

