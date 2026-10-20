# Main Site Execution Plan

Prepared October 19, 2026.

Implementation specification: [Main-site next steps](./main-site-next-steps-implementation-plan-2026-10-19.md).

This document turns that specification into a work queue. It defines delivery order, branch boundaries, evidence, and completion rules. The specification remains the source for proposed code and contracts. One agent performs the work sequentially. No subagents or separate autonomous chats are involved.

Status: implementation prepared locally on `codex/main-homepage-composition` from `origin/main` at `31c9571e`. No production writes, migrations, or schedules have been created.

## Delivery Strategy

Deliver the six workstreams through seven focused PRs. The optional booking flow has its own PR because it changes server contracts and scheduling behavior. Homepage composition and the initial interactive loading change ship together.

| Delivery | Proposed branch | What a reviewer can use |
| --- | --- | --- |
| PR 1 | `codex/main-homepage-composition` | Reordered homepage, architecture page, optional experience launchers |
| PR 2 | `codex/main-personal-introduction` | Approved personal introduction, or an unpublished component awaiting approved content |
| PR 3 | `codex/main-seller-examples` | Readable seller-plan sample and pricing-review entry point |
| PR 4 | `codex/main-seller-request-steps` | Three-step request with preserved retry behavior and saved confirmation |
| PR 5 | `codex/main-neighborhood-guides` | Richer existing guides, reviewed photos/places, requested map loading |
| PR 6 | `codex/main-seller-consultation-booking` | Verified availability and booking using the existing seller lead |
| PR 7 | `codex/main-marketing-performance` | Measured performance improvements and complete journey evidence |

These are planned names, not existing PR numbers. Check branch/PR state before creating each one. Reuse an appropriate active PR when authorized and its scope still matches.

Start each branch from current main after its prerequisite PR has merged. If work continues while review is pending, explicitly base the next branch on its dependency and record that relationship. Once the prerequisite merges, update the dependent base and verify that its diff contains only the new work.

## Phase 0: Establish the Baseline and Dependencies

Complete these five tasks before changing runtime code.

| ID | Action | Required output |
| --- | --- | --- |
| 0.1 | Inspect current Git status, applicable repository instructions, active PRs, and latest main | Recorded starting SHA; existing user edits preserved |
| 0.2 | Compare current code with specification sections 2–3 | Short drift list; changed paths/contracts corrected before edits |
| 0.3 | Capture homepage, seller page, and one existing guide at desktop/mobile widths | Before screenshots and existing error notes |
| 0.4 | Record production-build initial requests and available bundle/performance evidence | Comparable baseline, distinguishing development-only behavior |
| 0.5 | Inspect the configured scheduling authority and inventory approved content | Dependency register: available, missing, or unverified |

For 0.5, determine the actual event type, resource/calendar owner, availability path, reservation path, timezone policy, and reminder lifecycle. Read configuration and contracts without exposing credential values. The existence of the scheduling application does not prove that a production calendar is connected.

Record content separately: seller contact identity, portrait, approved biography, public contact destinations, neighborhood photos, and an authorized property example. KCD contact details remain specific to KCD.

**Exit:** the first implementation branch can be created with a known baseline. Missing images or booking configuration do not block unrelated implementation.

## PR 1: Homepage Composition and Experience Loading

Specification: sections 4 and 9.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 1.1 | Extract `CounterScanActions`; inventory links from sections leaving the homepage | Same destinations, bottom placement, server-derived access behavior |
| 1.2 | Create `/how-it-works`; relocate architecture content; update footer/sitemap and used anchor references | Working route with a coherent heading hierarchy and ordinary inbound navigation |
| 1.3 | Build static experience previews, explicit launch/close behavior, and error boundary | Scene runtime/data starts after launch; direct navigation remains usable |
| 1.4 | Recompose `app/page.tsx`; show four curated properties first; preserve a path to live search | One h1; compact listing behavior; unavailable data isolated to its section |
| 1.5 | Update homepage acceptance expectations and capture the result | Desktop/mobile screenshots, keyboard checks, initial-request comparison |

The introduction, new seller examples, and guide previews are inserted as their later modules become available. PR 1 must compile without importing unimplemented modules from the specification's final composition example.

Keep a usable interim homepage. For example, retain the existing seller value-proposition section until PR 3 replaces it. Use actual product captures for scene previews when available; ordinary link cards are sufficient while captures are pending.

Inspect `VirtualWorldHub`'s public destinations before exposing an inline homepage version. If its subset refactor would broaden this PR, launch only the reviewed public experience and retain ordinary public links for the rest. Record the remaining inline world-map task for PR 7.

**Exit:** a visitor can navigate the new order, reach technical content, browse properties, and launch optional content deliberately. KCD and standalone experiences still render. Required checks pass.

