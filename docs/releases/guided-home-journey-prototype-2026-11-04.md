# Guided Home Journey: Local Prototype

The first implementation is a local walkthrough at `/seller-plan/preview`. Visitors choose Sell My Home, Find a Home or Buy and Sell, then move through one question at a time. The existing public seller form has not changed.

This is P0 plus a read-only property lookup from [the implementation plan](../guided-home-journey-plan-2026-11-04.md). The draft lives in React memory. Address lookup sends the typed address to the local server to read eligible saved property records. No lead, subscription, valuation or booking is created, and contact answers are not submitted. Refreshing clears the draft. Use fictional details for the walkthrough.

## Run It

From this repository checkout, with the existing dependencies installed:

```powershell
npm run preview:home-journey --workspace apps/pulse
```

The launcher prints a fresh `http://127.0.0.1:<port>/seller-plan/preview` URL. Open that exact URL. It selects a free port, binds only to loopback, and starts Next in development mode with a small allowlist of OS environment variables and dummy backend configuration. It refuses runtime `.env` files in `apps/pulse`; use this isolated checkout instead of moving or deleting another checkout's environment files. No Docker service is needed.

Keep the terminal open while reviewing. Enter `quit` in that terminal to stop its server. The route returns `notFound()` outside development mode and has noindex/nofollow metadata. This is not a hosted preview or an access-control mechanism for other routes.

## Walk Through It

1. Choose **Buy and Sell**, then **Next**. Select **Use a Fictional Sample Home** on the address screen.
   Address entry uses one **Street Address** input. City, state and ZIP are not separate required fields. Lookup returns a unique match, bounded address choices, a request to refine the query, no match or an unavailable state. City/ZIP context can be included in that same input. **Enter Details Myself** remains available after unsuccessful lookup. Changing the address clears previous property facts, condition/loan answers and confirmation.
2. Confirm the home. Change a fact, move forward and Back, and check the value survives.
3. Choose **Add Home Details** to see the optional property questions. Choose **None** after selecting an improvement to check that the choices are exclusive. Each question also permits **Not Sure**. Starting again and choosing **Leave These for Later** skips this group.
4. Answer the mortgage question **Yes** to reveal an approximate balance. Enter plain dollars such as `250000` or choose **Not Sure**. Zero is distinct from unknown. This does not calculate equity or eligibility.
5. Continue through the buying questions. Pre-approval **Yes** reveals its amount question. At review, edit pre-approval to **Not Yet**; the amount disappears and is cleared. Editing it back to **Yes** requires a fresh amount or explicit **Not Sure** before returning to review.
6. Continue to contact with an example name and `taylor@example.test`. Response permission is separate from optional marketing. Neither choice sends anything here.
7. Open **Preview Controls**, choose **Show Loading, Then an Error**, and press **Preview My Request**. The disabled button reads **Loading…** during preparation and the final-step simulation. Answers survive the error. Choose **Show Loading, Then Complete** to try recovery. Use [the submission walkthrough](guided-home-journey-frontend-2026-11-05.md) to check that an unchanged retry keeps its request ID and a changed answer gets a new one.
8. Refresh or use **Reset Preview** to clear the draft. Try **Find a Home** to see the shorter buyer path without seller property questions. **Sell My Home** leaves out the buyer questions.
9. On a phone, choices remain full-width and the footer retains Back/Next. On entry, labels wrap below the illustration. Reduced motion shows them immediately. Ordinary edits do not replay their reveal.

Completion explicitly says no request was sent and links to the current seller form or existing Explorer. Following those links leaves the fixture walkthrough. The map is a labelled placeholder and the home is an original SVG illustration. Approved photography and the existing map integration belong to the later public integration.

## Try Address Matching and Prefill

