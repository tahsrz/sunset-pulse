# Content Publication Readiness

Prepared October 28, 2026. Branch: `codex/publication-readiness`. Base: [PR #90](https://github.com/tahsrz/sunset-pulse/pull/90) at `48503dd83f289e6024c2f7f14b73c0608b1d43d2`.

## Delivered

Plan group F's readiness tooling, section 4A, is implemented. `/admin/marketing/readiness` shows the seller introduction and the three existing neighborhood guides. Marketing Content links to it. Each item has separate required content, optional improvements, evidence warnings and an expandable review checklist with the exact repository files. Only published items have public preview links. Westlake uses the existing `westlake-overview` slug.

The read-only `/api/admin/marketing/readiness` route reuses `requireMarketingCopyAccess`. Anonymous callers, ordinary realtors and consumers cannot read the report. Administrators, operators, explicitly configured operator emails and the existing local-development access decision retain access. Successful and denied responses are private and not cached. The response contains only bounded readiness fields, not the underlying identity, contacts, biographies or source records.

The report validates existing repository content through the seller and guide loaders. Guide validation now happens during reads rather than at module initialization, so schema failures can become an unavailable check. Public draft filtering, inclusive evidence expiry and place/map omission remain in place. One shared evidence helper serves public loaders and readiness assessment.

Public guide pages depend on the whole guide collection and presentation collection. If either shared source fails, all guide checks are unavailable. This avoids marking an individually valid record healthy when its shared public loader cannot complete. Seller-source failures remain separate. A valid empty presentation collection means optional visual content is absent; it does not make the published text guides drafts.

The client distinguishes Published, Needs Content and Could Not Check, validates the response, clears old results during refresh, and aborts/ignores work after unmount. A failed read offers a deliberate retry. The page cannot save or publish content.

## Current Repository Content

- Seller introduction: draft. Approved public identity, biography, main-site contact and review are required. A portrait is optional.
- Old Town Keller, West Bursey Ranch and Westlake: published text guides with current evidence at the test date. Photography, places and maps are optional improvements.
- The neighborhood presentation collection is empty. No approved seller identity, response contact, portrait, neighborhood photography or local note was invented or published. KCD's contact remains separate.

Sections 4B and 4C remain pending approved content. The checks validate schema and expiry, not photo licensing, file existence, source accuracy, contact routing or deployment health. Those require review before publication. Changing a status field alone is not proof of approval.

## Verification

- 52 tests passed across seven focused contract, real-loader, authorization, UI and existing marketing/guide regression suites.
- The tests cover optional media, visual drafts, partial and complete evidence expiry, missing place evidence, shared-source failure, sanitized errors, response redaction, global access rules, malformed responses, retry and unmount cancellation.
- The marketing draft editor regression was rerun separately after adding an explicit async `act` boundary for the new navigation link. All five cases passed without the earlier React act warning.
- Next route type generation, full application TypeScript and focused ESLint on all changed TypeScript/TSX source and tests passed.

No production build or browser/deployed walkthrough was performed. No Supabase schema, storage files, database records, cron jobs, scheduler settings or publishing flags changed. Pending hosted CI was not awaited.

## Operator Walkthrough

1. Sign in with global marketing access. Open `/admin/marketing`. Download any edits before leaving the editor, then select **Check Content Readiness**.
2. Confirm the seller introduction shows **Needs Content**, while the three text guides show **Published**. Optional photography must not appear under required publication content.
3. Expand **Review Seller Introduction**. Prepare the approved public name, short biography and main-site phone or email in `content/marketing/seller-introduction.v1.json`. Confirm the contact against the actual seller response configuration. A portrait, if supplied, needs a local WebP, alt text and intrinsic dimensions.
4. Expand **Review Old Town Keller**. Update the guide and matching `presentation.v1.json` record through a reviewed change. Use licensed photos with captions/credits, current evidence IDs, valid place coordinates and an approved author/visit date for any personal note. Text publication does not require a map or photos.
5. Run the focused content tests and review the resulting public pages at mobile and desktop widths. Publish only the approved change through the normal PR and deployment flow. Use **Refresh Checks** after deploying it.
6. As a negative authorization check, a non-operator realtor must receive 403 from the readiness endpoint. The page must show an access message and no report. A failed source should show **Could Not Check**, not a list of fabricated missing fields. Retry after repairing the source.

## Next Work

Collect the approved content for sections 4B/4C. Independently inspect the existing scheduling authority, configured calendar/event type and all booking writers before selecting a consultation adapter. The implementation must reuse existing reservation, reminder and cancellation infrastructure and prove an interval-level concurrency invariant before activation.