## PR 2: Personal Introduction

Specification: section 5. Depends on PR 1's composition.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 2.1 | Add strict profile schema, server loader, and draft content record | Draft content omitted from public rendering; published fixtures validate |
| 2.2 | Build the introduction and contact presentation; integrate its conditional slot | Correct heading style, portrait sizing, email/telephone links |
| 2.3 | Add approved identity/content, optimize the portrait, and publish the record | Actual approved contact matches the seller-response configuration |

If approval or the portrait is missing, finish 2.1–2.2, keep the record draft, document 2.3 as pending, and move to PR 3. An unpublished component is implementation progress; it is not a completed public personal introduction.

**Exit:** the component is reviewable and its publication state is explicit. Public launch requires completion of 2.3.

## PR 3: Seller Examples

Specification: section 7. Depends on PR 1; it can proceed while PR 2 awaits content.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 3.1 | Add example-content schema/loader and the preparation-plan sample | Readable server-rendered example with no private client data |
| 3.2 | Add pricing-review explanation and allowlisted request-kind preselection | Pricing link selects `pricing_review`; direct visits retain the existing default |
| 3.3 | Replace homepage card usage; reuse the sample on the seller page; add approved photo if available | Concrete seller content and no duplicated long checklist |

Review the sample wording with the service owner before publishing it as an example of the offered process. An unavailable property photograph blocks only that optional panel. Avoid inventing sale outcomes or a testimonial to fill the space.

**Exit:** visitors can inspect an example before sharing contact information, and its pricing action reaches the correct existing request type.

## PR 4: Visual Seller Request

Specification: section 6, Part A. Depends on PR 3's preselection behavior.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 4.1 | Extract typed request state and payload construction | Earlier-step choices remain in the strict existing API payload |
| 4.2 | Build accessible radio cards and Help → Timing → Contact navigation | Keyboard operation, Back retention, progress text, deliberate focus movement |
| 4.3 | Integrate submit validation, in-flight protection, and stable retry identity | Identical uncertain retry reuses UUID; edited details rotate it |
| 4.4 | Add saved confirmation; preserve separate response/marketing consent and optional measurement | Saved status reflects the API result; Continue actions do not count as requests |
| 4.5 | Extend existing unit/route coverage and exercise the full browser journey | Valid payload, failed-save retention, successful save, preselection all verified |

Retain `form#request`, current offer identity/version, the existing backend host/origin/body/rate-limit protections, and server-resolved tenant routing. Keep contact data in form memory. Keep booking UI absent until PR 6 establishes its capability.

**Exit:** the new visual flow uses the existing intake correctly and confirms a saved request without implying an appointment exists.

## PR 5: Neighborhood Presentation

Specification: section 8. Depends on PR 1's composition, using current guide records.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 5.1 | Add presentation schema and source-aware join to published guides | Existing text-only guides remain valid; draft/unknown source data is rejected or omitted appropriately |
| 5.2 | Build guide cards/article layout and homepage preview | Stable URLs, accurate review dates, captions/credits, responsive presentation |
| 5.3 | Add requested map loading using checked coordinates and a textual places list | Map requests begin after launch; expired pins and facts disappear together |
| 5.4 | Add available approved assets; verify full/missing/expired/map-failure states | Useful guide without map/photos; richer view where approved material exists |

Publish content incrementally by existing guide slug. Start with one complete guide, verify it, then populate the other two through the same schema/components. A second guide should primarily require reviewed content rather than another page implementation.

**Exit:** guide functionality is complete, with a per-guide inventory of published and pending assets. Photo-led publication remains incomplete for any guide still missing approved photos.

## PR 6: Seller Consultation Booking

Specification: section 6, Part B. Depends on PR 4 and a verified scheduling authority from task 0.5.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 6.1 | Implement the adapter for actual availability/reservation; review all conflicting booking writers | Available slots derive from the configured authority; one shared reservation invariant |
| 6.2 | Add narrowly required transactional/schema changes and disposable acceptance coverage | Concurrent attempts cannot reserve one slot twice; idempotent retry returns the original reservation |
| 6.3 | Extend internal seller save/replay receipt and add scoped booking capability | Same saved lead reused; tampering, expiry, purpose, tenant, and current state validated |
| 6.4 | Add bounded same-origin availability/booking routes | Clear conflict/expiry/unavailable outcomes; no raw provider error exposure |
| 6.5 | Build the slot picker and confirmed reservation presentation | Correct absolute time/timezone, revalidation after conflict, saved request survives booking failure |
| 6.6 | Connect durable reminder intent and run the complete reservation/retry lifecycle | One booking, attendee, and reminder intent; retry/cancellation/consent behavior verified |