1. Open **Preview Controls** and select **Fictional Example Records** under **Address Lookup Data**. This is explicit test data; it never falls back to the saved-record reader.
2. Choose **Sell My Home**, enter `100 Example Lane` and press **Next**. Select Keller or Arlington from the returned choices. Neither is silently selected.
3. Confirm the home. Keller prefills 3 bedrooms and 2,100 square feet; Arlington prefills 4 and 2,400. The card identifies the fictional source and record date.
4. Use the bedroom **+**/**−** controls or type a correction. Back/Next retains the correction and does not repeat the lookup for the confirmed match.
5. Full/half bathrooms, stories and year built remain blank when absent. Combined bathrooms appear as a reference only; they are never divided into guessed full/half values. Fill them or choose **Not Sure**.
6. Edit the address to `100 Example Lane, Arlington` for a unique match. The old facts clear before the new record is applied. The new home still needs confirmation.
7. Try `200 Example Street` for no match, then **Enter Details Myself**. Return to **Saved Public Property Records** to exercise the isolated launcher's unavailable-data recovery.

The isolated launcher deliberately uses unreachable dummy database configuration. It can demonstrate successful matching with examples through the real local API, and failure recovery through the canonical reader. Successful reads from a hosted project were not exercised. In a development runtime configured for the project, the saved reader uses the existing canonical `properties` table. Actual address coverage and source permissions still need verification before public rollout.

## Code Map

| File under `apps/pulse` | Responsibility |
| --- | --- |
| `lib/marketing/guidedJourney.ts` | Typed answers, conditional steps, bounded facts, integer-cent parsing, hidden-answer cleanup, validation and review projection |
| `components/lead-capture/journey/GuidedJourneyPrototype.tsx` | In-memory controller, property/facts/questions, review editing, contact and deliberate loading/error controls |
| `components/lead-capture/journey/GuidedJourneyShell.tsx` | Property context, section progress, heading focus and Back/Next footer |
| `components/lead-capture/journey/JourneyChoiceGroup.tsx` | Native radio group with separate accessible names and descriptions |
| `components/lead-capture/journey/JourneyHomeFacts.tsx` | Editable record prefill, bounded count steppers, source/date and aggregate-bathroom context |
| `lib/marketing/homeFactsLookup.ts` | Strict input/response contracts, public fact projection, conservative address matching, bounded candidates and refinement parsing |
| `lib/marketing/homeFactsLookup.server.ts` | Saved-record reader and explicitly selected fictional examples; no provider ingestion |
| `app/api/seller-plan/preview/property-lookup/route.ts` | Development-only, same-origin read-only POST; 1KB stream bound, no-store responses and timeout |
| `lib/data/listingRepository.ts` | Public-column-only canonical address search, 31-row cap, city/ZIP refinement and abort signal |
| `components/lead-capture/journey/GuidedJourney.module.css` | Scoped sans-serif italic headings, responsive layout, focus and reduced motion |
| `components/marketing/SequentialPhotoLabels.tsx` and `.module.css` | Stable decorative labels, 180/320/460ms delays, 240ms reveal, static narrow-screen chips |
| `app/seller-plan/preview/page.tsx` | Development-only fixture entry |
| `lib/navigation/focusedSurfaces.ts` | Reuses the lightweight/minimal root layout for this exact path, avoiding unrelated branding/database providers |
| `scripts/guided-journey-preview*.mjs` | Isolated launcher and real-browser acceptance walkthrough |

One development-only read API was added. It sends addresses in a bounded JSON body, not URL query strings, and does not log them. The SQL filters out private, deleted and demo rows before selecting address/fact/provenance columns; no owner details, arbitrary metadata or full listing payload is returned. Database failures stay distinct from no match. A truncated candidate pool requires refinement rather than an arbitrary first result. Duplicate historical rows use the newest whole record per full address without merging conflicting facts.

No dependency, database schema, storage bucket, queue, cron or provider was added. The newer seller form in the feature stack was not replaced with the older main-based form. Integration must carry this presentation onto the reviewed feature base.

## Verification

Completed locally on November 4, 2026:

- **61 unit tests pass** across eight files: draft model, interaction, route gates, labels, public projection/matching, repository query contract and read API. Coverage includes source isolation, body bounds, explicit candidate choice, missing versus zero, corrections, property changes, abort/unmount and the local-origin regression.
- **Scoped TypeScript passes** for the new model/components/route/tests and focused navigation helper. This is not a full-project typecheck.
- **Scoped ESLint passes** for those TypeScript files; both scripts pass Node's syntax check.
- **Browser acceptance passes** for all three modes, optional details, review edits, 390px layout, reduced motion and 720px CSS reflow equivalent to 200% on the 1440px desktop viewport.
- The browser recorded **four read-only lookup POSTs, zero mutating requests and zero page exceptions**. No unrelated application API was called. The page and lookup returned HTTP 200. Success used explicit example records; the canonical reader used unreachable local database configuration and returned the expected unavailable fallback.
- Figure captures sample the actual CSS animation at 280/450/720ms, showing one/two/three visible labels. A separate normal-flow assertion checks no reveal replay during question rerenders.

Run browser acceptance while the owned launcher is running, substituting its printed origin:

```powershell
npm run test:home-journey:preview --workspace apps/pulse -- http://127.0.0.1:PORT
```

The check blocks external HTTP requests. Gitignored evidence under `apps/pulse/.pulse-local/guided-journey/` includes `result.json`, `dev.log`, `server-signals.json`, desktop/mobile/review screenshots and three label captures. Test answers are fictional; the result file records aggregate checks only.

Run the unit tests with:

```powershell
npm run test:unit --workspace apps/pulse -- tests/unit/guided-journey.test.ts tests/unit/guided-journey-form.test.tsx tests/unit/guided-journey-preview.test.tsx tests/unit/sequential-photo-labels.test.tsx
npm run test:unit --workspace apps/pulse -- tests/unit/home-facts-lookup.test.ts tests/unit/home-facts-form.test.tsx tests/unit/home-facts-route.test.ts tests/unit/home-facts-repository.test.ts
npm run typecheck:home-journey --workspace apps/pulse
```

No production build, hosted acceptance, real submission, booking or deployment was performed for this local-only slice. Required release checks still apply before public integration.

Repository conventions checklist:

1. Worker routing phrases: not applicable; no worker changes.
2. Relay provenance/modes: not applicable; no relay changes.
3. Operator route guards: not applicable; no operator routes added. The fixture's development-only gate and exact lightweight path pass unit checks.
4. Ledger disable flags/paths: not applicable; no application ledger writes. Launcher evidence uses gitignored `.pulse-local` paths.
5. API Zod bounds: passes; strict 180-character query/boolean input, bounded streamed body, exact public response shapes and fact/choice limits. Persisted intake validation remains a later gate.
6. Test environment restoration: passes; route tests restore environment mocks, form tests clean globals and pending timers.
7. Redacted Langfuse observations: not applicable; no tracing changes or personal-data observations added.

## Next Integration Slice

1. Select the reviewed seller-feature base and preserve its request identity, duplicate protection, consent, receipt and consultation capability. Keep the current public entry until integration passes.
2. Implement the plan's strict version 3 contract and privacy projection in the existing intake. Test v2 replay compatibility and changed-answer fingerprints before real writes. Never route the financial group through the legacy lead logger.
3. Connect the seller path to the existing save/receipt and consultation picker. Reuse availability, reservations and reminder claims. No second calendar or background job is needed.
4. Keep buyer persistence gated until its owner reader and two-owner isolation work. The current policy/RPC/planner select `source = 'seller_plan'`; adding a new source alone is insufficient.
5. Carry approved request context into the existing seller inbox, Today and case progress. Keep financing out of public/client-shared publication. Use Explorer for buyer browsing and the configured map provider for optional address context.

Public rollout remains separate from this interaction review and from the pending security release dependencies.