Resolve the active authority before writing provider-specific code. If it is unavailable, finish the adapter contract and independent request/confirmation work, document the exact missing connection, and continue to PR 7. Keep this delivery marked incomplete until real booking is verified.

Reuse the existing scheduler, booking lineage, and reminder lifecycle. Any additional workflow admission or schema change must be part of this PR's explicit diff and verification. A browser timer or a new unrelated cron is not an appointment reminder implementation.

**Exit:** a disposable/sandbox end-to-end run proves that a saved seller request can reserve a real available slot once, including replay and conflict cases. Production activation follows verified environment mapping and deployment configuration.

## PR 7: Performance and Integration Finish

Specification: sections 9, 11, and 13. Runs against completed visual stages; booking-specific checks run when PR 6 is ready.

| ID | Implementation task | Completion evidence |
| --- | --- | --- |
| 7.1 | Compare current homepage/guide request and bundle behavior against baseline | Scene/map loading is deferred in actual network/build evidence |
| 7.2 | Refine only measured provider/scene overhead; finish reduced-motion, abort, and cleanup behavior | Repeated open/close, failure, reduced-motion, and standalone-route checks |
| 7.3 | Run combined visitor journeys; complete responsive screenshots and publication inventory | All completed workstreams have review URLs, results, and explicit remaining dependencies |

Use a consistent production-build/mobile profile for before/after measurements. Separate lab evidence from field metrics. Keep global branding, tenant routing, compliance, and auth behavior intact when adjusting provider boundaries.

**Exit:** measured evidence supports the performance change, the integrated journeys pass, and incomplete content/booking tasks remain visible rather than being reported as finished.

## Shared Completion Rules for Every PR

1. Inspect the diff against the intended base; remove unrelated edits.
2. Run targeted lint/typecheck and behavior tests appropriate to that slice.
3. Verify the visitor journey in a browser, including its relevant failure state.
4. Check desktop and phone layouts; use 320 px for narrow-screen regressions.
5. Confirm typography/casing matches the established main-site rules.
6. Include a concise PR description with behavior, review URLs, real validation, and remaining dependencies.
7. Inspect current CI and deployment results after pushing. A local test pass does not establish preview/deployment success.
8. Attach the created PR to this chat and update the task record.

For local validation commands, use the exact targeted suite appropriate to the changed files from specification section 11. Run booking mutations only against the intended disposable/sandbox environment. New tests should verify a real behavioral invariant, not duplicate static markup.

## Progress Tracking

Current implementation record (October 19, 2026):

```text
Task: 1.1–1.4, 2.1–2.2, 3.1–3.3, 4.1–4.5, 5.1–5.4, 7.1–7.2; 7.3 in progress
State: seller attribution now survives homepage and pricing links; an integrated browser journey covers form navigation, retry, consent, and saved confirmation
Branch/PR: codex/main-homepage-composition / https://github.com/tahsrz/sunset-pulse/pull/87
Commit: `d4e05654` (latest PR head before the seller attribution follow-up; includes Atlas failure recovery test and publication inventory)
Checks: GitHub Actions run `39346154825` passed all six jobs on head `5295d555`; the responsive homepage E2E passed and its four viewport screenshots and resource-waterfall report are available in the `homepage-responsive-screenshots` artifact. The report records one deferred Next.js chunk loaded when Atlas opens; repeat open/close restores focus. On `706dc43b`, the focused Atlas unit tests pass (6 tests), as do ESLint, TypeScript, and `git diff --check`. The seller campaign-query unit test passes (3 tests); ESLint and TypeScript pass for the attribution change, and Playwright discovers both homepage tests plus the new integrated seller-plan journey. The local browser runner cannot bind its app-server socket in this workspace, so these E2E scenarios have not been executed locally.
Performance evidence: matched Vercel builds for `main` (`31c9571e`) and the PR (`4f57fe58`) both used iad1 with 4 cores and 8 GB. The homepage route changed from 12.1 kB to 9.44 kB, and first-load JS from 168 kB to 166 kB; shared JS is 110 kB in both. These measurements predate the final small listing fixes. The local optimized build did not complete in the command runner.
Preview review: authenticated desktop browser review confirmed Atlas open/close, seller request progression through steps 1–3 without submitting, and the neighborhood guide index. The live feed previously showed eight sample listings from FL/NC/SC; the provider guard now yields the honest empty state on the preview until a Bridge or Repliers record is available. The latest reviewed preview returned 200 and showed the curated listing in a centered single-column card with the price badge on its photo. CI passed horizontal-overflow checks and produced screenshots at 320, 390, 768, and 1440 px; no new Vercel preview is planned for this follow-up.
Dependency: 2.3 awaits approved identity, biography, portrait, and public contact; 5.4 awaits licensed photos and checked map coordinates/places; PR 6 awaits a configured availability and reservation authority
Next: wait for approved seller identity/contact, licensed neighborhood imagery and verified coordinates, provider-backed listing data, and a confirmed booking authority; retain the exact visitor journeys as regression coverage
```

The code is grouped in one working branch across the homepage, optional seller introduction, seller examples, stepped seller request, neighborhood presentation, and deferred interactive loading. This combines work that was initially planned as separate PRs so its route and data contracts can be reviewed together. The PR will clearly call out publication and booking dependencies. The map schema and launcher are implemented, but no area map or photo is published because no reviewed coordinates or licensed images are present.

### Publication inventory

This inventory reflects the checked-in content records and publication gates. A `published` guide is a source-linked text guide; it does not mean its optional presentation assets are ready.

| Surface | Current state | Review path | Remaining input before richer publication |
| --- | --- | --- | --- |
| Main homepage | Published | `/` | Curated property slots depend on verified listing records; seller introduction is intentionally omitted while its profile remains draft. |
| Old Town Keller guide | Text guide published; no presentation record | `/neighborhoods/old-town-keller` | Licensed area photos, verified place coordinates, captions/credits, and reviewed local note. |
| West Bursey Ranch guide | Text guide published; no presentation record | `/neighborhoods/west-bursey-ranch` | Licensed neighborhood photos and verified place coordinates; avoid implying subdivision boundaries or property-specific school assignment. |
| Westlake overview | Text guide published; no presentation record | `/neighborhoods/westlake-overview` | Licensed area photos and verified place coordinates; keep city-level claims distinct from property-level facts. |
| Seller introduction | Draft; not rendered publicly | `/` (module appears only after publication) | Approved display name, biography, and at least one public contact method; portrait is optional. |
| Live listings | Source-gated; honest empty state when no verified provider records exist | `/` then select the live feed | Ingest records with Bridge or Repliers provenance and current inventory data. |
| Public consultation booking | No availability picker | Existing booking routes are not an availability source | Confirmed calendar and reservation authority, then implement a read-only availability journey before accepting a slot. |

Current content audit: three guide records are marked published and reviewed `2026-09-30`; `presentation.v1.json` contains zero records; `seller-introduction.v1.json` is draft; the seller profile asset directory has no approved portrait; no neighborhood photo assets are checked in. This keeps page completeness separate from content readiness and gives each follow-up a specific review target.

**Rendered review update (October 19, 2026):** The authenticated PR preview rendered at desktop size. The Atlas panel opened and closed, the seller request progressed through all three steps without submission, and the neighborhood guide index loaded. Review exposed that the live feed returned eight out-of-state sample records and the single curated card appeared narrow with its price badge covering the address. The API now requires an explicit Bridge or Repliers provider, and the one-card grid uses one centered column with the price badge placed on the photo. The preview showed the empty state when no provider-backed listings are available and rendered the curated card at full width. CI run `39346154825` passed the public guide and homepage browser tests, checked horizontal overflow at 320/390/768/1440 px, restored focus after Atlas close, and uploaded the screenshots and resource-waterfall report. It recorded one deferred script chunk loaded on Atlas launch. Local focused tests now verify the canvas stops at reduced motion, responds to preference changes, and aborts the globe request on unmount; the server fallback tests cover unavailable and malformed payloads. A new browser case forces the deferred Atlas chunk to fail and checks that the page offers the standalone Atlas route as recovery. Local browser execution remains unavailable because the server socket is restricted by the current workspace. The local build previously hit an `EPERM` creating a `.next` API-route directory.

Update this document as implementation proceeds. Each task uses one of these states:

- `planned`: implementation has not begun.
- `in progress`: active coding or verification.
- `ready for review`: pushed with local evidence and PR URL.
- `merged`: merged into main, with deployment state recorded separately.
- `verified in deployment`: the relevant deployed journey has been checked.
- `waiting on dependency`: exact missing content/connection recorded; independent work continues.

Record progress in this compact form:

```text
Task: 4.3
State: ready for review
Branch/PR: <actual branch and URL>
Commit: <actual SHA>
Checks: <actual commands and results>
Browser evidence: <actual screenshot/trace path>
Dependency: <specific remaining dependency, or none>
Next: 4.4
```

Keep public deployment status separate from merge status. Completing code for a draft introduction does not mean the portrait/biography has been published. Completing the request form does not mean the calendar integration has been completed.

## Next Action

Complete PR 7 against the deployed preview, capturing rendered desktop/mobile screenshots and interactive journeys. Use browser request-waterfall evidence to decide whether any further performance work is justified. Resume the profile, photo/map, and booking tasks when their specific approvals and service configuration are available.

Create another implementation slice only when PR review or measured evidence identifies a concrete change. Do not create placeholder media or guess at booking availability to make the work queue appear complete.
